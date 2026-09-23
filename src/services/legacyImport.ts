import { PRIVATE_FIELDS } from './storage';

export interface ImportChoice { key: string; field: string; index?: number; label: string; importSource: string; recordSource: string | null; destination: string; warning: string; value: any }

export function importDestination(field: string): string {
  return ({ profile: 'Candidate Profile', searchProfile: 'Search Preferences', masterResume: 'Master Resume', evidence: 'Evidence Bank', projects: 'Projects', skills: 'Skills', jobs: 'Pipeline' } as Record<string, string>)[field] || field;
}

export function importReviewWarning(field: string): string {
  if (field === 'evidence') return 'Imported evidence remains untrusted and requires Evidence Bank review before it can support claims.';
  if (['projects', 'skills', 'masterResume'].includes(field)) return 'Imported claim-bearing content remains untrusted, is not verified by its presence here, and needs supporting reviewed evidence before it can support claims.';
  if (['profile', 'searchProfile'].includes(field)) return 'Review imported profile or preference details for accuracy; their presence does not verify claims or evidence.';
  return 'Untrusted import: review the destination records before relying on them.';
}

export function previewImport(input: any, source: string): ImportChoice[] {
  const data = input?.data || input;
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Expected a workspace JSON object.');
  return Object.keys(PRIVATE_FIELDS).filter(field => field !== 'auditLog' && data[field] != null).flatMap(field => {
    const values = Array.isArray(data[field]) ? data[field] : [data[field]];
    return values.map((value: any, index: number) => ({
      key: field + ':' + index, field, index: Array.isArray(data[field]) ? index : undefined,
      label: String(value?.name || value?.title || value?.rawEvidence || value?.id || field).slice(0, 120),
      importSource: source, recordSource: value?.sourceLocation || value?.source ? String(value.sourceLocation || value.source) : null, destination: importDestination(field),
      warning: importReviewWarning(field), value
    }));
  });
}
export function readLegacyWorkspace(storage: Pick<Storage, 'getItem'>, authenticatedOwner: boolean): ImportChoice[] {
  if (!authenticatedOwner) throw new Error('Owner authentication required.');
  const data: Record<string, unknown> = {};
  for (const [field, key] of Object.entries(PRIVATE_FIELDS)) {
    const value = storage.getItem(key);
    if (value) { try { data[field] = JSON.parse(value); } catch { throw new Error('Legacy ' + field + ' is malformed; local data was left unchanged.'); } }
  }
  return previewImport(data, 'Legacy browser storage');
}
export function selectedImport(choices: ImportChoice[], selected: Set<string>) {
  const result: Record<string, any> = {};
  for (const choice of choices.filter(c => selected.has(c.key))) {
    if (choice.index === undefined) result[choice.field] = choice.value;
    else (result[choice.field] ||= []).push(choice.value);
  }
  return result;
}
