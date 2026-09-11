import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, Wrench, Sparkles, Loader2 } from 'lucide-react';
import { ResumeEvaluation, EvaluationFlag, TailoredResume } from '../types';

interface EvaluationPanelProps {
  evaluation: ResumeEvaluation | null;
  onResumeUpdate: (updated: TailoredResume) => void;
  activeResume: TailoredResume;
}

export const EvaluationPanel: React.FC<EvaluationPanelProps> = ({
  evaluation,
  onResumeUpdate,
  activeResume
}) => {
  const [isFixing, setIsFixing] = useState(false);

  if (!evaluation) {
    return (
      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
        Evaluation pass pending...
      </div>
    );
  }

  const overallStatus = evaluation.overallStatus || (evaluation.isReady ? 'PASS' : 'WARN');
  const summaryPass = evaluation.checks?.summaryPass ?? evaluation.summaryPass ?? true;
  const skillsPass = evaluation.checks?.skillsPass ?? evaluation.skillsPass ?? true;
  const claimsPass = evaluation.checks?.claimsPass ?? evaluation.claimsPass ?? true;
  const roleFamilyPass = evaluation.checks?.roleFamilyPass ?? evaluation.roleFamilyPass ?? true;
  const flags = evaluation.flags || [];
  const metricsCount = evaluation.metricCoverage?.withMetrics ?? evaluation.metricCoverage?.metricsCount ?? 0;
  const totalBullets = evaluation.metricCoverage?.totalBullets ?? 0;

  const fixSafeFlag = (flag: EvaluationFlag) => {
    // Make safe edits locally, such as removing em dashes or trimming whitespace
    const cloned: TailoredResume = JSON.parse(JSON.stringify(activeResume));

    if (flag.code === 'DASH') {
      cloned.experience.forEach((e) => {
        e.bullets.forEach((b) => {
          b.text = b.text.replace(/—/g, ' - ').replace(/–/g, ' - ');
        });
      });
      cloned.projects.forEach((p) => {
        p.bullets.forEach((b) => {
          b.text = b.text.replace(/—/g, ' - ').replace(/–/g, ' - ');
        });
      });
      if (cloned.professionalSummary) {
        cloned.professionalSummary = cloned.professionalSummary.replace(/—/g, ' - ').replace(/–/g, ' - ');
      }
    } else if (flag.code === 'LONG' && flag.targetId) {
      cloned.experience.forEach((e) => {
        e.bullets.forEach((b) => {
          if (b.id === flag.targetId && flag.suggestedFix) {
            b.text = flag.suggestedFix;
          }
        });
      });
    }

    onResumeUpdate(cloned);
  };

  const handleFixAllSafe = () => {
    setIsFixing(true);
    const cloned: TailoredResume = JSON.parse(JSON.stringify(activeResume));

    // Remove any accidental em dashes or en dashes
    cloned.experience.forEach((e) => {
      e.bullets.forEach((b) => {
        b.text = b.text.replace(/—/g, ' - ').replace(/–/g, ' - ');
      });
    });
    cloned.projects.forEach((p) => {
      p.bullets.forEach((b) => {
        b.text = b.text.replace(/—/g, ' - ').replace(/–/g, ' - ');
      });
    });
    if (cloned.professionalSummary) {
      cloned.professionalSummary = cloned.professionalSummary.replace(/—/g, ' - ').replace(/–/g, ' - ');
    }

    // Apply any concrete suggested fixes
    flags.forEach((f) => {
      if (f.suggestedFix && f.targetId) {
        cloned.experience.forEach((e) => {
          e.bullets.forEach((b) => {
            if (b.id === f.targetId && f.suggestedFix) {
              b.text = f.suggestedFix;
            }
          });
        });
      }
    });

    onResumeUpdate(cloned);
    setTimeout(() => setIsFixing(false), 500);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
            Quality Control & Guardrail Verification
          </h3>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            overallStatus === 'PASS'
              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
              : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
          }`}
        >
          {overallStatus}
        </span>
      </div>

      {/* Core Checks Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-slate-500 text-[11px]">Summary:</span>
          <span className={`font-semibold ${summaryPass ? 'text-emerald-600' : 'text-amber-500'}`}>
            {summaryPass ? 'PASS' : 'WARN'}
          </span>
        </div>
        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-slate-500 text-[11px]">Skills Match:</span>
          <span className={`font-semibold ${skillsPass ? 'text-emerald-600' : 'text-amber-500'}`}>
            {skillsPass ? 'PASS' : 'WARN'}
          </span>
        </div>
        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-slate-500 text-[11px]">Claims Safe:</span>
          <span className={`font-semibold ${claimsPass ? 'text-emerald-600' : 'text-rose-500'}`}>
            {claimsPass ? 'PASS' : 'FLAG'}
          </span>
        </div>
        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-slate-500 text-[11px]">Role Family:</span>
          <span className={`font-semibold ${roleFamilyPass ? 'text-emerald-600' : 'text-amber-500'}`}>
            {roleFamilyPass ? 'PASS' : 'WARN'}
          </span>
        </div>
      </div>

      {/* Metric Coverage */}
      <div className="flex items-center justify-between text-xs px-1 text-slate-500">
        <span>Metric Coverage:</span>
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {metricsCount} of {totalBullets} experience bullets contain verified numbers
        </span>
      </div>

      {/* Flags List */}
      {flags.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
              {flags.length} Flag{flags.length > 1 ? 's' : ''} Detected
            </span>
            <button
              onClick={handleFixAllSafe}
              disabled={isFixing}
              className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1 cursor-pointer"
            >
              {isFixing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Wrench className="w-3 h-3" />
              )}
              <span>Fix All Safe Flags</span>
            </button>
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {flags.map((flag, idx) => (
              <div
                key={idx}
                className="p-2 rounded-md bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 flex items-start justify-between gap-2 text-xs"
              >
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100">
                      {flag.code}
                    </span>
                    <span className="text-[11px] font-medium text-slate-800 dark:text-slate-200">
                      {flag.message}
                    </span>
                  </div>
                  {flag.suggestedFix && (
                    <p className="text-[10px] text-slate-500 mt-1 italic">
                      Suggestion: {flag.suggestedFix}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => fixSafeFlag(flag)}
                  className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-medium text-slate-700 dark:text-slate-300 hover:text-emerald-600 cursor-pointer shrink-0"
                >
                  Fix
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
