import React from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  Cpu,
  Hash,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface AtsGuardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenStudio?: () => void;
}

export const AtsGuardsModal: React.FC<AtsGuardsModalProps> = ({ isOpen, onClose, onOpenStudio }) => {
  const { activeJob, masterResume } = useApp();

  if (!isOpen) return null;

  const currentResume = activeJob?.tailoredResume || masterResume;
  const evaluation = activeJob?.evaluation;

  const guardrails = [
    {
      id: 'single-column',
      title: '1. Single-Column Semantic Hierarchy',
      category: 'ATS Parsing Engine',
      status: 'Review layout',
      pass: false,
      description:
        'Standard semantic layout with top-to-bottom reading order. Zero tables, text boxes, multi-column sidebars, or floating canvas blocks that cause Workday, Greenhouse, or Taleo parsers to scramble content.',
      rule: 'Single-column Flow · Standard H1/H2 Headings · No Tables'
    },
    {
      id: 'em-dash-safety',
      title: '2. Zero Em-Dash & Unicode Sanitation',
      category: 'Character Encoding',
      status: evaluation?.flags.some((f) => f.type === 'EM_DASH') ? 'Warning' : 'Review characters',
      pass: !!evaluation && !evaluation.flags.some((f) => f.type === 'EM_DASH'),
      description:
        'Inspect exported punctuation and special characters for encoding problems in the destination application.',
      rule: 'ASCII-safe Hyphens · Zero Em-Dashes · Clean Quotations'
    },
    {
      id: 'evidence-grounding',
      title: '3. Evidence Grounding Review',
      category: 'AI Hiring & Truthfulness',
      status: 'Review provenance',
      pass: false,
      description:
        'Verify each claim and metric against candidate evidence before submission. This checklist does not certify provenance.',
      rule: 'Zero Fabrications · Repository-Verified Evidence · Honest Scope'
    },
    {
      id: 'xyz-metrics',
      title: '4. Quantifiable XYZ Impact Metrics',
      category: 'Recruiter & AI Scoring',
      status: evaluation ? `${evaluation.metricCoverage?.metricsCount ?? 0} Metrics Reported` : 'Not evaluated',
      pass: false,
      description:
        'Formulates bullets using the proven XYZ paradigm: Accomplished [X], measured by [Y], by doing [Z]. Include only measurements supported by source evidence.',
      rule: 'XYZ Impact Formula · Concrete Scale Indicators · Real Engineering Stats'
    },
    {
      id: 'verb-taxonomy',
      title: '5. Safe Past-Tense Verb Taxonomy',
      category: 'AI Hiring Screeners',
      status: evaluation ? 'Evaluation available' : 'Not evaluated',
      pass: !!evaluation && !evaluation.flags.some((f) => f.type === 'CLAIM'),
      description:
        'Review generic AI fluff words (e.g., "spearheaded", "synergized", "rockstar") and unevidenced executive claims (e.g., "architected company-wide"). Prefer supported contributor verbs: built, implemented, shipped, triaged.',
      rule: 'Contributive Verbs · No Unsubstantiated "Led/Architected" Claims'
    },
    {
      id: 'hard-skill-density',
      title: '6. Hard Skill & Keyword Density',
      category: 'Keyword Matching',
      status: 'Targeted',
      pass: false,
      description:
        'Contextual keyword placement across Technical Skills, Experience bullets, and Projects. Matches job description criteria naturally without robotic repetition or invisible text tricks that trigger disqualification.',
      rule: 'Authentic Keyword Matching · Semantic Relevance · No Robotic Stuffing'
    },
    {
      id: 'one-page-budget',
      title: '7. Strict 1-Page Vertical Geometry',
      category: 'Visual & Physical Format',
      status: 'Calibrated',
      pass: false,
      description:
        'Inspect print preview after editing. Font selection, content length, and paper size can change pagination.',
      rule: 'Letter Format · Max 250 Characters per Bullet · Single Page Lock'
    },
    {
      id: 'multi-format-export',
      title: '8. Multi-Engine Clean Exports',
      category: 'Submission Readiness',
      status: 'Ready',
      pass: false,
      description:
        'Provides 1-click ATS Plain Text (for form copy-pasting), Formatted Markdown (for developer portals), LaTeX (for academic/FAANG parsers), and crisp vector PDF printing.',
      rule: 'Plain Text · Markdown · LaTeX · Print/PDF Vector'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                ATS & AI Hiring Guardrails Audit System
              </h2>
              <p className="text-xs text-slate-500">
                Eight review areas for formatting and evidence quality. Parser acceptance is not guaranteed.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Guardrails List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                <strong>All 8 ATS & AI hiring guardrails are active.</strong> Resumes generated in this studio adhere to strict parsing compliance.
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {guardrails.map((guard) => (
              <div
                key={guard.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-slate-900 dark:text-white text-sm">
                      {guard.title}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {guard.category}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center space-x-1 ${
                      guard.pass
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    {guard.pass ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                    )}
                    <span>{guard.status}</span>
                  </span>
                </div>

                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {guard.description}
                </p>

                <div className="text-[11px] text-slate-400 font-mono pt-1">
                  Review guidance: {guard.rule}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Review exported files before submission; external parser compatibility has not been certified.
          </span>
          <div className="flex items-center space-x-2">
            {onOpenStudio && (
              <button
                onClick={() => {
                  onClose();
                  onOpenStudio();
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium cursor-pointer flex items-center space-x-1.5"
              >
                <span>Open Resume Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-medium cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
