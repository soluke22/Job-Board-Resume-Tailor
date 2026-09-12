import type { AssessmentMetadata, Requirement, Extraction } from './assessment';
export type PrimaryRoleFamily =
  | 'frontend-product'
  | 'ui-platform-design-systems'
  | 'frontend-heavy-fullstack'
  | 'production-support-frontend'
  | 'forward-deployed-software';

export type RoleFamily =
  | PrimaryRoleFamily
  | 'frontend-product-engineer'
  | 'internal-tools-fullstack-frontend';

export type RoleModifier =
  | 'AI_PRODUCT'
  | 'MEDIA'
  | 'SPORTS'
  | 'ACCESSIBILITY'
  | 'INTERNAL_TOOLS'
  | 'DEVELOPER_TOOLING'
  | 'DESIGN_SYSTEMS'
  | 'PRODUCTION_SUPPORT'
  | 'B2B_SAAS'
  | 'CUSTOMER_FACING'
  | 'DATA_VISUALIZATION'
  | 'EARLY_STAGE'
  | 'ENTERPRISE';

export type AtsProvider =
  | 'ashby'
  | 'greenhouse'
  | 'lever'
  | 'workday'
  | 'smartrecruiters'
  | 'recruitee'
  | 'company-careers'
  | 'custom'
  | 'unknown';

export type AtsVerificationStatus =
  | 'LISTED'
  | 'NOT_LISTED'
  | 'UNLISTED'
  | 'UNKNOWN'
  | 'UNSUPPORTED';

export type FreshnessBand = 'NEW' | 'RECENT' | 'ESTABLISHED' | 'OLD' | 'UNKNOWN';

export type Verdict = 'Apply' | 'Borderline' | 'Skip';

export type ApplicationPriority =
  | 'UNASSESSED'
  | 'APPLY FIRST'
  | 'STRONG'
  | 'STRONG WITH GAP'
  | 'CALIBRATED STRETCH'
  | 'LOW PRIORITY'
  | 'SKIP'
  | 'High'
  | 'Medium'
  | 'Low'
  | 'Do Not Apply';

export type ApplicationStatus =
  | 'DISCOVERED'
  | 'SHORTLISTED'
  | 'TAILORED'
  | 'APPLIED'
  | 'RECRUITER_SCREEN'
  | 'HIRING_MANAGER'
  | 'TECHNICAL'
  | 'FINAL_ONSITE'
  | 'OFFER'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'ARCHIVED';

export type WorkspaceMode = 'PUBLIC_DEMO' | 'PRIVATE_WORKSPACE';

export interface AuthSession {
  isAuthenticated: boolean;
  userEmail: string | null;
  userName?: string | null;
  isOwner: boolean;
  mode: WorkspaceMode;
  token?: string | null;
}

export interface SearchProfile {
  preferredRoleFamilies: PrimaryRoleFamily[];
  preferredModifiers: RoleModifier[];
  excludedRolePatterns: string[];
  targetSeniority: string[];
  allowedEmploymentTypes: string[];
  excludedEmploymentTypes: string[];
  remotePreference: 'remote_only' | 'hybrid_flexible' | 'any';
  hybridLocations: string[];
  maximumOnsiteFrequency: string;
  relocationAllowed: boolean;
  clearancePolicy: 'exclude_clearance' | 'open_to_clearance';
  salaryPreference: {
    minTarget?: number;
    minimumAcceptable?: number;
  };
  hiringProcessPreferences: {
    dislikeAiInterviewers?: boolean;
    preferTakeHome?: boolean;
    dislikeLeetcode?: boolean;
    dislikeMultiRoundTakehome?: boolean;
    notes?: string;
  };
  companyExclusions: string[];
  technologyStrengths: string[];
  technologyAdjacencies: string[];
  technologyGaps: string[];
}

export type EvidenceStrength = 'Strong' | 'Moderate' | 'Weak' | 'Missing';

