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

export const apiService = {
  async analyzeJob(
    rawDescription: string,
    candidateProfile: CandidateProfile,
    evidenceItems: EvidenceItem[]
  ): Promise<{ parsed: ParsedJob; fit: FitAssessment }> {
    const res = await fetch('/api/analyze-job', {
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
    const res = await fetch('/api/match-evidence', {
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
    const res = await fetch('/api/gap-interview', {
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
    const res = await fetch('/api/generate-plan', {
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
    const res = await fetch('/api/generate-resume', {
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
    const res = await fetch('/api/generate-cover-letter', {
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
    const res = await fetch('/api/evaluate-resume', {
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
    const res = await fetch('/api/regenerate-bullet', {
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
    const res = await fetch('/api/fetch-job-url', {
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
  ): Promise<{ discoveredJobs: any[]; queryBudgetUsed: number; freshnessStats: any }> {
    const res = await fetch('/api/discover-jobs', {
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
    const res = await fetch('/api/verify-ats', {
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
    const res = await fetch('/api/generate-proof-pack', {
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
    const res = await fetch('/api/generate-outreach', {
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
    const res = await fetch('/api/generate-answers', {
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
    const res = await fetch('/api/generate-referral', {
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

  async login(email: string, passwordOrToken?: string): Promise<any> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, passwordOrToken })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Authentication failed');
    }
    return res.json();
  },

  async logout(token?: string): Promise<void> {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ token })
    });
  },

  async getSession(token?: string): Promise<any> {
    const res = await fetch('/api/auth/session', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    return res.json();
  },

  async getWorkspaceData(token: string): Promise<any> {
    const res = await fetch('/api/workspace/data', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to load private workspace');
    }
    return res.json();
  },

  async saveWorkspaceData(token: string, data: any): Promise<any> {
    const res = await fetch('/api/workspace/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ data })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to persist private workspace');
    }
    return res.json();
  }
};
