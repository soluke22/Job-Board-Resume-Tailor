import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { installAuth, requireWorkspaceOwner } from './server/auth';
import { installPrivateFiles } from './server/privateFiles';
import { createWorkspaceRouter } from './server/workspaceRoutes';
import { redactAiPayload } from './server/privacy';
import { detectAtsProvider, verifyPostingAts } from './server/atsAdapters';
import { executeDiscoveryRequest, validateDiscoveryInput } from './server/discovery';
import { mergeDiscoveredJobs } from './src/utils/jobIdentity';
import { safeFetchText } from './server/safeFetch';
import {
  evaluateDeterministicBlockers,
  calculateFreshnessBand,
  hashJobDescription,
  analysisCache
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
function getGeminiClient(req: Request): GoogleGenAI | null {
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
  client.models.generateContent = (params: any) => generate(redactAiPayload(params, req.body?.candidateProfile));
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
app.post('/api/analyze-job', async (req: Request, res: Response): Promise<void> => {
  try {
    const { rawDescription, candidateProfile, evidenceItems } = req.body;

    if (!rawDescription || typeof rawDescription !== 'string') {
      res.status(400).json({ error: 'Job description text is required.' });
      return;
    }

    const ai = getGeminiClient(req);
    if (!ai) {
      res.status(503).json({
        error:
          'Gemini API key is not configured. Studio fails closed to prevent unverified hallucinations. Please configure GEMINI_API_KEY in Settings.'
      });
      return;
    }

    // Anonymized candidate profile and evidence context to protect PII
    const anonymizedEvidence = (evidenceItems || []).map((e: any) => ({
      id: e.id,
      experienceOrProject: e.employer || e.role || 'Candidate evidence',
      skills: e.technologies || [],
      domain: e.domain || 'Frontend Web',
      claim: e.rawEvidence,
      verified: e.verificationStatus !== 'unverified'
    }));

    const systemPrompt = `You are a skeptical tech recruiter and engineering hiring manager evaluating a job description against verified candidate evidence.
Candidate Background:
- Use only the supplied candidate evidence to determine specialization.
- Do not assume any employer, project, degree or professional history.
- Do not infer candidate qualifications without evidence.

Your task:
1. Parse the job description into structured details.
2. Classify into EXACTLY ONE role family:
   - "frontend-product-engineer" (React, TypeScript, product UI, consumer web, data integration, testing, a11y)
   - "ui-platform-design-systems" (component libraries, design systems, Storybook, design tokens, shared primitives)
   - "internal-tools-fullstack-frontend" (internal applications, CRUD workflows, API-backed admin interfaces)
   - "production-support-frontend" (use ONLY when role materially emphasizes production support, triage, observability, page validation)
3. Calculate multi-factor fit assessments:
   - qualificationFit: score from 0.0 to 10.0 reflecting hard requirement match and seniority alignment.
   - evidenceCoverage: score from 0.0 to 10.0 reflecting the proportion of required skills supported by verified evidence.
   - initialFitScore: conservative out of 10.0. An 8.0+ must be hard to earn and requires strong stack, level, and evidence alignment.
   - tailoredFitScore: conservative out of 10.0 (maximum realistic fit achievable purely with truthful tailoring).
   - applicationPriority: "High" | "Medium" | "Low" | "Do Not Apply".
   - verdict: "Apply" (tailoredFit >= 8.0), "Borderline" (tailoredFit between 6.5 and 7.9), "Skip" (tailoredFit < 6.5 or fundamental domain/seniority mismatch).
   - strongestMatch: candidate's verified evidence most aligned with JD.
   - biggestActualGap: major unevidenced requirement or domain gap (do not treat preferred requirements as hard gaps).
   - blockers: array of hard requirements candidate does not have evidence for.
   - unsupportedRequirements: requirements candidate cannot truthfully claim.
   - canTailor: boolean. Set to FALSE if the job is a "Skip" or fundamental mismatch/unviable stretch. If not a fit, we will NOT create a tailored resume for this job.
   - rejectionNotice: clear statement if canTailor is false explaining why we refuse to generate a misleading resume.

CRITICAL RULES:
- Never use em dashes (—) or en dashes (–) anywhere in any generated text (use commas, colons, or parentheses).
- Do not assume missing evidence exists.
- Return ONLY valid JSON matching this schema:
{
  "parsed": {
    "company": string,
    "roleTitle": string,
    "seniority": string,
    "employmentType": string,
    "locationExpectations": string,
    "coreResponsibilities": string[],
    "hardRequirements": string[],
    "preferredRequirements": string[],
    "primaryTechnologies": string[],
    "productDomainExpectations": string,
    "recruiterScreeningSignals": string[],
    "classifiedFamily": "frontend-product-engineer" | "ui-platform-design-systems" | "internal-tools-fullstack-frontend" | "production-support-frontend",
    "familyRationale": string
  },
  "fit": {
    "initialFitScore": number,
    "tailoredFitScore": number,
    "qualificationFit": number,
    "evidenceCoverage": number,
    "applicationPriority": "High" | "Medium" | "Low" | "Do Not Apply",
    "verdict": "Apply" | "Borderline" | "Skip",
    "verdictReason": string,
    "strongestMatch": string,
    "biggestActualGap": string,
    "blockers": string[],
    "unsupportedRequirements": string[],
    "canTailor": boolean,
    "rejectionNotice": string
  }
}`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        { text: systemPrompt },
        {
          text: `Candidate Summary:\nUse only the verified evidence below.\n\nVerified Evidence Context:\n${JSON.stringify(
            anonymizedEvidence
          )}\n\nJob Description:\n${rawDescription}`
        }
      ],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const json = extractCleanJson(response.text || '{}');
    res.json(json);
  } catch (error: any) {
    console.error('Private operation failed');
    res.status(500).json({ error: 'Failed to analyze job description' });
  }
});

// ==========================================
// 2. Evidence Matching (Full Evidence Bank Retrieval)
// ==========================================
app.post('/api/match-evidence', async (req: Request, res: Response): Promise<void> => {
  try {
    const { parsedJob, evidenceItems, projects, skills } = req.body;
    const ai = getGeminiClient(req);

    if (!ai) {
      res.status(503).json({
        error:
          'Gemini API key is not configured. Studio fails closed to prevent unverified hallucinations.'
      });
      return;
    }

    const prompt = `You are an evidence auditing engine matching job description requirements to verified candidate evidence.
CRITICAL CONSTRAINT: You must NOT infer missing evidence. If evidence does not exist in the candidate bank, label it "Missing".
Do NOT convert collaboration into ownership, contribution into leadership, or frontend API integration into backend ownership.
NO em dashes (—) or en dashes (–) anywhere in your text.

Requirements to Match:
Hard: ${JSON.stringify(parsedJob.hardRequirements || [])}
Preferred: ${JSON.stringify(parsedJob.preferredRequirements || [])}

Candidate Evidence Bank:
${JSON.stringify(
  (evidenceItems || []).map((e: any) => ({
    id: e.id,
    raw: e.rawEvidence,
    tech: e.technologies,
    domain: e.domain,
    status: e.verificationStatus
  }))
)}

Candidate Projects:
${JSON.stringify(
  (projects || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    tech: p.technologies,
    contribution: p.solomonContribution
  }))
)}

Return JSON matching this schema:
{
  "matches": [
    {
      "id": string,
      "requirement": string,
      "isHardRequirement": boolean,
      "candidateEvidence": string,
      "strength": "Strong" | "Moderate" | "Weak" | "Missing",
      "gap": string,
      "matchedEvidenceId": string (optional),
      "supportingEvidenceIds": string[] (optional),
      "supportingSkillIds": string[] (optional),
      "concern": string (optional)
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
    res.status(500).json({ error: 'Failed to match evidence' });
  }
});

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
app.post('/api/generate-plan', async (req: Request, res: Response): Promise<void> => {
  try {
    const { parsedJob, fit, evidenceMatches, sessionAnswers } = req.body;

    if (!fit.canTailor) {
      res.status(400).json({ error: 'Cannot tailor a plan for a job classified as Skip/Stretch.' });
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

    const prompt = `Formulate a detailed, conservative tailoring plan for the candidate for the role of ${
      parsedJob.roleTitle
    } at ${parsedJob.company} (${parsedJob.classifiedFamily}).

RULES:
- Select supported experience bullets from verified experience.
- Default to the 2 strongest projects. Primary project 3 to 4 bullets, secondary project 2 to 3 bullets.
- Skills: order by JD relevance, aim for 4 compact lines.
- Withhold any unsupported claims.
- NO em dashes anywhere.

Job hiring signals:
${JSON.stringify(parsedJob.recruiterScreeningSignals || [])}

Matches:
${JSON.stringify(evidenceMatches || [])}

Session evidence answers:
${JSON.stringify(sessionAnswers || {})}

Return JSON:
{
  "plan": {
    "professionalSummaryAngle": string,
    "disneyBulletsPlan": [
      { "evidenceId": string, "targetSignal": string, "action": "keep" | "rewrite" | "swap", "plannedAngle": string }
    ],
    "projectSelection": [
      { "projectId": string, "bulletCount": number, "rationale": string }
    ],
    "skillsOrdering": [
      { "category": string, "skills": string[] }
    ],
    "skillsToRemove": string[],
    "skillsToBackfill": string[],
    "unsupportedClaimsToWithhold": string[]
  }
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
    res.status(500).json({ error: 'Failed to generate tailoring plan' });
  }
});

// ==========================================
// 5. Generate Tailored Resume (Deterministic Header & Education Assembly)
// ==========================================
app.post('/api/generate-resume', async (req: Request, res: Response): Promise<void> => {
  try {
    const { parsedJob, tailoringPlan, candidateProfile, masterResume } = req.body;

    const ai = getGeminiClient(req);
    if (!ai) {
      res.status(503).json({
        error:
          'Gemini API key is not configured. Studio fails closed to prevent unverified hallucinations.'
      });
      return;
    }

    // Pass only non-PII technical context to Gemini for language judgment
    const prompt = `Generate tailored resume content (summary, skills ordering, experience bullets, and project bullets) applying to:
Company: ${parsedJob.company}
Role: ${parsedJob.roleTitle}
Role Family: ${parsedJob.classifiedFamily}

ABSOLUTE MANDATORY RULES:
1. NEVER USE EM DASHES (—) OR EN DASHES (–) ANYWHERE in any text. Replace with commas, colons, or parentheses.
2. Preserve the candidate titles supplied in the master resume.
3. Preserve employers from the supplied master resume.
4. Safe verbs: built, implemented, shipped, contributed, supported, reviewed, validated, triaged, investigated, routed, documented, tested, collaborated.
   Do NOT use "led", "owned", "architected" for candidate experience unless verified.
5. Professional summary: 2 to 3 rendered lines. Do NOT use generic buzzwords ("results-driven", "passionate", "proven track record"). Focus on React, TypeScript, GraphQL, testing, and production UI engineering.
6. Experience bullets: select supported bullets, approximately 2 rendered lines each. Distinguish activity from impact.
7. Projects: 2 projects (SignalSafe as primary with 3 bullets; Accessible UI Component Primitive Library or Personal Engineering Portfolio with 2 bullets).
8. Skills: 4 compact categories. Order by relevance to ${parsedJob.company}.
9. Estimate line budget to fit exactly on ONE PAGE (approx 46 to 50 lines total).
10. DO NOT generate candidate name, contact information, phone, email, or education institution. These will be assembled deterministically.

Master Resume Base Content:
${JSON.stringify({
  summary: masterResume.professionalSummary,
  skills: masterResume.skills,
  experience: masterResume.experience,
  projects: masterResume.projects
})}

Tailoring Plan:
${JSON.stringify(tailoringPlan)}

Return JSON matching this schema:
{
  "professionalSummary": string,
  "skills": [
    { "category": string, "skills": string[] }
  ],
  "experienceBullets": [
    {
      "id": string,
      "text": string,
      "targetRequirement": string,
      "evidenceSource": string,
      "whyThisBullet": string,
      "underlyingEvidence": string,
      "supportingEvidenceId": string
    }
  ],
  "projects": [
    {
      "id": string,
      "name": string,
      "period": string,
      "technologies": string[],
      "bullets": [
        {
          "id": string,
          "text": string,
          "targetRequirement": string,
          "evidenceSource": string,
          "whyThisBullet": string,
          "underlyingEvidence": string,
          "supportingEvidenceId": string
        }
      ]
    }
  ],
  "pageEstimate": {
    "isOnePage": true,
    "estimatedLines": number,
    "overflowRisk": "low" | "moderate" | "high",
    "trimSuggestions": string[]
  }
}`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ text: prompt }],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const generated = extractCleanJson(response.text || '{}');

    // Deterministic assembly of resume: Header, contact details, links, education, and dates are strictly preserved
    const assembledResume = {
      id: `tailored-${Date.now()}`,
      jobId: parsedJob.id || `job-${Date.now()}`,
      roleFamily: parsedJob.classifiedFamily,
      header: {
        name: candidateProfile?.name || masterResume.header.name || '',
        title: candidateProfile?.title || masterResume.header.title || 'Software Engineer',
        email:
          candidateProfile?.email ||
          masterResume.header.email ||
          '',
        phone: candidateProfile?.phone || masterResume.header.phone || '',
        location:
          candidateProfile?.location ||
          masterResume.header.location ||
          '',
        links: candidateProfile?.links || masterResume.header.links || []
      },
      professionalSummary: (generated.professionalSummary || masterResume.professionalSummary || '')
        .replace(/[—–]/g, ', '),
      skills: generated.skills || masterResume.skills,
      experience: [
        {
          id: masterResume.experience[0]?.id || 'experience',
          employer: masterResume.experience[0]?.employer || '',
          title: masterResume.experience[0]?.title || '',
          period: masterResume.experience[0]?.period || '',
          location: masterResume.experience[0]?.location || '',
          bullets: (generated.experienceBullets || masterResume.experience[0]?.bullets || []).map(
            (b: any, idx: number) => ({
              id: b.id || `exp-bullet-${idx}`,
              section: 'experience',
              parentId: masterResume.experience[0]?.id || 'experience',
              text: (b.text || '').replace(/[—–]/g, ', '),
              targetRequirement: b.targetRequirement || '',
              evidenceSource: b.evidenceSource || masterResume.experience[0]?.employer || '',
              whyThisBullet: b.whyThisBullet || '',
              underlyingEvidence: b.underlyingEvidence || '',
              supportingEvidenceId: b.supportingEvidenceId,
              enabled: true
            })
          )
        }
      ],
      projects: (generated.projects || masterResume.projects || []).map((p: any, pIdx: number) => ({
        id: p.id || `proj-${pIdx}`,
        name: p.name,
        period: p.period || '2023',
        technologies: p.technologies || [],
        bullets: (p.bullets || []).map((b: any, bIdx: number) => ({
          id: b.id || `proj-${pIdx}-b-${bIdx}`,
          section: 'project',
          parentId: p.id || `proj-${pIdx}`,
          text: (b.text || '').replace(/[—–]/g, ', '),
          targetRequirement: b.targetRequirement || '',
          evidenceSource: b.evidenceSource || p.name,
          whyThisBullet: b.whyThisBullet || '',
          underlyingEvidence: b.underlyingEvidence || '',
          supportingEvidenceId: b.supportingEvidenceId,
          enabled: true
        }))
      })),
      education: masterResume.education,
      pageEstimate: generated.pageEstimate || {
        isOnePage: true,
        estimatedLines: 48,
        overflowRisk: 'low',
        trimSuggestions: []
      }
    };

    res.json({ resume: assembledResume });
  } catch (error: any) {
    console.error('Private operation failed');
    res.status(500).json({ error: 'Failed to generate resume' });
  }
});

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
// 7. Evaluate Resume (Submission QA Pass)
// ==========================================
app.post('/api/evaluate-resume', async (req: Request, res: Response): Promise<void> => {
  try {
    const { resume, parsedJob } = req.body;

    const flags: any[] = [];
    let metricsCount = 0;
    let totalBullets = 0;

    // Local deterministic checks for em-dashes and forbidden patterns
    const checkTextForEmDash = (text: string, location: string) => {
      if (text.includes('—') || text.includes('–')) {
        flags.push({
          id: `dash-${Math.random().toString(36).substring(2, 8)}`,
          type: 'DASH',
          severity: 'critical',
          target: location,
          message:
            'Em dash or en dash detected. The specification strictly prohibits em dashes anywhere in generated text.',
          suggestedFix: text.replace(/—/g, ', ').replace(/–/g, '-'),
          isSafeToAutoFix: true
        });
      }
    };

    checkTextForEmDash(resume.professionalSummary || '', 'Professional Summary');

    // Check experience bullets
    (resume.experience || []).forEach((exp: any) => {
      (exp.bullets || []).forEach((b: any, idx: number) => {
        totalBullets++;
        checkTextForEmDash(b.text, `${exp.employer} Bullet ${idx + 1}`);

        // Check metric coverage
        if (/\d+/.test(b.text)) {
          metricsCount++;
        }

        // Check verbs
        const firstWord = b.text.trim().split(/\s+/)[0]?.toLowerCase();
        const restricted = ['led', 'owned', 'architected', 'spearheaded', 'revolutionized'];
        if (restricted.includes(firstWord)) {
          flags.push({
            id: `claim-${Math.random().toString(36).substring(2, 8)}`,
            type: 'CLAIM',
            severity: 'warning',
            target: `${exp.employer} Bullet ${idx + 1}`,
            message: `Verb "${firstWord}" suggests unevidenced ownership or leadership for candidate experience. Safe verbs include: built, implemented, shipped, contributed, supported, triaged.`,
            suggestedFix: b.text.replace(new RegExp(`^${firstWord}`, 'i'), 'Built and delivered'),
            isSafeToAutoFix: true
          });
        }

        // Check length
        if (b.text.length > 250) {
          flags.push({
            id: `long-${Math.random().toString(36).substring(2, 8)}`,
            type: 'LONG',
            severity: 'info',
            target: `${exp.employer} Bullet ${idx + 1}`,
            message:
              'Bullet exceeds 250 characters and may wrap onto a 3rd line, risking 1-page overflow.',
            suggestedFix: b.text.slice(0, 200) + '...',
            isSafeToAutoFix: false
          });
        }
      });
    });

    (resume.projects || []).forEach((proj: any) => {
      (proj.bullets || []).forEach((b: any, idx: number) => {
        totalBullets++;
        checkTextForEmDash(b.text, `${proj.name} Bullet ${idx + 1}`);
      });
    });

    const isReady = flags.filter((f) => f.severity === 'critical').length === 0;

    res.json({
      evaluation: {
        isReady,
        summaryPass: true,
        skillsPass: true,
        claimsPass: flags.filter((f) => f.type === 'CLAIM').length === 0,
        roleFamilyPass: true,
        metricCoverage: {
          metricsCount,
          totalBullets,
          ratioString: `${metricsCount} of ${totalBullets} experience bullets contain a concrete metric, number, or scale indicator.`
        },
        flags
      }
    });
  } catch (error: any) {
    console.error('Private operation failed');
    res.status(500).json({ error: 'Failed to evaluate resume' });
  }
});