export type VerificationStatus =
  | 'requires-review'
  | 'verified'
  | 'provisional'
  | 'session-unreviewed'
  | 'unverified'
  | 'manual-edit-unvalidated'
  | 'rejected';

export type EvidenceSourceType =
  | 'disney-work-record'
  | 'jira-archive'
  | 'personal-project'
  | 'hackathon'
  | 'session-interview'
  | 'manual-entry'
  | 'document-import'
  | 'user-interview';

export interface CandidateLink {
  label: string;
  url: string;
}

export interface CandidateProfile {
  name: string;
  fullName?: string;
  preferredName?: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  links: CandidateLink[];
  coreIdentity: string;
  masterSummary: string;
  safeVerbs: string[];
  restrictedVerbs: string[];
  workAuthorization?: string;
  targetRoleFamilies?: RoleFamily[];
  targetSeniority?: string[];
  locationPreferences?: string[];
  dealbreakers?: string[];
}

export type SkillCategory =
  | 'Languages'
  | 'Frameworks & Libraries'
  | 'Architecture & Web Systems'
  | 'Developer Tools & Workflow';

export interface EvidenceItem {
  id: string;
  sourceType: EvidenceSourceType;
  sourceLocation: string;
  verificationStatus: VerificationStatus;
  employer?: string;
  role?: string;
  period?: string;
  context: 'Full-time' | 'Internship' | 'Contract' | 'Research' | 'Personal' | string;
  rawEvidence: string;
  technologies: string[];
  responsibilities: string[];
  outcomes: string[];
  supportedVerbs: string[];
  supportedMetrics: string[];
  strength: 'High' | 'Medium' | 'Foundational' | 'Strong' | 'Weak' | 'Moderate';
  roleFamilyRelevance: RoleFamily[];
  source: string;
  notes?: string;
  enabled: boolean;
  requiresUserReview?: boolean;
  lastVerifiedAt?: string;
  isSessionEvidence?: boolean;
}

export interface ProjectItem {
  id: string;
  name: string;
  purpose: string;
  period: string;
  technologies: string[];
  solomonContribution: string;
  leadershipEvidence: string;
  implementationEvidence: string;
  outcomes: string[];
  supportedMetrics: string[];
  roleFamilyRelevance: RoleFamily[];
  bullets: string[];
  enabled: boolean;
}

export interface SkillItem {
  id: string;
  name: string;
  category: SkillCategory;
  professionalEvidence: string;
  projectEvidence: string;
  confidence: 'Expert' | 'Proficient' | 'Familiar';
  isCore: boolean;
  roleFamilies?: RoleFamily[];
  roleFamilyRelevance?: RoleFamily[];
  enabled: boolean;
}

export interface ParsedJob {
  company: string;
  roleTitle: string;
  seniority: string;
  employmentType: string;
  locationExpectations: string;
  coreResponsibilities: string[];
  hardRequirements: string[];
  preferredRequirements: string[];
  primaryTechnologies: string[];
  productDomainExpectations: string;
  recruiterScreeningSignals: string[];
  classifiedFamily: RoleFamily;
  familyRationale: string;
  roleFamily?: PrimaryRoleFamily;
  technologies?: string[];
}

export interface FitAssessment {
  recommendation?: 'APPLY' | 'SELECTIVE_APPLY' | 'SKIP';
  constraintBlockers?: string[];
  preferenceConcerns?: string[];
  unknownConstraints?: string[];
  whyFits?: string[];
  whyNot?: string[];
  qualificationFit: number; // 0 - 10
  evidenceCoverage: number; // 0 - 10
  applicationPriority: ApplicationPriority;
  initialFitScore: number; // legacy backwards compat
  tailoredFitScore: number; // legacy backwards compat
  verdict: Verdict; // Apply, Borderline, Skip
  verdictReason: string;
  strongestMatch: string;
  biggestActualGap: string;
  blockers: string[];
  unsupportedRequirements: string[];
  canTailor: boolean;
  rejectionNotice?: string;
}

