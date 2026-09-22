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
  const body = await readPrivateBody(response, epoch, false);
  if (epoch !== generation) throw new Error('Session changed');
  let data: any;
  try { data = JSON.parse(body); } catch {
    if (epoch === generation && storageService.getAuthSession().isAuthenticated) window.dispatchEvent(new Event('workspace-access-lost'));
    data = undefined;
  }
  if (!response.ok) {
    accessLost(response);
    const message = typeof data?.error === 'string' && data.error.trim()
      ? data.error
      : `Private workspace service unavailable (HTTP ${response.status})`;
    throw new Error(message);
  }
  if (data === undefined) throw new Error(`Private workspace returned an invalid response (HTTP ${response.status})`);
  return data;
}
const jsonRequest = (data: any) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
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
}
