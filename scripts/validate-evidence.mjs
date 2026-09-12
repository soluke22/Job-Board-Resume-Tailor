import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
export function validateEvidence(input) {
 if(!input || !Array.isArray(input.evidence) || !Array.isArray(input.records)) throw Error('Expected evidence and records arrays');
 const ids = new Map();
 for(const item of input.evidence) {
  if(!item || typeof item.id !== 'string' || !item.id.trim() || ids.has(item.id)) throw Error('Invalid or duplicate evidence ID');
  ids.set(item.id,item);
 }
 const errors = [];
 const singular = new Set(['supportingEvidenceId','matchedEvidenceId']);
 const plural = new Set(['evidenceIds','supportingEvidenceIds']);
 function check(id) {
  const e = ids.get(id);
  if(typeof id !== 'string' || !e || e.verificationStatus !== 'verified' || e.enabled === false ||
    (input.ownerId !== undefined && e.ownerId !== input.ownerId)) errors.push('Unresolved or unapproved evidence reference');
 }
 function visit(v) {
  if(Array.isArray(v)) { v.forEach(visit); return; }
  if(!v || typeof v !== 'object') return;
  for(const [k,val]of Object.entries(v)) {
   if(singular.has(k)) check(val);
   else if(plural.has(k)) { if(!Array.isArray(val)) errors.push('Evidence references must be arrays'); else val.forEach(check); }
   else visit(val);
  }
 }
 input.records.forEach(visit);
 if(errors.length) throw Error(errors.length + ' invalid evidence reference(s)');
 return true;
}
if(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
 if(!process.argv[2]) throw Error('Usage: node scripts/validate-evidence.mjs <synthetic-json-file>');
 validateEvidence(JSON.parse(await readFile(process.argv[2],'utf8')));
 console.log('Evidence ID integrity passed (semantic support not evaluated)');
}