export interface RequirementMatch {
  relationship?: 'direct' | 'adjacent' | 'none';
  id: string;
  requirement: string;
  isHardRequirement: boolean;
  candidateEvidence: string;
  strength: EvidenceStrength;
  gap: string;
  matchedEvidenceId?: string;
  supportingEvidenceIds?: string[];
  supportingSkillIds?: string[];
  supportingProjectIds?: string[];
  concern?: string;
}

export interface GapInterviewQuestion {
  id: string;
  requirement: string;
  question: string;
  contextRationale: string;
  answer?: string;
  savedToEvidenceBank?: boolean;
}

export interface TailoringPlan {
  decisions?: { targetRequirementId: string; evidenceIds: string[]; action: 'keep' | 'rewrite' | 'omit' | 'reorder'; reason: string }[];
  professionalSummaryAngle: string;
  disneyBulletsPlan: {
    evidenceId: string;
    targetSignal: string;
    action: 'keep' | 'rewrite' | 'swap';
    plannedAngle: string;
  }[];
  projectSelection: {
    projectId: string;
    bulletCount: number;
    rationale: string;
  }[];
  skillsOrdering: {
    category: string;
    skills: string[];
  }[];
  skillsToRemove: string[];
  skillsToBackfill: string[];
  unsupportedClaimsToWithhold: string[];
}

export interface ResumeBullet {
  id: string;
  section: 'experience' | 'project';
  parentId: string; // employer or project ID
  text: string;
  targetRequirement: string;
  evidenceSource: string;
  whyThisBullet: string;
  underlyingEvidence: string;
  supportingEvidenceId?: string;
  supportingProjectId?: string;
  originalMasterText?: string;
  masterText?: string;
  isManualEdit?: boolean;
  provenanceStatus?: VerificationStatus;
  enabled: boolean;
}

export interface ExperienceBlock {
  id: string;
  employer: string;
  title: string;
  period: string;
  location: string;
  bullets: ResumeBullet[];
}

export interface ProjectBlock {
  id: string;
  name: string;
  period: string;
  technologies: string[];
  bullets: ResumeBullet[];
}

export interface EducationBlock {
  institution: string;
  degree: string;
  period: string;
  location: string;
  details?: string;
}

export interface PageEstimate {
  isOnePage: boolean;
  estimatedLines: number;
  overflowRisk: 'low' | 'moderate' | 'high';
  trimSuggestions: string[];
}

export interface TailoredResume {
  claimLedger?: import('./provenance').ResumeClaim[];
  basis?: import('./provenance').ResumeBasis;
  readiness?: import('./provenance').ResumeReadiness;
  readinessIssues?: string[];
  id: string;
  jobId: string;
  roleFamily: RoleFamily;
  header: {
    name: string;
    title: string;
    email: string;
    phone: string;
    location: string;
    links: CandidateLink[];
  };
  professionalSummary: string;
  skills: {
    category: string;
    skills: string[];
  }[];
  experience: ExperienceBlock[];
  projects: ProjectBlock[];
  education: EducationBlock[];
  pageEstimate: PageEstimate;
}

export interface TailoredCoverLetter {
  id: string;
  jobId: string;
  date: string;
  recipientName: string;
  companyName: string;
  roleTitle: string;
  paragraphs: string[];
  signOff: string;
  evidenceThemesUsed: string[];
}

export interface EvalFlag {
  id: string;
  type: 'JD MISS' | 'VALUE' | 'LONG' | 'VERB' | 'SUMMARY' | 'SKILL' | 'CLAIM' | 'FAMILY' | 'IMPACT' | 'DASH' | 'EM_DASH';
  code?: 'JD MISS' | 'VALUE' | 'LONG' | 'VERB' | 'SUMMARY' | 'SKILL' | 'CLAIM' | 'FAMILY' | 'IMPACT' | 'DASH' | 'EM_DASH' | string;
  severity: 'critical' | 'warning' | 'info';
  target: string;
  targetId?: string;
  message: string;
  suggestedFix?: string;
  isSafeToAutoFix: boolean;
}

