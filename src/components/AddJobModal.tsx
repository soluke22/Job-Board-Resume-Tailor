import React, { useState } from 'react';
import { X, Sparkles, Loader2, FileText, Link2, Building, Briefcase, Download } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddJobModal: React.FC<AddJobModalProps> = ({ isOpen, onClose }) => {
  const { addJob, analyzeJob } = useApp();

  const [company, setCompany] = useState('');
  const [title, setTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [rawDescription, setRawDescription] = useState('');
  const [userProvided, setUserProvided] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFetchUrl = async () => {
    if (!sourceUrl.trim() || !sourceUrl.startsWith('http')) {
      setErrorMessage('Please enter a valid URL starting with http:// or https://');
      return;
    }
    setIsFetchingUrl(true);
    setErrorMessage(null);
    try {
      const data = await apiService.fetchJobUrl(sourceUrl.trim());
      if (data.text) {
        setRawDescription(data.text);
        setUserProvided(false);
        if (data.title && !title) {
          setTitle(data.title.slice(0, 100));
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not fetch job posting from URL. Please paste the job description directly.');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawDescription.trim()) {
      setErrorMessage('Please provide a job description to analyze.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const createdJob = await addJob(rawDescription, sourceUrl, company, title, userProvided);
      await analyzeJob(createdJob.id);
      onClose();
      // Reset form
      setCompany('');
      setTitle('');
      setSourceUrl('');
      setRawDescription('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to analyze job.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSample = (type: 'frontend' | 'design-systems' | 'skip-backend') => {
    setUserProvided(true);
    if (type === 'frontend') {
      setCompany('Airbnb');
      setTitle('Frontend Engineer, Guest Experience');
      setSourceUrl('https://careers.airbnb.com/positions/frontend-engineer');
      setRawDescription(`About the Role:
We are looking for a Frontend Engineer to join our Guest Experience team. You will build responsive, accessible, and delightful booking workflows with React, TypeScript, and modern web standards.

Responsibilities:
- Build modular, high-performing web applications using React, TypeScript, and GraphQL.
- Ensure strict adherence to WCAG AA accessibility standards across desktop and mobile browsers.
- Work closely with designers and product managers to prototype and ship high-impact features.
- Write robust unit and integration tests with Jest and React Testing Library.
- Investigate and patch production frontend defects and performance regressions.

Requirements:
- 2+ years of professional experience with React and TypeScript.
- Strong knowledge of JavaScript (ES6+), DOM APIs, and CSS.
- Experience consuming GraphQL or RESTful APIs.
- Experience with frontend testing and debugging.

Nice to have:
- Experience with design systems or server-side rendering.`);
    } else if (type === 'design-systems') {
      setCompany('Vercel');
      setTitle('Design Systems Engineer');
      setSourceUrl('https://vercel.com/careers/design-systems-engineer');
      setRawDescription(`Role Overview:
Vercel is seeking a Design Systems Engineer to build and maintain the foundational UI primitives and design tokens powering our dashboard and developer tools.

Key Responsibilities:
- Design, build, and maintain accessible React UI component primitives.
- Maintain comprehensive Storybook documentation and design token architectures.
- Partner with product engineers to facilitate seamless adoption of component updates.
- Ensure 100% keyboard accessibility and screen-reader support across all components.

Requirements:
- Strong proficiency in React, TypeScript, and Tailwind CSS.
- Deep practical expertise in Web Accessibility (ARIA, focus management, screen readers).
- Experience building or maintaining shared component libraries and Storybook catalogs.
- High visual craftsmanship and typographic discipline.`);
    } else {
      setCompany('Datadog');
      setTitle('Staff Distributed Systems Engineer, Kernel & Storage Engine');
      setSourceUrl('https://careers.datadoghq.com/staff-distributed-systems');
      setRawDescription(`Role:
We are seeking a Staff Systems Engineer with 8+ years experience architecting distributed consensus storage engines in C++ and Go.

Key Requirements:
- 8+ years designing high-throughput distributed consensus protocols (Raft, Paxos).
- Deep expertise in C++, Go, Linux kernel internals, eBPF, and NVMe hardware optimizations.
- Proven track record managing petabyte-scale distributed database clusters.
- MS/PhD in Computer Science or published research in distributed systems.

Notice: This position is pure low-level storage engine architecture and contains NO web UI or frontend development.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden my-8">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Add Job for Fit Analysis
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              The AI evaluates requirements against the candidate evidence bank before any tailoring begins.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Sample Presets */}
        <div className="bg-slate-50 dark:bg-slate-800/60 px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
          <span className="text-slate-500 font-medium">Quick Presets:</span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => loadSample('frontend')}
              className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-200 hover:border-emerald-500 transition-colors cursor-pointer"
            >
              Airbnb (Frontend Fit)
            </button>
            <button
              type="button"
              onClick={() => loadSample('design-systems')}
              className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-200 hover:border-emerald-500 transition-colors cursor-pointer"
            >
              Vercel (UI Systems Fit)
            </button>
            <button
              type="button"
              onClick={() => loadSample('skip-backend')}
              className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-colors cursor-pointer"
            >
              Datadog (Skip / Stretch Test)
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>Company (Optional)</span>
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Airbnb, Stripe, Figma"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <span>Role Title (Optional)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Frontend Software Engineer"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                <Link2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Job Posting URL (Optional)</span>
              </label>
              {sourceUrl.trim() && (
                <button
                  type="button"
                  onClick={handleFetchUrl}
                  disabled={isFetchingUrl || isLoading}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1 font-medium cursor-pointer disabled:opacity-50"
                >
                  {isFetchingUrl ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Fetching URL...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3 h-3" />
                      <span>Fetch Job Content from URL</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://company.com/careers/..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Job Description Text *</span>
            </label>
            <textarea
              required
              rows={9}
              value={rawDescription}
              onChange={(e) => { setRawDescription(e.target.value); setUserProvided(true); }}
              placeholder="Paste the complete job description here..."
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Conservative fit scoring will classify into 1 of 4 role families.
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors flex items-center space-x-2 cursor-pointer shadow-xs"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing Fit...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Analyze Fit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
