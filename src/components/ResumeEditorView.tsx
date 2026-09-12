import React, { useState } from 'react';
import {
  ArrowLeft,
  Printer,
  Download,
  Sparkles,
  HelpCircle,
  Database,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Layers,
  ChevronDown,
  Edit3,
  Trash2,
  Eye,
  Sliders,
  ExternalLink,
  ShieldCheck,
  Wrench,
  Loader2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ResumePaper } from './ResumePaper';
import { CoverLetterPaper } from './CoverLetterPaper';
import { EvaluationPanel } from './EvaluationPanel';
import { WhyBulletModal } from './WhyBulletModal';
import { ExportModal } from './ExportModal';
import { ResumeBullet, TailoredResume } from '../types';
import { canExportFinal } from '../utils/resumeReadiness';

export const ResumeEditorView: React.FC = () => {
  const {
    activeJob,
    jobs,
    setActiveJobId,
    setCurrentView,
    profile,
    updateResume,
    updateCoverLetter,
    regenerateBullet,
    evaluateResume,
    isGenerating,
    isAnalyzing
  } = useApp();

  const [activeTab, setActiveTab] = useState<'resume' | 'cover-letter'>('resume');
  const [selectedBulletId, setSelectedBulletId] = useState<string | null>(null);
  const [inspectingBullet, setInspectingBullet] = useState<{
    bullet: ResumeBullet;
    employerOrProject: string;
  } | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [showQcPanel, setShowQcPanel] = useState(true);

  if (!activeJob) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p className="text-slate-500">No job selected for Resume Studio.</p>
        <button
          onClick={() => setCurrentView('jobs')}
          className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg text-xs"
        >
          View Jobs
        </button>
      </div>
    );
  }

  const resume = activeJob.tailoredResume;
  const coverLetter = activeJob.tailoredCoverLetter;
  const evaluation = activeJob.evaluation || null;

  if (!resume) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto">
          <FileText className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          No Resume Generated for {activeJob.company}
        </h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Please run the fit analysis and generate tailored materials from the Job Analysis view first.
        </p>
        <button
          onClick={() => setCurrentView('job-detail')}
          className="px-4 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-500 cursor-pointer"
        >
          Open Fit Analysis
        </button>
      </div>
    );
  }

  // Page length estimation heuristic:
  // Standard 8.5x11 sheet fits approximately 36-40 text lines at 12px with standard headings.
  const calculateEstimatedLines = (r: TailoredResume) => {
    let lines = 4; // header
    if (r.professionalSummary) lines += Math.ceil(r.professionalSummary.length / 90) + 2;
    lines += r.skills.length + 2;
    r.experience.forEach((e) => {
      lines += 2;
      e.bullets.filter((b) => b.enabled !== false).forEach((b) => {
        lines += Math.ceil(b.text.length / 85);
      });
    });
    r.projects.forEach((p) => {
      lines += 2;
      p.bullets.filter((b) => b.enabled !== false).forEach((b) => {
        lines += Math.ceil(b.text.length / 85);
      });
    });
    lines += r.education.length + 2;
    return lines;
  };

  const estimatedLines = calculateEstimatedLines(resume);
  const overflowRisk = estimatedLines > 42 ? 'High' : estimatedLines > 38 ? 'Moderate' : 'Low';

  const handleSummaryChange = (newSummary: string) => {
    const updated: TailoredResume = { ...resume, professionalSummary: newSummary };
    updateResume(activeJob.id, updated);
  };

  const handleToggleBullet = (bulletId: string, isExperience: boolean) => {
    const cloned: TailoredResume = JSON.parse(JSON.stringify(resume));
    if (isExperience) {
      cloned.experience.forEach((e) => {
        e.bullets.forEach((b) => {
          if (b.id === bulletId) b.enabled = b.enabled === false ? true : false;
        });
      });
    } else {
      cloned.projects.forEach((p) => {
        p.bullets.forEach((b) => {
          if (b.id === bulletId) b.enabled = b.enabled === false ? true : false;
        });
      });
    }
    updateResume(activeJob.id, cloned);
  };

  const handleBulletTextChange = (bulletId: string, newText: string, isExperience: boolean) => {
    const cloned: TailoredResume = JSON.parse(JSON.stringify(resume));
    if (isExperience) {
      cloned.experience.forEach((e) => {
        e.bullets.forEach((b) => {
          if (b.id === bulletId) b.text = newText;
        });
      });
    } else {
      cloned.projects.forEach((p) => {
        p.bullets.forEach((b) => {
          if (b.id === bulletId) b.text = newText;
        });
      });
    }
    updateResume(activeJob.id, cloned);
  };

  const handleRestoreMaster = (bulletId: string) => {
    const cloned: TailoredResume = JSON.parse(JSON.stringify(resume));
    cloned.experience.forEach((e) => {
      e.bullets.forEach((b) => {
        if (b.id === bulletId && b.masterText) b.text = b.masterText;
      });
    });
    cloned.projects.forEach((p) => {
      p.bullets.forEach((b) => {
        if (b.id === bulletId && b.masterText) b.text = b.masterText;
      });
    });
    updateResume(activeJob.id, cloned);
    setInspectingBullet(null);
  };

  const handleRegenBullet = async (targetReq: string, underlyingEvidence: string) => {
    if (!inspectingBullet) return;
    await regenerateBullet(
      activeJob.id,
      inspectingBullet.bullet.id,
      inspectingBullet.employerOrProject,
      inspectingBullet.bullet.text,
      targetReq,
      underlyingEvidence
    );
    setInspectingBullet(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      {/* Top Controls Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setCurrentView('job-detail')}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title="Back to Job Analysis"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Job Selector Dropdown */}
          <div className="relative">
            <select
              value={activeJob.id}
              onChange={(e) => setActiveJobId(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.company} — {j.title} ({j.fit?.verdict || 'Review'})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Mode Switcher: Tailored Resume vs Tailored Cover Letter */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-xs font-medium">
            <button
              onClick={() => setActiveTab('resume')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                activeTab === 'resume'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tailored Resume
            </button>
            <button
              onClick={() => setActiveTab('cover-letter')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                activeTab === 'cover-letter'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tailored Cover Letter
            </button>
          </div>
        </div>

        {/* Page length & Export Actions */}
        <div className="flex items-center space-x-3 self-end sm:self-auto">
          {activeTab === 'resume' && (
            <div
              className={`text-[11px] px-2.5 py-1 rounded-full font-medium flex items-center space-x-1.5 ${
                overflowRisk === 'Low'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : overflowRisk === 'Moderate'
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
              title={`${estimatedLines} estimated rendered lines.`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              <span>Page fit estimate: {overflowRisk} risk; check print preview</span>
            </div>
          )}

          <button
            disabled={!canExportFinal(resume, activeJob.assessmentStatus)}
            onClick={() => setIsExportOpen(true)}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            title="Print / Save as PDF"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsExportOpen(true)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center space-x-1 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Options</span>
          </button>
        </div>
      </div>

      {/* Two-Pane Desktop Layout */}
      <div className="p-3 rounded-lg border border-amber-200 text-xs">
        <strong>Resume: {activeJob.assessmentStatus === 'STALE' ? 'STALE' : resume.readiness || 'DRAFT'}</strong>
        <p>{resume.readinessIssues?.join('; ') || 'Exact current text must retain eligible evidence support.'}</p>
        <button disabled={isGenerating} onClick={()=>evaluateResume(activeJob.id)} className="mt-2 underline">Save checkpoint and validate current claims</button>
        <div className="mt-2">{resume.claimLedger?.map(c=><div key={c.claimId}>{c.claimType}: {activeJob.assessmentStatus === 'STALE' ? 'stale' : c.validationStatus} — {c.text.slice(0,90)}</div>)}</div>
        <details className="mt-2"><summary>Version history ({activeJob.versionHistory?.length || 0})</summary>{activeJob.versionHistory?.map(v=><details key={v.versionId}><summary>{v.timestamp}: {v.note} ({v.resume.readiness || 'DRAFT'})</summary>{v.resume.claimLedger?.map(c=><div key={c.claimId}>{c.text} — {c.validationStatus}; evidence: {c.supportingEvidenceIds.join(', ')}</div>)}</details>)}</details>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANE: Editor & Tailoring Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4 overflow-y-auto max-h-[calc(100vh-140px)] pr-1">
          {/* Evaluation Panel */}
          {evaluation && (
            <EvaluationPanel
              evaluation={evaluation}
              onResumeUpdate={(u) => updateResume(activeJob.id, u)}
              activeResume={resume}
            />
          )}

          {activeTab === 'resume' ? (
            <>
              {/* Professional Summary Box */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Professional Summary
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {resume.professionalSummary?.length || 0} chars (Target: 180-260)
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={resume.professionalSummary || ''}
                  onChange={(e) => handleSummaryChange(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed"
                />
              </div>

              {/* Experience Bullets Manager */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white block">
                      Professional experience
                    </span>
                    <span className="text-[11px] text-slate-400">
                      All selected employment records
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {resume.experience.flatMap(exp => exp.bullets.map(bullet => ({bullet, exp}))).map(({bullet, exp}, idx) => {
                    const isSelected = selectedBulletId === bullet.id;
                    const isEnabled = bullet.enabled !== false;

                    return (
                      <div
                        key={bullet.id}
                        className={`p-3 rounded-lg border transition-all text-xs space-y-2 ${
                          isEnabled
                            ? isSelected
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                            : 'bg-slate-100/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800 text-slate-400 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() => handleToggleBullet(bullet.id, true)}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {exp.employer}, {exp.title} ({exp.period}) · Bullet #{idx + 1}
                            </span>
                          </label>

                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setInspectingBullet({
                                  bullet,
                                  employerOrProject: exp.employer
                                })
                              }
                              className="p-1 text-slate-500 hover:text-emerald-600 rounded cursor-pointer flex items-center space-x-0.5"
                              title="Why this bullet & underlying evidence"
                            >
                              <HelpCircle className="w-3.5 h-3.5" />
                              <span className="text-[10px]">Why?</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setInspectingBullet({
                                  bullet,
                                  employerOrProject: exp.employer
                                });
                              }}
                              className="p-1 text-slate-500 hover:text-emerald-600 rounded cursor-pointer"
                              title="Regenerate single bullet"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <textarea
                          rows={3}
                          aria-label={`${exp.employer}, ${exp.title}: bullet ${idx + 1}`} value={bullet.text}
                          onChange={(e) => handleBulletTextChange(bullet.id, e.target.value, true)}
                          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                        />

                        {bullet.targetRequirement && (
                          <div className="text-[10px] text-emerald-700 dark:text-emerald-400/90 truncate">
                            Target: {bullet.targetRequirement}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Projects Section Manager */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white block">
                  Selected Technical Projects
                </span>

                <div className="space-y-3">
                  {resume.projects.map((proj) => (
                    <div
                      key={proj.id}
                      className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {proj.name}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {proj.technologies?.join(', ')}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {proj.bullets.map((b) => (
                          <div key={b.id} className="space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <label className="flex items-center space-x-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={b.enabled !== false}
                                  onChange={() => handleToggleBullet(b.id, false)}
                                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-slate-600 dark:text-slate-400">Include</span>
                              </label>
                              <button
                                type="button"
                                onClick={() =>
                                  setInspectingBullet({
                                    bullet: b,
                                    employerOrProject: proj.name
                                  })
                                }
                                className="text-slate-400 hover:text-emerald-500 flex items-center space-x-0.5 cursor-pointer"
                              >
                                <HelpCircle className="w-3 h-3" />
                                <span>Evidence</span>
                              </button>
                            </div>
                            <textarea
                              rows={2}
                              value={b.text}
                              onChange={(e) => handleBulletTextChange(b.id, e.target.value, false)}
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Cover Letter Controls */
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white block">
                Cover Letter Paragraphs
              </span>

              {coverLetter ? (
                <div className="space-y-3">
                  {coverLetter.paragraphs.map((para, idx) => (
                    <div key={idx} className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase">
                        Paragraph {idx + 1}
                      </span>
                      <textarea
                        rows={5}
                        value={para}
                        onChange={(e) => {
                          const cloned = { ...coverLetter };
                          cloned.paragraphs[idx] = e.target.value;
                          updateCoverLetter(activeJob.id, cloned);
                        }}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No cover letter generated yet.</p>
              )}
            </div>
          )}
        </div>

        {/* RIGHT PANE: Realistic Paper Preview (7 cols) */}
        <div className="lg:col-span-7 bg-slate-100 dark:bg-slate-950 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
          {activeTab === 'resume' ? (
            <ResumePaper
              resume={resume}
              selectedBulletId={selectedBulletId}
              onBulletClick={(id) => {
                setSelectedBulletId(id);
                // Locate bullet to inspect
                let targetBullet: ResumeBullet | undefined;
                let employerOrProject = resume.experience[0]?.employer || '';

                resume.experience.forEach((e) => {
                  e.bullets.forEach((b) => {
                    if (b.id === id) {
                      targetBullet = b;
                      employerOrProject = e.employer;
                    }
                  });
                });
                if (!targetBullet) {
                  resume.projects.forEach((p) => {
                    p.bullets.forEach((b) => {
                      if (b.id === id) {
                        targetBullet = b;
                        employerOrProject = p.name;
                      }
                    });
                  });
                }
                if (targetBullet) {
                  setInspectingBullet({ bullet: targetBullet, employerOrProject });
                }
              }}
            />
          ) : coverLetter ? (
            <CoverLetterPaper coverLetter={coverLetter} profile={profile} />
          ) : (
            <div className="p-12 text-center text-slate-500 text-xs">
              No cover letter available for preview.
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <WhyBulletModal
        isOpen={!!inspectingBullet}
        onClose={() => setInspectingBullet(null)}
        bullet={inspectingBullet?.bullet || null}
        employerOrProject={inspectingBullet?.employerOrProject || ''}
        onRegenerate={handleRegenBullet}
        onRestoreMaster={
          inspectingBullet ? () => handleRestoreMaster(inspectingBullet.bullet.id) : undefined
        }
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        resume={resume}
        coverLetter={coverLetter}
        activeMode={activeTab}
      />
    </div>
  );
};