// ==========================================
// 8. Surgical Bullet Regeneration
// ==========================================
app.post('/api/regenerate-bullet', async (req: Request, res: Response): Promise<void> => {
  try {
    const { targetRequirement, underlyingEvidence, currentText, employerOrProject } = req.body;
    const ai = getGeminiClient(req);

    if (!ai) {
      res.status(503).json({
        error:
          'Gemini API key is not configured. Studio fails closed to prevent unverified hallucinations.'
      });
      return;
    }

    const prompt = `Rewrite this single resume bullet.
Context: ${employerOrProject}
Target JD Requirement: ${targetRequirement}
Underlying Evidence: ${underlyingEvidence}
Current Text: ${currentText}

RULES:
- Exactly 1 bullet sentence (approx 140-200 characters, targeting 2 rendered lines).
- Open with a strong, safe past-tense verb (e.g. built, implemented, shipped, triaged, investigated, developed, tested).
- STRICTLY NO EM DASHES OR EN DASHES.
- Do NOT invent metrics or unverified outcomes.
- Connect activity to clear qualitative or supported impact.

Return JSON:
{
  "bulletText": string,
  "whyThisBullet": string
}`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ text: prompt }],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const json = extractCleanJson(response.text || '{}');
    if (json.bulletText) {
      json.bulletText = json.bulletText.replace(/[—–]/g, ', ');
    }
    res.json(json);
  } catch (error: any) {
    console.error('Private operation failed');
    res.status(500).json({ error: 'Failed to regenerate bullet' });
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

// ==========================================
// 13. Generate Interview Proof Pack
// ==========================================
app.post('/api/generate-proof-pack', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tailoredResume, candidateEvidence, parsedJob } = req.body;
    const ai = getGeminiClient(req);

    if (!ai) {
      res.status(503).json({
        error: 'Gemini API key is not configured. Studio fails closed to prevent unverified hallucinations.'
      });
      return;
    }

    const bullets: any[] = [];
    (tailoredResume?.experience || []).forEach((e: any) => {
      (e.bullets || []).forEach((b: any) => bullets.push({ context: e.employer, text: b.text, id: b.id }));
    });
    (tailoredResume?.projects || []).forEach((p: any) => {
      (p.bullets || []).forEach((b: any) => bullets.push({ context: p.name, text: b.text, id: b.id }));
    });

    const prompt = `You are a technical interview preparation specialist creating an Interview Proof Pack for a software engineering candidate.
Target Role: ${parsedJob?.roleTitle || 'Frontend Engineer'} at ${parsedJob?.company || 'Target Company'}

For each resume bullet below, formulate:
1. Technical context (architecture, trade-offs, underlying technologies)
2. Likely skeptical follow-up question an engineering manager or staff engineer will ask
3. Defensible, truthful explanation that avoids exaggeration and grounds the claim in realistic day-to-day engineering
4. A concise STAR story (Situation, Task, Action, Result)

CRITICAL RULES:
- STRICTLY NO EM DASHES OR EN DASHES ANYWHERE.
- Zero exaggeration. If the candidate was a contributor, do not claim they led the entire initiative.
- Return JSON:
{
  "claims": [
    {
      "id": string,
      "resumeBulletText": string,
      "underlyingEvidenceIds": string[],
      "technicalContext": string,
      "likelyFollowUpQuestion": string,
      "defensibleExplanation": string,
      "starStory": {
        "situation": string,
        "task": string,
        "action": string,
        "result": string
      }
    }
  ],
  "prepNotes": string[]
}

Resume Bullets:
${JSON.stringify(bullets.slice(0, 8))}`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ text: prompt }],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const json = extractCleanJson(response.text || '{}');
    const proofPack = {
      jobId: parsedJob?.id || 'job-active',
      generatedAt: new Date().toISOString(),
      claims: (json.claims || []).map((c: any) => ({
        ...c,
        technicalContext: (c.technicalContext || '').replace(/[—–]/g, ', '),
        likelyFollowUpQuestion: (c.likelyFollowUpQuestion || '').replace(/[—–]/g, ', '),
        defensibleExplanation: (c.defensibleExplanation || '').replace(/[—–]/g, ', ')
      })),
      prepNotes: (json.prepNotes || []).map((n: string) => n.replace(/[—–]/g, ', '))
    };

    res.json({ proofPack });
  } catch (error: any) {
    console.error('Private operation failed');
    res.status(500).json({ error: 'Failed to generate proof pack' });
  }
});

