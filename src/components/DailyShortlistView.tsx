import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, BriefcaseBusiness, Clock3, ExternalLink, Loader2, MapPin, ShieldAlert } from 'lucide-react';
import type { JobRecord } from '../types';
import { useApp } from '../context/AppContext';
import { assessmentDisplay } from '../utils/assessmentView';
import { normalizedJobUrl } from '../utils/jobIdentity';
import { compensationSummary, formatScanStatus, performShortlistDecision, selectDailyShortlist, shortlistRelevance, shortlistVerification, useShortlistClock, type ShortlistDecision, type ShortlistWindow } from '../utils/shortlist';

const labels: Record<ShortlistWindow, { title: string; detail: string }> = {
  daily: { title: 'Published in the last 24 hours', detail: 'Actual publication timestamps only. Older and unknown-date postings are kept separate.' },
  recent: { title: 'Other postings from the last 14 days', detail: 'Published more than 24 hours ago and no more than 14 days ago.' },
  unknown: { title: 'Publication date unknown', detail: 'These postings are not treated as recent.' }
};

export type DailyShortlistPresenterProps = {
  jobs: JobRecord[];
  now: number;
  isDiscovering?: boolean;
  error?: string | null;
  scannedAt?: string | null;
  onOpen: (id: string) => void;
  onDiscover: () => void;
  onDecision: (jobId: string, decision: ShortlistDecision) => Promise<void>;
};

function publicationLabel(job: JobRecord) {
  if (!job.publishedAt || !Number.isFinite(Date.parse(job.publishedAt))) return 'Publication date unknown';
  return `Published ${new Date(job.publishedAt).toLocaleString()}`;
}

function workplaceLabel(job: JobRecord) {
  const kind = job.remoteStatus === 'remote' ? 'Remote' : job.remoteStatus === 'hybrid' ? 'Hybrid' : job.remoteStatus === 'onsite' ? 'Onsite' : 'Workplace unknown';
  return job.location ? `${kind} · ${job.location}` : kind;
}

