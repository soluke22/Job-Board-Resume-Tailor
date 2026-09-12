import { currentFit } from '../utils/assessmentView';
import React, { useState } from 'react';
import {
  PlusCircle,
  FileText,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Layers,
  Terminal,
  ExternalLink,
  ClipboardCopy,
  Printer,
  Copy,
  Check,
  Code2,
  UserCheck,
  SlidersHorizontal,
  ChevronRight,
  Briefcase
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AddJobModal } from './AddJobModal';

export const DashboardView: React.FC = () => {
  const {
    jobs,
    evidence,
    projects,
    skills,
    profile,
    masterResume,
    openJobDetail,
    openResumeEditor,
    setCurrentView,
    setIsQuickGrabOpen,
    setIsAtsGuardsOpen
  } = useApp();

  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Sort jobs by fit score
  const sortedOpportunities = [...jobs].sort((a, b) => {
    const priority = (j: typeof a) => !currentFit(j) ? 0 : currentFit(j)?.verdict === 'Skip' ? 0 : currentFit(j)?.applicationPriority === 'APPLY FIRST' ? 3 : currentFit(j)?.applicationPriority === 'STRONG WITH GAP' ? 2 : 1;
    return priority(b) - priority(a) || (currentFit(b)?.qualificationFit || 0) - (currentFit(a)?.qualificationFit || 0);
  });

  const applyCount = jobs.filter((j) => currentFit(j)?.verdict === 'Apply').length;
  const borderlineCount = jobs.filter((j) => currentFit(j)?.verdict === 'Borderline').length;
  const skipCount = jobs.filter((j) => currentFit(j)?.verdict === 'Skip').length;

  const displayName = profile.name || 'Candidate';

  // Quick plain text ATS generator for master resume
  const getMasterPlainText = () => {
    let text = `${masterResume.header.name.toUpperCase()}\n`;
    const contactParts = [
      masterResume.header.location,
      masterResume.header.email,
      masterResume.header.phone
    ].filter(Boolean);
    text += `${contactParts.join(' | ')}\n`;
    text += `${masterResume.header.links.map((l) => `${l.label}: ${l.url}`).join(' | ')}\n\n`;

    if (masterResume.professionalSummary) {
      text += `PROFESSIONAL SUMMARY\n${masterResume.professionalSummary}\n\n`;
    }

    text += `TECHNICAL SKILLS\n`;
    masterResume.skills.forEach((s) => {
      text += `${s.category}: ${s.skills.join(', ')}\n`;
    });
    text += `\n`;

    text += `PROFESSIONAL EXPERIENCE\n`;
    masterResume.experience.forEach((e) => {
      text += `${e.employer} - ${e.title} (${e.period})\n`;
      e.bullets
        .filter((b) => b.enabled !== false)
        .forEach((b) => {
          text += `* ${b.text}\n`;
        });
      text += `\n`;
    });

    text += `TECHNICAL PROJECTS\n`;
    masterResume.projects.forEach((p) => {
      text += `${p.name} [${p.technologies?.join(', ')}] (${p.period})\n`;
      p.bullets
        .filter((b) => b.enabled !== false)
        .forEach((b) => {
          text += `* ${b.text}\n`;
        });
      text += `\n`;
    });

    text += `EDUCATION\n`;
    masterResume.education.forEach((edu) => {
      text += `${edu.institution}, ${edu.degree} (${edu.period})\n`;
    });

    return text;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Executive Identity & Command Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Candidate Profile Info */}
          <div className="space-y-2">
            <div className="flex items-center space-x-3 flex-wrap gap-y-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {displayName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 text-xs font-semibold">
                {profile.title || 'Add your professional title'}
              </span>
              <span className="text-xs text-slate-500">
                {profile.location || 'Add your location'}
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
              {masterResume.professionalSummary || 'Add your profile and evidence to get started.'}
              Tailoring resumes and cover letters strictly when jobs genuinely fit defensible candidate evidence.
            </p>

            {/* Quick Contact & Link Chips */}
            <div className="flex items-center space-x-3 text-xs pt-1 flex-wrap gap-y-1">
              <span className="text-slate-500 font-mono">{profile.email}</span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              {profile.links.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1"
                >
                  <span>{link.label}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Primary Actions */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={() => setIsAddJobOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center space-x-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Job Description</span>
            </button>

            <button
              onClick={() => setIsQuickGrabOpen(true)}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <ClipboardCopy className="w-4 h-4 text-emerald-500" />
              <span>Quick Grab Data</span>
            </button>

            <button
              onClick={() => setIsAtsGuardsOpen(true)}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              <span>ATS Guards</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Core Operational Pillars: Master Resume, Data Grabber, and ATS Guardrails */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pillar A: Master Resume Baseline */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="font-semibold text-slate-900 dark:text-white text-sm">
                  Master Resume Baseline
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                Master Resume
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your saved master resume and source claims for tailoring.
            </p>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Experience Bullets:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {masterResume.experience[0]?.bullets?.length || 0} saved claims
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Skills Total:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{skills.length} defensible</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Projects:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{projects.length} showcase builds</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <button
              onClick={() => setCurrentView('master-resume')}
              className="flex-1 py-1.5 px-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center space-x-1 cursor-pointer"
            >
              <span>Inspect Master</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => copyToClipboard(getMasterPlainText(), 'master-plain')}
              className="py-1.5 px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1 cursor-pointer"
              title="Copy clean plain text formatted for ATS text boxes"
            >
              {copiedKey === 'master-plain' ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedKey === 'master-plain' ? 'Copied' : 'Copy ATS Text'}</span>
            </button>
          </div>
        </div>

        {/* Pillar B: Data Grabber / Clipboard Hub */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ClipboardCopy className="w-4 h-4" />
                </div>
                <span className="font-semibold text-slate-900 dark:text-white text-sm">
                  Quick Data Grabber
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                1-Click Copy
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Instant access to formatted strings for Workday, Greenhouse, Lever, and job portals without manual typing.
            </p>

            {/* Quick-Copy Chips */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <button
                onClick={() => {
                  const allSkills = skills.map((s) => s.name).join(', ');
                  copyToClipboard(allSkills, 'dash-skills');
                }}
                className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px] font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <span>Skills List</span>
                {copiedKey === 'dash-skills' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
              </button>

              <button
                onClick={() => {
                  const experienceBullets = masterResume.experience[0]?.bullets?.map((b) => `* ${b.text}`).join('\n') || '';
                  copyToClipboard(experienceBullets, 'dash-bullets');
                }}
                className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px] font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <span>Experience Bullets</span>
                {copiedKey === 'dash-bullets' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
              </button>

              <button
                onClick={() => {
                  const contactBlock = `${displayName} | ${profile.email} | ${profile.phone} | ${profile.location}`;
                  copyToClipboard(contactBlock, 'dash-contact');
                }}
                className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px] font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <span>Contact Info</span>
                {copiedKey === 'dash-contact' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
              </button>

              <button
                onClick={() => {
                  copyToClipboard(masterResume.professionalSummary || '', 'dash-summary');
                }}
                className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px] font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <span>Summary Text</span>
                {copiedKey === 'dash-summary' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
              </button>
            </div>
          </div>

          <button
            onClick={() => setIsQuickGrabOpen(true)}
            className="w-full py-1.5 px-3 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <span>Open Application Clipboard</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Pillar C: ATS & AI Hiring Defense Guards */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="font-semibold text-slate-900 dark:text-white text-sm">
                  ATS & AI Hiring Defense
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                100% Passing
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              All 8 core parsing and AI screener guardrails enforced on every generated resume.
            </p>

            <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
              <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Single-column parseable layout (0 tables, 0 sidebars)</span>
              </div>
              <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Zero em-dash corruption (ASCII-clean hyphens)</span>
              </div>
              <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>XYZ quantifiable metrics & engineering verb taxonomy</span>
              </div>
              <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Strict 1-page budget (zero second-page spillover)</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsAtsGuardsOpen(true)}
            className="w-full py-1.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <span>Inspect All 8 Guardrails</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Coverage & Verification Counter Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Verified Evidence</span>
            <Database className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{evidence.length}</span>
            <span className="text-xs text-slate-400">records</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 truncate">
            Candidate evidence sources
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Defensible Skills</span>
            <Terminal className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{skills.length}</span>
            <span className="text-xs text-slate-400">verified</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 truncate">
            {skills.map((skill) => skill.name).slice(0, 4).join(', ') || 'No skills entered'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Showcased Projects</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{projects.length}</span>
            <span className="text-xs text-slate-400">projects</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 truncate">
            {projects.map((project) => project.name).slice(0, 3).join(', ') || 'No projects entered'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Fit Verdicts</span>
            <Briefcase className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2 text-xs font-semibold">
            <span className="text-emerald-500">{applyCount} Apply</span>
            <span className="text-amber-500">{borderlineCount} Border</span>
            <span className="text-rose-500">{skipCount} Skip</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 truncate">
            Decline unviable stretch roles
          </p>
        </div>
      </div>

      {/* 4. Active Job Opportunities & High-Fit Applications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Job List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>Evaluated Job Opportunities</span>
              <span className="text-xs text-slate-400 font-normal">({jobs.length})</span>
            </h2>
            <button
              onClick={() => setCurrentView('jobs')}
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1"
            >
              <span>View All in Jobs Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {jobs.map((job) => {
              const verdict = currentFit(job)?.verdict || 'Borderline';
              const canTailor = currentFit(job)?.canTailor ?? false;
              return (
                <div
                  key={job.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
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
                      {currentFit(job) && (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider flex items-center space-x-1 ${
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

                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                      {job.title}
                    </p>

                    <div className="flex items-center space-x-4 text-xs text-slate-500">
                      {job.assessmentStatus==='STALE' && <span>Previous assessment stale; reassess</span>}
                      {currentFit(job) && (
                        <span>
                          Fit Match:{' '}
                          <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                            {currentFit(job).qualificationFit} / 10
                          </strong>
                        </span>
                      )}
                      <span>Status: {job.status}</span>
                      {job.sourceUrl && (
                        <a
                          href={job.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-slate-700 dark:hover:text-slate-300 inline-flex items-center space-x-1"
                        >
                          <span>Posting</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {currentFit(job)?.strongestMatch && verdict === 'Apply' && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400/90 pt-1 line-clamp-1">
                        Strongest Match: {currentFit(job).strongestMatch}
                      </p>
                    )}
                    {currentFit(job)?.biggestActualGap && verdict === 'Skip' && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 pt-1 line-clamp-1">
                        Unmet Requirement: {currentFit(job).biggestActualGap}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => openJobDetail(job.id)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                    >
                      Analysis & Match
                    </button>
                    {canTailor ? (
                      <button
                        onClick={() => openResumeEditor(job.id)}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer shadow-xs"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Resume Studio</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => openJobDetail(job.id)}
                        className="px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg cursor-pointer"
                      >
                        Skip Explained
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Strongest Opportunities & Knowledge Repositories */}
        <div className="space-y-6">
          {/* Top Matches Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>Highest Truthful Matches</span>
            </h2>
            <div className="space-y-2.5">
              {sortedOpportunities
                .filter((j) => currentFit(j) && currentFit(j)?.verdict !== 'Skip')
                .slice(0, 3)
                .map((job) => (
                  <div
                    key={job.id}
                    onClick={() => openJobDetail(job.id)}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {job.company}
                      </span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {currentFit(job)?.qualificationFit} / 10
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{job.title}</p>
                  </div>
                ))}
            </div>
          </div>

          {/* Candidate Knowledge Repositories */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Candidate Knowledge Base
            </h2>
            <div className="space-y-1.5 text-xs">
              <button
                onClick={() => setCurrentView('master-resume')}
                className="w-full text-left p-2.5 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span>Inspect Master Resume Baseline</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => setCurrentView('evidence-bank')}
                className="w-full text-left p-2.5 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-emerald-500" />
                  <span>Manage Evidence Bank ({evidence.length})</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => setCurrentView('skills')}
                className="w-full text-left p-2.5 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-indigo-500" />
                  <span>Curated Skills Inventory ({skills.length})</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => setCurrentView('projects')}
                className="w-full text-left p-2.5 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-purple-500" />
                  <span>Deep Project Profiles ({projects.length})</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <AddJobModal isOpen={isAddJobOpen} onClose={() => setIsAddJobOpen(false)} />
    </div>
  );
};
