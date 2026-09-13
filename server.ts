import { createArtifactHandler } from './server/artifactRoutes';
import { z } from 'zod';
import { AssessmentError } from './server/assessment';
import { createAssessmentHandler } from './server/assessmentRoutes';
import { createResumeHandler } from './server/resumeRoutes';
import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { installAuth, requireWorkspaceOwner } from './server/auth';
import { installPrivateFiles } from './server/privateFiles';
import { createWorkspaceRouter } from './server/workspaceRoutes';
import { redactAiPayload } from './server/privacy';
import { detectAtsProvider, verifyPostingAts } from './server/atsAdapters';
import { executeDiscoveryRequest, validateDiscoveryInput } from './server/discovery';
import { mergeDiscoveredJobs } from './src/utils/jobIdentity';
import { safeFetchText } from './server/safeFetch';
import {

  calculateFreshnessBand,


} from './server/searchEngine';
import { JobRecord, SearchProfile } from './src/types';

dotenv.config();

export const app = express();
app.disable('x-powered-by');
app.use((_req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('X-Frame-Options', 'DENY'); next(); });
installAuth(app);
installPrivateFiles(app);
app.use(express.json({ limit: '3mb' }));
app.use('/api/workspace', createWorkspaceRouter());
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
// All remaining application APIs handle private data or invoke private services.
app.use('/api', requireWorkspaceOwner);

// Lazy initialization of GoogleGenAI
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
  if (!alreadyMinimized) client.models.generateContent = (params: any) => generate(redactAiPayload(params, req.body?.candidateProfile));
  return client;
}

const MODEL_NAME = 'gemini-3.8-flash';

// Helper to safely extract JSON from Gemini response
function extractCleanJson(text: string): any {
  let cleaned = text.trim();
  // Strip markdown code fences if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned);
}

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
app.post('/api/gap-interview', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fit, evidenceMatches, parsedJob } = req.body;

    // Per spec: Only ask questions if projected fit is 8.0 or higher, a hard requirement has weak/missing evidence,
    // and it could plausibly have been covered by undocumented past work.
    if (!fit || fit.tailoredFitScore < 8.0) {
      res.json({ questions: [] });
      return;
    }

    const candidateGaps = (evidenceMatches || []).filter(
      (m: any) => m.isHardRequirement && (m.strength === 'Weak' || m.strength === 'Missing')
    );

    if (candidateGaps.length === 0) {
      res.json({ questions: [] });
      return;
    }

    const ai = getGeminiClient(req);
    if (!ai) {
      res.status(503).json({
        error:
          'Gemini API key is not configured. Studio fails closed to prevent unverified hallucinations.'
      });
      return;
    }

    const prompt = `The candidate is interviewing for ${parsedJob.roleTitle} at ${parsedJob.company}.
Their tailored fit score is ${fit.tailoredFitScore}/10 (8.0+).
Generate up to 3 targeted, respectful interview questions for the candidate about specific gaps in hard requirements that could plausibly have been covered by undocumented past work in prior work or personal projects.
Do NOT suggest inventing anything.
NO em dashes.

Gaps:
${JSON.stringify(candidateGaps)}

Return JSON:
{
  "questions": [
    {
      "id": string,
      "requirement": string,
      "question": string,
      "contextRationale": string
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ text: prompt }],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const json = extractCleanJson(response.text || '{}');
    res.json(json);
  } catch (error: any) {
    console.error('Private operation failed');
    res.status(500).json({ error: 'Failed to generate gap questions' });
  }
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
        responseMimeType: 'application/json'
      }
    });

    const generated = extractCleanJson(response.text || '{}');
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
// 12. Search-Grounded Job Discovery Engine
// ==========================================
app.post('/api/discover-jobs', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      searchProfile,
      customQueries,
      evidenceItems,
      existingJobs,
      queryBudget = 4
    } = req.body;

    const ai = getGeminiClient(req);
    if (!ai) {
      res.status(503).json({
        error:
          'Gemini API key is not configured. Studio fails closed to prevent unverified hallucinations. Please configure GEMINI_API_KEY in Settings.'
      });
      return;
    }

    try { validateDiscoveryInput(searchProfile, queryBudget, customQueries); }
    catch (error) { res.status(400).json({error: (error as Error).message}); return; }
    // Budget counts requests, not Google's unobservable internal query execution.
    const outcome = await executeDiscoveryRequest(prompt => ai.models.generateContent({
      model: MODEL_NAME, contents: [{text: prompt}], config: {tools: [{googleSearch: {}}]}
    }), searchProfile, queryBudget, customQueries);
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
  } catch (error: any) {
    console.error('Private operation failed');
    res.status(500).json({ error: 'Job discovery failed' });
  }
});

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
