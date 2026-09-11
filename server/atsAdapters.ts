import { AtsProvider, AtsVerificationStatus, CompensationDetails } from '../src/types';

export interface NormalizedAtsJob {
  atsProvider: AtsProvider;
  atsBoard?: string;
  atsJobId?: string;
  title: string;
  company: string;
  canonicalUrl: string;
  applyUrl: string;
  location: string;
  secondaryLocations?: string[];
  remoteStatus: 'remote' | 'hybrid' | 'onsite' | 'unknown';
  workplaceType?: string;
  employmentType: string;
  compensation?: CompensationDetails;
  department?: string;
  team?: string;
  publishedAt?: string;
  updatedAt?: string;
  isCurrentlyListed: boolean;
  rawContent?: string;
}

export interface JobVerificationResult {
  status: AtsVerificationStatus;
  isListed: boolean;
  canonicalUrl?: string;
  applyUrl?: string;
  lastVerifiedAt: string;
  compensation?: CompensationDetails;
  rawDetails?: Partial<NormalizedAtsJob>;
  notes?: string;
}

export interface AtsAdapter {
  provider: AtsProvider;
  detect(url: string): { isMatch: boolean; board?: string; jobId?: string };
  verify(url: string, board?: string, jobId?: string): Promise<JobVerificationResult>;
}

// 1. Ashby Adapter
export const ashbyAdapter: AtsAdapter = {
  provider: 'ashby',
  detect(url: string) {
    const isMatch = url.includes('jobs.ashbyhq.com') || url.includes('api.ashbyhq.com');
    if (!isMatch) return { isMatch: false };

    // Format: https://jobs.ashbyhq.com/{board}/{jobId}
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split('/').filter(Boolean);
    const board = parts[0] || undefined;
    const jobId = parts[1] || undefined;

    return { isMatch: true, board, jobId };
  },

  async verify(url: string, board?: string, jobId?: string): Promise<JobVerificationResult> {
    const detected = this.detect(url);
    const effectiveBoard = board || detected.board;
    const effectiveJobId = jobId || detected.jobId;

    if (!effectiveBoard) {
      return {
        status: 'UNKNOWN',
        isListed: false,
        lastVerifiedAt: new Date().toISOString(),
        notes: 'Could not extract Ashby board identifier from URL.'
      };
    }

    try {
      const endpoint = `https://api.ashbyhq.com/posting-api/job-board/${effectiveBoard}?includeCompensation=true`;
      const response = await fetch(endpoint, {
        headers: { Accept: 'application/json', 'User-Agent': 'CareerOS-ATS-Verifier/2.0' }
      });

      if (!response.ok) {
        return {
          status: response.status === 404 ? 'NOT_LISTED' : 'UNKNOWN',
          isListed: false,
          lastVerifiedAt: new Date().toISOString(),
          notes: `Ashby API responded with HTTP ${response.status}`
        };
      }

      const data = await response.json();
      const jobs = data.jobs || [];

      if (!effectiveJobId) {
        // Board exists and is active
        return {
          status: 'LISTED',
          isListed: true,
          lastVerifiedAt: new Date().toISOString(),
          notes: `Ashby board ${effectiveBoard} is verified active with ${jobs.length} open roles.`
        };
      }

      const match = jobs.find(
        (j: any) =>
          j.id === effectiveJobId ||
          j.jobUrl?.includes(effectiveJobId) ||
          j.applyUrl?.includes(effectiveJobId)
      );

      if (match) {
        const isListed = match.isListed !== false;
        let comp: CompensationDetails | undefined;
        if (match.compensation) {
          comp = {
            min: match.compensation.min,
            max: match.compensation.max,
            currency: match.compensation.currency || 'USD',
            interval: match.compensation.period?.toLowerCase() || 'year',
            raw: match.compensation.formatted
          };
        }

        return {
          status: isListed ? 'LISTED' : 'UNLISTED',
          isListed,
          canonicalUrl: match.jobUrl || url,
          applyUrl: match.applyUrl || match.jobUrl || url,
          lastVerifiedAt: new Date().toISOString(),
          compensation: comp,
          rawDetails: {
            atsProvider: 'ashby',
            atsBoard: effectiveBoard,
            atsJobId: match.id,
            title: match.title,
            company: effectiveBoard,
            canonicalUrl: match.jobUrl || url,
            applyUrl: match.applyUrl || url,
            location: match.location || (match.isRemote ? 'Remote' : 'Onsite'),
            remoteStatus: match.isRemote ? 'remote' : 'onsite',
            workplaceType: match.isRemote ? 'Remote' : 'Onsite',
            employmentType: match.employmentType || 'full-time',
            publishedAt: match.publishedAt,
            isCurrentlyListed: isListed
          }
        };
      }

      return {
        status: 'NOT_LISTED',
        isListed: false,
        lastVerifiedAt: new Date().toISOString(),
        notes: `Posting ${effectiveJobId} not found in current Ashby public board listings.`
      };
    } catch (err: any) {
      return {
        status: 'UNKNOWN',
        isListed: false,
        lastVerifiedAt: new Date().toISOString(),
        notes: `Ashby verification check encountered network error: ${err.message}`
      };
    }
  }
};

