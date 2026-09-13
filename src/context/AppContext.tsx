import type { ApplicationQuestion } from '../types/artifacts';
import { invalidateJobArtifacts, invalidateEditedArtifacts } from '../utils/artifactReadiness';
import { invalidateEditedResume } from '../utils/resumeReadiness';
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { mergeDiscoveredJobs } from '../utils/jobIdentity';
import {
  CandidateProfile,
  EvidenceItem,
  ProjectItem,
  SkillItem,
  JobRecord,
  TailoredResume,
  TailoredCoverLetter,
  ResumeEvaluation,
  ResumeBullet,
  SearchProfile,
  OutcomeAnalytics,
  WorkspaceMode,
  AuthSession,
  ApplicationStatus,
  InterviewProofPack,
  RecruiterOutreach
} from '../types';
import { storageService } from '../services/storage';
import { apiService, setBeforePrivateRequest, invalidatePrivateRequests, signOutPrivateWorkspace } from '../services/api';

export type AppView =
  | 'dashboard'
  | 'discover'
  | 'pipeline'
  | 'jobs'
  | 'job-detail'
  | 'resume-editor'
  | 'proof-packs'
  | 'outreach'
  | 'master-resume'
  | 'evidence-bank'
  | 'projects'
  | 'skills'
  | 'analytics'
  | 'candidate-setup'
  | 'settings';

interface AppContextType {
  // Views & Mode
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  workspaceMode: WorkspaceMode;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  authSession: AuthSession;
  login: () => Promise<boolean>;
  workspaceEpoch: number;
  syncStatus: string;
  sessionLoading: boolean;
  logout: () => Promise<boolean>;
  signOutPending: boolean;

  // Data Models
  profile: CandidateProfile;
  setProfile: (profile: CandidateProfile) => void;
  searchProfile: SearchProfile;
  updateSearchProfile: (profile: SearchProfile) => void;
  evidence: EvidenceItem[];
  projects: ProjectItem[];
  skills: SkillItem[];
  jobs: JobRecord[];
  activeJobId: string | null;
  activeJob: JobRecord | null;
  masterResume: TailoredResume;
  analytics: OutcomeAnalytics;

  // Status & Progress
  isAnalyzing: boolean;
  isGenerating: boolean;
  isDiscovering: boolean;
  error: string | null;
  clearError: () => void;

  // Navigation / Selection
  setActiveJobId: (id: string | null) => void;
  openJobDetail: (id: string) => void;
  openResumeEditor: (id: string) => void;

  // Discovery & Job Pipeline
  discoverJobs: (queryBudget?: number) => Promise<void>;
  verifyAtsStatus: (jobId: string) => Promise<void>;
  addJob: (
    rawDescription: string,
    sourceUrl?: string,
    company?: string,
    title?: string,
    userProvided?: boolean
  ) => Promise<JobRecord>;
  deleteJob: (id: string) => void;
  updateJob: (job: JobRecord) => void;
  logOutcome: (
    jobId: string,
    status: ApplicationStatus,
    notes?: string,
    rejectionReason?: string
  ) => void;

  // Tailoring Workflow
  analyzeJob: (jobId: string) => Promise<void>;
  matchEvidence: (jobId: string) => Promise<void>;
  submitGapAnswers: (
    jobId: string,
    answers: Record<string, string>,
    saveToEvidenceBank: Record<string, boolean>
  ) => Promise<void>;
  generatePlan: (jobId: string) => Promise<void>;
  generateResume: (jobId: string) => Promise<void>;
  generateCoverLetter: (jobId: string) => Promise<void>;
  evaluateResume: (jobId: string) => Promise<void>;
  prepareResumeExport: (jobId: string) => Promise<TailoredResume>;
  updateResume: (jobId: string, resume: TailoredResume) => void;
  updateCoverLetter: (jobId: string, coverLetter: TailoredCoverLetter) => void;
  regenerateBullet: (
    jobId: string,
    bulletId: string,
    employerOrProject: string,
    currentText: string,
    targetReq: string,
    underlyingEvidence: string
  ) => Promise<void>;

  // Preparation & Outreach
  generateProofPack: (jobId: string) => Promise<void>;
  generateOutreach: (jobId: string, overrideReason?:string) => Promise<void>;
  generateAnswers: (jobId: string, questions: (string|ApplicationQuestion)[]) => Promise<void>;
  generateReferral: (
    jobId: string,
    contactName: string,
    relationship: string,
    overrideReason?: string
  ) => Promise<string>;

