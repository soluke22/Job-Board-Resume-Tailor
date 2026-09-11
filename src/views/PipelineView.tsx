import React, { useState } from 'react';
import {
  Briefcase,
  ExternalLink,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  ShieldCheck,
  Send,
  MessageSquare,
  Plus,
  Filter
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ApplicationStatus, JobRecord } from '../types';

const STAGES: { id: ApplicationStatus; label: string; color: string }[] = [
  { id: 'DISCOVERED', label: 'Discovered', color: 'border-slate-700 text-slate-300' },
  { id: 'SHORTLISTED', label: 'Shortlisted', color: 'border-blue-700 text-blue-300' },
  { id: 'TAILORED', label: 'Tailored', color: 'border-indigo-700 text-indigo-300' },
  { id: 'APPLIED', label: 'Applied', color: 'border-amber-700 text-amber-300' },
  { id: 'RECRUITER_SCREEN', label: 'Recruiter Screen', color: 'border-cyan-700 text-cyan-300' },
  { id: 'TECHNICAL', label: 'Technical / Pairing', color: 'border-purple-700 text-purple-300' },
  { id: 'FINAL_ONSITE', label: 'Final Round', color: 'border-pink-700 text-pink-300' },
  { id: 'OFFER', label: 'Offer Received', color: 'border-emerald-500 text-emerald-300' },
  { id: 'REJECTED', label: 'Archived / Rejected', color: 'border-red-900 text-red-400' }
];

export const PipelineView: React.FC = () => {
  const {
    jobs,
    logOutcome,
    openResumeEditor,
    openJobDetail,
    generateProofPack,
    generateOutreach,
    setCurrentView
  } = useApp();

  const [activeStageFilter, setActiveStageFilter] = useState<string>('all');
  const [selectedJobForOutcome, setSelectedJobForOutcome] = useState<JobRecord | null>(null);
  const [newStatus, setNewStatus] = useState<ApplicationStatus>('APPLIED');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const filteredJobs = jobs.filter((j) => {
    if (activeStageFilter !== 'all' && j.applicationStatus !== activeStageFilter) return false;
    return true;
  });

  const handleSaveOutcome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobForOutcome) return;
    logOutcome(selectedJobForOutcome.id, newStatus, outcomeNotes, rejectionReason);
    setSelectedJobForOutcome(null);
    setOutcomeNotes('');
    setRejectionReason('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
              Phase 2: Track &amp; Progress
            </span>
            <span className="text-xs text-slate-400">Application Lifecycle &amp; Outcomes</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Application Pipeline</h1>
          <p className="text-sm text-slate-300 mt-1">
            Tracks tailored submissions from initial discovery to offer. Every outcome updates your conversion model to improve future role ranking.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => setCurrentView('discover')}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-900/30 flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Discover Roles</span>
          </button>
        </div>
      </div>

      {/* Stage Chips */}
      <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveStageFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
            activeStageFilter === 'all'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
          }`}
        >
          All Stages ({jobs.length})
        </button>

        {STAGES.map((st) => {
          const count = jobs.filter((j) => j.applicationStatus === st.id).length;
          return (
            <button
              key={st.id}
              onClick={() => setActiveStageFilter(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer flex items-center space-x-1.5 ${
                activeStageFilter === st.id
                  ? 'bg-slate-800 text-white border-slate-600 shadow-md'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <span>{st.label}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950 font-semibold text-slate-300">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Jobs Grid / Cards */}
      <div className="space-y-3">
        {filteredJobs.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl">
            <Briefcase className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">No applications in this stage</h3>
            <p className="text-xs text-slate-400 mt-1">
              Select &quot;All Stages&quot; or discover new roles to populate your pipeline.
            </p>
          </div>
        ) : (
          filteredJobs.map((job) => {
            const hasResume = !!job.tailoredResume;
            const hasProofPack = !!job.proofPack;
            const hasOutreach = !!job.recruiterOutreach;

            return (
              <div
                key={job.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg space-y-3 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 border border-slate-700 text-white">
                        {job.applicationStatus || 'DISCOVERED'}
                      </span>
                      <span className="text-xs text-slate-400">{job.atsProvider.toUpperCase()}</span>
                      {job.appliedDate && (
                        <span className="text-xs text-slate-400">Applied: {job.appliedDate}</span>
                      )}
                    </div>
                    <h2 className="text-base font-bold text-white mt-1">
                      {job.title} · <span className="text-slate-300 font-normal">{job.company}</span>
                    </h2>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {job.location || 'Remote'} {job.compensation?.raw ? `· ${job.compensation.raw}` : ''}
                    </div>
                  </div>

                  {/* Stage Update Button */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => {
                        setSelectedJobForOutcome(job);
                        setNewStatus(job.applicationStatus || 'APPLIED');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer"
                    >
                      Update Stage &amp; Note
                    </button>

                    {job.canonicalUrl && (
                      <a
                        href={job.canonicalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs cursor-pointer"
                        title="Open ATS portal"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Status Badges & Quick Action Links */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center space-x-3">
                    <span
                      className={`flex items-center space-x-1 ${
                        hasResume ? 'text-emerald-400 font-medium' : 'text-slate-500'
                      }`}
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>{hasResume ? 'Resume Ready' : 'Resume Pending'}</span>
                    </span>

                    <span
                      className={`flex items-center space-x-1 ${
                        hasProofPack ? 'text-emerald-400 font-medium' : 'text-slate-500'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{hasProofPack ? 'Proof Pack Ready' : 'No Proof Pack'}</span>
                    </span>

                    <span
                      className={`flex items-center space-x-1 ${
                        hasOutreach ? 'text-emerald-400 font-medium' : 'text-slate-500'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{hasOutreach ? 'Outreach Ready' : 'No Outreach'}</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openResumeEditor(job.id)}
                      className="text-xs text-emerald-400 hover:underline cursor-pointer"
                    >
                      Open Studio
                    </button>
                    <span className="text-slate-700">·</span>
                    <button
                      onClick={() => generateProofPack(job.id)}
                      className="text-xs text-blue-400 hover:underline cursor-pointer"
                    >
                      Generate Proof Pack
                    </button>
                    <span className="text-slate-700">·</span>
                    <button
                      onClick={() => generateOutreach(job.id)}
                      className="text-xs text-purple-400 hover:underline cursor-pointer"
                    >
                      Draft Outreach
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Outcome Update Modal */}
      {selectedJobForOutcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">
              Update Status: {selectedJobForOutcome.company}
            </h3>

            <form onSubmit={handleSaveOutcome} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select Stage</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ApplicationStatus)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {STAGES.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>

              {newStatus === 'REJECTED' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Rejection Reason (For Learning Engine)
                  </label>
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Chose candidate with heavy GraphQL Apollo federation"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Reflection Notes / Feedback
                </label>
                <textarea
                  rows={3}
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  placeholder="Record interviewer questions, feedback, or process observations..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedJobForOutcome(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold"
                >
                  Save Outcome
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