const JobCard: React.FC<{ job: JobRecord; onOpen: (id: string) => void; onDecision: (id: string, decision: ShortlistDecision) => Promise<void> }> = ({ job, onOpen, onDecision }) => {
  const [pending, setPending] = useState<ShortlistDecision | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const decisionInFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const display = assessmentDisplay(job);
  const compensation = compensationSummary(job.compensation);
  const verification = shortlistVerification(job);
  const url = [job.canonicalUrl, job.applyUrl, job.sourceUrl]
    .map(normalizedJobUrl)
    .find((value): value is string => !!value);
  const decide = async (decision: ShortlistDecision) => {
    if (decisionInFlight.current) return;
    decisionInFlight.current = true;
    setPending(decision); setFailure(null);
    try { await onDecision(job.id, decision); }
    catch (error: any) { if (mounted.current) setFailure(error?.message || 'The decision was not saved.'); }
    finally { decisionInFlight.current = false; if (mounted.current) setPending(null); }
  };
  return <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="font-semibold text-slate-950 dark:text-white">{job.company}</p>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{job.title}</h2>
        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">Role family: {job.primaryRoleFamily || job.parsed?.classifiedFamily || 'Unclassified'}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300">
          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1"><Clock3 className="mr-1 inline h-3.5 w-3.5" />{publicationLabel(job)}</span>
          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1"><MapPin className="mr-1 inline h-3.5 w-3.5" />{workplaceLabel(job)}</span>
        </div>
      </div>
      {url && <a href={url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-300">Original posting <ExternalLink className="h-3.5 w-3.5" /></a>}
    </div>
    <div className="grid gap-3 text-sm sm:grid-cols-2">
      <section><p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Relevance</p><p className="mt-1 text-slate-700 dark:text-slate-200">{shortlistRelevance(job)}</p>{display.state === 'current' && <><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Current assessment: {display.fit?.applicationPriority} · {display.fit?.qualificationFit}/10</p>{display.biggestActualGap && <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Known gap: {display.biggestActualGap}</p>}{display.fit?.unknownConstraints?.slice(0, 2).map(concern => <p key={concern} className="mt-1 text-xs text-amber-700 dark:text-amber-300">Confirm: {concern}</p>)}</>}</section>
      <section><p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Compensation</p>{compensation.lines.length ? compensation.lines.map(line => <p key={line} className="mt-1 text-slate-700 dark:text-slate-200">{line}</p>) : <p className="mt-1 text-slate-500 dark:text-slate-400">Not reliably disclosed.</p>}{compensation.uncertainty && <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{compensation.uncertainty}</p>}</section>
    </div>
    {verification.length > 0 && <section className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"><p className="font-semibold"><ShieldAlert className="mr-1 inline h-3.5 w-3.5" />Verification needed</p><ul className="mt-1 list-disc pl-5">{verification.map(issue => <li key={issue}>{issue}</li>)}</ul></section>}
    {failure && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{failure}</p>}
    <div className="flex flex-wrap gap-2">
      <button onClick={() => onOpen(job.id)} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600">Review / analysis</button>
      <button disabled={!!pending} onClick={() => decide('pursue')} className="rounded-lg border border-emerald-300 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40">{pending === 'pursue' ? 'Saving…' : job.applicationStatus === 'SHORTLISTED' ? 'Shortlisted' : 'Pursue'}</button>
      <button disabled={!!pending} onClick={() => decide('dismiss')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">{pending === 'dismiss' ? 'Saving…' : 'Dismiss'}</button>
    </div>
    <p className="text-xs text-slate-500 dark:text-slate-400">Pursue saves Shortlisted. Dismiss archives. Neither applies to this job.</p>
  </article>;
};

export const DailyShortlistPresenter: React.FC<DailyShortlistPresenterProps> = ({ jobs, now, isDiscovering, error, scannedAt, onOpen, onDiscover, onDecision }) => {
  const [window, setWindow] = useState<ShortlistWindow>('daily');
  const shortlist = useMemo(() => selectDailyShortlist(jobs, now), [jobs, now]);
  const entries = shortlist[window];
  return <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Approval-based review queue</p><h1 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">Daily shortlist</h1><p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">Up to ten unique reviewable postings per view. Ordered by current priority and qualification fit, then newest publication. Unassessed records remain review-needed.</p></div><button onClick={onDiscover} className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><ArrowUpRight className="h-4 w-4" />Open discovery</button></div><p role="status" className="mt-4 text-xs text-slate-500 dark:text-slate-400">{formatScanStatus(scannedAt, now)} {shortlist.available} reviewable opportunities; {shortlist.verificationNeeded} need verification.</p></header>
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">Shortlist data may be incomplete: {error}</p>}
    <div role="group" aria-label="Shortlist timeframe" className="flex flex-wrap gap-2">{(Object.keys(labels) as ShortlistWindow[]).map(key => <button key={key} aria-pressed={window === key} onClick={() => setWindow(key)} className={`rounded-full px-3 py-1.5 text-sm font-medium ${window === key ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>{key === 'daily' ? 'Last 24 hours' : key === 'recent' ? 'Other 14 days' : 'Unknown dates'} ({shortlist.counts[key]})</button>)}</div>
    <section aria-live="polite" className="space-y-3"><div><h2 className="text-lg font-semibold text-slate-900 dark:text-white">{labels[window].title}</h2><p className="text-sm text-slate-500 dark:text-slate-400">{labels[window].detail}</p></div>{isDiscovering ? <p role="status" className="rounded-xl border border-slate-200 p-5 text-slate-600 dark:border-slate-800 dark:text-slate-300"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Discovery is running; no shortlist refresh is started here.</p> : entries.length ? entries.map(job => <JobCard key={job.id} job={job} onOpen={onOpen} onDecision={onDecision} />) : <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-600 dark:border-slate-700 dark:text-slate-300"><BriefcaseBusiness className="mx-auto h-6 w-6" /><p className="mt-2 font-medium">No postings in this view.</p><p className="mt-1 text-sm">The shortlist does not fill daily results with older or unknown-date postings.</p></div>}</section>
  </div>;
};

export const DailyShortlistView: React.FC = () => {
  const { jobs, isDiscovering, error, latestDiscoverySession, openJobDetail, setCurrentView, logOutcome } = useApp();
  const now = useShortlistClock();
  return <DailyShortlistPresenter key="daily-shortlist" jobs={jobs} now={now} isDiscovering={isDiscovering} error={error} scannedAt={latestDiscoverySession?.searchedAt} onOpen={openJobDetail} onDiscover={() => setCurrentView('discover')} onDecision={(jobId, decision) => performShortlistDecision(jobId, decision, logOutcome)} />;
};
