import React, { useState } from 'react';
import { FileText, Save, Check, RotateCcw, ShieldCheck, Printer, ClipboardCopy, Copy } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ResumePaper } from './ResumePaper';
import { TailoredResume } from '../types';

export const MasterResumeView: React.FC = () => {
  const { masterResume, saveMasterResume, setIsQuickGrabOpen } = useApp();
  const [editableResume, setEditableResume] = useState<TailoredResume>(
    JSON.parse(JSON.stringify(masterResume))
  );
  const [savedNotice, setSavedNotice] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const handleSave = () => {
    saveMasterResume(editableResume);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleReset = () => {
    setEditableResume(JSON.parse(JSON.stringify(masterResume)));
  };

  const copyMasterPlainText = () => {
    let text = `${editableResume.header.name.toUpperCase()}\n`;
    text += `${editableResume.header.location} | ${editableResume.header.email} | ${editableResume.header.phone}\n`;
    text += `${editableResume.header.links.map((l) => `${l.label}: ${l.url}`).join(' | ')}\n\n`;

    if (editableResume.professionalSummary) {
      text += `PROFESSIONAL SUMMARY\n${editableResume.professionalSummary}\n\n`;
    }

    text += `TECHNICAL SKILLS\n`;
    editableResume.skills.forEach((s) => {
      text += `${s.category}: ${s.skills.join(', ')}\n`;
    });
    text += `\n`;

    text += `PROFESSIONAL EXPERIENCE\n`;
    editableResume.experience.forEach((e) => {
      text += `${e.employer} - ${e.title} (${e.period})\n`;
      e.bullets
        .filter((b) => b.enabled !== false)
        .forEach((b) => {
          text += `* ${b.text}\n`;
        });
      text += `\n`;
    });

    text += `TECHNICAL PROJECTS\n`;
    editableResume.projects.forEach((p) => {
      text += `${p.name} [${p.technologies?.join(', ')}] (${p.period})\n`;
      p.bullets
        .filter((b) => b.enabled !== false)
        .forEach((b) => {
          text += `* ${b.text}\n`;
        });
      text += `\n`;
    });

    text += `EDUCATION\n`;
    editableResume.education.forEach((edu) => {
      text += `${edu.institution}, ${edu.degree} (${edu.period})\n`;
    });

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Principle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
              Master Resume Baseline
            </h1>
            <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-xs font-semibold uppercase tracking-wider">
              Immutable Baseline
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            This is your master resume. Tailored resumes branch from this baseline and never overwrite it.
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <button
            onClick={() => setIsQuickGrabOpen(true)}
            className="px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-950 border border-emerald-200 dark:border-emerald-800/80 rounded-lg flex items-center space-x-1.5 cursor-pointer"
          >
            <ClipboardCopy className="w-3.5 h-3.5" />
            <span>Quick Grab Data</span>
          </button>

          <button
            onClick={copyMasterPlainText}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center space-x-1.5 cursor-pointer"
          >
            {copiedText ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedText ? 'ATS Text Copied!' : 'Copy ATS Text'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center space-x-1 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Master</span>
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs transition-colors flex items-center space-x-1 cursor-pointer"
          >
            {savedNotice ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{savedNotice ? 'Baseline Saved' : 'Save Baseline'}</span>
          </button>
        </div>
      </div>

      {/* Two-Column Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Metadata & Baseline Details (4 cols) */}
        <div className="lg:col-span-4 space-y-4 text-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
            <h3 className="font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Grounding Principles</span>
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              The master resume provides presentation and deterministic identity. It does not establish claim truth. Tailored claims require current eligible Evidence Bank records and exact-text validation.
            </p>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                Official Employment Title:
              </span>
              <span className="text-slate-600 dark:text-slate-300">
                {[masterResume.experience[0]?.title, masterResume.experience[0]?.employer].filter(Boolean).join(' at ') || 'No employment entered'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                Experience Context:
              </span>
              <span className="text-slate-600 dark:text-slate-300">
                Review employment claims against their source evidence.
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-2">
            <span className="font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block">
              Edit Master Professional Summary
            </span>
            <textarea
              rows={5}
              value={editableResume.professionalSummary || ''}
              onChange={(e) =>
                setEditableResume({ ...editableResume, professionalSummary: e.target.value })
              }
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Right Column: Live Printable Sheet (8 cols) */}
        <div className="lg:col-span-8 bg-slate-100 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <ResumePaper resume={editableResume} />
        </div>
      </div>
    </div>
  );
};
