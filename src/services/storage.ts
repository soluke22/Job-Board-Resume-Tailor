import { computeOutcomeAnalytics } from '../utils/outcomeAnalytics';
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
  DEMO_SEARCH_PROFILE
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

const privateMemory = new Map<string, string>();
const publicSession = (): AuthSession => ({ isAuthenticated: false, userEmail: null, isOwner: false, mode: 'PUBLIC_DEMO' });
let currentMode: WorkspaceMode = 'PUBLIC_DEMO';
let currentSession = publicSession();
export const PRIVATE_FIELDS = {
  profile: KEYS.PRIVATE_PROFILE, searchProfile: KEYS.PRIVATE_SEARCH_PROFILE, evidence: KEYS.PRIVATE_EVIDENCE,
  projects: KEYS.PRIVATE_PROJECTS, skills: KEYS.PRIVATE_SKILLS, jobs: KEYS.PRIVATE_JOBS,
  masterResume: KEYS.PRIVATE_MASTER_RESUME, auditLog: KEYS.PRIVATE_AUDIT_LOG
};
const cache = {
  getItem(key: string) { return key.startsWith('caos_priv_') ? privateMemory.get(key) ?? null : localStorage.getItem(key); },
  setItem(key: string, value: string) { if (key.startsWith('caos_priv_')) privateMemory.set(key, value); else localStorage.setItem(key, value); },
  removeItem(key: string) { if (key.startsWith('caos_priv_')) privateMemory.delete(key); else localStorage.removeItem(key); }
};
export const storageService = {
  getWorkspaceMode(): WorkspaceMode { return currentMode; },
  setWorkspaceMode(mode: WorkspaceMode): void { currentMode = mode; },
  getAuthSession(): AuthSession { return currentSession; },
  saveAuthSession(session: AuthSession): void { currentSession = session; currentMode = session.mode; },
  clearAuthSession(): void { privateMemory.clear(); currentMode = 'PUBLIC_DEMO'; currentSession = publicSession(); },
  hydratePrivateWorkspace(data: any): void {
    privateMemory.clear();
    for (const [field, key] of Object.entries(PRIVATE_FIELDS)) {
      if (data?.[field] != null) privateMemory.set(key, JSON.stringify(data[field]));
    }
  },
  privateSnapshot(): any {
    return { profile: this.getProfile('PRIVATE_WORKSPACE'), searchProfile: this.getSearchProfile('PRIVATE_WORKSPACE'), evidence: this.getEvidence('PRIVATE_WORKSPACE'), projects: this.getProjects('PRIVATE_WORKSPACE'), skills: this.getSkills('PRIVATE_WORKSPACE'), jobs: this.getJobs('PRIVATE_WORKSPACE'), masterResume: this.getMasterResume('PRIVATE_WORKSPACE') };
  },
  clearPrivateCache(): void { privateMemory.clear(); },
  resetPublicDemo(): void {
    if (currentMode !== 'PUBLIC_DEMO') throw new Error('Switch to Public Demo before resetting it.');
    const demoKeys: string[] = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key?.startsWith('caos_demo_')) demoKeys.push(key);
    }
    for (const key of demoKeys) localStorage.removeItem(key);
  },

  // Candidate Profile
  getProfile(mode?: WorkspaceMode): CandidateProfile {
    const currentMode = mode || this.getWorkspaceMode();
    const key = currentMode === 'PRIVATE_WORKSPACE' ? KEYS.PRIVATE_PROFILE : KEYS.DEMO_PROFILE;
    const fallback = currentMode === 'PRIVATE_WORKSPACE' ? DEFAULT_PRIVATE_PROFILE : DEMO_CANDIDATE_PROFILE;

    try {
      const data = cache.getItem(key);
      return data ? JSON.parse(data) : structuredClone(fallback);
    } catch {
      return structuredClone(fallback);
    }
  },

  saveProfile(profile: CandidateProfile, mode?: WorkspaceMode): void {
    const currentMode = mode || this.getWorkspaceMode();
    const key = currentMode === 'PRIVATE_WORKSPACE' ? KEYS.PRIVATE_PROFILE : KEYS.DEMO_PROFILE;
    cache.setItem(key, JSON.stringify(profile));
    this.addAuditLog('RESUME_MANUALLY_EDITED', profile.name, 'Updated candidate profile');
  },

  // Search Profile
  getSearchProfile(mode?: WorkspaceMode): SearchProfile {
    const currentMode = mode || this.getWorkspaceMode();
    const key = currentMode === 'PRIVATE_WORKSPACE' ? KEYS.PRIVATE_SEARCH_PROFILE : KEYS.DEMO_SEARCH_PROFILE;
    const fallback = currentMode === 'PRIVATE_WORKSPACE' ? DEFAULT_SEARCH_PROFILE : DEMO_SEARCH_PROFILE;

    try {
      const data = cache.getItem(key);
      return data ? JSON.parse(data) : structuredClone(fallback);
    } catch {
      return structuredClone(fallback);
    }
  },

  saveSearchProfile(profile: SearchProfile, mode?: WorkspaceMode): void {
    const currentMode = mode || this.getWorkspaceMode();
    const key = currentMode === 'PRIVATE_WORKSPACE' ? KEYS.PRIVATE_SEARCH_PROFILE : KEYS.DEMO_SEARCH_PROFILE;
    cache.setItem(key, JSON.stringify(profile));
  },

  // Evidence Items
  getEvidence(mode?: WorkspaceMode): EvidenceItem[] {
    const currentMode = mode || this.getWorkspaceMode();
    const key = currentMode === 'PRIVATE_WORKSPACE' ? KEYS.PRIVATE_EVIDENCE : KEYS.DEMO_EVIDENCE;
    const fallback = currentMode === 'PRIVATE_WORKSPACE' ? [] : DEMO_EVIDENCE_ITEMS;

    try {
      const data = cache.getItem(key);
      return data ? JSON.parse(data) : structuredClone(fallback);
    } catch {
      return structuredClone(fallback);
    }
  },

  saveEvidence(evidence: EvidenceItem[], mode?: WorkspaceMode): void {
    const currentMode = mode || this.getWorkspaceMode();
    const key = currentMode === 'PRIVATE_WORKSPACE' ? KEYS.PRIVATE_EVIDENCE : KEYS.DEMO_EVIDENCE;
    cache.setItem(key, JSON.stringify(evidence));
  },

  // Projects
  getProjects(mode?: WorkspaceMode): ProjectItem[] {
    const currentMode = mode || this.getWorkspaceMode();
    const key = currentMode === 'PRIVATE_WORKSPACE' ? KEYS.PRIVATE_PROJECTS : KEYS.DEMO_PROJECTS;
    const fallback = currentMode === 'PRIVATE_WORKSPACE' ? [] : DEMO_PROJECTS;

    try {
      const data = cache.getItem(key);
      return data ? JSON.parse(data) : structuredClone(fallback);
    } catch {
      return structuredClone(fallback);
    }
  },

  saveProjects(projects: ProjectItem[], mode?: WorkspaceMode): void {
    const currentMode = mode || this.getWorkspaceMode();
    const key = currentMode === 'PRIVATE_WORKSPACE' ? KEYS.PRIVATE_PROJECTS : KEYS.DEMO_PROJECTS;
    cache.setItem(key, JSON.stringify(projects));
  },

  // Skills
  getSkills(mode?: WorkspaceMode): SkillItem[] {
    const currentMode = mode || this.getWorkspaceMode();
    const key = currentMode === 'PRIVATE_WORKSPACE' ? KEYS.PRIVATE_SKILLS : KEYS.DEMO_SKILLS;
    const fallback = currentMode === 'PRIVATE_WORKSPACE' ? [] : DEMO_SKILLS;

    try {
      const data = cache.getItem(key);
      return data ? JSON.parse(data) : structuredClone(fallback);
    } catch {
      return structuredClone(fallback);
    }
  },

  saveSkills(skills: SkillItem[], mode?: WorkspaceMode): void {
    const currentMode = mode || this.getWorkspaceMode();
    const key = currentMode === 'PRIVATE_WORKSPACE' ? KEYS.PRIVATE_SKILLS : KEYS.DEMO_SKILLS;
    cache.setItem(key, JSON.stringify(skills));
  },

  // Jobs
  getJobs(mode?: WorkspaceMode): JobRecord[] {
    const currentMode = mode || this.getWorkspaceMode();
    const key = currentMode === 'PRIVATE_WORKSPACE' ? KEYS.PRIVATE_JOBS : KEYS.DEMO_JOBS;
    const fallback = currentMode === 'PRIVATE_WORKSPACE' ? [] : DEMO_JOBS;

    try {
      const data = cache.getItem(key);
      return data ? JSON.parse(data) : structuredClone(fallback);
    } catch {
      return structuredClone(fallback);
    }
  },

  saveJobs(jobs: JobRecord[], mode?: WorkspaceMode): void {
    const currentMode = mode || this.getWorkspaceMode();
    const key = currentMode === 'PRIVATE_WORKSPACE' ? KEYS.PRIVATE_JOBS : KEYS.DEMO_JOBS;
    cache.setItem(key, JSON.stringify(jobs));
  },

  // Master Resume
  getMasterResume(mode?: WorkspaceMode): TailoredResume {
    const currentMode = mode || this.getWorkspaceMode();
    const key = currentMode === 'PRIVATE_WORKSPACE' ? KEYS.PRIVATE_MASTER_RESUME : KEYS.DEMO_MASTER_RESUME;
    const fallback = currentMode === 'PRIVATE_WORKSPACE' ? DEFAULT_BLANK_MASTER_RESUME : DEMO_MASTER_RESUME;

    try {
      const data = cache.getItem(key);
      return data ? JSON.parse(data) : structuredClone(fallback);
    } catch {
      return structuredClone(fallback);
    }
  },

  saveMasterResume(resume: TailoredResume, mode?: WorkspaceMode): void {
    const currentMode = mode || this.getWorkspaceMode();
    const key = currentMode === 'PRIVATE_WORKSPACE' ? KEYS.PRIVATE_MASTER_RESUME : KEYS.DEMO_MASTER_RESUME;
    cache.setItem(key, JSON.stringify(resume));
    this.addAuditLog('RESUME_MANUALLY_EDITED', resume.id, 'Updated master resume');
  },

  // Analytics
  getAnalytics(mode?: WorkspaceMode): OutcomeAnalytics {
    return computeOutcomeAnalytics(this.getJobs(mode || this.getWorkspaceMode()));
  },

  // Audit Logging
  getAuditLog(): AuditLogEntry[] {
    try {
      const data = cache.getItem(KEYS.PRIVATE_AUDIT_LOG);
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
      cache.setItem(KEYS.PRIVATE_AUDIT_LOG, JSON.stringify(logs.slice(0, 100)));
    } catch (e) {
      console.error('Failed to log audit event:');
    }
  },

  // In-memory serialization; authenticated export uses the server endpoint.
  exportPrivateWorkspace(): string {
    const data = {
      exportedAt: new Date().toISOString(),
      schemaVersion: '2.0.0',
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

  // Reset/Clear Private Workspace
  clearPrivateWorkspace(): void {
    cache.removeItem(KEYS.PRIVATE_PROFILE);
    cache.removeItem(KEYS.PRIVATE_EVIDENCE);
    cache.removeItem(KEYS.PRIVATE_PROJECTS);
    cache.removeItem(KEYS.PRIVATE_SKILLS);
    cache.removeItem(KEYS.PRIVATE_JOBS);
    cache.removeItem(KEYS.PRIVATE_MASTER_RESUME);
    cache.removeItem(KEYS.PRIVATE_SEARCH_PROFILE);
    this.addAuditLog('FILE_DELETED', 'all-records', 'Private workspace cleared by owner');
  }
};
