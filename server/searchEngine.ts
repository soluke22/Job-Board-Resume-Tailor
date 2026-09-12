import crypto from 'crypto';
import {
  JobRecord,
  SearchProfile,
  FreshnessBand,
  PrimaryRoleFamily,
  RoleModifier,
  AtsProvider,
  CompensationDetails
} from '../src/types';
import { detectAtsProvider, verifyPostingAts } from './atsAdapters';

export interface DeterministicFilterResult {
  passed: boolean;
  blockerReason?: string;
  hardBlockers: string[];
}

export function evaluateDeterministicBlockers(
  text: string,
  title: string,
  profile: SearchProfile
): DeterministicFilterResult {
  const lowerText = text.toLowerCase();
  const lowerTitle = title.toLowerCase();
  const hardBlockers: string[] = [];

  // 1. Clearance check
  if (profile.clearancePolicy === 'exclude_clearance') {
    const clearanceTerms = ['active secret clearance', 'ts/sci', 'top secret clearance', 'polygraph required', 'security clearance required'];
    if (clearanceTerms.some((t) => lowerText.includes(t))) {
      hardBlockers.push('Explicit active security clearance requirement.');
    }
  }

  // 2. Heavy non-candidate backend focus (Java/Python/C++)
  if (
    (lowerTitle.includes('java developer') || lowerTitle.includes('java engineer') || lowerText.includes('deep java spring boot architecture')) &&
    !lowerTitle.includes('full') &&
    !lowerTitle.includes('front')
  ) {
    hardBlockers.push('Role is fundamentally focused on Java backend architecture rather than product/frontend engineering.');
  }

  if (
    (lowerTitle.includes('python backend engineer') || lowerTitle.includes('django architect')) &&
    !lowerTitle.includes('front')
  ) {
    hardBlockers.push('Backend-heavy Python architecture role.');
  }

  // 3. Low-level / ML infra / DevOps / SRE
  if (
    lowerTitle.includes('devops engineer') ||
    lowerTitle.includes('site reliability engineer') ||
    lowerTitle.includes('sre') ||
    lowerTitle.includes('kubernetes platform engineer')
  ) {
    hardBlockers.push('DevOps/SRE infrastructure role outside candidate product engineering focus.');
  }

  if (
    lowerTitle.includes('mlops') ||
    lowerTitle.includes('machine learning infrastructure') ||
    lowerTitle.includes('cuda engineer') ||
    lowerTitle.includes('compiler engineer')
  ) {
    hardBlockers.push('Machine learning or systems compiler infrastructure role.');
  }

  // 4. Extreme seniority mismatch
  if (
    lowerTitle.includes('staff software engineer') ||
    lowerTitle.includes('principal software engineer') ||
    lowerTitle.includes('director of engineering') ||
    lowerTitle.includes('vp of engineering') ||
    lowerTitle.includes('engineering manager')
  ) {
    hardBlockers.push('Seniority level (Staff/Principal/Executive) requires significantly greater leadership scope than verified evidence supports.');
  }

  // 5. Excluded company patterns
  if (profile.companyExclusions?.length > 0) {
    for (const excluded of profile.companyExclusions) {
      if (lowerText.includes(excluded.toLowerCase())) {
        hardBlockers.push(`Company is on candidate exclusion list: ${excluded}`);
        break;
      }
    }
  }

  // 6. Relocation
  if (!profile.relocationAllowed && lowerText.includes('must relocate') && !lowerText.includes('remote')) {
    hardBlockers.push('Requires mandatory relocation.');
  }

  return {
    passed: hardBlockers.length === 0,
    blockerReason: hardBlockers[0],
    hardBlockers
  };
}

export function calculateFreshnessBand(
  publishedAt?: string,
  firstSeenAt?: string
): FreshnessBand {
  if (!publishedAt || !Number.isFinite(Date.parse(publishedAt)) || Date.parse(publishedAt) > Date.now()) return 'UNKNOWN';
  const referenceDate = new Date(publishedAt);
  const diffDays = Math.max(0, Math.floor((Date.now() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)));

  if (diffDays <= 7) return 'NEW';
  if (diffDays <= 21) return 'RECENT';
  if (diffDays <= 45) return 'ESTABLISHED';
  return 'OLD';
}

export function hashJobDescription(text: string): string {
  return crypto.createHash('sha256').update(text.trim()).digest('hex');
}

// In-memory cache for parsed jobs and ATS queries
class AnalysisCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

  get(hash: string): any | null {
    const entry = this.cache.get(hash);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.TTL_MS) {
      this.cache.delete(hash);
      return null;
    }
    return entry.data;
  }

  set(hash: string, data: any): void {
    this.cache.set(hash, { data, timestamp: Date.now() });
    if (this.cache.size > 200) {
      // Evict oldest entries
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
  }

  stats(): { size: number } {
    return { size: this.cache.size };
  }
}

export const analysisCache = new AnalysisCache();
