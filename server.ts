import { createArtifactHandler } from './server/artifactRoutes.js';
import { z } from 'zod';
import { AssessmentError } from './server/assessment.js';
import { createAssessmentHandler } from './server/assessmentRoutes.js';
import { createResumeHandler } from './server/resumeRoutes.js';
import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { installAuth, requireWorkspaceOwner, privateNoStore } from './server/auth.js';
import { assertBoundedJson } from './server/inputBounds.js';
import { reserveProviderCall, ProviderBudgetExceeded, isBudgetedExternalPath } from './server/providerBudget.js';
import { installPrivateFiles } from './server/privateFiles.js';
import { createWorkspaceRouter } from './server/workspaceRoutes.js';
import { redactAiPayload } from './server/privacy.js';
import { verifyPostingAts } from './server/atsAdapters.js';
import { buildDiscoveryQueries, createBraveSearchProvider, DiscoveryProvider, DiscoveryProviderError, executeDiscoveryQueries } from './server/discovery.js';
import { mergeDiscoveredJobs } from './src/utils/jobIdentity.js';
import { safeFetchText } from './server/safeFetch.js';
import { classifyGeminiError } from './server/geminiDiagnostics.js';
import { createWorkspaceRepository } from './server/workspaceRepository.js';


dotenv.config();

export const app = express();
app.disable('x-powered-by');
app.use((_req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('X-Frame-Options', 'DENY'); next(); });
installAuth(app);
installPrivateFiles(app);
app.use('/api', privateNoStore);
app.use(express.json({ limit: '3mb' }));
app.use('/api', (req, res, next) => {
  try { assertBoundedJson(req.body); next(); } catch { res.status(400).json({ error: 'Invalid request complexity' }); }
});
app.use('/api/workspace', createWorkspaceRouter());
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
// All remaining application APIs handle private data or invoke private services.
app.use('/api', requireWorkspaceOwner);
export function createProviderBudgetMiddleware(reserve = reserveProviderCall): RequestHandler {
  return async (req, res, next) => {
    if (!isBudgetedExternalPath(req.path)) { next(); return; }
    try { await reserve(res.locals.ownerId, 'external'); next(); }
    catch (error) {
      if (error instanceof ProviderBudgetExceeded) {
        res.status(429).json({ error: 'External operation budget exceeded; retry after the current window', code: 'PROVIDER_BUDGET_EXCEEDED' });
        return;
      }
      // Diagnostic category only: provider exceptions may contain connection or
      // query details and must never be exposed or logged verbatim.
      console.warn('provider_budget_unavailable category=external');
      res.status(503).json({ error: 'External operation budget is temporarily unavailable; retry later', code: 'PROVIDER_UNAVAILABLE' });
    }
  };
}
app.use('/api', createProviderBudgetMiddleware());

// Lazy initialization of GoogleGenAI
export class ProviderBudgetUnavailable extends Error {}
class GeminiProviderFailure extends Error {
  constructor(readonly providerError: unknown) { super('Gemini provider request failed'); }
}
export async function reserveAiProviderCall(ownerId: string, reserve = reserveProviderCall): Promise<void> {
  try {
    await reserve(ownerId, 'ai');
  } catch (error) {
    if (error instanceof ProviderBudgetExceeded) throw error;
    throw new ProviderBudgetUnavailable();
  }
}
export async function reserveExternalProviderCall(ownerId: string, reserve = reserveProviderCall): Promise<void> {
  try {
    await reserve(ownerId, 'external');
  } catch (error) {
    if (error instanceof ProviderBudgetExceeded) throw error;
    throw new ProviderBudgetUnavailable();
  }
}
function getGeminiClient(req: Request, alreadyMinimized = false): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  const client = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
  const generate = client.models.generateContent.bind(client.models);
  client.models.generateContent = async (params: any) => {
    await reserveAiProviderCall(req.res!.locals.ownerId);
    const bounded = { ...params, config: { ...params.config, httpOptions: { ...params.config?.httpOptions, timeout: 30000 } } };
    return generate(alreadyMinimized ? bounded : redactAiPayload(bounded, req.body?.candidateProfile));
  };
  return client;
}

const MODEL_NAME = 'gemini-3.8-flash';

// ==========================================
// 0. Fetch Job Posting from URL
// ==========================================
app.post('/api/fetch-job-url', async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      res.status(400).json({ error: 'A valid http/https URL is required.' });
      return;
    }

    const response = await safeFetchText(url);
    if (response.status < 200 || response.status >= 300) {
      res.status(502).json({error: 'Job page did not return successful content.'}); return;
    }
    const html = response.text;
    // Extract text cleanly by stripping scripts, styles, navigation, footer, tags
    const stripped = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    // Extract title tag if present
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    res.json({ text: stripped.slice(0, 15000), title, url: response.url, verificationStatus: 'UNKNOWN' });
  } catch (error: any) {
    console.error('Private operation failed');
    res.status(500).json({ error: 'Failed to fetch job posting from URL' });
  }
});