// 2. Greenhouse Adapter
export const greenhouseAdapter: AtsAdapter = {
  provider: 'greenhouse',
  detect(url: string) {
    const isMatch =
      url.includes('boards.greenhouse.io') ||
      url.includes('job-boards.greenhouse.io') ||
      url.includes('boards-api.greenhouse.io');
    if (!isMatch) return { isMatch: false };

    const urlObj = new URL(url);
    const parts = urlObj.pathname.split('/').filter(Boolean);
    const board = parts[0] || undefined;
    const jobId = parts[parts.indexOf('jobs') + 1] || parts[1] || undefined;

    return { isMatch: true, board, jobId };
  },

  async verify(url: string, board?: string, jobId?: string): Promise<JobVerificationResult> {
    const detected = this.detect(url);
    const effectiveBoard = board || detected.board;
    const effectiveJobId = jobId || detected.jobId;

    if (!effectiveBoard) {
      return {
        status: 'UNKNOWN',
        isListed: false,
        lastVerifiedAt: new Date().toISOString(),
        notes: 'Could not extract Greenhouse board name.'
      };
    }

    try {
      // Direct job endpoint if we have jobId
      if (effectiveJobId) {
        const endpoint = `https://boards-api.greenhouse.io/v1/boards/${effectiveBoard}/jobs/${effectiveJobId}`;
        const response = await fetch(endpoint, {
          headers: { Accept: 'application/json', 'User-Agent': 'CareerOS-ATS-Verifier/2.0' }
        });

        if (response.ok) {
          const match = await response.json();
          return {
            status: 'LISTED',
            isListed: true,
            canonicalUrl: match.absolute_url || url,
            applyUrl: `${match.absolute_url}#app`,
            lastVerifiedAt: new Date().toISOString(),
            rawDetails: {
              atsProvider: 'greenhouse',
              atsBoard: effectiveBoard,
              atsJobId: match.id?.toString(),
              title: match.title,
              company: effectiveBoard,
              canonicalUrl: match.absolute_url || url,
              applyUrl: `${match.absolute_url}#app`,
              location: match.location?.name || 'Remote',
              remoteStatus: (match.location?.name || '').toLowerCase().includes('remote')
                ? 'remote'
                : 'unknown',
              employmentType: 'full-time',
              updatedAt: match.updated_at,
              isCurrentlyListed: true
            }
          };
        } else if (response.status === 404) {
          return {
            status: 'NOT_LISTED',
            isListed: false,
            lastVerifiedAt: new Date().toISOString(),
            notes: `Greenhouse job ID ${effectiveJobId} returned 404 Not Found.`
          };
        }
      }

      // Board level check
      const boardEndpoint = `https://boards-api.greenhouse.io/v1/boards/${effectiveBoard}/jobs`;
      const boardRes = await fetch(boardEndpoint);
      if (boardRes.ok) {
        return {
          status: 'LISTED',
          isListed: true,
          lastVerifiedAt: new Date().toISOString(),
          notes: `Greenhouse board ${effectiveBoard} is verified active.`
        };
      }

      return {
        status: 'UNKNOWN',
        isListed: false,
        lastVerifiedAt: new Date().toISOString(),
        notes: `Greenhouse board query returned HTTP ${boardRes.status}`
      };
    } catch (err: any) {
      return {
        status: 'UNKNOWN',
        isListed: false,
        lastVerifiedAt: new Date().toISOString(),
        notes: `Greenhouse verification failed: ${err.message}`
      };
    }
  }
};