export type EvaluationFlag = EvalFlag;

export interface ResumeEvaluation {
  isReady: boolean;
  overallStatus?: 'PASS' | 'WARN' | 'FAIL';
  summaryPass: boolean;
  skillsPass: boolean;
  claimsPass: boolean;
  roleFamilyPass: boolean;
  checks?: {
    summaryPass?: boolean;
    skillsPass?: boolean;
    claimsPass?: boolean;
    roleFamilyPass?: boolean;
  };
  metricCoverage: {
    metricsCount?: number;
    withMetrics?: number;
    totalBullets: number;
    ratioString?: string;
  };
  flags: EvalFlag[];
}

export interface ResumeVersion {
  versionId: string;
  timestamp: string;
  note: string;
  resume: TailoredResume;
}

export type JobStage =
  | 'Bookmarked'
  | 'Fit Evaluated'
  | 'Tailored'
  | 'Applied'
  | 'Screening'
  | 'Technical'
  | 'Offer'
  | 'Rejected'
  | 'Withdrawn';

export type JobSourceChannel =
  | 'Direct / Company Portal'
  | 'Referral'
  | 'LinkedIn'
  | 'Recruiter Reachout'
  | 'Other';

export interface CompensationDetails {
  min?: number;
  max?: number;
  currency?: string;
  interval?: 'year' | 'hour' | 'month';
  raw?: string;
}

export interface InterviewProofClaim {
  id: string;
  resumeBulletText: string;
  underlyingEvidenceIds: string[];
  technicalContext: string;
  likelyFollowUpQuestion: string;
  defensibleExplanation: string;
  starStory?: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
}

export interface InterviewProofPack {
  jobId: string;
  generatedAt: string;
  claims: InterviewProofClaim[];
  prepNotes: string[];
}

export interface RecruiterOutreach {
  jobId: string;
  company: string;
  roleTitle: string;
  linkedInMessage: string; // concise ~300 chars
  emailSubject: string;
  emailBody: string;
  concreteImpact: string;
  whyCandidateRelevant: string;
  generatedAt: string;
}

export interface ReferralContact {
  id: string;
  contactName: string;
  relationship: string;
  company: string;
  role: string;
  contactSource: string;
  outreachStatus: 'NOT_STARTED' | 'REQUESTED' | 'ACCEPTED' | 'DECLINED';
  referralMessage: string;
  updatedAt: string;
}

export interface ApplicationAnswer {
  id: string;
  question: string;
  answer: string;
  evidenceIds: string[];
  rationale?: string;
}

export interface StatusTransitionEvent {
  from: string;
  to: string;
  timestamp: string;
  note?: string;
}

export interface JobRecord {
  // Canonical identity & ATS
  id: string;
  atsProvider: AtsProvider;
  atsBoard?: string;
  atsJobId?: string;
  company: string;
  title: string;
  canonicalUrl: string;
  applyUrl: string;
  sourceUrl?: string;
  discoveryUrl?: string;
  discoveryTitle?: string;
  discoveryCompany?: string;
  publicationDateSource?: string;
  discoverySummary?: string;
  discoverySourceUrls?: string[];
  discoveryAliases?: string[];
  canonicalContentStatus?: 'AVAILABLE' | 'UNAVAILABLE' | 'UNSUPPORTED';
  canonicalContentSource?: string;
  canonicalMetadata?: unknown;
  assessmentStatus?: 'UNASSESSED' | 'ASSESSED' | 'STALE';
  jdSource?: 'user-provided';
  requirements?: Requirement[];
  assessmentMetadata?: AssessmentMetadata;
  assessmentFacts?: Extraction['facts'];
  description: string;
  location: string;
  secondaryLocations?: string[];
  remoteStatus: 'remote' | 'hybrid' | 'onsite' | 'unknown';
  workplaceType?: string;
  employmentType: 'full-time' | 'contract' | 'part-time' | 'internship' | string;
  compensation?: CompensationDetails;
  department?: string;
  team?: string;