// ==========================================
// 1. Analyze Job & Classify Role Family & Multi-Factor Fit
// ==========================================
function geminiJsonSchema(schema: z.ZodType) { const { ['$schema']: dialect, ...json } = z.toJSONSchema(schema); return json; }
const assessmentHandler = createAssessmentHandler((req) => async (schema, system, data) => {
  const ai = getGeminiClient(req, true);
  if (!ai) throw new AssessmentError('Gemini is not configured; no assessment produced');
  const response = await ai.models.generateContent({model:MODEL_NAME,contents:JSON.stringify(data),config:{systemInstruction:system,responseMimeType:'application/json',responseJsonSchema:geminiJsonSchema(schema),thinkingConfig:{thinkingLevel:ThinkingLevel.MEDIUM},httpOptions:{timeout:30000}}});
  return schema.parse(JSON.parse(response.text || ''));
});
app.post('/api/analyze-job', assessmentHandler);
// Compatibility route uses the same persisted deterministic assessment, never a second scoring path.
app.post('/api/match-evidence', assessmentHandler);

// ==========================================
// 3. Gap Interview Questions
// ==========================================
// No UI caller remains. Fence arbitrary client gap context.
app.post('/api/gap-interview', (_req, res) => {
  res.status(410).json({ error: 'Legacy gap generation is unavailable; use reviewed evidence and current assessment' });
});

// ==========================================
// 4. Tailoring Plan
// ==========================================
const resumeModel = (req: Request) => async (schema: z.ZodType, system: string, data: unknown) => {
  const ai = getGeminiClient(req, true);
  if (!ai) throw new Error('Gemini is not configured');
  const response = await ai.models.generateContent({model:MODEL_NAME,contents:JSON.stringify(data),config:{systemInstruction:system,responseMimeType:'application/json',responseJsonSchema:geminiJsonSchema(schema),thinkingConfig:{thinkingLevel:ThinkingLevel.MEDIUM},httpOptions:{timeout:30000}}});
  return schema.parse(JSON.parse(response.text || ''));
};
app.post('/api/generate-plan', createResumeHandler('plan', resumeModel));
app.post('/api/generate-resume', createResumeHandler('generate', resumeModel));
app.post('/api/evaluate-resume', createResumeHandler('evaluate', resumeModel));
app.post('/api/validate-resume', createResumeHandler('validate', resumeModel));
app.post('/api/regenerate-bullet', createResumeHandler('regenerate', resumeModel));
app.post('/api/export-resume', createResumeHandler('export', resumeModel));
// ==========================================
// 6. Generate Tailored Cover Letter (Deterministic Header & Sign-Off)
// ==========================================
app.post('/api/generate-cover-letter', async (req: Request, res: Response): Promise<void> => {
  try {
    const { parsedJob, candidateProfile, tailoredResume } = req.body;

    const ai = getGeminiClient(req);
    if (!ai) {
      res.status(503).json({
        error:
          'Gemini API key is not configured. Studio fails closed to prevent unverified hallucinations.'
      });
      return;
    }

    const dateStr = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    const prompt = `Write a compelling, truthful, and grounded cover letter applying for:
Company: ${parsedJob.company}
Role: ${parsedJob.roleTitle}

CRITICAL RULES:
1. STRICTLY NO EM DASHES (—) OR EN DASHES (–) ANYWHERE. Use commas or periods.
2. Grounded strictly in supplied candidate evidence and projects.
3. Do NOT invent metrics, revenue, or leadership roles. Preserve supplied candidate titles.
4. Professional tone: conversational, confident, free of empty clichés.
5. Exactly 3 to 4 well-structured paragraphs.
6. Return ONLY the body paragraphs and evidence themes used.

Return JSON:
{
  "paragraphs": string[],
  "evidenceThemesUsed": string[]
}`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ text: prompt }],
      config: {
        responseMimeType: 'application/json', httpOptions: { timeout: 30000 }
      }
    });

    const generated = z.object({ paragraphs: z.array(z.string().max(6000)).min(3).max(4), evidenceThemesUsed: z.array(z.string().max(500)).max(20) }).strict().parse(JSON.parse(response.text || ''));
    const candidateName =
      candidateProfile?.name ||
      candidateProfile?.fullName ||
      tailoredResume?.header?.name ||
      '';

    const coverLetter = {
      id: `cl-${Date.now()}`,
      jobId: parsedJob.roleTitle,
      date: dateStr,
      recipientName: `Hiring Team for ${parsedJob.roleTitle}`,
      companyName: parsedJob.company,
      roleTitle: parsedJob.roleTitle,
      paragraphs: (generated.paragraphs || []).map((p: string) => p.replace(/[—–]/g, ', ')),
      signOff: `Sincerely,\n${candidateName}`,
      evidenceThemesUsed: generated.evidenceThemesUsed || []
    };

    res.json({ coverLetter });
  } catch (error: any) {
    console.error('Private operation failed');
    res.status(500).json({ error: 'Failed to generate cover letter' });
  }
});

