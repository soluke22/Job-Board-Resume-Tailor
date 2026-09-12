import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Shield,
  FileText,
  Sparkles,
  HelpCircle,
  Save,
  Check,
  RotateCcw,
  Loader2,
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const JobAnalysisView: React.FC = () => {
  const {
    activeJob,
    setCurrentView,
    analyzeJob,
    generatePlan,
    generateResume,
    submitGapAnswers,
    openResumeEditor,
    isAnalyzing,
    isGenerating
  } = useApp();

  const [gapAnswers, setGapAnswers] = useState<Record<string, string>>({});
  const [saveToBankMap, setSaveToBankMap] = useState<Record<string, boolean>>({});
  const [hasSavedGap, setHasSavedGap] = useState(false);

  if (!activeJob) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p className="text-slate-500">No job selected.</p>
        <button
          onClick={() => setCurrentView('jobs')}
          className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg text-xs"
        >
          Back to Jobs
        </button>
      </div>
    );
  }

  const { parsed, fit, evidenceMatches, sessionQuestions, tailoringPlan } = activeJob;
  const verdict = fit?.verdict || 'Borderline';
  const canTailor = fit?.canTailor ?? true;

  const handleGapAnswerChange = (qId: string, value: string) => {
    setGapAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const handleToggleSaveToBank = (qId: string) => {
    setSaveToBankMap((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  const handleSaveGapInterview = async () => {
    await submitGapAnswers(activeJob.id, gapAnswers, saveToBankMap);
    setHasSavedGap(true);
    setTimeout(() => setHasSavedGap(false), 3000);
  };

  const handleTailorImmediately = async () => {
    await generateResume(activeJob.id);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back Button & Title Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentView('jobs')}
          className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center space-x-1 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Jobs</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => analyzeJob(activeJob.id)}
            disabled={isAnalyzing}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>Re-analyze</span>
          </button>

          {canTailor && (
            <button
              onClick={handleTailorImmediately}
              disabled={isGenerating}
              className="px-4 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating Resume...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tailor Resume & Cover Letter</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                {activeJob.company}
              </span>
              {parsed?.classifiedFamily && (
                <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  Role Family: {parsed.classifiedFamily}
                </span>
              )}
              {parsed?.seniority && (
                <span className="px-2 py-0.5 rounded text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/40">
                  {parsed.seniority}
                </span>
              )}
            </div>
            <p className="text-base font-medium text-slate-800 dark:text-slate-200">
              {activeJob.title}
            </p>
            {parsed?.familyRationale && (
              <p className="text-xs text-slate-500 max-w-2xl pt-1">
                {parsed.familyRationale}
              </p>
            )}
          </div>

          {/* Scores and Verdict Card */}
          <div className="flex items-center space-x-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shrink-0">
            <div className="text-center px-2">
              <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                Initial Fit
              </span>
              <span className="text-xl font-bold text-slate-800 dark:text-slate-200">
                {fit?.initialFitScore ?? '—'} <span className="text-xs font-normal text-slate-500">/ 10</span>
              </span>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
            <div className="text-center px-2">
              <span className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 block">
                Best Truthful Fit
              </span>
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {fit?.tailoredFitScore ?? '—'} <span className="text-xs font-normal text-emerald-700/60">/ 10</span>
              </span>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
            <div className="text-center px-2">
              <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-0.5">
                Verdict
              </span>
              <span
                className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                  verdict === 'Apply'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : verdict === 'Borderline'
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                    : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                }`}
              >
                {verdict}
              </span>
            </div>
          </div>
        </div>

        {/* STRICT GUARDRAIL BANNER IF SKIP */}
        {!canTailor ? (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 space-y-2">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              <h3 className="text-sm font-semibold tracking-tight text-rose-700 dark:text-rose-300">
                Guardrail Enforced: Resume Tailoring Blocked
              </h3>
            </div>
            <p className="text-xs text-rose-800/90 dark:text-rose-200/90 leading-relaxed">
              {fit?.rejectionNotice ||
                'Per core principle: We do not tailor resumes or cover letters for jobs that do not fit the candidate’s verified skills. If the job description is not a fit or a stretch, then we will not create a resume for this job.'}
            </p>
            {fit?.blockers && fit.blockers.length > 0 && (
              <div className="pt-2">
                <span className="text-xs font-semibold text-rose-900 dark:text-rose-300 block mb-1">
                  Hard Blockers & Missing Qualifications:
                </span>
                <ul className="list-disc list-inside text-xs space-y-0.5 text-rose-800 dark:text-rose-300">
                  {fit.blockers.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : verdict === 'Borderline' ? (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 space-y-1">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <h3 className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                Borderline Match Notice
              </h3>
            </div>
            <p className="text-xs text-amber-800/90 dark:text-amber-200/90">
              {fit?.verdictReason ||
                'This role represents a moderate stretch. Review the gap analysis carefully to ensure your interview answers can defensibly address unevidenced areas.'}
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
              <strong>High Fit Confirmed:</strong> Review the assessment and supporting evidence for the core responsibilities of this role.
            </p>
          </div>
        )}
      </div>

      {/* Strategic Analysis Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Recruiter Screening Signals */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Top Hiring Signals
          </h3>
          <ul className="space-y-2">
            {(parsed?.recruiterScreeningSignals || []).map((sig, idx) => (
              <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>{sig}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Strongest Match vs Actual Gap */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Strongest Selling Point
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-1.5">
              {fit?.strongestMatch || 'No supporting match has been recorded.'}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Biggest Actual Gap
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-1.5">
              {fit?.biggestActualGap || 'None identified as hard blocker.'}
            </p>
          </div>
        </div>

        {/* Claims Withheld */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>Claims Withheld (Safety)</span>
          </h3>
          <p className="text-[11px] text-slate-500">
            JD requirements that cannot be truthfully claimed on the resume:
          </p>
          {(fit?.unsupportedRequirements || []).length === 0 ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              Zero unsupported claims detected. All target requirements map to candidate evidence.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {fit?.unsupportedRequirements.map((un, i) => (
                <li key={i} className="text-xs text-rose-600 dark:text-rose-400 flex items-start space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                  <span>{un}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Evidence Gap Interview (Stage 3) */}
      {sessionQuestions && sessionQuestions.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                <HelpCircle className="w-4 h-4 text-emerald-500" />
                <span>Evidence Gap Interview (High Fit Opportunity)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Fit is 8.0+. Answer targeted questions regarding past undocumented work. You may optionally save answers to your permanent Evidence Bank.
              </p>
            </div>
            <button
              onClick={handleSaveGapInterview}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
            >
              {hasSavedGap ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
              <span>{hasSavedGap ? 'Saved' : 'Save Answers'}</span>
            </button>
          </div>

          <div className="space-y-4 pt-2">
            {sessionQuestions.map((q) => (
              <div
                key={q.id}
                className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider block">
                      Target Requirement: {q.requirement}
                    </span>
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                      {q.question}
                    </p>
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={gapAnswers[q.id] || q.answer || ''}
                  onChange={(e) => handleGapAnswerChange(q.id, e.target.value)}
                  placeholder="Enter specific, truthful context from your work or projects..."
                  className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveToBankMap[q.id] || q.savedToEvidenceBank || false}
                      onChange={() => handleToggleSaveToBank(q.id)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-[11px] font-medium">
                      Save as permanent record in Evidence Bank
                    </span>
                  </label>
                  <span className="text-[11px] text-slate-400 italic">
                    Session evidence only by default
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evidence Matching Table (Stage 2) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              <span>Evidence-to-Requirements Analysis</span>
            </h3>
            <p className="text-xs text-slate-500">
              Requirement → Candidate Evidence → Strength → Gap. Missing evidence is never inferred.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-4">JD Requirement</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Matched Candidate Evidence</th>
                <th className="py-2.5 px-4">Strength</th>
                <th className="py-2.5 px-4">Gap / Concern</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(evidenceMatches || []).map((m, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-white max-w-xs">
                    {m.requirement}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        m.isHardRequirement
                          ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {m.isHardRequirement ? 'Hard Req' : 'Preferred'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-md">
                    {m.candidateEvidence}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        m.strength === 'Strong'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : m.strength === 'Moderate'
                          ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                          : m.strength === 'Weak'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                      }`}
                    >
                      {m.strength}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500 max-w-xs">
                    {m.gap || 'None'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tailoring Plan View (Stage 4) */}
      {tailoringPlan && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>Tailoring Plan Configuration</span>
            </h3>
            <button
              onClick={() => openResumeEditor(activeJob.id)}
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1"
            >
              <span>Open in Resume Studio</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-0.5">
                Summary Angle:
              </span>
              <p className="text-slate-600 dark:text-slate-400">
                {tailoringPlan.professionalSummaryAngle}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                  Selected Projects & Allocation:
                </span>
                <ul className="space-y-1">
                  {tailoringPlan.projectSelection.map((p, i) => (
                    <li key={i} className="text-slate-600 dark:text-slate-400 flex items-center justify-between">
                      <span>{p.projectId}</span>
                      <span className="font-mono font-medium">{p.bulletCount} bullets</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                  Experience Bullets Strategy:
                </span>
                <p className="text-slate-600 dark:text-slate-400">
                  {tailoringPlan.disneyBulletsPlan.length} experience bullets planned.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setCurrentView('jobs')}
          className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
        >
          Cancel
        </button>

        {canTailor && (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => generatePlan(activeJob.id)}
              disabled={isGenerating}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Generate Plan View
            </button>
            <button
              onClick={handleTailorImmediately}
              disabled={isGenerating}
              className="px-5 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Tailored Resume...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Tailor Immediately</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