  // Dialogs & Modals
  isQuickGrabOpen: boolean;
  setIsQuickGrabOpen: (open: boolean) => void;
  isAtsGuardsOpen: boolean;
  setIsAtsGuardsOpen: (open: boolean) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;

  // Candidate Data Management
  saveMasterResume: (resume: TailoredResume) => void;
  addEvidenceItem: (item: EvidenceItem) => void;
  updateEvidenceItem: (item: EvidenceItem) => void;
  toggleEvidenceItem: (id: string) => void;
  deleteEvidenceItem: (id: string) => void;
  addProjectItem: (project: ProjectItem) => void;
  updateProjectItem: (project: ProjectItem) => void;
  addSkillItem: (skill: SkillItem) => void;
  updateSkillItem: (skill: SkillItem) => void;

  // Workspace Sync & Migration
  importWorkspaceJson: (jsonString: string) => Promise<{ success: boolean; message: string }>;
  exportWorkspaceJson: () => Promise<string>;
  clearWorkspace: () => void;
  resetAllData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [workspaceMode, setWorkspaceModeState] = useState<WorkspaceMode>(storageService.getWorkspaceMode());
  const [authSession, setAuthSession] = useState<AuthSession>(storageService.getAuthSession());

  // Entity states initialized from storage by mode
  const [profile, setProfileState] = useState<CandidateProfile>(() => storageService.getProfile(workspaceMode));
  const [searchProfile, setSearchProfileState] = useState<SearchProfile>(() => storageService.getSearchProfile(workspaceMode));
  const [evidence, setEvidenceState] = useState<EvidenceItem[]>(() => storageService.getEvidence(workspaceMode));
  const [projects, setProjectsState] = useState<ProjectItem[]>(() => storageService.getProjects(workspaceMode));
  const [skills, setSkillsState] = useState<SkillItem[]>(() => storageService.getSkills(workspaceMode));
  const [jobs, setJobsState] = useState<JobRecord[]>(() => storageService.getJobs(workspaceMode));
  const [masterResume, setMasterResumeState] = useState<TailoredResume>(() => storageService.getMasterResume(workspaceMode));
  const [analytics, setAnalyticsState] = useState<OutcomeAnalytics>(() => storageService.getAnalytics(workspaceMode));

  const [activeJobId, setActiveJobId] = useState<string | null>(jobs[0]?.id || null);

