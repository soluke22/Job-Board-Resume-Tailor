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
type SafeApiError = { error?: unknown; code?: unknown };
function accessLost(response: Response, data?: SafeApiError) {
  const code = typeof data?.code === 'string' ? data.code : undefined;
  // Provider errors are never authentication verdicts for the private workspace,
  // even if an upstream service accidentally uses an auth-like HTTP status.
  const providerFailure = code?.startsWith('GEMINI_') === true || code?.startsWith('SEARCH_') === true;
  const authLoss = !providerFailure && (response.status === 401 ||
    (response.status === 403 && code === 'AUTH_FORBIDDEN') ||
    code === 'AUTH_UNAVAILABLE');
  if (authLoss && storageService.getAuthSession().isAuthenticated) window.dispatchEvent(new Event('workspace-access-lost'));
  return authLoss;
}
async function fetchPrivateResponse(input: string, init?: RequestInit): Promise<Response> {
  return fetch(input, { credentials: 'same-origin', cache: 'no-store', ...init });
}
async function readPrivateBody(response: Response, json: boolean): Promise<any> {
  return json ? response.json() : response.text();
}
async function privateFetch(input: string, init?: RequestInit): Promise<Response> {
  if (storageService.getWorkspaceMode() !== 'PRIVATE_WORKSPACE' || !storageService.getAuthSession().isAuthenticated) throw new Error('Sign in to the private workspace to use this action. Demo records remain synthetic.');
  const epoch = generation;
  await beforePrivateRequest();
  if (epoch !== generation) throw new Error('Session changed');
  const response = await fetchPrivateResponse(input, init);
  const body = await readPrivateBody(response, false);
  if (epoch !== generation) throw new Error('Session changed');
  let data: SafeApiError | undefined;
  try { data = JSON.parse(body); } catch { /* non-JSON intermediary responses have no auth code */ }
  const authLoss = accessLost(response, data);
  const result = new Response(body, { status: response.status, headers: response.headers });
  const parse = result.json.bind(result);
  result.json = async () => {
    const data = await parse();
    if (!authLoss && epoch !== generation) throw new Error('Session changed');
    return data;
  };
  return result;
}
export async function workspaceRequest(path: string, init?: RequestInit): Promise<any> {
  const epoch = generation;
  const response = await fetchPrivateResponse(path, init);
  const body = await readPrivateBody(response, false);
  if (epoch !== generation) throw new Error('Session changed');
  let data: any;
  try { data = JSON.parse(body); } catch {
    data = undefined;
  }
  if (!response.ok) {
    accessLost(response, data);
    const message = typeof data?.error === 'string' && data.error.trim()
      ? data.error
      : `Private workspace service unavailable (HTTP ${response.status})`;
    throw new Error(message);
  }
  if (data === undefined) throw new Error(`Private workspace returned an invalid response (HTTP ${response.status})`);
  return data;
}
const jsonRequest = (data: any) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

export function privateSignInFailureNotice(search: string): string | null {
  return new URLSearchParams(search).get('workspace') === 'private'
    ? 'Private sign-in was not accepted. Continue with the configured owner Google account.'
    : null;
}

export function clearPrivateSignInIntent(location?: Pick<Location, 'href'>, history?: Pick<History, 'state' | 'replaceState'>): boolean {
  if (!location || !history) return false;
  try {
    const url = new URL(location.href);
    if (url.searchParams.get('workspace') !== 'private') return false;
    url.searchParams.delete('workspace');
    history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
    return true;
  } catch { return false; }
}

export const apiService = {
  async approveEvidence(evidenceId: string, revision: number, contentHash: string): Promise<any> {
    const res = await privateFetch('/api/workspace/evidence-approval', jsonRequest({ evidenceId, revision, contentHash }));
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Evidence approval failed'); }
    return res.json();
  },
  async transitionApplication(request: import('../types/application').TransitionRequest): Promise<any> {
    const res=await privateFetch('/api/workspace/application-transition',jsonRequest(request));
    if(!res.ok){const err=await res.json().catch(()=>({}));throw new Error(err.error || 'Application transition failed');}
    return res.json();
  },
  async analyzeJob(jobId: string): Promise<{ job: import('../types').JobRecord }> {
    const res = await privateFetch('/api/analyze-job', jsonRequest({jobId}));
    if (!res.ok) { const err=await res.json().catch(()=>({})); throw new Error(err.error || 'Assessment failed'); }
    return res.json();
  },
  async matchEvidence(jobId: string): Promise<{ job: import('../types').JobRecord }> {
    return this.analyzeJob(jobId);
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

  async resumeOperation(operation: 'plan' | 'generate' | 'evaluate' | 'validate' | 'regenerate' | 'export', jobId: string, claimId?: string): Promise<any> {
    const paths={plan:'generate-plan',generate:'generate-resume',evaluate:'evaluate-resume',validate:'validate-resume',regenerate:'regenerate-bullet',export:'export-resume'};
    const res=await privateFetch(`/api/${paths[operation]}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jobId,...(claimId?{claimId}:{})})});
    if(!res.ok){const err=await res.json().catch(()=>({}));throw new Error(err.error || 'Resume operation failed');}
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

  async discoverJobs(): Promise<{ discoveredJobs: any[]; refreshedJobs?: any[]; discoverySources?: any[]; sourceResults?: any[]; googleSearches?: {query:string;url:string}[]; discoveryRequestsUsed?: number; queryBudgetUsed: number; freshnessStats: any }> {
    const res = await privateFetch('/api/discover-jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Job discovery failed');
    }
    return res.json();
  },

  async validateDiscoverySource(input: string, company: string): Promise<{source: import('../utils/discovery').DiscoverySource}> {
    const res = await privateFetch('/api/discovery-sources/validate', jsonRequest({ input, company }));
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Discovery source validation failed'); }
    return res.json();
  },

  async importJob(input: {url:string;description?:string;company?:string;title?:string}): Promise<{discoveredJobs:any[];refreshedJobs?:any[]}> {
    const res = await privateFetch('/api/import-job', jsonRequest(input));
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Posting import failed'); }
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

  async generateArtifact(operation:'proof'|'outreach'|'answers'|'referral', jobId:string, context:Record<string,unknown>={}):Promise<any> {
    const path={proof:'generate-proof-pack',outreach:'generate-outreach',answers:'generate-answers',referral:'generate-referral'}[operation];
    const res=await privateFetch(`/api/${path}`,jsonRequest({jobId,...context}));
    if(!res.ok){const data=await res.json();throw new Error(data.error || 'Artifact generation failed');}
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
  clearPrivateSignInIntent(window.location, window.history);
}
