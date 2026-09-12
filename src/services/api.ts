import { storageService } from './storage';
import {
  CandidateProfile,
  EvidenceItem,
  ProjectItem,
  SkillItem,
  ParsedJob,
  FitAssessment,
  RequirementMatch,
  TailoringPlan,
  TailoredResume,
  TailoredCoverLetter,
  ResumeEvaluation,
  GapInterviewQuestion
} from '../types';

let beforePrivateRequest: () => Promise<void> = async () => {};
export function setBeforePrivateRequest(callback: () => Promise<void>) { beforePrivateRequest = callback; }
let generation = 0;
export function invalidatePrivateRequests() { generation++; }
function accessLost(response: Response) {
  if (storageService.getAuthSession().isAuthenticated && (response.status === 401 || response.status === 403 || response.status === 503)) window.dispatchEvent(new Event('workspace-access-lost'));
}
async function fetchPrivateResponse(input: string, init?: RequestInit): Promise<Response> {
  const epoch = generation;
  try { return await fetch(input, { credentials: 'same-origin', cache: 'no-store', ...init }); }
  catch (error) {
    if (epoch === generation && storageService.getAuthSession().isAuthenticated) window.dispatchEvent(new Event('workspace-access-lost'));
    throw error;
  }
}
async function readPrivateBody(response: Response, epoch: number, json: boolean): Promise<any> {
  try { return await (json ? response.json() : response.text()); }
  catch (error) {
    if (epoch === generation && storageService.getAuthSession().isAuthenticated) window.dispatchEvent(new Event('workspace-access-lost'));
    throw error;
  }
}
async function privateFetch(input: string, init?: RequestInit): Promise<Response> {
  if (storageService.getWorkspaceMode() !== 'PRIVATE_WORKSPACE' || !storageService.getAuthSession().isAuthenticated) throw new Error('Sign in to the private workspace to use this action. Demo records remain synthetic.');
  const epoch = generation;
  await beforePrivateRequest();
  if (epoch !== generation) throw new Error('Session changed');
  const response = await fetchPrivateResponse(input, init);
  const body = await readPrivateBody(response, epoch, false);
  if (epoch !== generation) throw new Error('Session changed');
  accessLost(response);
  if (epoch !== generation) throw new Error('Private access is unavailable. Sign in again.');
  const result = new Response(body, { status: response.status, headers: response.headers });
  const parse = result.json.bind(result);
  result.json = async () => {
    const data = await parse();
    if (epoch !== generation) throw new Error('Session changed');
    return data;
  };
  return result;
}
export async function workspaceRequest(path: string, init?: RequestInit): Promise<any> {
  const epoch = generation;
  const response = await fetchPrivateResponse(path, init);
  const data = await readPrivateBody(response, epoch, true);
  if (epoch !== generation) throw new Error('Session changed');
  if (!response.ok) {
    accessLost(response);
    throw new Error(data.error || 'Private workspace service unavailable');
  }
  return data;
}
const jsonRequest = (data: any) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
export const apiService = {
  async analyzeJob(
    rawDescription: string,
    candidateProfile: CandidateProfile,
    evidenceItems: EvidenceItem[]
  ): Promise<{ parsed: ParsedJob; fit: FitAssessment }> {
    const res = await privateFetch('/api/analyze-job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawDescription, candidateProfile, evidenceItems })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to analyze job');
    }
    return res.json();
  },

  async matchEvidence(
    parsedJob: ParsedJob,
    evidenceItems: EvidenceItem[],
    projects: ProjectItem[],
    skills: SkillItem[]
  ): Promise<{ matches: RequirementMatch[] }> {
    const res = await privateFetch('/api/match-evidence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parsedJob, evidenceItems, projects, skills })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to match evidence');
    }
    return res.json();
  },

  async getGapInterviewQuestions(
    fit: FitAssessment,
    evidenceMatches: RequirementMatch[],
    parsedJob: ParsedJob
  ): Promise<{ questions: GapInterviewQuestion[] }> {
    const res = await privateFetch('/api/gap-interview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fit, evidenceMatches, parsedJob })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to get interview questions');
    }
    return res.json();
  },

  async generatePlan(
    parsedJob: ParsedJob,
    fit: FitAssessment,
    evidenceMatches: RequirementMatch[],
    sessionAnswers?: Record<string, string>
  ): Promise<{ plan: TailoringPlan }> {
    const res = await privateFetch('/api/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parsedJob, fit, evidenceMatches, sessionAnswers })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate tailoring plan');
    }
    return res.json();
  },

  async generateResume(
    parsedJob: ParsedJob,
    tailoringPlan: TailoringPlan,
    candidateProfile: CandidateProfile,
    masterResume: TailoredResume
  ): Promise<{ resume: TailoredResume }> {
    const res = await privateFetch('/api/generate-resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parsedJob, tailoringPlan, candidateProfile, masterResume })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate resume');
    }
    return res.json();
  },

  async generateCoverLetter(
    parsedJob: ParsedJob,
    candidateProfile: CandidateProfile,
    tailoredResume: TailoredResume
  ): Promise<{ coverLetter: TailoredCoverLetter }> {
    const res = await privateFetch('/api/generate-cover-letter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parsedJob, candidateProfile, tailoredResume })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate cover letter');
    }
    return res.json();
  },

  async evaluateResume(
    resume: TailoredResume,
    parsedJob: ParsedJob
  ): Promise<{ evaluation: ResumeEvaluation }> {
    const res = await privateFetch('/api/evaluate-resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume, parsedJob })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to evaluate resume');
    }
    return res.json();
  },

  async regenerateBullet(
    targetRequirement: string,
    underlyingEvidence: string,
    currentText: string,
    employerOrProject: string
  ): Promise<{ bulletText: string; whyThisBullet?: string }> {
    const res = await privateFetch('/api/regenerate-bullet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetRequirement, underlyingEvidence, currentText, employerOrProject })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to regenerate bullet');
    }
    return res.json();
  },

  async fetchJobUrl(url: string): Promise<{ text: string; title?: string; url: string }> {
    const res = await privateFetch('/api/fetch-job-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch job posting from URL');
    }
    return res.json();
  },

  async discoverJobs(
    searchProfile: any,
    customQueries?: string[],
    queryBudget?: number,
    existingJobs?: any[]
  ): Promise<{ discoveredJobs: any[]; refreshedJobs?: any[]; discoveryRequestsUsed?: number; queryBudgetUsed: number; freshnessStats: any }> {
    const res = await privateFetch('/api/discover-jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchProfile, customQueries, queryBudget, existingJobs })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Job discovery failed');
    }
    return res.json();
  },

  async verifyAts(
    url: string,
    provider?: string,
    board?: string,
    jobId?: string
  ): Promise<any> {
    const res = await privateFetch('/api/verify-ats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, provider, board, jobId })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'ATS verification failed');
    }
    return res.json();
  },

  async generateProofPack(
    tailoredResume: any,
    candidateEvidence: any[],
    parsedJob: any
  ): Promise<{ proofPack: any }> {
    const res = await privateFetch('/api/generate-proof-pack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tailoredResume, candidateEvidence, parsedJob })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate interview proof pack');
    }
    return res.json();
  },

  async generateOutreach(
    parsedJob: any,
    candidateProfile: any,
    tailoredResume?: any
  ): Promise<{ outreach: any }> {
    const res = await privateFetch('/api/generate-outreach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parsedJob, candidateProfile, tailoredResume })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate outreach');
    }
    return res.json();
  },

  async generateAnswers(
    questions: string[],
    parsedJob: any,
    candidateEvidence: any[]
  ): Promise<{ answers: any[] }> {
    const res = await privateFetch('/api/generate-answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions, parsedJob, candidateEvidence })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate application answers');
    }
    return res.json();
  },

  async generateReferral(
    contactName: string,
    relationship: string,
    company: string,
    roleTitle: string,
    jobUrl: string
  ): Promise<{ referralMessage: string }> {
    const res = await privateFetch('/api/generate-referral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactName, relationship, company, roleTitle, jobUrl })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate referral request');
    }
    return res.json();
  },

  async login(): Promise<void> {
    const data = await workspaceRequest('/api/auth/sign-in/social', jsonRequest({ provider: 'google', callbackURL: window.location.origin + '/?workspace=private' }));
    if (!data.url) throw new Error('Google sign-in is unavailable');
    window.location.assign(data.url);
  },
  async logout(): Promise<void> { await workspaceRequest('/api/auth/sign-out', jsonRequest({})); },
  async getSession(): Promise<any> { return workspaceRequest('/api/auth/session'); },
  async getWorkspaceData(): Promise<any> { return workspaceRequest('/api/workspace/data'); },
  async saveWorkspaceData(data: any, revision: number): Promise<any> { return workspaceRequest('/api/workspace/data', jsonRequest({ data, revision })); },
  async importWorkspace(data: any, revision: number): Promise<any> { return workspaceRequest('/api/workspace/import', jsonRequest({ data, revision })); },
  async exportWorkspace(): Promise<any> { return workspaceRequest('/api/workspace/export'); }
};

export async function signOutPrivateWorkspace(clearClient: () => void): Promise<void> {
  clearClient();
  // Cross-tab notification is best effort; browser storage cannot prevent
  // durable server revocation or its retry.
  try { localStorage.setItem('caos_logout_event', String(Date.now())); } catch {}
  await apiService.logout();
}
