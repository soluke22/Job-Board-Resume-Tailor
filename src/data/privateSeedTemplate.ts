import { CandidateProfile, SearchProfile, TailoredResume } from '../types';

// Empty form shapes only. No candidate identity, career history or preferences.
export const DEFAULT_PRIVATE_PROFILE: CandidateProfile = {
  name: '', fullName: '', preferredName: '', title: '', email: '', phone: '', location: '', links: [],
  coreIdentity: '', masterSummary: '', safeVerbs: [], restrictedVerbs: [],
  workAuthorization: '', targetRoleFamilies: [], targetSeniority: [], locationPreferences: [], dealbreakers: []
};
export const DEFAULT_SEARCH_PROFILE: SearchProfile = {
  preferredRoleFamilies: [], preferredModifiers: [], excludedRolePatterns: [], targetSeniority: [],
  allowedEmploymentTypes: [], excludedEmploymentTypes: [], remotePreference: 'any', hybridLocations: [],
  maximumOnsiteFrequency: '', relocationAllowed: false, clearancePolicy: 'exclude_clearance',
  salaryPreference: {}, hiringProcessPreferences: {}, companyExclusions: [],
  technologyStrengths: [], technologyAdjacencies: [], technologyGaps: []
};
export const DEFAULT_BLANK_MASTER_RESUME: TailoredResume = {
  id: 'master-resume', jobId: 'master', roleFamily: 'frontend-product',
  header: { name: '', title: '', email: '', phone: '', location: '', links: [] },
  professionalSummary: '', skills: [], experience: [], projects: [], education: [],
  pageEstimate: { isOnePage: true, estimatedLines: 0, overflowRisk: 'low', trimSuggestions: [] }
};