// ==========================================
// 9. Authentication & Session Management
// ==========================================
app.post('/api/verify-ats', async (req: Request, res: Response): Promise<void> => {
  try {
    const { url, provider, board, jobId } = req.body;
    if (!url) {
      res.status(400).json({ error: 'URL is required for ATS verification.' });
      return;
    }

    const verification = await verifyPostingAts(url, provider, board, jobId);
    res.json(verification);
  } catch (error: any) {
    console.error('Private operation failed');
    res.status(500).json({ error: 'ATS verification failed' });
  }
});

// ==========================================
// 12. Deterministic Web Search Job Discovery Engine
// ==========================================
type DiscoveryWorkspace = { searchProfile: import('./src/types/index.js').SearchProfile | null; jobs: import('./src/types/index.js').JobRecord[] };
export function createDiscoveryHandler(
  providerFactory: () => DiscoveryProvider | null = createBraveSearchProvider,
  reserve = reserveProviderCall,
  readWorkspace: (ownerId: string) => Promise<DiscoveryWorkspace> = async ownerId => {
    const workspace = await createWorkspaceRepository().read(ownerId);
    return { searchProfile: workspace.searchProfile, jobs: workspace.jobs };
  }
): RequestHandler {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { queryBudget = 4 } = req.body;
      if (Object.keys(req.body).some(key => key !== 'queryBudget')) { res.status(400).json({ error: 'Discovery accepts only a query budget.' }); return; }

      const provider = providerFactory();
      if (!provider) {
        res.status(503).json({
          error: 'Web search discovery is not configured.',
          code: 'SEARCH_PROVIDER_CONFIGURATION_REQUIRED'
        });
        return;
      }

      const workspace = await readWorkspace(req.res!.locals.ownerId);
      const searchProfile = workspace.searchProfile;
      const existingJobs = workspace.jobs;
      let queries: string[];
      try { queries = buildDiscoveryQueries(searchProfile, queryBudget); }
      catch (error) { res.status(400).json({error: (error as Error).message}); return; }
      for (let index = 1; index < queries.length; index++) await reserveExternalProviderCall(req.res!.locals.ownerId, reserve);
      const outcome = await executeDiscoveryQueries(provider, queries);
      const candidates = outcome.jobs;
      const merged = mergeDiscoveredJobs(Array.isArray(existingJobs) ? existingJobs : [], candidates);
      res.json({
        discoveredJobs: merged.newJobs.filter(j => j.verificationStatus !== 'NOT_LISTED'),
        refreshedJobs: merged.refreshedJobs,
        discoveryRequestsUsed: outcome.discoveryRequestsUsed, queryBudgetUsed: outcome.queryBudgetUsed, queryBudgetUnit: outcome.queryBudgetUnit,
        freshnessStats: {
          newCount: merged.newJobs.filter(j => j.freshnessBand === 'NEW').length,
          recentCount: merged.newJobs.filter(j => j.freshnessBand === 'RECENT').length,
          unknownCount: merged.newJobs.filter(j => j.freshnessBand === 'UNKNOWN').length
        }
      });
    } catch (error) {
      if (error instanceof ProviderBudgetExceeded) {
        res.status(429).json({ error: 'External operation budget exceeded; retry after the current window', code: 'PROVIDER_BUDGET_EXCEEDED' });
        return;
      }
      if (error instanceof ProviderBudgetUnavailable) {
        console.warn('provider_budget_unavailable category=external');
        res.status(503).json({ error: 'External operation budget is temporarily unavailable; retry later', code: 'PROVIDER_UNAVAILABLE' });
        return;
      }
      if (error instanceof DiscoveryProviderError) {
        const status = error.code === 'SEARCH_TIMEOUT' ? 504 : error.code === 'SEARCH_RATE_LIMITED' ? 429 : error.code === 'SEARCH_PROVIDER_UNAVAILABLE' ? 503 : 502;
        res.status(status).json({ error: error.message, code: error.code });
        return;
      }
      console.error('Private operation failed');
      res.status(500).json({ error: 'Job discovery failed', code: 'DISCOVERY_FAILED' });
    }
  };
}
app.post('/api/discover-jobs', createDiscoveryHandler());

// Phase 6 certified downstream artifacts use the Phase 4/5 strict adapter.
for (const [path, operation] of [['generate-proof-pack','proof'],['generate-outreach','outreach'],['generate-answers','answers'],['generate-referral','referral']] as const) {
  app.post(`/api/${path}`, createArtifactHandler(operation, (req) => async (schema, system, data) => {
    const ai=getGeminiClient(req,true);
    if(!ai)throw new AssessmentError('Gemini is not configured; no artifact produced');
    const response=await ai.models.generateContent({model:MODEL_NAME,contents:JSON.stringify(data),config:{systemInstruction:system,responseMimeType:'application/json',responseJsonSchema:geminiJsonSchema(schema),thinkingConfig:{thinkingLevel:ThinkingLevel.MEDIUM},httpOptions:{timeout:30000}}});
    return schema.parse(JSON.parse(response.text || ''));
  }));
}

app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown API route' }));
app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
  if (res.headersSent) { res.destroy(); return; }
  const status = error?.type === 'entity.too.large' ? 413 : error instanceof SyntaxError ? 400 : 500;
  res.status(status).json({ error: status === 500 ? 'Request failed' : 'Invalid request' });
});
export default app;
