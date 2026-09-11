import {
  CandidateProfile,
  EvidenceItem,
  ProjectItem,
  SkillItem,
  JobRecord,
  TailoredResume,
  SearchProfile,
  OutcomeAnalytics,
  WorkspaceMode,
  AuthSession,
  AuditLogEntry
} from '../types';
import {
  DEMO_CANDIDATE_PROFILE,
  DEMO_EVIDENCE_ITEMS,
  DEMO_PROJECTS,
  DEMO_SKILLS,
  DEMO_MASTER_RESUME,
  DEMO_JOBS,
  DEMO_SEARCH_PROFILE,
  DEMO_OUTCOME_ANALYTICS
} from '../data/syntheticDemoData';
import {
  DEFAULT_PRIVATE_PROFILE,
  DEFAULT_SEARCH_PROFILE,
  DEFAULT_BLANK_MASTER_RESUME
} from '../data/privateSeedTemplate';

const KEYS = {
  MODE: 'caos_workspace_mode',
  SESSION: 'caos_auth_session',
  // Private Workspace storage keys (strictly separated from demo)
  PRIVATE_PROFILE: 'caos_priv_profile',
  PRIVATE_EVIDENCE: 'caos_priv_evidence',
  PRIVATE_PROJECTS: 'caos_priv_projects',
  PRIVATE_SKILLS: 'caos_priv_skills',
  PRIVATE_JOBS: 'caos_priv_jobs',
  PRIVATE_MASTER_RESUME: 'caos_priv_master_resume',
  PRIVATE_SEARCH_PROFILE: 'caos_priv_search_profile',
  PRIVATE_AUDIT_LOG: 'caos_priv_audit_log',
  // Demo Workspace storage keys
  DEMO_PROFILE: 'caos_demo_profile',
  DEMO_EVIDENCE: 'caos_demo_evidence',
  DEMO_PROJECTS: 'caos_demo_projects',
  DEMO_SKILLS: 'caos_demo_skills',
  DEMO_JOBS: 'caos_demo_jobs',
  DEMO_MASTER_RESUME: 'caos_demo_master_resume',
  DEMO_SEARCH_PROFILE: 'caos_demo_search_profile'
};

