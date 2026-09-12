import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from '../server/db/schema';
import { createWorkspaceRepository, WorkspaceConflict, WorkspaceValidationError } from '../server/workspaceRepository';

test('durable workspace survives database reopen; owner scope, concurrency and import review', async () => {
  const path = await mkdtemp(join(tmpdir(), 'careeros-workspace-'));
  let pg = new PGlite(path);
  let db = drizzle(pg, { schema });
  try {
    await migrate(db, { migrationsFolder: './migrations' });
    await db.insert(schema.user).values([
      { id: 'owner-a', name: 'Synthetic A', email: 'a@example.invalid' },
      { id: 'owner-b', name: 'Synthetic B', email: 'b@example.invalid' },
    ]);
    let repo = createWorkspaceRepository(() => db as any);
    const blank = await repo.read('owner-a');
    assert.equal(blank.profile, null);
    assert.deepEqual(blank.jobs, []);
    await repo.save('owner-a', { profile: { name: 'Synthetic Candidate' }, evidence: [{ id: 'same-id', rawEvidence: 'Owner A synthetic evidence', verificationStatus: 'verified' }], jobs: [{ id: 'job-a', title: 'Synthetic role', fit: { qualificationFit: 5 }, applicationStatus: 'APPLIED', versionHistory: [{ versionId: 'v1', note: 'synthetic' }], statusHistory: [{ from: 'TAILORED', to: 'APPLIED', timestamp: '2026-01-01' }] }] }, 0);
    await repo.save('owner-b', { evidence: [{ id: 'same-id', rawEvidence: 'Owner B evidence' }] }, 0);
    assert.equal((await repo.read('owner-b')).evidence[0].rawEvidence, 'Owner B evidence');
    assert.equal((await repo.read('owner-b')).profile, null);
    assert.deepEqual((await repo.read('owner-b')).jobs, []);
    await assert.rejects(repo.save('owner-a', { evidence: [] }, 0), WorkspaceConflict);
    assert.equal((await repo.read('owner-a')).evidence.length, 1);
    await pg.close();
    pg = new PGlite(path);
    db = drizzle(pg, { schema });
    repo = createWorkspaceRepository(() => db as any);
    const restored = await repo.read('owner-a');
    assert.equal(restored.profile.name, 'Synthetic Candidate');
    assert.equal(restored.jobs[0].fit.qualificationFit, 5);
    assert.equal(restored.jobs[0].versionHistory[0].versionId, 'v1');
    assert.equal(restored.jobs[0].applicationStatus, 'APPLIED');
    const imported = await repo.import('owner-a', { evidence: [{ id: 'imported', verificationStatus: 'verified', rawEvidence: 'Untrusted local assertion' }] }, 1);
    assert.equal(imported.evidence.find(e => e.id === 'imported').verificationStatus, 'requires-review');
    assert.equal(imported.evidence.length, 2);
    assert.equal(imported.profile.name, 'Synthetic Candidate');
    assert.equal(imported.auditLog.length, 2);
    await repo.save('owner-a', { jobs: [{ id: 'job-a', title: 'Edited title' }] }, 2);
    assert.equal((await repo.read('owner-a')).jobs[0].fit.qualificationFit, 5, 'absent attachment is preserved');
    await assert.rejects(repo.save('owner-a', { evidence: [{ id: 'x' }, { id: 'x' }] }, 3), WorkspaceValidationError);
    await assert.rejects(repo.save('owner-a', { ownerId: 'owner-b' }, 3), WorkspaceValidationError);
    await assert.rejects(repo.save('owner-a', { profile: { name: ['invalid'] } }, 3), WorkspaceValidationError);
    assert.equal((await repo.read('owner-a')).revision, 3, 'invalid domain fields roll back revision');
    await assert.rejects(repo.read(''), WorkspaceValidationError);
    await repo.save('owner-a', { evidence: [] }, 3);
    assert.equal((await repo.read('owner-a')).evidence.length, 0);
    assert.equal((await repo.read('owner-b')).evidence.length, 1);
    const raced = await Promise.allSettled([
      repo.save('owner-a', { searchProfile: { remotePreference: 'any' } }, 4),
      repo.save('owner-a', { searchProfile: { remotePreference: 'remote_only' } }, 4),
    ]);
    assert.equal(raced.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(raced.filter(r => r.status === 'rejected' && r.reason instanceof WorkspaceConflict).length, 1);
  } finally {
    await pg.close();
    await rm(path, { recursive: true, force: true });
  }
});
