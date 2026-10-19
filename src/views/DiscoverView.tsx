import React, { useState } from 'react';
import {
  Compass,
  Search,
  SlidersHorizontal,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Sparkles,
  Building2,
  MapPin,
  DollarSign,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Filter,
  ArrowRight,
  Plus
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';
import { buildDiscoveryQueries, discoverySourcesForWorkspace, googleSearchUrl, type DiscoverySource } from '../utils/discovery';
import {
  JobRecord,
  AtsProvider,
  FreshnessBand,
  AtsVerificationStatus,
  PrimaryRoleFamily,
  DiscoveryWindowDays
} from '../types';

export const DiscoverView: React.FC = () => {
  const {
    jobs,
    discoverJobs,
    isDiscovering,
    discoverySourceResults,
    latestDiscoverySession,
    workspaceMode,
    authSession,
    verifyAtsStatus,
    openJobDetail,
    openResumeEditor,
    logOutcome,
    searchProfile,
    saveSearchProfile,
    setCurrentView,
    addJob
  } = useApp();

  const [filterFamily, setFilterFamily] = useState<string>('all');
  const [filterAts, setFilterAts] = useState<string>('all');
  const [filterFreshness, setFilterFreshness] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [discoveryWindowDays, setDiscoveryWindowDays] = useState<DiscoveryWindowDays>(14);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualText, setManualText] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [manualCompany, setManualCompany] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [sourceCompany, setSourceCompany] = useState('');
  const [sourceInput, setSourceInput] = useState('');
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [sourceBusy, setSourceBusy] = useState(false);

  const googleQueries = buildDiscoveryQueries(searchProfile, 10);
  const discoverySources = discoverySourcesForWorkspace(searchProfile, jobs).filter(source => !source.removed);

  const filteredJobs = jobs.filter((job) => {
    if (filterFamily !== 'all' && job.primaryRoleFamily !== filterFamily) return false;
    if (filterAts !== 'all' && job.atsProvider !== filterAts) return false;
    if (filterFreshness !== 'all' && job.freshnessBand !== filterFreshness) return false;
    if (filterPriority !== 'all' && job.applicationPriority !== filterPriority) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCompany = job.company.toLowerCase().includes(q);
      const matchTitle = job.title.toLowerCase().includes(q);
      const matchTech = (job.technologies || []).some((t) => t.toLowerCase().includes(q));
      if (!matchCompany && !matchTitle && !matchTech) return false;
    }
    return true;
  });

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim() && !manualUrl.trim()) return;
    await addJob(manualText, manualUrl, manualCompany, manualTitle);
    setManualText('');
    setManualUrl('');
    setManualCompany('');
    setManualTitle('');
    setIsManualModalOpen(false);
  };

  const persistSource = async (source: DiscoverySource) => {
    const sources = [...(searchProfile.discoverySources || []).filter(existing => existing.id !== source.id), source];
    await saveSearchProfile({ ...searchProfile, discoverySources: sources });
  };

  const handleAddSource = async (event: React.FormEvent) => {
    event.preventDefault(); setSourceError(null); setSourceBusy(true);
    try {
      const { source } = await apiService.validateDiscoverySource(sourceInput, sourceCompany);
      await persistSource({ ...source, removed: false });
      setSourceInput(''); setSourceCompany('');
    } catch (error: any) { setSourceError(error.message || 'Discovery source validation failed'); }
    finally { setSourceBusy(false); }
  };

  const setSourceEnabled = async (source: DiscoverySource, enabled: boolean) => {
    setSourceError(null);
    try { await persistSource({ ...source, origin: 'configured', enabled, removed: false }); }
    catch (error: any) { setSourceError(error.message || 'Discovery source update failed'); }
  };

  const removeSource = async (source: DiscoverySource) => {
    setSourceError(null);
    try { await persistSource({ ...source, origin: 'configured', enabled: false, removed: true }); }
    catch (error: any) { setSourceError(error.message || 'Discovery source removal failed'); }
  };

  const getPriorityBadgeClass = (priority?: string) => {
    switch (priority) {
      case 'APPLY FIRST':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700/80';
      case 'STRONG':
        return 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-700/80';
      case 'CALIBRATED STRETCH':
        return 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700/80';
      case 'LOW PRIORITY':
      case 'SKIP':
        return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  const getFreshnessBadgeClass = (band?: FreshnessBand) => {
    switch (band) {
      case 'NEW':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30';
      case 'RECENT':
        return 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30';
      case 'ESTABLISHED':
        return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600/50';
      case 'OLD':
        return 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                Discover & Verify
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Grounded ATS Sourcing · Real Canonical Boards
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
              High-Signal Job Discovery
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-700 dark:text-slate-300">
              Searches using your configured preferences, then checks exact supported ATS postings. Search leads are not verified facts or candidate fit assessments.
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-3 md:w-auto md:justify-end">
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center space-x-1.5 rounded-xl border border-slate-300 bg-slate-100 px-3.5 py-2 text-xs font-medium text-slate-800 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
            >
              <SlidersHorizontal className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <span>Search Profile</span>
            </button>

            <button
              onClick={() => setIsManualModalOpen(true)}
              className="flex items-center space-x-1.5 rounded-xl border border-slate-300 bg-slate-100 px-3.5 py-2 text-xs font-medium text-slate-800 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
            >
              <Plus className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                <span>Add Posting</span>
            </button>

            <label className="text-[11px] text-slate-600 dark:text-slate-400">
              <span className="sr-only">Discovery window</span>
              <select
                value={discoveryWindowDays}
                onChange={event=>setDiscoveryWindowDays(Number(event.target.value) as DiscoveryWindowDays)}
                disabled={isDiscovering}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                <option value={1}>Last 1 day</option>
                <option value={2}>Last 2 days</option>
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
              </select>
            </label>

            <button
              onClick={() => discoverJobs('ALL_ENABLED', discoveryWindowDays)}
              disabled={isDiscovering}
              className="flex w-full items-center justify-center space-x-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-800 disabled:opacity-50 sm:w-auto cursor-pointer"
            >
              {isDiscovering ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Discovering ATS Roles...</span>
                </>
              ) : (
                <>
                  <Compass className="w-4 h-4" />
                  <span>Scan All Enabled Sources</span>
                </>
              )}
            </button>
          </div>
        </div>

        {workspaceMode === 'PRIVATE_WORKSPACE' && authSession.isAuthenticated && discoverySourceResults.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2" aria-label="Latest discovery source outcomes">
            {discoverySourceResults.map(result => (
              <span key={result.sourceId} className={`rounded-lg border px-2.5 py-1 text-[11px] ${result.status === 'SUCCESS' ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-200'}`}>
                {result.sourceId}: {result.status === 'SUCCESS' ? `${result.selected} selected; ${result.locationEligible} location / ${result.roleEligible} role eligible (${result.fetched} fetched; ${result.health.toLowerCase().replaceAll('_',' ')})` : `scan failed (${result.health.toLowerCase().replaceAll('_',' ')})`}
              </span>
            ))}
          </div>
        )}

        {workspaceMode === 'PRIVATE_WORKSPACE' && authSession.isAuthenticated && latestDiscoverySession && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300" aria-label="Latest discovery diagnostic summary">
            <div className="font-semibold text-slate-800 dark:text-slate-200">
              Latest scan · {latestDiscoverySession.requestedWindowDays}-day window · {new Date(latestDiscoverySession.searchedAt).toLocaleString()}
            </div>
            <div className="mt-1">
              {latestDiscoverySession.totals.candidatesEncountered} encountered · {latestDiscoverySession.totals.selectedForVerification} selected · {latestDiscoverySession.totals.successfullyVerified} verified · {latestDiscoverySession.totals.newlyDiscovered} new · {latestDiscoverySession.totals.rediscovered} rediscovered
            </div>
            <div className="mt-1 text-slate-600 dark:text-slate-400">
              Excluded: company {latestDiscoverySession.filters.companyExcluded}, employment {latestDiscoverySession.filters.employmentExcluded + latestDiscoverySession.filters.employmentNotAllowed}, role {latestDiscoverySession.filters.roleExcluded}, location {latestDiscoverySession.filters.locationExcluded}, older {latestDiscoverySession.filters.knownOlderExcluded}, future {latestDiscoverySession.filters.futureExcluded}, duplicate {latestDiscoverySession.totals.duplicatesRemoved}, unknown-date overflow {latestDiscoverySession.filters.unknownDateUnselected}, cap {latestDiscoverySession.filters.capUnselected}. Empty boards: {latestDiscoverySession.sources.filter(source=>source.health === 'EMPTY_BOARD').length}. Zero eligible: {latestDiscoverySession.sources.filter(source=>source.health === 'ZERO_ELIGIBLE').length}. Provider errors: {latestDiscoverySession.providerErrors.map(error=>error.reason.toLowerCase().replaceAll('_',' ')).join(', ') || 'none'}.
            </div>
          </div>
        )}

        {/* Filters and Search Query */}
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5 dark:border-slate-800/80">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-600 dark:text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company, title, or skills..."
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3.5 text-xs text-slate-900 placeholder-slate-500 focus:border-emerald-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder-slate-400"
            />
          </div>

          {/* Role Family Filter */}
          <select
            value={filterFamily}
            onChange={(e) => setFilterFamily(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 cursor-pointer"
          >
            <option value="all">All Role Families</option>
            <option value="frontend-product">Frontend Product</option>
            <option value="ui-platform-design-systems">UI Platform / Design Systems</option>
            <option value="frontend-heavy-fullstack">Frontend Full Stack</option>
            <option value="forward-deployed-software">Forward Deployed</option>
          </select>

          {/* ATS Board Filter */}
          <select
            value={filterAts}
            onChange={(e) => setFilterAts(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 cursor-pointer"
          >
            <option value="all">All ATS Boards</option>
            <option value="ashby">Ashby Direct</option>
            <option value="greenhouse">Greenhouse</option>
            <option value="lever">Lever</option>
            <option value="workday">Workday</option>
            <option value="company-careers">Company Careers</option>
          </select>

          {/* Freshness Filter */}
          <select
            value={filterFreshness}
            onChange={(e) => setFilterFreshness(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 cursor-pointer"
          >
            <option value="all">All Freshness</option>
            <option value="NEW">New (&lt; 7 days)</option>
            <option value="RECENT">Recent (7-21 days)</option>
            <option value="ESTABLISHED">Established (21-45 days)</option>
            <option value="OLD">Old (&gt; 45 days)</option>
          </select>

          {/* Priority Filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="APPLY FIRST">Apply First</option>
            <option value="STRONG">Strong Match</option>
            <option value="CALIBRATED STRETCH">Calibrated Stretch</option>
            <option value="LOW PRIORITY">Low Priority</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900" aria-labelledby="discovery-sources-title">
          <div>
            <h2 id="discovery-sources-title" className="text-base font-bold text-slate-950 dark:text-white">Discovery Sources</h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Keyless scans use only validated public Ashby, Greenhouse, and Lever boards. Verified jobs can contribute learned board identities.</p>
          </div>
          <div className="space-y-2">
            {discoverySources.length ? discoverySources.map(source => (
              <div key={source.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950/50">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{source.company}</div>
                  <div className="text-slate-600 dark:text-slate-400">{source.provider} · {source.boardId} · {source.origin}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setSourceEnabled(source, !source.enabled)} className={`rounded-lg border px-2.5 py-1 ${source.enabled ? 'border-emerald-600 text-emerald-800 dark:border-emerald-700 dark:text-emerald-300' : 'border-slate-400 text-slate-700 dark:border-slate-700 dark:text-slate-300'}`}>
                    {source.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                  <button type="button" onClick={() => removeSource(source)} className="rounded-lg border border-slate-400 px-2.5 py-1 text-slate-700 hover:text-rose-700 dark:border-slate-700 dark:text-slate-300 dark:hover:text-rose-300">Remove</button>
                </div>
              </div>
            )) : <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">No public boards are configured or learned yet. Google exploration and manual posting import remain available.</p>}
          </div>
          <form onSubmit={handleAddSource} className="grid grid-cols-1 sm:grid-cols-[1fr_1.5fr_auto] gap-2">
            <input value={sourceCompany} onChange={event => setSourceCompany(event.target.value)} required maxLength={200} placeholder="Company label" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder-white/50" />
            <input value={sourceInput} onChange={event => setSourceInput(event.target.value)} required placeholder="Board URL or greenhouse:board" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder-white/50" />
            <button disabled={sourceBusy} className="rounded-xl bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200">{sourceBusy ? 'Validating…' : 'Add Source'}</button>
          </form>
          {sourceError && <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">{sourceError}</p>}
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900" aria-labelledby="broader-search-title">
          <div>
            <h2 id="broader-search-title" className="text-base font-bold text-slate-950 dark:text-white">Broader Web Search</h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Open a targeted Google search, then add useful postings back to CareerOS. CareerOS does not scrape Google or require a search API key.</p>
          </div>
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {googleQueries.map(query => (
              <div key={query} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                <code className="break-all text-[11px] text-slate-700 dark:text-slate-300">{query}</code>
                <a href={googleSearchUrl(query)} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300">
                  Search Google
                </a>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Discovered Postings List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1 text-xs text-slate-600 dark:text-slate-400">
          <span>Showing {filteredJobs.length} workspace postings and discovery leads</span>
          <span>Classification is not fit</span>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900/60">
            <Compass className="mx-auto mb-3 h-10 w-10 text-slate-500 dark:text-slate-600" />
            <h3 className="text-base font-semibold text-slate-950 dark:text-white">No postings match current filters</h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Scan a configured public board, open a targeted Google search, or add a posting URL/JD.
            </p>
          </div>
        ) : (
          filteredJobs.map((job) => {
            const hasBlockers = (job.hardBlockers || []).length > 0;
            return (
              <div
                key={job.id}
                className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getPriorityBadgeClass(
                          job.applicationPriority
                        )}`}
                      >
                        {job.applicationPriority || 'UNRATED'}
                      </span>

                      {job.freshnessBand && (
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-medium border flex items-center space-x-1 ${getFreshnessBadgeClass(
                            job.freshnessBand
                          )}`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{job.freshnessBand === 'UNKNOWN' ? 'Publication date unknown' : job.freshnessBand}</span>
                        </span>
                      )}
                      <span className="text-[11px] text-slate-600 dark:text-slate-400">First seen {new Date(job.firstSeenAt).toLocaleDateString()}</span>

                      <span className="rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {job.atsProvider.toUpperCase()}
                      </span>

                      <span className="rounded border border-sky-300 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-800 dark:border-sky-800/40 dark:bg-sky-950/40 dark:text-sky-300">
                        {job.sourceChannel || 'Web Search Lead'}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-medium border flex items-center space-x-1 ${
                          job.verificationStatus === 'LISTED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40'
                            : 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40'
                        }`}
                      >
                        {job.verificationStatus === 'LISTED' ? (
                          <ShieldCheck className="w-3 h-3" />
                        ) : (
                          <ShieldAlert className="w-3 h-3" />
                        )}
                        <span>{job.verificationStatus}</span>
                      </span>
                    </div>

                    <h2 className="mt-2 flex items-center space-x-2 text-lg font-bold text-slate-950 dark:text-white">
                      <span>{job.title}</span>
                    </h2>

                    <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                      <span className="flex items-center space-x-1 font-semibold text-slate-800 dark:text-slate-200">
                        <Building2 className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                        <span>{job.company}</span>
                      </span>

                      <span className="flex items-center space-x-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                        <span>{job.location || 'Location unknown'}</span>
                      </span>

                      {job.remoteStatus === 'unknown' && <span className="text-amber-800 dark:text-amber-300">Workplace unknown · confirm attendance</span>}

                      {job.compensation?.raw && (
                        <span className="flex items-center space-x-1 font-medium text-emerald-700 dark:text-emerald-300">
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>{job.compensation.raw}</span>
                        </span>
                      )}

                      {job.primaryRoleFamily && (
                        <span className="text-slate-600 dark:text-slate-400">
                          Family: <strong className="text-slate-700 dark:text-slate-300">{job.primaryRoleFamily}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Top Right Action Buttons */}
                  <div className="flex items-center space-x-2 shrink-0">
                    {job.canonicalUrl && (
                      <a
                        href={job.canonicalUrl || job.discoveryUrl || job.sourceUrl || undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center space-x-1 rounded-xl border border-slate-300 bg-slate-100 p-2 text-xs text-slate-700 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                        title="View direct canonical ATS posting"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Canonical ATS</span>
                      </a>
                    )}

                    <button
                      onClick={() => verifyAtsStatus(job.id)}
                      className="flex items-center space-x-1 rounded-xl border border-slate-300 bg-slate-100 p-2 text-xs text-slate-700 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                      title="Re-verify active status with ATS API"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
                      <span className="hidden sm:inline">Verify</span>
                    </button>
                  </div>
                </div>

                {/* Description Snippet & Requirements */}
                <div className="line-clamp-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 dark:border-slate-800/80 dark:bg-slate-950/40 dark:text-slate-300">
                  {job.description || job.rawDescription || `Discovery summary (unverified): ${job.discoverySummary || 'Canonical content unavailable'}`}
                </div>

                {/* Hiring Signals and Blockers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Hiring Signals */}
                  <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800/80 dark:bg-slate-950/40">
                    <div className="flex items-center space-x-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      <Sparkles className="w-3 h-3" />
                      <span>Top Alignment Signals</span>
                    </div>
                    <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                      {(job.hiringSignals?.length ? job.hiringSignals : [job.priorityReason || 'Not assessed']).slice(0, 2).map((sig, i) => (
                        <li key={i} className="flex items-start space-x-1.5">
                          <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-700 dark:text-emerald-300" />
                          <span>{sig}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Blockers or Soft Gaps */}
                  <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800/80 dark:bg-slate-950/40">
                    <div className="flex items-center space-x-1 text-[11px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      <AlertCircle className="w-3 h-3" />
                      <span>Screening &amp; Blocker Check</span>
                    </div>
                    {hasBlockers ? (
                      <div className="text-red-700 dark:text-red-300 flex items-start space-x-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        <span>{job.hardBlockers[0]}</span>
                      </div>
                    ) : (
                      <div className="flex items-start space-x-1.5 text-slate-700 dark:text-slate-300">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" />
                        <span>Qualification and evidence coverage have not been assessed.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Workflow Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-2 dark:border-slate-800/60">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Current Pipeline Stage:</span>
                    <span className="rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                      {job.applicationStatus || 'DISCOVERED'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2.5">
                    <button
                      onClick={() => openJobDetail(job.id)}
                      className="rounded-xl border border-slate-300 bg-slate-100 px-3.5 py-1.5 text-xs font-medium text-slate-800 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      Deep Fit &amp; Gap Check
                    </button>

                    <button
                      onClick={() => openResumeEditor(job.id)}
                      className="flex items-center space-x-1.5 rounded-xl bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-emerald-900/20 transition hover:bg-emerald-800 cursor-pointer"
                    >
                      <span>Tailor Resume</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Manual Paste Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-300 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-950 dark:text-white">Add Posting</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">Paste a URL, a job description, or both. Supported ATS URLs are verified canonically; every imported role remains UNASSESSED.</p>
            <form onSubmit={handleManualAdd} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-700 dark:text-slate-300">Company</label>
                  <input
                    type="text"
                    value={manualCompany}
                    onChange={(e) => setManualCompany(e.target.value)}
                    placeholder="e.g. Linear"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder-white/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-700 dark:text-slate-300">Role Title</label>
                  <input
                    type="text"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="e.g. Frontend Engineer"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder-white/50"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-700 dark:text-slate-300">Posting URL</label>
                <input
                  type="url"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://jobs.ashbyhq.com/..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder-white/50"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-700 dark:text-slate-300">Job Description (optional when URL is present)</label>
                <textarea
                  rows={5}
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Paste full job description here..."
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 placeholder-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder-white/50"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="rounded-xl bg-slate-200 px-4 py-2 text-xs text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                >
                  Add Unassessed Posting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search Profile Drawer / Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl border border-slate-300 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-950 dark:text-white">Search Preferences &amp; Blockers</h3>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="text-sm text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                  Preferred Role Families
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {searchProfile.preferredRoleFamilies.map((fam, i) => (
                    <span
                      key={i}
                      className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    >
                      {fam}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                  Excluded Patterns (Deterministic Skip)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {searchProfile.excludedRolePatterns.map((pat, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-red-50 border border-red-300 text-red-800 dark:bg-red-950/50 dark:border-red-800 dark:text-red-300"
                    >
                      {pat}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                  Salary Preference
                </label>
                <div className="text-slate-700 dark:text-slate-300">
                  Target: <strong>${searchProfile.salaryPreference?.minTarget?.toLocaleString()}</strong> USD/yr
                </div>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                  Security Clearance Policy
                </label>
                <div className="text-slate-700 dark:text-slate-300">
                  {searchProfile.clearancePolicy === 'exclude_clearance'
                    ? 'Strictly exclude roles requiring active security clearances'
                    : 'Permit clearance roles'}
                </div>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                  Hiring Process Preferences
                </label>
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  {searchProfile.hiringProcessPreferences?.notes || 'Prioritizes practical pairing and architecture.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 cursor-pointer"
              >
                Close &amp; Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