  // Timestamps
  publishedAt?: string;
  updatedAt?: string;
  firstSeenAt: string;
  lastVerifiedAt?: string;

  // Verification & Freshness
  verificationStatus: AtsVerificationStatus;
  isCurrentlyListed: boolean;
  freshnessBand?: FreshnessBand;

  // Discovery provenance
  sourceChannel: string;
  searchQuery?: string;

  // Categorization & Fit
  primaryRoleFamily?: PrimaryRoleFamily;
  roleModifiers: RoleModifier[];
  seniority: 'Junior' | 'Mid' | 'Senior' | 'Staff' | 'Lead' | 'Unspecified' | string;
  hardRequirements: string[];
  preferredRequirements: string[];
  technologies: string[];
  responsibilities: string[];
  hiringSignals: string[];
  hardBlockers: string[];
  softGaps: string[];

  // Scores & Priority
  qualificationFit?: number; // absent until assessed
  evidenceCoverage?: number; // absent until assessed
  applicationPriority: ApplicationPriority;
  priorityReason: string;
  applicationStatus: ApplicationStatus;
  duplicateOf?: string;
  notes?: string;

  // Backwards compat / Resume Studio handoff
  rawDescription?: string;
  dateAdded?: string;
  status?:
    | 'Imported'
    | 'Fit Checked'
    | 'Tailoring Planned'
    | 'Resume Generated'
    | 'Applied'
    | 'Archived'
    | 'Gap Interview Recommended'
    | 'Plan Ready'
    | 'Ready to Plan';
  stage?: JobStage;
  channel?: JobSourceChannel;
  appliedDate?: string;
  rejectionReason?: string;
  parsed?: ParsedJob;
  fit?: FitAssessment;
  evidenceMatches?: RequirementMatch[];
  sessionQuestions?: GapInterviewQuestion[];
  gapQuestions?: GapInterviewQuestion[];
  sessionAnswers?: Record<string, string>;
  tailoringPlan?: TailoringPlan;
  tailoredResume?: TailoredResume;
  tailoredCoverLetter?: TailoredCoverLetter;
  coverLetter?: TailoredCoverLetter;
  evaluation?: ResumeEvaluation;
  versionHistory?: ResumeVersion[];

  // Proof pack & outreach attachments
  proofPack?: InterviewProofPack;
  outreachDrafts?: RecruiterOutreach;
  recruiterOutreach?: RecruiterOutreach;
  referralContact?: ReferralContact;
  applicationAnswers?: ApplicationAnswer[];
  statusHistory?: StatusTransitionEvent[];
}

export interface OutcomeAnalytics {
  totalApplications: number;
  totalScreens: number;
  totalTechnicalInterviews: number;
  totalFinalInterviews: number;
  totalOffers: number;
  totalRejections: number;
  conversionByFamily: Record<string, { total: number; interviews: number; rate: number }>;
  conversionByModifier: Record<string, { total: number; interviews: number; rate: number }>;
  conversionByChannel: Record<string, { total: number; interviews: number; rate: number }>;
  conversionByFitBand: Record<string, { total: number; interviews: number; rate: number }>;
  conversionByFreshness: Record<string, { total: number; interviews: number; rate: number }>;
  smallSampleWarning: boolean;
}

export interface AuditLogEntry {
  id: string;
  eventType:
    | 'EVIDENCE_CONFIRMED'
    | 'EVIDENCE_REJECTED'
    | 'RESUME_GENERATED'
    | 'RESUME_MANUALLY_EDITED'
    | 'APPLICATION_STATUS_CHANGED'
    | 'OUTCOME_LOGGED'
    | 'FILE_IMPORTED'
    | 'FILE_DELETED'
    | 'JOB_DISCOVERED'
    | 'JOB_VERIFIED';
  recordId: string;
  timestamp: string;
  actorId: string;
  summary: string;
}