  // Modals & UI states
  const [isQuickGrabOpen, setIsQuickGrabOpen] = useState(false);
  const [isAtsGuardsOpen, setIsAtsGuardsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Async task spinners
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const activeJob = jobs.find((j) => j.id === activeJobId) || null;

  // Synchronize state when workspaceMode changes
  const reloadDataForMode = (mode: WorkspaceMode) => {
    setProfileState(storageService.getProfile(mode));
    setSearchProfileState(storageService.getSearchProfile(mode));
    setEvidenceState(storageService.getEvidence(mode));
    setProjectsState(storageService.getProjects(mode));
    setSkillsState(storageService.getSkills(mode));
    const loadedJobs = storageService.getJobs(mode);
    setJobsState(loadedJobs);
    setMasterResumeState(storageService.getMasterResume(mode));
    setAnalyticsState(storageService.getAnalytics(mode));
    setActiveJobId(loadedJobs[0]?.id || null);
  };

  const setWorkspaceMode = (newMode: WorkspaceMode) => {
    if (newMode === 'PRIVATE_WORKSPACE' && !authSession.isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    if (newMode !== storageService.getWorkspaceMode()) { epoch.current++; invalidatePrivateRequests(); setWorkspaceEpoch(v => v + 1); }
    setWorkspaceModeState(newMode);
    storageService.setWorkspaceMode(newMode);
    reloadDataForMode(newMode);
  };

  // Auth actions
  const revision = useRef(0);
  const ready = useRef(false);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const epoch = useRef(0);
  const saved = useRef('');
  const scheduled = useRef('');
  const [workspaceEpoch, setWorkspaceEpoch] = useState(0);
  const [syncStatus, setSyncStatus] = useState('');
  const [sessionLoading, setSessionLoading] = useState(true);
  const [signOutPending, setSignOutPending] = useState(false);

  const clearPrivateView = () => {
    ready.current = false;
    epoch.current++;
    invalidatePrivateRequests();
    storageService.clearAuthSession();
    setAuthSession(storageService.getAuthSession());
    setWorkspaceModeState('PUBLIC_DEMO');
    reloadDataForMode('PUBLIC_DEMO');
    setCurrentView('dashboard');
    setIsAuthModalOpen(false); setIsQuickGrabOpen(false); setIsAtsGuardsOpen(false);
    setWorkspaceEpoch(v => v + 1);
    setSyncStatus('');
    setIsAnalyzing(false); setIsGenerating(false); setIsDiscovering(false);
  };
  const adopt = (result: any) => {
    storageService.hydratePrivateWorkspace(result.data);
    revision.current = result.revision;
    saved.current = scheduled.current = JSON.stringify(storageService.privateSnapshot());
    reloadDataForMode('PRIVATE_WORKSPACE');
  };
  const persistCurrent = (): Promise<void> => {
    if (storageService.getWorkspaceMode() !== 'PRIVATE_WORKSPACE') return Promise.resolve();
    if (!ready.current) return Promise.reject(new Error('Private workspace is not ready. Reload before editing.'));
    const data = storageService.privateSnapshot(), serialized = JSON.stringify(data), started = epoch.current;
    if (serialized === scheduled.current) return queue.current;
    scheduled.current = serialized;
    setSyncStatus('Saving…');
    queue.current = queue.current.then(async () => {
      if (started !== epoch.current) return;
      const result = await apiService.saveWorkspaceData(data, revision.current);
      if (started !== epoch.current) return;
      revision.current = result.revision;
      saved.current = serialized;
      setSyncStatus('Saved privately');
    }).catch(err => {
      if (started === epoch.current) { ready.current = false; setSyncStatus('Not saved — reload required'); setError(err.message); }
      throw err;
    });
    return queue.current;
  };
  useEffect(() => {
    setBeforePrivateRequest(persistCurrent);
    if (workspaceMode === 'PRIVATE_WORKSPACE' && ready.current) void persistCurrent().catch(() => {});
  }, [profile, searchProfile, evidence, projects, skills, jobs, masterResume, workspaceMode]);

  useEffect(() => {
    let cancelled = false;
    const started = epoch.current;
    const restore = async () => {
      try {
        const session = await apiService.getSession();
        if (cancelled || started !== epoch.current) return;
        if (!session.authenticated || !session.isOwner) {
          if (new URLSearchParams(window.location.search).get('workspace') === 'private') setError('Private sign-in was not accepted. Continue with the configured owner Google account.');
          return;
        }
        const result = await apiService.getWorkspaceData();
        if (cancelled || started !== epoch.current) return;
        const identity: AuthSession = { isAuthenticated: true, isOwner: true, userEmail: session.user.email, userName: session.user.name, mode: 'PRIVATE_WORKSPACE' };
        storageService.saveAuthSession(identity); setAuthSession(identity);
        adopt(result); ready.current = true;
        setWorkspaceModeState('PRIVATE_WORKSPACE');
        setCurrentView(result.data?.profile?.name ? 'dashboard' : 'candidate-setup');
        setSyncStatus('Saved privately');
        scheduleExpiry(session.expiresAt);
      } catch (err: any) {
        if (!cancelled && started === epoch.current && new URLSearchParams(window.location.search).get('workspace') === 'private') setError(err.message);
      } finally { if (!cancelled) setSessionLoading(false); }
    };
    void restore();
    const lost = () => { clearPrivateView(); setError('Private access is unavailable or expired. Sign in again.'); };
    let expiryTimer: number | undefined;
    const scheduleExpiry = (expiresAt: string) => {
      window.clearTimeout(expiryTimer);
      const remaining = new Date(expiresAt).getTime() - Date.now();
      if (!Number.isFinite(remaining) || remaining <= 0) { lost(); return; }
      const scheduledEpoch = epoch.current;
      expiryTimer = window.setTimeout(() => { if (scheduledEpoch === epoch.current) lost(); }, remaining);
    };
    let checking = false;
    const checkSession = async () => {
      if (checking || !storageService.getAuthSession().isAuthenticated) return;
      checking = true;
      const checkedEpoch = epoch.current;
      try {
        const session = await apiService.getSession();
        if (checkedEpoch === epoch.current) {
          if (!session.authenticated || !session.isOwner) lost();
          else scheduleExpiry(session.expiresAt);
        }
      } catch {
        if (checkedEpoch === epoch.current) lost();
      } finally { checking = false; }
    };
    const visible = () => { if (document.visibilityState === 'visible') void checkSession(); };
    const timer = window.setInterval(() => void checkSession(), 30_000);
    window.addEventListener('focus', checkSession);
    document.addEventListener('visibilitychange', visible);
    const pagehide = () => { if (storageService.getWorkspaceMode() === 'PRIVATE_WORKSPACE') { document.documentElement.style.visibility = 'hidden'; clearPrivateView(); } };
    const pageshow = (event: PageTransitionEvent) => { if (event.persisted) window.location.reload(); else document.documentElement.style.visibility = ''; };
    const otherTab = (event: StorageEvent) => { if (event.key === 'caos_logout_event') clearPrivateView(); };
    window.addEventListener('workspace-access-lost', lost);
    window.addEventListener('pagehide', pagehide); window.addEventListener('pageshow', pageshow); window.addEventListener('storage', otherTab);
    return () => { cancelled = true; window.clearTimeout(expiryTimer); window.clearInterval(timer); window.removeEventListener('focus', checkSession); document.removeEventListener('visibilitychange', visible); window.removeEventListener('workspace-access-lost', lost); window.removeEventListener('pagehide', pagehide); window.removeEventListener('pageshow', pageshow); window.removeEventListener('storage', otherTab); };
  }, []);
  const login = async (): Promise<boolean> => { await apiService.login(); return true; };
  const logout = async (): Promise<boolean> => {
    // Invalidate client access immediately; server sign-out revokes the durable session.
    setSignOutPending(true);
    try { await signOutPrivateWorkspace(clearPrivateView); setSignOutPending(false); return true; }
    catch (err: any) { setError('Server sign-out could not be confirmed. Retry sign-out before leaving this device. ' + err.message); setIsAuthModalOpen(true); return false; }
  };

  // Profile and data setters with storage persistence
  const setProfile = (newProfile: CandidateProfile) => {
    if(JSON.stringify(newProfile)!==JSON.stringify(profile))setJobs(jobs.map(j=>invalidateJobArtifacts(j,'Profile changed; reload or regenerate before use')));
    setProfileState(newProfile);
    storageService.saveProfile(newProfile, workspaceMode);
  };

  const updateSearchProfile = (newSearchProfile: SearchProfile) => {
    if (JSON.stringify(newSearchProfile) !== JSON.stringify(searchProfile)) setJobs(jobs.map(j=>invalidateJobArtifacts(j.fit?{...j,assessmentStatus:'STALE'}:j,'Assessment source changed; reassess and regenerate before use')));
    setSearchProfileState(newSearchProfile);
    storageService.saveSearchProfile(newSearchProfile, workspaceMode);
  };

  const setEvidence = (newEvidence: EvidenceItem[]) => {
    if (JSON.stringify(newEvidence) !== JSON.stringify(evidence)) setJobs(jobs.map(j=>invalidateJobArtifacts(j.fit?{...j,assessmentStatus:'STALE'}:j,'Assessment source changed; reassess and regenerate before use')));
    setEvidenceState(newEvidence);
    storageService.saveEvidence(newEvidence, workspaceMode);
  };

  const setProjects = (newProjects: ProjectItem[]) => {
    setProjectsState(newProjects);
    storageService.saveProjects(newProjects, workspaceMode);
  };

  const setSkills = (newSkills: SkillItem[]) => {
    setSkillsState(newSkills);
    storageService.saveSkills(newSkills, workspaceMode);
  };

  const setJobs = (newJobs: JobRecord[]) => {
    const previousJobs=storageService.getJobs(workspaceMode);
    newJobs=newJobs.map(job=>{
      const old=previousJobs.find(j=>j.id===job.id);
      if(!old)return job;
      const sourceFields=['description','rawDescription','jdSource','canonicalContentStatus','title','company','verificationStatus','publishedAt','freshnessBand','compensation','assessmentMetadata','assessmentStatus','fit','parsed','requirements','evidenceMatches','tailoredResume'] as const;
      return sourceFields.some(k=>JSON.stringify(old[k])!==JSON.stringify(job[k]))?
        invalidateJobArtifacts(job,'Job, assessment or resume basis changed; regenerate before use'):invalidateEditedArtifacts(old,job);
    });
    setJobsState(newJobs);
    storageService.saveJobs(newJobs, workspaceMode);
    setAnalyticsState(storageService.getAnalytics(workspaceMode));
  };

  const saveMasterResume = (resume: TailoredResume) => {
    if(JSON.stringify(resume)!==JSON.stringify(masterResume))setJobs(jobs.map(j=>invalidateJobArtifacts(j,'Master resume changed; revalidate sources before use')));
    setMasterResumeState(resume);
    storageService.saveMasterResume(resume, workspaceMode);
  };

  const openJobDetail = (id: string) => {
    setActiveJobId(id);
    setCurrentView('job-detail');
  };

  const openResumeEditor = (id: string) => {
    setActiveJobId(id);
    setCurrentView('resume-editor');
  };

  // Job Search & Discovery
  const discoverJobs = async (queryBudget = 3): Promise<void> => {
    setIsDiscovering(true);
    setError(null);
    try {
      const res = await apiService.discoverJobs(searchProfile, undefined, queryBudget, jobs);
      const newDiscovered = res.discoveredJobs || [];

      // Read the latest cache after the await: an in-flight search must not undo
      // application edits or resurrect a history record deleted meanwhile.
      const currentJobs = storageService.getJobs(workspaceMode);
      const retainedRefreshes = (res.refreshedJobs || []).filter(j => currentJobs.some(current => current.id === j.id));
      const merged = mergeDiscoveredJobs(currentJobs, [...retainedRefreshes, ...newDiscovered]);
      setJobs(merged.jobs);
      if (merged.newJobs[0]) setActiveJobId(merged.newJobs[0].id);
    } catch (err: any) {
      console.error('Job discovery failed:', err);
      setError(err.message || 'Job discovery encountered an error');
    } finally {
      setIsDiscovering(false);
    }
  };

  const verifyAtsStatus = async (jobId: string): Promise<void> => {
    const target = jobs.find((j) => j.id === jobId);
    if (!target) return;

    try {
      const url = target.canonicalUrl || target.applyUrl || target.sourceUrl;
      if (!url) return;

      const res = await apiService.verifyAts(url, target.atsProvider, target.atsBoard, target.atsJobId);
      const currentJobs = storageService.getJobs(workspaceMode);
      const current = currentJobs.find(j => j.id === jobId);
      if (!current) return;
      const updated: JobRecord = {
        ...current,
        verificationStatus: res.status || 'UNKNOWN',
        isCurrentlyListed: res.status === 'LISTED',
        lastVerifiedAt: res.lastVerifiedAt || new Date().toISOString(),
        canonicalUrl: res.canonicalUrl || current.canonicalUrl,
        applyUrl: res.applyUrl || current.applyUrl
      };
      setJobs(currentJobs.map(j => j.id === jobId ? updated : j));
    } catch (err: any) {
      console.error('ATS verification error:', err);
    }
  };

  const addJob = async (
    rawDescription: string,
    sourceUrl?: string,
    company?: string,
    title?: string,
    userProvided = true
  ): Promise<JobRecord> => {
    const effectiveUrl = sourceUrl || '';
    const newJob: JobRecord = {
      id: `job-${Date.now()}`,
      atsProvider: 'company-careers',
      company: company || 'Pending Analysis',
      title: title || 'Target Role',
      canonicalUrl: effectiveUrl,
      applyUrl: effectiveUrl,
      sourceUrl,
      rawDescription,
      jdSource: userProvided ? 'user-provided' : undefined,
      description: rawDescription,
      location: '',
      remoteStatus: 'unknown',
      employmentType: '',
      dateAdded: new Date().toISOString().split('T')[0],
      firstSeenAt: new Date().toISOString(),
      verificationStatus: 'UNKNOWN',
      isCurrentlyListed: false,
      freshnessBand: 'UNKNOWN',
      sourceChannel: 'Direct User Input',
      applicationPriority: 'UNASSESSED',
      assessmentStatus: 'UNASSESSED',
      priorityReason: 'User imported target role; not assessed',
      applicationStatus: 'SHORTLISTED',
      status: 'Imported',
      primaryRoleFamily: undefined,
      roleModifiers: [],
      seniority: 'Unspecified',
      hardRequirements: [],
      preferredRequirements: [],
      technologies: [],
      responsibilities: [],
      hiringSignals: [],
      hardBlockers: [],
      softGaps: []
    };

    const updated = [newJob, ...jobs];
    setJobs(updated);
    setActiveJobId(newJob.id);
    setCurrentView('job-detail');
    return newJob;
  };

  const deleteJob = (id: string) => {
    const updated = jobs.filter((j) => j.id !== id);
    setJobs(updated);
    if (activeJobId === id) {
      setActiveJobId(updated[0]?.id || null);
      setCurrentView('pipeline');
    }
  };

  const updateJob = (updatedJob: JobRecord) => {
    const previous = jobs.find(j=>j.id===updatedJob.id);
    if (previous?.fit && ['description','rawDescription','jdSource','canonicalContentStatus','verificationStatus','publishedAt','freshnessBand','compensation'].some(k=>JSON.stringify(previous[k as keyof JobRecord])!==JSON.stringify(updatedJob[k as keyof JobRecord]))) updatedJob = {...updatedJob,assessmentStatus:'STALE'};
    if(previous && ['tailoredResume','description','rawDescription','jdSource','canonicalContentStatus','title','company','assessmentMetadata'].some(k=>JSON.stringify(previous[k as keyof JobRecord])!==JSON.stringify(updatedJob[k as keyof JobRecord])))updatedJob=invalidateJobArtifacts(updatedJob,'Job or resume basis changed; regenerate before use');
    const updated = jobs.map((j) => (j.id === updatedJob.id ? updatedJob : j));
    setJobs(updated);
  };

  const logOutcome = (
    jobId: string,
    status: ApplicationStatus,
    notes?: string,
    rejectionReason?: string
  ) => {
    const target = jobs.find((j) => j.id === jobId);
    if (!target) return;

    const historyEntry = {
      status,
      timestamp: new Date().toISOString(),
      notes
    };

    const updated: JobRecord = {
      ...target,
      applicationStatus: status,
      appliedDate: status === 'APPLIED' ? new Date().toISOString().split('T')[0] : target.appliedDate,
      rejectionReason: rejectionReason || target.rejectionReason,
      statusHistory: [...(target.statusHistory || []), historyEntry]
    };

    updateJob(updated);
    storageService.addAuditLog('OUTCOME_LOGGED', jobId, `Updated status to ${status}${notes ? `: ${notes}` : ''}`);
  };

  // Tailoring Workflow
  const analyzeJob = async (jobId: string) => {
    const target = jobs.find((j) => j.id === jobId);
    if (!target) return;

    setIsAnalyzing(true);
    setError(null);
    try {
      const startedSnapshot = JSON.stringify(storageService.privateSnapshot());
      await apiService.analyzeJob(jobId);
      // Server persisted the assessment; reload its revision before the next local save.
      const result = await apiService.getWorkspaceData();
      if (startedSnapshot !== JSON.stringify(storageService.privateSnapshot())) {
        ready.current = false;
        throw new Error('Local edits occurred during assessment. Reload required before saving; local edits have not been overwritten.');
      }
      adopt(result);
      setActiveJobId(jobId);
    } catch (err: any) {
      console.error('Job analysis failed:', err);
      setError(err.message || 'Job analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const matchEvidence = analyzeJob;

  const submitGapAnswers = async (
    jobId: string,
    answers: Record<string, string>,
    saveToEvidenceBank: Record<string, boolean>
  ) => {
    const target = jobs.find((j) => j.id === jobId);
    if (!target) return;

    // Save selected answers to evidence bank
    const newItems: EvidenceItem[] = [];
    Object.entries(answers).forEach(([qId, ans]) => {
      if (saveToEvidenceBank[qId] && ans.trim()) {
        const q = target.gapQuestions?.find((item) => item.id === qId);
        newItems.push({
          id: `ev-gap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          sourceType: 'manual-entry',
          sourceLocation: 'Gap Interview session',
          context: 'Full-time',
          verificationStatus: 'session-unreviewed',
          rawEvidence: ans,
          technologies: target.parsed?.technologies || [],
          responsibilities: [ans],
          outcomes: [],
          supportedVerbs: ['implemented', 'contributed', 'supported'],
          supportedMetrics: [],
          strength: 'Moderate',
          roleFamilyRelevance: [target.primaryRoleFamily || 'frontend-product'],
          source: `Gap Interview response for ${target.company} (${q?.relatedRequirement || 'General'})`,
          enabled: true,
          lastVerifiedAt: new Date().toISOString()
        });
      }
    });

    if (newItems.length > 0) {
      const updatedEvidence = [...evidence, ...newItems];
      setEvidence(updatedEvidence);
    }

    const updatedJob: JobRecord = {
      ...target,
      sessionAnswers: {
        ...(target.sessionAnswers || {}),
        ...answers
      },
      status: 'Ready to Plan'
    };
    updateJob(updatedJob);
  };

  const runResumeOperation = async (operation: 'plan'|'generate'|'evaluate'|'validate'|'regenerate', jobId:string, claimId?:string) => {
    setIsGenerating(true); setError(null);
    try {
      await persistCurrent();
      const startedSnapshot=JSON.stringify(storageService.privateSnapshot());
      await apiService.resumeOperation(operation,jobId,claimId);
      const result=await apiService.getWorkspaceData();
      if(startedSnapshot!==JSON.stringify(storageService.privateSnapshot())) {
        ready.current=false;
        throw new Error('Local edits occurred during resume operation. Reload required; local edits have not been overwritten.');
      }
      adopt(result); setActiveJobId(jobId);
      if(operation==='generate')setCurrentView('resume-editor');
    }catch(err:any){setError(err.message || 'Resume operation failed');}
    finally{setIsGenerating(false);}
  };
  const generatePlan = (jobId:string) => runResumeOperation('plan',jobId);
  const generateResume = (jobId:string) => runResumeOperation('generate',jobId);
  const generateCoverLetter = async (jobId: string) => {
    const target = jobs.find((j) => j.id === jobId);
    if (!target || !target.parsed || !target.tailoredResume) return;

    setIsGenerating(true);
    setError(null);
    try {
      const { coverLetter } = await apiService.generateCoverLetter(
        target.parsed,
        profile,
        target.tailoredResume
      );
      const updated: JobRecord = {
        ...target,
        coverLetter
      };
      updateJob(updated);
    } catch (err: any) {
      console.error('Cover letter generation failed:', err);
      setError(err.message || 'Cover letter generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const evaluateResume = (jobId:string) => runResumeOperation('validate',jobId);
  const prepareResumeExport = async (jobId:string):Promise<TailoredResume> => {
    await persistCurrent();
    const startedSnapshot=JSON.stringify(storageService.privateSnapshot());
    const exported=await apiService.resumeOperation('export',jobId);
    const result=await apiService.getWorkspaceData();
    if(startedSnapshot!==JSON.stringify(storageService.privateSnapshot())) {
      ready.current=false;
      throw new Error('Local edits occurred during export validation. Reload required; local edits have not been overwritten.');
    }
    adopt(result);
    return exported.resume;
  };
  const updateResume = (jobId: string, resume: TailoredResume) => {
    const target = jobs.find((j) => j.id === jobId);
    if (!target) return;
    updateJob({ ...target, tailoredResume: invalidateEditedResume(target.tailoredResume || resume, structuredClone(resume)), evaluation: undefined });
    storageService.addAuditLog('RESUME_MANUALLY_EDITED', jobId, 'Edited resume in Studio');
  };

  const updateCoverLetter = (jobId: string, coverLetter: TailoredCoverLetter) => {
    const target = jobs.find((j) => j.id === jobId);
    if (!target) return;
    updateJob({ ...target, coverLetter });
  };

  const regenerateBullet = async (jobId:string, bulletId:string, employerOrProject:string, currentText:string, targetReq:string, underlyingEvidence:string) => {
    await runResumeOperation('regenerate',jobId,bulletId);
  };
  // Phase 6 responses are persisted server-side; adopt only if local state stayed unchanged.
  const runArtifactOperation = async (operation:'proof'|'outreach'|'answers'|'referral',jobId:string,context:Record<string,unknown>={}) => {
    setIsGenerating(true);setError(null);
    const startedEpoch=epoch.current;
    try {
      await persistCurrent();
      const before=JSON.stringify(storageService.privateSnapshot());
      const result=await apiService.generateArtifact(operation,jobId,context);
      if(startedEpoch!==epoch.current)return;
      if(before!==JSON.stringify(storageService.privateSnapshot())) {
        ready.current=false;
        throw new Error('Local edits occurred during generation. Reload required; local edits were preserved.');
      }
      adopt(result);setActiveJobId(jobId);
      setCurrentView(operation==='proof'?'proof-packs':'outreach');
      return result.job;
    }catch(err:any){setError(err.message || 'Artifact generation failed');}
    finally{setIsGenerating(false);}
  };
  const generateProofPack = async(jobId:string)=>{await runArtifactOperation('proof',jobId);};
  const generateOutreach = async(jobId:string,overrideReason?:string)=>{await runArtifactOperation('outreach',jobId,overrideReason?.trim()?{overrideReason}:{});};
  const generateAnswers = async(jobId:string,questions:(string|ApplicationQuestion)[])=>{await runArtifactOperation('answers',jobId,{questions});};
  const generateReferral = async(jobId:string,contactName:string,relationship:string,overrideReason?:string):Promise<string>=>{
    const job=await runArtifactOperation('referral',jobId,{contactName,relationship,...(overrideReason?.trim()?{overrideReason}:{})});
    return job?.referralContact?.referralMessage || '';
  };

  // Evidence & Entities
  const addEvidenceItem = (item: EvidenceItem) => {
    const updated = [item, ...evidence];
    setEvidence(updated);
  };

  const updateEvidenceItem = (item: EvidenceItem) => {
    const updated = evidence.map((e) => (e.id === item.id ? item : e));
    setEvidence(updated);
  };

  const toggleEvidenceItem = (id: string) => {
    const updated = evidence.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e));
    setEvidence(updated);
  };

  const deleteEvidenceItem = (id: string) => {
    const updated = evidence.filter((e) => e.id !== id);
    setEvidence(updated);
  };

  const addProjectItem = (project: ProjectItem) => {
    const updated = [project, ...projects];
    setProjects(updated);
  };

  const updateProjectItem = (project: ProjectItem) => {
    const updated = projects.map((p) => (p.id === project.id ? project : p));
    setProjects(updated);
  };

  const addSkillItem = (skill: SkillItem) => {
    const updated = [skill, ...skills];
    setSkills(updated);
  };

  const updateSkillItem = (skill: SkillItem) => {
    const updated = skills.map((s) => (s.id === skill.id ? skill : s));
    setSkills(updated);
  };

  // Workspace Import / Export / Reset
  const importWorkspaceJson = async (jsonString: string) => {
    if (!authSession.isAuthenticated || workspaceMode !== 'PRIVATE_WORKSPACE') return { success: false, message: 'Owner sign-in required.' };
    try {
      const started = epoch.current;
      await persistCurrent();
      if (started !== epoch.current) throw new Error('Session changed');
      const result = await apiService.importWorkspace(JSON.parse(jsonString), revision.current);
      if (started !== epoch.current) throw new Error('Session changed');
      adopt(result);
      setWorkspaceEpoch(v => v + 1);
      return { success: true, message: 'Selected records imported privately and marked for review. Local originals were retained.' };
    } catch (err: any) { return { success: false, message: err.message }; }
  };
  const exportWorkspaceJson = async () => {
    if (!authSession.isAuthenticated || workspaceMode !== 'PRIVATE_WORKSPACE') throw new Error('Owner sign-in required.');
    const started = epoch.current;
    await persistCurrent();
    if (started !== epoch.current) throw new Error('Session changed');
    return JSON.stringify(await apiService.exportWorkspace(), null, 2);
  };

  const clearWorkspace = () => {
    if (!authSession.isAuthenticated || workspaceMode !== 'PRIVATE_WORKSPACE') return;
    storageService.clearPrivateWorkspace();
    reloadDataForMode('PRIVATE_WORKSPACE');
  };

  const resetAllData = () => {
    if (workspaceMode === 'PUBLIC_DEMO') {
      localStorage.removeItem('caos_demo_profile');
      localStorage.removeItem('caos_demo_evidence');
      localStorage.removeItem('caos_demo_projects');
      localStorage.removeItem('caos_demo_skills');
      localStorage.removeItem('caos_demo_jobs');
      localStorage.removeItem('caos_demo_master_resume');
      reloadDataForMode('PUBLIC_DEMO');
    } else {
      clearWorkspace();
    }
  };

  return (
    <AppContext.Provider
      value={{
        workspaceEpoch, syncStatus, sessionLoading,
        currentView,
        setCurrentView,
        workspaceMode,
        setWorkspaceMode,
        authSession,
        login,
        logout,
        signOutPending,
        profile,
        setProfile,
        searchProfile,
        updateSearchProfile,
        evidence,
        projects,
        skills,
        jobs,
        activeJobId,
        activeJob,
        masterResume,
        analytics,
        isAnalyzing,
        isGenerating,
        isDiscovering,
        error,
        clearError,
        setActiveJobId,
        openJobDetail,
        openResumeEditor,
        discoverJobs,
        verifyAtsStatus,
        addJob,
        deleteJob,
        updateJob,
        logOutcome,
        analyzeJob,
        matchEvidence,
        submitGapAnswers,
        generatePlan,
        generateResume,
        generateCoverLetter,
        evaluateResume,
        prepareResumeExport,
        updateResume,
        updateCoverLetter,
        regenerateBullet,
        generateProofPack,
        generateOutreach,
        generateAnswers,
        generateReferral,
        isQuickGrabOpen,
        setIsQuickGrabOpen,
        isAtsGuardsOpen,
        setIsAtsGuardsOpen,
        isAuthModalOpen,
        setIsAuthModalOpen,
        saveMasterResume,
        addEvidenceItem,
        updateEvidenceItem,
        toggleEvidenceItem,
        deleteEvidenceItem,
        addProjectItem,
        updateProjectItem,
        addSkillItem,
        updateSkillItem,
        importWorkspaceJson,
        exportWorkspaceJson,
        clearWorkspace,
        resetAllData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
