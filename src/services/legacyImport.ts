import { PRIVATE_FIELDS } from './storage';

export interface ImportChoice { key: string; field: string; index?: number; label: string; source: string; warning: string; value: any }
export function previewImport(input: any, source: string): ImportChoice[] {
  const data = input?.data || input;
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Expected a workspace JSON object.');
  return Object.keys(PRIVATE_FIELDS).filter(field => field !== 'auditLog' && data[field] != null).flatMap(field => {
    const values = Array.isArray(data[field]) ? data[field] : [data[field]];
    return values.map((value: any, index: number) => ({
      key: field + ':' + index, field, index: Array.isArray(data[field]) ? index : undefined,
      label: String(value?.name || value?.title || value?.rawEvidence || value?.id || field).slice(0, 120),
      source: String(value?.sourceLocation || value?.source || source),
      warning: 'Untrusted import: may contain old seeds or generated claims. Requires review.', value
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
