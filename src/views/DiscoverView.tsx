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
  PrimaryRoleFamily
} from '../types';

export const DiscoverView: React.FC = () => {
  const {
    jobs,
    discoverJobs,
    isDiscovering,
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
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80';
      case 'STRONG':
        return 'bg-blue-950/80 text-blue-300 border-blue-700/80';
      case 'CALIBRATED STRETCH':
        return 'bg-amber-950/80 text-amber-300 border-amber-700/80';
      case 'LOW PRIORITY':
      case 'SKIP':
        return 'bg-slate-800 text-slate-400 border-slate-700';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getFreshnessBadgeClass = (band?: FreshnessBand) => {
    switch (band) {
      case 'NEW':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'RECENT':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'ESTABLISHED':
        return 'bg-slate-700/50 text-slate-300 border-slate-600/50';
      case 'OLD':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Discover & Verify
              </span>
              <span className="text-xs text-slate-400">
                Grounded ATS Sourcing · Real Canonical Boards
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-1">
              High-Signal Job Discovery
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Searches using your configured preferences, then checks exact supported ATS postings. Search leads are not verified facts or candidate fit assessments.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center space-x-1.5 transition cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
              <span>Search Profile</span>
            </button>

            <button
              onClick={() => setIsManualModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
                <span>Add Posting</span>
            </button>

            <button
              onClick={() => discoverJobs(3)}
              disabled={isDiscovering}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-900/30 flex items-center space-x-2 transition cursor-pointer disabled:opacity-50"
            >
              {isDiscovering ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Discovering ATS Roles...</span>
                </>
              ) : (
                <>
                  <Compass className="w-4 h-4" />
                  <span>Discover New Roles</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filters and Search Query */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company, title, or skills..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Role Family Filter */}
          <select
            value={filterFamily}
            onChange={(e) => setFilterFamily(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
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
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
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
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
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
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
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
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4" aria-labelledby="discovery-sources-title">
          <div>
            <h2 id="discovery-sources-title" className="text-base font-bold text-white">Discovery Sources</h2>
            <p className="text-xs text-slate-400 mt-1">Keyless scans use only validated public Ashby, Greenhouse, and Lever boards. Verified jobs can contribute learned board identities.</p>
          </div>
          <div className="space-y-2">
            {discoverySources.length ? discoverySources.map(source => (
              <div key={source.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs">
                <div>
                  <div className="font-semibold text-slate-200">{source.company}</div>
                  <div className="text-slate-500">{source.provider} · {source.boardId} · {source.origin}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setSourceEnabled(source, !source.enabled)} className={`rounded-lg border px-2.5 py-1 ${source.enabled ? 'border-emerald-700 text-emerald-300' : 'border-slate-700 text-slate-400'}`}>
                    {source.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                  <button type="button" onClick={() => removeSource(source)} className="rounded-lg border border-slate-700 px-2.5 py-1 text-slate-400 hover:text-rose-300">Remove</button>
                </div>
              </div>
            )) : <p className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-400">No public boards are configured or learned yet. Google exploration and manual posting import remain available.</p>}
          </div>
          <form onSubmit={handleAddSource} className="grid grid-cols-1 sm:grid-cols-[1fr_1.5fr_auto] gap-2">
            <input value={sourceCompany} onChange={event => setSourceCompany(event.target.value)} required maxLength={200} placeholder="Company label" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <input value={sourceInput} onChange={event => setSourceInput(event.target.value)} required placeholder="Board URL or greenhouse:board" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white" />
            <button disabled={sourceBusy} className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 disabled:opacity-50">{sourceBusy ? 'Validating…' : 'Add Source'}</button>
          </form>
          {sourceError && <p role="alert" className="text-xs text-rose-300">{sourceError}</p>}
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4" aria-labelledby="broader-search-title">
          <div>
            <h2 id="broader-search-title" className="text-base font-bold text-white">Broader Web Search</h2>
            <p className="text-xs text-slate-400 mt-1">Open a targeted Google search, then add useful postings back to CareerOS. CareerOS does not scrape Google or require a search API key.</p>
          </div>
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {googleQueries.map(query => (
              <div key={query} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                <code className="text-[11px] text-slate-300 break-all">{query}</code>
                <a href={googleSearchUrl(query)} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg border border-sky-800 bg-sky-950/40 px-2.5 py-1.5 text-xs font-semibold text-sky-300">
                  Search Google
                </a>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Discovered Postings List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>Showing {filteredJobs.length} workspace postings and discovery leads</span>
          <span>Classification is not fit</span>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl">
            <Compass className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">No postings match current filters</h3>
            <p className="text-xs text-slate-400 mt-1">
              Scan a configured public board, open a targeted Google search, or add a posting URL/JD.
            </p>
          </div>
        ) : (
          filteredJobs.map((job) => {
            const hasBlockers = (job.hardBlockers || []).length > 0;
            return (
              <div
                key={job.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 transition shadow-lg space-y-4"
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
                      <span className="text-[11px] text-slate-400">First seen {new Date(job.firstSeenAt).toLocaleDateString()}</span>

                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 border border-slate-700 text-slate-300">
                        {job.atsProvider.toUpperCase()}
                      </span>

                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-sky-950/40 border border-sky-800/40 text-sky-300">
                        {job.sourceChannel || 'Web Search Lead'}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-medium border flex items-center space-x-1 ${
                          job.verificationStatus === 'LISTED'
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                            : 'bg-amber-950/40 text-amber-400 border-amber-800/40'
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

                    <h2 className="text-lg font-bold text-white mt-2 flex items-center space-x-2">
                      <span>{job.title}</span>
                    </h2>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-1">
                      <span className="font-semibold text-slate-200 flex items-center space-x-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{job.company}</span>
                      </span>

                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{job.location || 'Location unknown'}</span>
                      </span>

                      {job.compensation?.raw && (
                        <span className="flex items-center space-x-1 text-emerald-400 font-medium">
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>{job.compensation.raw}</span>
                        </span>
                      )}

                      {job.primaryRoleFamily && (
                        <span className="text-slate-400">
                          Family: <strong className="text-slate-300">{job.primaryRoleFamily}</strong>
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
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs flex items-center space-x-1 transition cursor-pointer"
                        title="View direct canonical ATS posting"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Canonical ATS</span>
                      </a>
                    )}

                    <button
                      onClick={() => verifyAtsStatus(job.id)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs flex items-center space-x-1 transition cursor-pointer"
                      title="Re-verify active status with ATS API"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                      <span className="hidden sm:inline">Verify</span>
                    </button>
                  </div>
                </div>

                {/* Description Snippet & Requirements */}
                <div className="text-xs text-slate-300 line-clamp-2 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                  {job.description || job.rawDescription || `Discovery summary (unverified): ${job.discoverySummary || 'Canonical content unavailable'}`}
                </div>

                {/* Hiring Signals and Blockers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Hiring Signals */}
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-1">
                    <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center space-x-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Top Alignment Signals</span>
                    </div>
                    <ul className="space-y-1 text-slate-300">
                      {(job.hiringSignals?.length ? job.hiringSignals : [job.priorityReason || 'Not assessed']).slice(0, 2).map((sig, i) => (
                        <li key={i} className="flex items-start space-x-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{sig}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Blockers or Soft Gaps */}
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-1">
                    <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center space-x-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>Screening &amp; Blocker Check</span>
                    </div>
                    {hasBlockers ? (
                      <div className="text-red-300 flex items-start space-x-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                        <span>{job.hardBlockers[0]}</span>
                      </div>
                    ) : (
                      <div className="text-slate-300 flex items-start space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Qualification and evidence coverage have not been assessed.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Workflow Action Bar */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/60">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400">Current Pipeline Stage:</span>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-white border border-slate-700">
                      {job.applicationStatus || 'DISCOVERED'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2.5">
                    <button
                      onClick={() => openJobDetail(job.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer"
                    >
                      Deep Fit &amp; Gap Check
                    </button>

                    <button
                      onClick={() => openResumeEditor(job.id)}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-900/20 flex items-center space-x-1.5 transition cursor-pointer"
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
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Add Posting</h3>
            <p className="text-xs text-slate-400">Paste a URL, a job description, or both. Supported ATS URLs are verified canonically; every imported role remains UNASSESSED.</p>
            <form onSubmit={handleManualAdd} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Company</label>
                  <input
                    type="text"
                    value={manualCompany}
                    onChange={(e) => setManualCompany(e.target.value)}
                    placeholder="e.g. Linear"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Role Title</label>
                  <input
                    type="text"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="e.g. Frontend Engineer"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Posting URL</label>
                <input
                  type="url"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://jobs.ashbyhq.com/..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Job Description (optional when URL is present)</label>
                <textarea
                  rows={5}
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Paste full job description here..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
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
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Search Preferences &amp; Blockers</h3>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Preferred Role Families
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {searchProfile.preferredRoleFamilies.map((fam, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300"
                    >
                      {fam}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Excluded Patterns (Deterministic Skip)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {searchProfile.excludedRolePatterns.map((pat, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-red-950/50 border border-red-800 text-red-300"
                    >
                      {pat}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Salary Preference
                </label>
                <div className="text-slate-300">
                  Target: <strong>${searchProfile.salaryPreference?.minTarget?.toLocaleString()}</strong> USD/yr
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Security Clearance Policy
                </label>
                <div className="text-slate-300">
                  {searchProfile.clearancePolicy === 'exclude_clearance'
                    ? 'Strictly exclude roles requiring active security clearances'
                    : 'Permit clearance roles'}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Hiring Process Preferences
                </label>
                <p className="text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  {searchProfile.hiringProcessPreferences?.notes || 'Prioritizes practical pairing and architecture.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
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