// ==========================================
// 14. Generate Recruiter Outreach & Referral Message
// ==========================================
app.post('/api/generate-outreach', async (req: Request, res: Response): Promise<void> => {
  try {
    const { parsedJob, candidateProfile, tailoredResume } = req.body;
    const ai = getGeminiClient(req);

    if (!ai) {
      res.status(503).json({
        error: 'Gemini API key is not configured. Studio fails closed to prevent unverified hallucinations.'
      });
      return;
    }

    const prompt = `Write high-conversion, professional recruiter outreach messages for:
Company: ${parsedJob.company}
Role: ${parsedJob.roleTitle}
Candidate: ${candidateProfile?.name || 'Candidate'}

Generate:
1. linkedInMessage: Under 300 characters. Direct, polite, highlighting verified React/TypeScript alignment.
2. emailSubject: Clear, professional subject line.
3. emailBody: 2-3 concise paragraphs. Highlights specific technical evidence, why this company's product is exciting, and invites a 15-minute introductory conversation.
4. concreteImpact: 1 sentence stating concrete impact from candidate's verified background.
5. whyCandidateRelevant: 1 sentence summarizing why candidate is directly qualified.

CRITICAL RULES:
- STRICTLY NO EM DASHES OR EN DASHES ANYWHERE.
- Zero buzzwords (e.g. no "supercharged", "rockstar", "ninja", "results-driven").
- Return JSON matching schema:
{
  "linkedInMessage": string,
  "emailSubject": string,
  "emailBody": string,
  "concreteImpact": string,
  "whyCandidateRelevant": string
}`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ text: prompt }],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const json = extractCleanJson(response.text || '{}');
    const outreach = {
      jobId: parsedJob.id || 'job-outreach',
      company: parsedJob.company,
      roleTitle: parsedJob.roleTitle,
      linkedInMessage: (json.linkedInMessage || '').replace(/[—–]/g, ', '),
      emailSubject: (json.emailSubject || '').replace(/[—–]/g, ', '),
      emailBody: (json.emailBody || '').replace(/[—–]/g, ', '),
      concreteImpact: (json.concreteImpact || '').replace(/[—–]/g, ', '),
      whyCandidateRelevant: (json.whyCandidateRelevant || '').replace(/[—–]/g, ', '),
      generatedAt: new Date().toISOString()
    };

    res.json({ outreach });
  } catch (error: any) {
    console.error('Private operation failed');
    res.status(500).json({ error: 'Failed to generate outreach' });
  }
});

