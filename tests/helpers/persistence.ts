import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from '../../server/db/schema';
import { DEFAULT_BLANK_MASTER_RESUME } from '../../src/data/privateSeedTemplate';

export async function persistenceDb(path?: string) {
  const pg = new PGlite(path);
  const db = drizzle(pg, { schema });
  await migrate(db, { migrationsFolder: './migrations' });
  await db.insert(schema.user).values(['owner-a', 'owner-b'].map(id => ({ id, name: `Synthetic ${id}`, email: `${id}@example.invalid` }))).onConflictDoNothing();
  return { pg, db };
}
export const syntheticEvidence = (id = 'same-id', rawEvidence = 'Synthetic evidence') => ({
  id, rawEvidence, sourceType: 'user-interview', sourceLocation: 'synthetic fixture',
  verificationStatus: 'verified', context: 'Synthetic context', technologies: [],
  responsibilities: [], outcomes: [], supportedVerbs: [], supportedMetrics: [],
  strength: 'Medium', roleFamilyRelevance: [], source: 'synthetic', enabled: true,
});
export const syntheticJob = (id = 'job-a') => ({
  id, title: 'Synthetic role', company: 'Synthetic company', atsProvider: 'unknown',
  canonicalUrl: 'https://example.invalid/job', applyUrl: 'https://example.invalid/job',
  description: 'Synthetic description', location: '', remoteStatus: 'unknown', employmentType: '',
  firstSeenAt: '2026-01-01', verificationStatus: 'UNKNOWN', isCurrentlyListed: false,
  sourceChannel: 'manual', primaryRoleFamily: 'frontend-product', roleModifiers: [], seniority: '',
  hardRequirements: [], preferredRequirements: [], technologies: [], responsibilities: [],
  hiringSignals: [], hardBlockers: [], softGaps: [], qualificationFit: 5, evidenceCoverage: 0,
  applicationPriority: 'review', priorityReason: 'Synthetic fixture', applicationStatus: 'APPLIED',
  fit: { qualificationFit: 5, evidenceCoverage: 0, applicationPriority: 'review',
    initialFitScore: 5, tailoredFitScore: 5, verdict: 'Borderline', verdictReason: 'Synthetic',
    strongestMatch: '', biggestActualGap: '', blockers: [], unsupportedRequirements: [], canTailor: false },
  versionHistory: [{ versionId: 'v1', timestamp: '2026-01-01', note: 'synthetic', resume: structuredClone(DEFAULT_BLANK_MASTER_RESUME) }],
  statusHistory: [{ from: 'TAILORED', to: 'APPLIED', timestamp: '2026-01-01' }],
});
export const syntheticFile = (ownerId = 'owner-a', id = 'same-file-id') => ({
  ownerId, id, blobPath: `private/${ownerId}/${id}`, originalFilename: 'synthetic résumé.txt',
  mimeType: 'text/plain', size: 9, purpose: 'evidence', sourceType: 'user-upload',
});
