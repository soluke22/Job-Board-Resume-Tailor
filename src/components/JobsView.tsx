import React, { useState } from 'react';
import {
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Trash2,
  ExternalLink,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RoleFamily, Verdict } from '../types';
import { AddJobModal } from './AddJobModal';

export const JobsView: React.FC = () => {
  const { jobs, openJobDetail, openResumeEditor, deleteJob } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [verdictFilter, setVerdictFilter] = useState<Verdict | 'All'>('All');
  const [familyFilter, setFamilyFilter] = useState<RoleFamily | 'All'>('All');
  const [isAddJobOpen, setIsAddJobOpen] = useState(false);

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesVerdict =
      verdictFilter === 'All' || job.fit?.verdict === verdictFilter;

    const matchesFamily =
      familyFilter === 'All' || job.parsed?.classifiedFamily === familyFilter;

    return matchesSearch && matchesVerdict && matchesFamily;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Job Evaluation & Fit Pipeline
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Conservative evaluation ensures we only generate materials for verified skillset matches.
          </p>
        </div>
        <button
          onClick={() => setIsAddJobOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg shadow-xs transition-colors flex items-center space-x-2 self-start sm:self-auto cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Job Description</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by company or role..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Verdict Filter Buttons */}
          <div className="flex items-center space-x-1 self-start sm:self-auto w-full sm:w-auto overflow-x-auto">
            {(['All', 'Apply', 'Borderline', 'Skip'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVerdictFilter(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  verdictFilter === v
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Role Family Pill Strip */}
        <div className="flex items-center space-x-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs overflow-x-auto">
          <span className="text-slate-400 text-[11px] font-medium mr-1 flex items-center space-x-1 shrink-0">
            <Filter className="w-3 h-3" />
            <span>Family:</span>
          </span>
          {[
            { id: 'All', label: 'All Families' },
            { id: 'frontend-product-engineer', label: 'Frontend Product' },
            { id: 'ui-platform-design-systems', label: 'UI Platform & Systems' },
            { id: 'internal-tools-fullstack-frontend', label: 'Internal Tools' },
            { id: 'production-support-frontend', label: 'Production Support' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFamilyFilter(f.id as any)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                familyFilter === f.id
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs Table / Card List */}
      <div className="space-y-3">
        {filteredJobs.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <p className="text-sm text-slate-500">No jobs match your selected filters.</p>
          </div>
        ) : (
          filteredJobs.map((job) => {
            const verdict = job.fit?.verdict || 'Borderline';
            const canTailor = job.fit?.canTailor ?? true;

            return (
              <div
                key={job.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="font-semibold text-slate-900 dark:text-white text-base">
                      {job.company}
                    </span>
                    {job.parsed?.classifiedFamily && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {job.parsed.classifiedFamily}
                      </span>
                    )}
                    {job.fit && (
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider flex items-center space-x-1 ${
                          verdict === 'Apply'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : verdict === 'Borderline'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        {verdict === 'Apply' && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                        {verdict === 'Borderline' && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                        {verdict === 'Skip' && <XCircle className="w-3 h-3 inline mr-1" />}
                        <span>{verdict}</span>
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {job.title}
                  </p>

                  <div className="flex items-center space-x-4 text-xs text-slate-500 flex-wrap">
                    {job.fit ? (
                      <>
                        <span>
                          Initial Fit:{' '}
                          <strong className="text-slate-700 dark:text-slate-300">
                            {job.fit.initialFitScore} / 10
                          </strong>
                        </span>
                        <span>
                          Best Truthful Fit:{' '}
                          <strong className="text-emerald-600 dark:text-emerald-400">
                            {job.fit.tailoredFitScore} / 10
                          </strong>
                        </span>
                      </>
                    ) : (
                      <span className="text-amber-500">Analysis pending</span>
                    )}
                    <span>Status: {job.status}</span>
                    <span>Added: {job.dateAdded}</span>
                  </div>

                  {job.fit?.verdictReason && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 pt-1 line-clamp-2">
                      {job.fit.verdictReason}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => openJobDetail(job.id)}
                    className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                  >
                    Fit & Evidence
                  </button>

                  {canTailor ? (
                    <button
                      onClick={() => openResumeEditor(job.id)}
                      className="px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Tailor Studio</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => openJobDetail(job.id)}
                      className="px-3 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg cursor-pointer"
                    >
                      Skip Guardrail
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (confirm(`Delete job for ${job.company}?`)) {
                        deleteJob(job.id);
                      }
                    }}
                    title="Delete Job"
                    className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <AddJobModal isOpen={isAddJobOpen} onClose={() => setIsAddJobOpen(false)} />
    </div>
  );
};