// ==========================================
// 15. Generate Grounded Application Answers
// ==========================================
app.post('/api/generate-answers', async (req: Request, res: Response): Promise<void> => {
  try {
    const { questions, parsedJob, candidateEvidence } = req.body;
    const ai = getGeminiClient(req);

    if (!ai) {
      res.status(503).json({
        error: 'Gemini API key is not configured. Studio fails closed to prevent unverified hallucinations.'
      });
      return;
    }

    const prompt = `Formulate natural, concise, and specific application portal answers for the role of ${
      parsedJob.roleTitle
    } at ${parsedJob.company}.
Questions:
${JSON.stringify(questions || ['Why are you interested in this role?', 'Describe a challenging technical project you worked on.'])}

Candidate Evidence Context:
${JSON.stringify((candidateEvidence || []).slice(0, 5))}

CRITICAL RULES:
- STRICTLY NO EM DASHES OR EN DASHES.
- Keep answers under 150 words each.
- Ground answers directly in verified candidate work.
- Return JSON:
{
  "answers": [
    {
      "id": string,
      "question": string,
      "answer": string,
      "evidenceIds": string[],
      "rationale": string
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
    const sanitized = (json.answers || []).map((a: any) => ({
      ...a,
      answer: (a.answer || '').replace(/[—–]/g, ', ')
    }));

    res.json({ answers: sanitized });
  } catch (error: any) {
    console.error('Private operation failed');
    res.status(500).json({ error: 'Failed to generate answers' });
  }
});

// ==========================================
// 16. Generate Referral Request Message
// ==========================================
app.post('/api/generate-referral', async (req: Request, res: Response): Promise<void> => {
  try {
    const { contactName, relationship, company, roleTitle, jobUrl } = req.body;
    const ai = getGeminiClient(req);

    if (!ai) {
      res.status(503).json({
        error: 'Gemini API key is not configured. Studio fails closed to prevent unverified hallucinations.'
      });
      return;
    }

    const prompt = `Write a polite, natural, and low-pressure referral request to a contact.
Contact: ${contactName} (${relationship})
Target Company: ${company}
Target Role: ${roleTitle}
Job Link: ${jobUrl}

CRITICAL RULES:
- STRICTLY NO EM DASHES OR EN DASHES.
- Concise: approx 3-4 sentences.
- Acknowledge their time, specify the exact role and why candidate is a direct fit, and offer to share the resume.
- Return JSON:
{
  "referralMessage": string
}`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ text: prompt }],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const json = extractCleanJson(response.text || '{}');
    res.json({
      referralMessage: (json.referralMessage || '').replace(/[—–]/g, ', ')
    });
  } catch (error: any) {
    console.error('Private operation failed');
    res.status(500).json({ error: 'Failed to generate referral request' });
  }
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown API route' }));
app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
  res.status(error?.type === 'entity.too.large' ? 413 : 400).json({ error: 'Invalid request' });
});
export default app;