// 3. Lever Adapter
export const leverAdapter: AtsAdapter = {
  provider: 'lever',
  detect(url: string) {
    const isMatch = url.includes('jobs.lever.co') || url.includes('api.lever.co');
    if (!isMatch) return { isMatch: false };

    const urlObj = new URL(url);
    const parts = urlObj.pathname.split('/').filter(Boolean);
    const board = parts[0] || undefined;
    const jobId = parts[1] || undefined;

    return { isMatch: true, board, jobId };
  },

  async verify(url: string, board?: string, jobId?: string): Promise<JobVerificationResult> {
    const detected = this.detect(url);
    const effectiveBoard = board || detected.board;
    const effectiveJobId = jobId || detected.jobId;

    if (!effectiveBoard) {
      return {
        status: 'UNKNOWN',
        isListed: false,
        lastVerifiedAt: new Date().toISOString(),
        notes: 'Could not extract Lever site identifier.'
      };
    }

    try {
      if (effectiveJobId) {
        const endpoint = `https://api.lever.co/v0/postings/${effectiveBoard}/${effectiveJobId}`;
        const res = await fetch(endpoint);
        if (res.ok) {
          const match = await res.json();
          return {
            status: 'LISTED',
            isListed: true,
            canonicalUrl: match.hostedUrl || url,
            applyUrl: match.applyUrl || `${match.hostedUrl}/apply`,
            lastVerifiedAt: new Date().toISOString(),
            rawDetails: {
              atsProvider: 'lever',
              atsBoard: effectiveBoard,
              atsJobId: match.id,
              title: match.text,
              company: effectiveBoard,
              canonicalUrl: match.hostedUrl || url,
              applyUrl: match.applyUrl || `${match.hostedUrl}/apply`,
              location: match.categories?.location || 'Remote',
              remoteStatus:
                match.workplaceType === 'remote' ||
                (match.categories?.location || '').toLowerCase().includes('remote')
                  ? 'remote'
                  : 'unknown',
              employmentType: match.categories?.commitment || 'full-time',
              publishedAt: match.createdAt ? new Date(match.createdAt).toISOString() : undefined,
              isCurrentlyListed: true
            }
          };
        } else if (res.status === 404) {
          return {
            status: 'NOT_LISTED',
            isListed: false,
            lastVerifiedAt: new Date().toISOString(),
            notes: `Lever posting ${effectiveJobId} returned 404.`
          };
        }
      }

      return {
        status: 'UNKNOWN',
        isListed: false,
        lastVerifiedAt: new Date().toISOString(),
        notes: 'Could not conclusively verify Lever posting without job identifier.'
      };
    } catch (err: any) {
      return {
        status: 'UNKNOWN',
        isListed: false,
        lastVerifiedAt: new Date().toISOString(),
        notes: `Lever verification error: ${err.message}`
      };
    }
  }
};

// 4. Generic / Company Careers Page Adapter
export const genericAdapter: AtsAdapter = {
  provider: 'company-careers',
  detect(url: string) {
    return { isMatch: true };
  },

  async verify(url: string): Promise<JobVerificationResult> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      clearTimeout(timeout);

      if (res.ok) {
        const text = await res.text();
        const lower = text.toLowerCase();
        // Check if posting indicates closed or expired
        const isClosed =
          lower.includes('this job has closed') ||
          lower.includes('this position has been filled') ||
          lower.includes('job is no longer available') ||
          lower.includes('posting is no longer active');

        return {
          status: isClosed ? 'NOT_LISTED' : 'LISTED',
          isListed: !isClosed,
          canonicalUrl: url,
          applyUrl: url,
          lastVerifiedAt: new Date().toISOString(),
          notes: isClosed ? 'Page text contains job closed notification.' : 'Page is live and accessible.'
        };
      }

      return {
        status: res.status === 404 ? 'NOT_LISTED' : 'UNKNOWN',
        isListed: false,
        lastVerifiedAt: new Date().toISOString(),
        notes: `HTTP status ${res.status}`
      };
    } catch (err: any) {
      return {
        status: 'UNKNOWN',
        isListed: false,
        lastVerifiedAt: new Date().toISOString(),
        notes: `Direct URL check failed: ${err.message}`
      };
    }
  }
};

// Registry of adapters
export const atsAdapters: AtsAdapter[] = [ashbyAdapter, greenhouseAdapter, leverAdapter, genericAdapter];

export function detectAtsProvider(url: string): { provider: AtsProvider; board?: string; jobId?: string } {
  for (const adapter of [ashbyAdapter, greenhouseAdapter, leverAdapter]) {
    const check = adapter.detect(url);
    if (check.isMatch) {
      return { provider: adapter.provider, board: check.board, jobId: check.jobId };
    }
  }

  if (url.includes('myworkdayjobs.com')) return { provider: 'workday' };
  if (url.includes('smartrecruiters.com')) return { provider: 'smartrecruiters' };
  if (url.includes('recruitee.com')) return { provider: 'recruitee' };

  return { provider: 'company-careers' };
}

export async function verifyPostingAts(
  url: string,
  providerOverride?: AtsProvider,
  board?: string,
  jobId?: string
): Promise<JobVerificationResult> {
  const detected = detectAtsProvider(url);
  const provider = providerOverride || detected.provider;

  if (provider === 'ashby') {
    return ashbyAdapter.verify(url, board || detected.board, jobId || detected.jobId);
  }
  if (provider === 'greenhouse') {
    return greenhouseAdapter.verify(url, board || detected.board, jobId || detected.jobId);
  }
  if (provider === 'lever') {
    return leverAdapter.verify(url, board || detected.board, jobId || detected.jobId);
  }

  return genericAdapter.verify(url);
}
