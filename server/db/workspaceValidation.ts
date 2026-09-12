import { z } from 'zod';

// Runtime counterparts of the persisted UI contracts. Unknown optional metadata is
// preserved for forwards compatibility; known fields never bypass shape validation.
const text = z.string().max(200_000);
const id = z.string().min(1).max(200);
const strings = z.array(text).max(5000);
const flag = z.boolean();
const number = z.number().finite();
const object = <T extends z.ZodRawShape>(shape: T) => z.object(shape).loose();
const list = <T extends z.ZodType>(schema: T) => z.array(schema).max(5000);
const links = list(object({ label: text, url: text }));
const review = { requiresUserReview: flag.optional(), importProvenance: object({ source: text, importedAt: text, status: text }).optional() };
export const profileSchema = object({ name: text, title: text, email: text, phone: text, location: text, links,
  coreIdentity: text, masterSummary: text, safeVerbs: strings, restrictedVerbs: strings,
  fullName: text.optional(), preferredName: text.optional(), workAuthorization: text.optional(),
  targetRoleFamilies: strings.optional(), targetSeniority: strings.optional(), locationPreferences: strings.optional(), dealbreakers: strings.optional(), ...review });
export const searchProfileSchema = object({ preferredRoleFamilies: strings, preferredModifiers: strings, excludedRolePatterns: strings,
  targetSeniority: strings, allowedEmploymentTypes: strings, excludedEmploymentTypes: strings,
  remotePreference: z.enum(['remote_only', 'hybrid_flexible', 'any']), hybridLocations: strings, maximumOnsiteFrequency: text,
  relocationAllowed: flag, clearancePolicy: z.enum(['exclude_clearance', 'open_to_clearance']),
  salaryPreference: object({ minTarget: number.optional(), minimumAcceptable: number.optional() }),
  hiringProcessPreferences: object({ dislikeAiInterviewers: flag.optional(), preferTakeHome: flag.optional(), dislikeLeetcode: flag.optional(), dislikeMultiRoundTakehome: flag.optional(), notes: text.optional() }),
  companyExclusions: strings, technologyStrengths: strings, technologyAdjacencies: strings, technologyGaps: strings, ...review });
const verification = z.enum(['verified', 'provisional', 'session-unreviewed', 'unverified', 'manual-edit-unvalidated', 'rejected', 'requires-review']);
export const evidenceSchema = object({ id, sourceType: text, sourceLocation: text, verificationStatus: verification,
  employer: text.optional(), role: text.optional(), period: text.optional(), context: text, rawEvidence: text,
  technologies: strings, responsibilities: strings, outcomes: strings, supportedVerbs: strings, supportedMetrics: strings,
  strength: text, roleFamilyRelevance: strings, source: text, notes: text.optional(), enabled: flag,
  lastVerifiedAt: text.optional(), isSessionEvidence: flag.optional(), ...review });
export const projectSchema = object({ id, name: text, purpose: text, period: text, technologies: strings, solomonContribution: text,
  leadershipEvidence: text, implementationEvidence: text, outcomes: strings, supportedMetrics: strings, roleFamilyRelevance: strings, bullets: strings, enabled: flag, ...review });
export const skillSchema = object({ id, name: text, category: text, professionalEvidence: text, projectEvidence: text,
  confidence: z.enum(['Expert', 'Proficient', 'Familiar']), isCore: flag, roleFamilies: strings.optional(), roleFamilyRelevance: strings.optional(), enabled: flag, ...review });
const bullet = object({ id, section: z.enum(['experience', 'project']), parentId: text, text, targetRequirement: text,
  evidenceSource: text, whyThisBullet: text, underlyingEvidence: text, supportingEvidenceId: text.optional(), supportingProjectId: text.optional(),
  originalMasterText: text.optional(), masterText: text.optional(), isManualEdit: flag.optional(), provenanceStatus: verification.optional(), enabled: flag });
export const experienceSchema = object({ id, employer: text, title: text, period: text, location: text, bullets: list(bullet), ...review });
const resumeProject = object({ id, name: text, period: text, technologies: strings, bullets: list(bullet) });
export const resumeSchema = object({ id, jobId: text, roleFamily: text,
  header: object({ name: text, title: text, email: text, phone: text, location: text, links }), professionalSummary: text,
  skills: list(object({ category: text, skills: strings })), experience: list(experienceSchema), projects: list(resumeProject),
  education: list(object({ institution: text, degree: text, period: text, location: text, details: text.optional() })),
  pageEstimate: object({ isOnePage: flag, estimatedLines: number, overflowRisk: z.enum(['low', 'moderate', 'high']), trimSuggestions: strings }), ...review });
const fit = object({ qualificationFit: number.min(0).max(10), evidenceCoverage: number.min(0).max(10), applicationPriority: text,
  initialFitScore: number, tailoredFitScore: number, verdict: z.enum(['Apply', 'Borderline', 'Skip']), verdictReason: text,
  strongestMatch: text, biggestActualGap: text, blockers: strings, unsupportedRequirements: strings, canTailor: flag, rejectionNotice: text.optional() });
const plan = object({ professionalSummaryAngle: text,
  disneyBulletsPlan: list(object({ evidenceId: text, targetSignal: text, action: z.enum(['keep', 'rewrite', 'swap']), plannedAngle: text })),
  projectSelection: list(object({ projectId: text, bulletCount: number, rationale: text })),
  skillsOrdering: list(object({ category: text, skills: strings })), skillsToRemove: strings, skillsToBackfill: strings, unsupportedClaimsToWithhold: strings });
