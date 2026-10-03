import type { CompanyWatchlistEntry, PrimaryRoleFamily } from '../types';

export const WATCHLIST_LANES: PrimaryRoleFamily[] = ['frontend-product','ui-platform-design-systems','frontend-heavy-fullstack','production-support-frontend','forward-deployed-software'];
export const normalizeWatchlistCompany = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();
export function isSyntheticDemoWatchlist(entries: readonly CompanyWatchlistEntry[]) {
  return entries.every(entry => {
    let validUrl = true;
    try { validUrl = !entry.careersUrl || new URL(entry.careersUrl).hostname.endsWith('.example.invalid'); } catch { validUrl = false; }
    return entry.id.startsWith('demo-watch-') && entry.normalizedCompanyName.startsWith('synthetic ') && (!entry.atsSourceId || entry.atsSourceId.startsWith('demo-source-')) && validUrl;
  });
}
export function watchlistEntryWithSafeMonitoring(entry: CompanyWatchlistEntry, changes: Partial<CompanyWatchlistEntry>): CompanyWatchlistEntry {
  const next={...entry,...changes,updatedAt:new Date().toISOString()};
  if (changes.atsSourceId && entry.status === 'RESEARCH' && changes.status === undefined) next.status='ACTIVE';
  if (!next.atsSourceId) { next.status=next.status==='PAUSED'?'PAUSED':'RESEARCH'; next.monitoringEnabled=false; }
  if (next.status==='RESEARCH') next.monitoringEnabled=false;
  if (next.status==='PAUSED') next.monitoringEnabled=false;
  return next;
}
