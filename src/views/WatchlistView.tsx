import React, { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { CompanyWatchlistEntry, PrimaryRoleFamily } from '../types';
import { normalizeWatchlistCompany, WATCHLIST_LANES, watchlistEntryWithSafeMonitoring } from '../utils/watchlist';

type DetailDraft = { careersUrl: string; notes: string };

export function WatchlistView() {
  const { companyWatchlist, saveCompanyWatchlist, searchProfile, workspaceMode, discoverySourceResults, discoverJobs, isDiscovering } = useApp();
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState<Record<string, DetailDraft>>({});
  const [filters, setFilters] = useState({ priority: '', status: '', lane: '', source: '', monitoring: '' });
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const editable = workspaceMode === 'PRIVATE_WORKSPACE';
  const sources = searchProfile.discoverySources?.filter(source => !source.removed) ?? [];

  const mutate = async (entries: CompanyWatchlistEntry[], success?: string): Promise<boolean> => {
    if (savingRef.current) {
      setMessage('A watchlist change is already being saved.');
      return false;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      await saveCompanyWatchlist(entries);
      setMessage(success ?? 'Watchlist saved privately.');
      return true;
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Watchlist changes could not be saved.');
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const add = async () => {
    const companyName = draft.trim().replace(/\s+/g, ' ');
    const normalizedCompanyName = normalizeWatchlistCompany(companyName);
    if (!companyName) return;
    if (companyWatchlist.some(entry => entry.normalizedCompanyName === normalizedCompanyName)) {
      setMessage('That target company is already on this watchlist.');
      return;
    }
    const now = new Date().toISOString();
    const saved = await mutate([{
      id: `watch-${crypto.randomUUID()}`,
      companyName,
      normalizedCompanyName,
      status: 'RESEARCH',
      priority: 'MEDIUM',
      lanes: [],
      locationPolicy: 'UNKNOWN',
      monitoringEnabled: false,
      createdAt: now,
      updatedAt: now,
    }, ...companyWatchlist], 'Target saved privately.');
    if (saved) setDraft('');
  };

  const update = (entry: CompanyWatchlistEntry, changes: Partial<CompanyWatchlistEntry>) =>
    mutate(companyWatchlist.map(item => item.id === entry.id ? watchlistEntryWithSafeMonitoring(entry, changes) : item));
  const detailFor = (entry: CompanyWatchlistEntry) => details[entry.id] ?? { careersUrl: entry.careersUrl ?? '', notes: entry.notes ?? '' };
  const saveDetails = async (entry: CompanyWatchlistEntry) => {
    const detail = detailFor(entry);
    if (detail.careersUrl) {
      try {
        const parsed = new URL(detail.careersUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
      } catch {
        setMessage('Careers URL must be a complete http or https URL.');
        return;
      }
    }
    const saved = await update(entry, { careersUrl: detail.careersUrl || undefined, notes: detail.notes || undefined });
    if (saved) setDetails(({ [entry.id]: _discard, ...rest }) => rest);
  };

  const filtered = companyWatchlist.filter(entry =>
    (!filters.priority || entry.priority === filters.priority)
    && (!filters.status || entry.status === filters.status)
    && (!filters.lane || entry.lanes.includes(filters.lane as PrimaryRoleFamily))
    && (!filters.source || (filters.source === 'configured') === !!entry.atsSourceId)
    && (!filters.monitoring || (filters.monitoring === 'enabled') === entry.monitoringEnabled));
  const select = (key: keyof typeof filters, label: string, children: React.ReactNode) =>
    <label>{label}<select aria-label={`Filter ${label}`} value={filters[key]} onChange={event => setFilters({ ...filters, [key]: event.target.value })}>{children}</select></label>;

  return <section className="max-w-6xl mx-auto p-6 space-y-5" aria-busy={saving}>
    <div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-bold">Company Watchlist</h1><p className="text-sm text-slate-500">Deliberate target companies are private workspace strategy. Sources remain separately configured ATS boards.</p></div>{editable && <button type="button" disabled={isDiscovering} className="bg-emerald-700 text-white rounded px-4 py-2 disabled:opacity-50" onClick={() => void discoverJobs('WATCHLIST')}>{isDiscovering ? 'Scanning…' : 'Scan Active Watchlist'}</button>}</div>
    {editable
      ? <form className="flex gap-2" onSubmit={event => { event.preventDefault(); void add(); }}><input disabled={saving} aria-label="Company name" className="border rounded px-3 py-2 flex-1" value={draft} onChange={event => setDraft(event.target.value)} placeholder="Add a target company"/><button disabled={saving} className="bg-emerald-700 text-white rounded px-4">{saving ? 'Saving…' : 'Add company'}</button></form>
      : <p className="text-sm text-amber-700">Synthetic demo watchlist is read-only. Sign in to manage private target companies.</p>}
    {message && <p role="status" className="text-sm">{message}</p>}
    <div className="grid md:grid-cols-5 gap-2 text-sm">
      {select('priority', 'priority', <><option value="">All priorities</option><option>HIGH</option><option>MEDIUM</option><option>LOW</option></>)}
      {select('status', 'status', <><option value="">All statuses</option><option>ACTIVE</option><option>PAUSED</option><option>RESEARCH</option></>)}
      {select('lane', 'lane', <><option value="">All lanes</option>{WATCHLIST_LANES.map(value => <option key={value}>{value}</option>)}</>)}
      {select('source', 'source', <><option value="">All sources</option><option value="configured">Source configured</option><option value="missing">Source missing</option></>)}
      {select('monitoring', 'monitoring', <><option value="">All monitoring</option><option value="enabled">Monitoring enabled</option><option value="disabled">Monitoring disabled</option></>)}
    </div>
    <div className="space-y-3">{filtered.map(entry => {
      const source = sources.find(item => item.id === entry.atsSourceId);
      const scan = discoverySourceResults.find(result => result.sourceId === entry.atsSourceId);
      const monitorable = source?.enabled === true && entry.status === 'ACTIVE';
      const detail = detailFor(entry);
      return <article key={entry.id} className="border rounded p-4 space-y-3">
        <div className="flex justify-between gap-3"><div><h2 className="font-semibold">{entry.companyName}</h2><p className="text-sm text-slate-500">{source ? `Configured source: ${source.company} (${source.provider})` : 'Source not configured'}</p><p className="text-xs text-slate-500">{scan ? `This session: ${scan.status}; ${scan.selected} selected, ${scan.locationEligible} location / ${scan.roleEligible} role eligible from ${scan.fetched} fetched.` : 'This session: not yet scanned.'}</p>{entry.careersUrl && <a className="text-sm text-emerald-700 underline" href={entry.careersUrl} target="_blank" rel="noreferrer">Open careers page</a>}</div>{editable && <button type="button" disabled={saving} className="text-rose-700 text-sm" onClick={() => void mutate(companyWatchlist.filter(item => item.id !== entry.id), 'Target removed privately.')}>Remove</button>}</div>
        {editable && <>
          <div className="grid md:grid-cols-4 gap-2 text-sm">
            <label>Priority<select disabled={saving} value={entry.priority} onChange={event => void update(entry, { priority: event.target.value as CompanyWatchlistEntry['priority'] })}><option>HIGH</option><option>MEDIUM</option><option>LOW</option></select></label>
            <label>Status<select disabled={saving} value={entry.status} onChange={event => void update(entry, { status: event.target.value as CompanyWatchlistEntry['status'] })}><option>ACTIVE</option><option>PAUSED</option><option>RESEARCH</option></select></label>
            <label>Location<select disabled={saving} value={entry.locationPolicy} onChange={event => void update(entry, { locationPolicy: event.target.value as CompanyWatchlistEntry['locationPolicy'] })}><option>REMOTE_OK</option><option>LOCAL_HYBRID</option><option>ANY</option><option>UNKNOWN</option></select></label>
            <label>ATS source<select disabled={saving} value={entry.atsSourceId ?? ''} onChange={event => void update(entry, { atsSourceId: event.target.value || undefined })}><option value="">Not configured</option>{sources.map(item => <option key={item.id} value={item.id}>{item.company} ({item.provider})</option>)}</select></label>
          </div>
          <div className="grid md:grid-cols-2 gap-2 text-sm"><label>Careers URL<input disabled={saving} className="border rounded px-2 py-1 w-full" value={detail.careersUrl} onChange={event => setDetails({ ...details, [entry.id]: { ...detail, careersUrl: event.target.value } })}/></label><label>Notes<textarea disabled={saving} className="border rounded px-2 py-1 w-full" value={detail.notes} onChange={event => setDetails({ ...details, [entry.id]: { ...detail, notes: event.target.value } })}/></label></div>
          <button type="button" disabled={saving} className="text-sm text-emerald-700" onClick={() => void saveDetails(entry)}>Save details</button>
          <label className="text-sm"><input type="checkbox" disabled={saving || !monitorable} checked={entry.monitoringEnabled} onChange={event => void update(entry, { monitoringEnabled: event.target.checked })}/> Monitoring enabled {monitorable ? '' : '(requires ACTIVE status and an enabled configured source)'}</label>
          <fieldset disabled={saving}><legend className="text-sm">Career lanes</legend>{WATCHLIST_LANES.map(value => <label key={value} className="mr-3 text-xs"><input type="checkbox" checked={entry.lanes.includes(value)} onChange={event => void update(entry, { lanes: event.target.checked ? [...entry.lanes, value] : entry.lanes.filter(lane => lane !== value) })}/>{value}</label>)}</fieldset>
        </>}
      </article>;
    })}</div>
  </section>;
}