export const storageService = {
  // Mode management
  getWorkspaceMode(): WorkspaceMode {
    try {
      const mode = localStorage.getItem(KEYS.MODE);
      if (mode === 'PRIVATE_WORKSPACE' || mode === 'PUBLIC_DEMO') {
        return mode;
      }
      return 'PUBLIC_DEMO';
    } catch {
      return 'PUBLIC_DEMO';
    }
  },

  setWorkspaceMode(mode: WorkspaceMode): void {
    try {
      localStorage.setItem(KEYS.MODE, mode);
    } catch (e) {
      console.error('Failed to set workspace mode:', e);
    }
  },

  // Auth Session
  getAuthSession(): AuthSession {
    try {
      const data = localStorage.getItem(KEYS.SESSION);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to get auth session:', e);
    }
    return {
      isAuthenticated: false,
      userEmail: null,
      userName: null,
      isOwner: false,
      mode: 'PUBLIC_DEMO'
    };
  },

  saveAuthSession(session: AuthSession): void {
    try {
      localStorage.setItem(KEYS.SESSION, JSON.stringify(session));
      localStorage.setItem(KEYS.MODE, session.mode);
    } catch (e) {
      console.error('Failed to save auth session:', e);
    }
  },

  clearAuthSession(): void {
    try {
      localStorage.removeItem(KEYS.SESSION);
      localStorage.setItem(KEYS.MODE, 'PUBLIC_DEMO');
    } catch (e) {
      console.error('Failed to clear auth session:', e);
    }
  },

  // Candidate Profile
  getProfile(mode?: WorkspaceMode): CandidateProfile {
    const currentMode = mode || this.getWorkspaceMode();
    const key = currentMode === 'PRIVATE_WORKSPACE' ? KEYS.PRIVATE_PROFILE : KEYS.DEMO_PROFILE;
    const fallback = currentMode === 'PRIVATE_WORKSPACE' ? DEFAULT_PRIVATE_PROFILE : DEMO_CANDIDATE_PROFILE;

    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  },

  saveProfile(profile: CandidateProfile, mode?: WorkspaceMode): void {
    const currentMode = mode || this.getWorkspaceMode();
    const key = currentMode === 'PRIVATE_WORKSPACE' ? KEYS.PRIVATE_PROFILE : KEYS.DEMO_PROFILE;
    localStorage.setItem(key, JSON.stringify(profile));
    this.addAuditLog('RESUME_MANUALLY_EDITED', profile.name, 'Updated candidate profile');
  },

  // Search Profile
  getSearchProfile(mode?: WorkspaceMode): SearchProfile {
    const currentMode = mode || this.getWorkspaceMode();
    const key = currentMode === 'PRIVATE_WORKSPACE' ? KEYS.PRIVATE_SEARCH_PROFILE : KEYS.DEMO_SEARCH_PROFILE;
    const fallback = currentMode === 'PRIVATE_WORKSPACE' ? DEFAULT_SEARCH_PROFILE : DEMO_SEARCH_PROFILE;

    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  },

  saveSearchProfile(profile: SearchProfile, mode?: WorkspaceMode): void {
    const currentMode = mode || this.getWorkspaceMode();
    const key = currentMode === 'PRIVATE_WORKSPACE' ? KEYS.PRIVATE_SEARCH_PROFILE : KEYS.DEMO_SEARCH_PROFILE;
    localStorage.setItem(key, JSON.stringify(profile));
  },

  // Evidence Items
  getEvidence(mode?: WorkspaceMode): EvidenceItem[] {
    const currentMode = mode || this.getWorkspaceMode();
    const key = currentMode === 'PRIVATE_WORKSPACE' ? KEYS.PRIVATE_EVIDENCE : KEYS.DEMO_EVIDENCE;
    const fallback = currentMode === 'PRIVATE_WORKSPACE' ? [] : DEMO_EVIDENCE_ITEMS;

    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  },

  saveEvidence(evidence: EvidenceItem[], mode?: WorkspaceMode): void {
    const currentMode = mode || this.getWorkspaceMode();
    const key = currentMode === 'PRIVATE_WORKSPACE' ? KEYS.PRIVATE_EVIDENCE : KEYS.DEMO_EVIDENCE;
    localStorage.setItem(key, JSON.stringify(evidence));
  },

  // Projects
  getProjects(mode?: WorkspaceMode): ProjectItem[] {
    const currentMode = mode || this.getWorkspaceMode();
    const key = currentMode === 'PRIVATE_WORKSPACE' ? KEYS.PRIVATE_PROJECTS : KEYS.DEMO_PROJECTS;
    const fallback = currentMode === 'PRIVATE_WORKSPACE' ? [] : DEMO_PROJECTS;

    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  },

  saveProjects(projects: ProjectItem[], mode?: WorkspaceMode): void {
    const currentMode = mode || this.getWorkspaceMode();
    const key = currentMode === 'PRIVATE_WORKSPACE' ? KEYS.PRIVATE_PROJECTS : KEYS.DEMO_PROJECTS;
    localStorage.setItem(key, JSON.stringify(projects));
  },

  // Skills
  getSkills(mode?: WorkspaceMode): SkillItem[] {
    const currentMode = mode || this.getWorkspaceMode();
    const key = currentMode === 'PRIVATE_WORKSPACE' ? KEYS.PRIVATE_SKILLS : KEYS.DEMO_SKILLS;
    const fallback = currentMode === 'PRIVATE_WORKSPACE' ? [] : DEMO_SKILLS;

    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  },

  saveSkills(skills: SkillItem[], mode?: WorkspaceMode): void {
    const currentMode = mode || this.getWorkspaceMode();
    const key = currentMode === 'PRIVATE_WORKSPACE' ? KEYS.PRIVATE_SKILLS : KEYS.DEMO_SKILLS;
    localStorage.setItem(key, JSON.stringify(skills));
  },

  // Jobs
  getJobs(mode?: WorkspaceMode): JobRecord[] {
    const currentMode = mode || this.getWorkspaceMode();
    const key = currentMode === 'PRIVATE_WORKSPACE' ? KEYS.PRIVATE_JOBS : KEYS.DEMO_JOBS;
    const fallback = currentMode === 'PRIVATE_WORKSPACE' ? [] : DEMO_JOBS;

    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  },

  saveJobs(jobs: JobRecord[], mode?: WorkspaceMode): void {
    const currentMode = mode || this.getWorkspaceMode();
    const key = currentMode === 'PRIVATE_WORKSPACE' ? KEYS.PRIVATE_JOBS : KEYS.DEMO_JOBS;
    localStorage.setItem(key, JSON.stringify(jobs));
  },

  // Master Resume
  getMasterResume(mode?: WorkspaceMode): TailoredResume {
    const currentMode = mode || this.getWorkspaceMode();
    const key = currentMode === 'PRIVATE_WORKSPACE' ? KEYS.PRIVATE_MASTER_RESUME : KEYS.DEMO_MASTER_RESUME;
    const fallback = currentMode === 'PRIVATE_WORKSPACE' ? DEFAULT_BLANK_MASTER_RESUME : DEMO_MASTER_RESUME;

    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  },

  saveMasterResume(resume: TailoredResume, mode?: WorkspaceMode): void {
    const currentMode = mode || this.getWorkspaceMode();
    const key = currentMode === 'PRIVATE_WORKSPACE' ? KEYS.PRIVATE_MASTER_RESUME : KEYS.DEMO_MASTER_RESUME;
    localStorage.setItem(key, JSON.stringify(resume));
    this.addAuditLog('RESUME_MANUALLY_EDITED', resume.id, 'Updated master resume');
  },

  // Analytics
  getAnalytics(mode?: WorkspaceMode): OutcomeAnalytics {
    const currentMode = mode || this.getWorkspaceMode();
    if (currentMode === 'PUBLIC_DEMO') {
      return DEMO_OUTCOME_ANALYTICS;
    }

    // Compute dynamically from private jobs
    const jobs = this.getJobs('PRIVATE_WORKSPACE');
    const applied = jobs.filter((j) =>
      ['APPLIED', 'RECRUITER_SCREEN', 'HIRING_MANAGER', 'TECHNICAL', 'FINAL_ONSITE', 'OFFER', 'REJECTED'].includes(
        j.applicationStatus
      )
    );
    const screens = jobs.filter((j) =>
      ['RECRUITER_SCREEN', 'HIRING_MANAGER', 'TECHNICAL', 'FINAL_ONSITE', 'OFFER'].includes(j.applicationStatus)
    );
    const technical = jobs.filter((j) =>
      ['TECHNICAL', 'FINAL_ONSITE', 'OFFER'].includes(j.applicationStatus)
    );
    const finals = jobs.filter((j) =>
      ['FINAL_ONSITE', 'OFFER'].includes(j.applicationStatus)
    );
    const offers = jobs.filter((j) => j.applicationStatus === 'OFFER');
    const rejections = jobs.filter((j) => j.applicationStatus === 'REJECTED');

    const conversionByFamily: Record<string, { total: number; interviews: number; rate: number }> = {};
    const conversionByModifier: Record<string, { total: number; interviews: number; rate: number }> = {};
    const conversionByChannel: Record<string, { total: number; interviews: number; rate: number }> = {};
    const conversionByFitBand: Record<string, { total: number; interviews: number; rate: number }> = {};
    const conversionByFreshness: Record<string, { total: number; interviews: number; rate: number }> = {};

    applied.forEach((j) => {
      const family = j.primaryRoleFamily || 'unclassified';
      const hasInterview = ['RECRUITER_SCREEN', 'HIRING_MANAGER', 'TECHNICAL', 'FINAL_ONSITE', 'OFFER'].includes(
        j.applicationStatus
      );

      // By Family
      if (!conversionByFamily[family]) {
        conversionByFamily[family] = { total: 0, interviews: 0, rate: 0 };
      }
      conversionByFamily[family].total += 1;
      if (hasInterview) conversionByFamily[family].interviews += 1;
      conversionByFamily[family].rate =
        conversionByFamily[family].total > 0
          ? Number((conversionByFamily[family].interviews / conversionByFamily[family].total).toFixed(2))
          : 0;

      // By Channel
      const channel = j.sourceChannel || 'Direct';
      if (!conversionByChannel[channel]) {
        conversionByChannel[channel] = { total: 0, interviews: 0, rate: 0 };
      }
      conversionByChannel[channel].total += 1;
      if (hasInterview) conversionByChannel[channel].interviews += 1;
      conversionByChannel[channel].rate =
        conversionByChannel[channel].total > 0
          ? Number((conversionByChannel[channel].interviews / conversionByChannel[channel].total).toFixed(2))
          : 0;

      // By Fit Band
      const fitBand = (j.qualificationFit || 0) >= 9 ? 'APPLY FIRST (9.0+)' : (j.qualificationFit || 0) >= 8 ? 'STRONG (8.0-8.9)' : 'CALIBRATED STRETCH';
      if (!conversionByFitBand[fitBand]) {
        conversionByFitBand[fitBand] = { total: 0, interviews: 0, rate: 0 };
      }
      conversionByFitBand[fitBand].total += 1;
      if (hasInterview) conversionByFitBand[fitBand].interviews += 1;
      conversionByFitBand[fitBand].rate =
        conversionByFitBand[fitBand].total > 0
          ? Number((conversionByFitBand[fitBand].interviews / conversionByFitBand[fitBand].total).toFixed(2))
          : 0;
    });

    return {
      totalApplications: applied.length,
      totalScreens: screens.length,
      totalTechnicalInterviews: technical.length,
      totalFinalInterviews: finals.length,
      totalOffers: offers.length,
      totalRejections: rejections.length,
      conversionByFamily,
      conversionByModifier,
      conversionByChannel,
      conversionByFitBand,
      conversionByFreshness,
      smallSampleWarning: applied.length < 15
    };
  },

  // Audit Logging
  getAuditLog(): AuditLogEntry[] {
    try {
      const data = localStorage.getItem(KEYS.PRIVATE_AUDIT_LOG);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addAuditLog(
    eventType: AuditLogEntry['eventType'],
    recordId: string,
    summary: string,
    actorId = 'owner'
  ): void {
    try {
      const logs = this.getAuditLog();
      const entry: AuditLogEntry = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        eventType,
        recordId,
        timestamp: new Date().toISOString(),
        actorId,
        summary
      };
      logs.unshift(entry);
      // Keep recent 100 entries
      localStorage.setItem(KEYS.PRIVATE_AUDIT_LOG, JSON.stringify(logs.slice(0, 100)));
    } catch (e) {
      console.error('Failed to log audit event:', e);
    }
  },

  // Export Private Workspace as encrypted or formatted JSON
  exportPrivateWorkspace(): string {
    const data = {
      exportedAt: new Date().toISOString(),
      schemaVersion: '2.0.0',
      owner: 'Solomon Lucas-Thornton',
      profile: this.getProfile('PRIVATE_WORKSPACE'),
      searchProfile: this.getSearchProfile('PRIVATE_WORKSPACE'),
      evidence: this.getEvidence('PRIVATE_WORKSPACE'),
      projects: this.getProjects('PRIVATE_WORKSPACE'),
      skills: this.getSkills('PRIVATE_WORKSPACE'),
      jobs: this.getJobs('PRIVATE_WORKSPACE'),
      masterResume: this.getMasterResume('PRIVATE_WORKSPACE'),
      auditLog: this.getAuditLog()
    };
    return JSON.stringify(data, null, 2);
  },

  // Import workspace data with provenance review
  importWorkspaceData(jsonString: string): { success: boolean; message: string; count?: number } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.profile && !parsed.evidence && !parsed.jobs) {
        return { success: false, message: 'Invalid format: missing required candidate or job keys.' };
      }

      if (parsed.profile) {
        this.saveProfile(parsed.profile, 'PRIVATE_WORKSPACE');
      }
      if (parsed.searchProfile) {
        this.saveSearchProfile(parsed.searchProfile, 'PRIVATE_WORKSPACE');
      }
      if (Array.isArray(parsed.evidence)) {
        // Tag newly imported evidence as imported-unreviewed unless verified
        const normalized = parsed.evidence.map((item: any) => ({
          ...item,
          verificationStatus: item.verificationStatus === 'verified' ? 'verified' : 'session-unreviewed'
        }));
        this.saveEvidence(normalized, 'PRIVATE_WORKSPACE');
      }
      if (Array.isArray(parsed.projects)) {
        this.saveProjects(parsed.projects, 'PRIVATE_WORKSPACE');
      }
      if (Array.isArray(parsed.skills)) {
        this.saveSkills(parsed.skills, 'PRIVATE_WORKSPACE');
      }
      if (Array.isArray(parsed.jobs)) {
        this.saveJobs(parsed.jobs, 'PRIVATE_WORKSPACE');
      }
      if (parsed.masterResume) {
        this.saveMasterResume(parsed.masterResume, 'PRIVATE_WORKSPACE');
      }

      this.addAuditLog('FILE_IMPORTED', 'workspace-backup', 'Imported workspace data JSON backup');
      return { success: true, message: 'Private workspace successfully imported.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to parse JSON backup.' };
    }
  },

  // Reset/Clear Private Workspace
  clearPrivateWorkspace(): void {
    localStorage.removeItem(KEYS.PRIVATE_PROFILE);
    localStorage.removeItem(KEYS.PRIVATE_EVIDENCE);
    localStorage.removeItem(KEYS.PRIVATE_PROJECTS);
    localStorage.removeItem(KEYS.PRIVATE_SKILLS);
    localStorage.removeItem(KEYS.PRIVATE_JOBS);
    localStorage.removeItem(KEYS.PRIVATE_MASTER_RESUME);
    localStorage.removeItem(KEYS.PRIVATE_SEARCH_PROFILE);
    this.addAuditLog('FILE_DELETED', 'all-records', 'Private workspace cleared by owner');
  }
};
