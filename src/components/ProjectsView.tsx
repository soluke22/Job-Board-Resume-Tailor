import React from 'react';
import { FolderGit2, CheckCircle2, Shield, Users, Code2, ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ProjectsView: React.FC = () => {
  const { projects, setCurrentView } = useApp();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Defensible Technical Projects
          </h1>
          <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 text-xs font-semibold">
            {projects.length} Project records
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Record project context and supporting evidence for the skills you want to demonstrate.
        </p>
      </div>

      {projects.length === 0 && <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-sm space-y-2">
        <p>No project records yet. Use Setup to selectively import structured records when applicable; records are not verified by presence.</p>
        <button type="button" className="text-emerald-600 font-medium" onClick={() => setCurrentView('candidate-setup')}>Return to Setup and import</button>
      </div>}

      {/* Projects Cards List */}
      <div className="space-y-6">
        {projects.map((proj) => (
          <div
            key={proj.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>{proj.name}</span>
                </h2>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-0.5">
                  {proj.context}
                </p>
              </div>
              <span className="text-xs font-medium text-slate-500">{proj.period}</span>
            </div>

            {/* Technologies */}
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-xs font-medium text-slate-500">Tech Stack:</span>
              {proj.technologies.map((t, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                >
                  {t}
                </span>
              ))}
            </div>

            {/* Leadership & Implementation Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1.5">
                <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] flex items-center space-x-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-500" />
                  <span>Leadership & Collaboration Evidence</span>
                </span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {proj.leadershipEvidence}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1.5">
                <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] flex items-center space-x-1.5">
                  <Code2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Implementation Details</span>
                </span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {proj.implementationEvidence}
                </p>
              </div>
            </div>

            {/* Verified Bullets */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                Authorized Resume Bullets
              </span>
              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                {proj.bullets.map((b) => (
                  <li
                    key={b.id}
                    className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 leading-relaxed flex items-start space-x-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{b.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