const letter = object({ id, jobId: text, date: text, recipientName: text, companyName: text, roleTitle: text, paragraphs: strings, signOff: text, evidenceThemesUsed: strings });
const outreach = object({ jobId: text, company: text, roleTitle: text, linkedInMessage: text, emailSubject: text, emailBody: text, concreteImpact: text, whyCandidateRelevant: text, generatedAt: text });
const proof = object({ jobId: text, generatedAt: text, prepNotes: strings, claims: list(object({ id, resumeBulletText: text,
  underlyingEvidenceIds: strings, technicalContext: text, likelyFollowUpQuestion: text, defensibleExplanation: text,
  starStory: object({ situation: text, task: text, action: text, result: text }).optional() })) });
const contact = object({ id, contactName: text, relationship: text, company: text, role: text, contactSource: text,
  outreachStatus: z.enum(['NOT_STARTED', 'REQUESTED', 'ACCEPTED', 'DECLINED']), referralMessage: text, updatedAt: text });
const match = object({ id, requirement: text, isHardRequirement: flag, candidateEvidence: text, strength: text, gap: text,
  matchedEvidenceId: text.optional(), supportingEvidenceIds: strings.optional(), supportingSkillIds: strings.optional(), supportingProjectIds: strings.optional(), concern: text.optional() });
const question = object({ id, requirement: text, question: text, contextRationale: text, answer: text.optional(), savedToEvidenceBank: flag.optional() });
const parsed = object({ company: text, roleTitle: text, seniority: text, employmentType: text, locationExpectations: text,
  coreResponsibilities: strings, hardRequirements: strings, preferredRequirements: strings, primaryTechnologies: strings,
  productDomainExpectations: text, recruiterScreeningSignals: strings, classifiedFamily: text, familyRationale: text, roleFamily: text.optional(), technologies: strings.optional() });
const checks = { summaryPass: flag, skillsPass: flag, claimsPass: flag, roleFamilyPass: flag };
const evaluation = object({ isReady: flag, overallStatus: z.enum(['PASS', 'WARN', 'FAIL']).optional(), ...checks,
  checks: object({ summaryPass: flag.optional(), skillsPass: flag.optional(), claimsPass: flag.optional(), roleFamilyPass: flag.optional() }).optional(),
  metricCoverage: object({ totalBullets: number, metricsCount: number.optional(), withMetrics: number.optional(), ratioString: text.optional() }),
  flags: list(object({ id, type: text, code: text.optional(), severity: z.enum(['critical', 'warning', 'info']), target: text,
    targetId: text.optional(), message: text, suggestedFix: text.optional(), isSafeToAutoFix: flag })) });
export const jobSchema = object({ id, atsProvider: text, atsBoard: text.optional(), atsJobId: text.optional(), company: text, title: text,
  canonicalUrl: text, applyUrl: text, sourceUrl: text.optional(), discoveryUrl: text.optional(), description: text, location: text,
  secondaryLocations: strings.optional(), remoteStatus: z.enum(['remote', 'hybrid', 'onsite', 'unknown']), workplaceType: text.optional(), employmentType: text,
  compensation: object({ min: number.optional(), max: number.optional(), currency: text.optional(), interval: z.enum(['year', 'hour', 'month']).optional(), raw: text.optional() }).optional(),
  department: text.optional(), team: text.optional(), publishedAt: text.optional(), updatedAt: text.optional(), firstSeenAt: text, lastVerifiedAt: text.optional(),
  verificationStatus: text, isCurrentlyListed: flag, freshnessBand: text.optional(), sourceChannel: text, searchQuery: text.optional(),
  primaryRoleFamily: text, roleModifiers: strings, seniority: text, hardRequirements: strings, preferredRequirements: strings,
  technologies: strings, responsibilities: strings, hiringSignals: strings, hardBlockers: strings, softGaps: strings,
  qualificationFit: number, evidenceCoverage: number, applicationPriority: text, priorityReason: text, applicationStatus: text,
  duplicateOf: text.optional(), notes: text.optional(), rawDescription: text.optional(), dateAdded: text.optional(), status: text.optional(), stage: text.optional(),
  channel: text.optional(), appliedDate: text.optional(), rejectionReason: text.optional(), parsed: parsed.optional(), fit: fit.optional(),
  evidenceMatches: list(match).optional(), sessionQuestions: list(question).optional(), gapQuestions: list(question).optional(), sessionAnswers: z.record(z.string(), text).optional(),
  tailoringPlan: plan.optional(), tailoredResume: resumeSchema.optional(), tailoredCoverLetter: letter.optional(), coverLetter: letter.optional(), evaluation: evaluation.optional(),
  versionHistory: list(object({ versionId: id, timestamp: text, note: text, resume: resumeSchema })).optional(),
  proofPack: proof.optional(), outreachDrafts: outreach.optional(), recruiterOutreach: outreach.optional(), referralContact: contact.optional(),
  applicationAnswers: list(object({ id, question: text, answer: text, evidenceIds: strings, rationale: text.optional() })).optional(),
  statusHistory: list(object({ from: text, to: text, timestamp: text, note: text.optional() })).optional(), ...review });
const unique = <T extends z.ZodType<{ id: string }>>(schema: T) => list(schema).refine(records => new Set(records.map(r => r.id)).size === records.length, 'Duplicate record ids');
export const workspaceInput = z.object({ profile: profileSchema.nullable().optional(), searchProfile: searchProfileSchema.nullable().optional(), masterResume: resumeSchema.nullable().optional(),
  evidence: unique(evidenceSchema).optional(), projects: unique(projectSchema).optional(), skills: unique(skillSchema).optional(), jobs: unique(jobSchema).optional(),
  experiences: unique(experienceSchema).optional(), searchSessions: unique(object({ id })).optional(),
}).strict();
