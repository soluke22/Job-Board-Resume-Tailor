import { ArtifactStatus } from '../components/ArtifactStatus';
import { canCopyArtifact } from '../utils/artifactReadiness';
import React, { useState } from 'react';
import {
  ShieldCheck,
  Sparkles,
  HelpCircle,
  FileText,
  Copy,
  Check,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { InterviewProofClaim } from '../types';

export const ProofPackView: React.FC = () => {
  const {
    jobs,
    activeJobId,
    activeJob,
    setActiveJobId,
    generateProofPack,
    isGenerating
  } = useApp();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedClaimId, setExpandedClaimId] = useState<string | null>(null);

  const proofPack = activeJob?.proofPack;

  const handleCopy = (text: string, id: string) => {
    if(!canCopyArtifact(proofPack))return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              Interview Defensibility
            </span>
            <span className="text-xs text-slate-400">Evidence and uncertainty</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Interview Proof Pack</h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Prepares defensible, technical answers for every resume claim before an engineering manager or staff engineer asks.
          </p>
        </div>

        {/* Target Job Selector */}
        <div className="flex items-center space-x-3 shrink-0">
          <select
            value={activeJobId || ''}
            onChange={(e) => setActiveJobId(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
          >
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.company} - {j.title}
              </option>
            ))}
          </select>

          <button
            onClick={() => activeJob && generateProofPack(activeJob.id)}
            disabled={isGenerating || !activeJob || activeJob.assessmentStatus!=='ASSESSED' || activeJob.tailoredResume?.readiness!=='READY'}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-900/30 flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Formulating Proof Claims...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{proofPack ? 'Regenerate Pack' : 'Generate Proof Pack'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {activeJob && (activeJob.assessmentStatus!=='ASSESSED' || activeJob.tailoredResume?.readiness!=='READY') && <p className="text-xs text-amber-300">Proof packs require a current assessment and a READY resume. Reassess or validate the resume first.</p>}
      {!activeJob ? (
        <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-400">
          Select or add a job to generate an Interview Proof Pack.
        </div>
      ) : !proofPack ? (
        <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
          <ShieldCheck className="w-12 h-12 text-indigo-400 mx-auto" />
          <h2 className="text-base font-bold text-white">No Proof Pack Generated Yet</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Click &quot;Generate Proof Pack&quot; to synthesize technical context, anticipated skeptical interview questions, and defensible STAR answers grounded in verified evidence.
          </p>
          <button
            onClick={() => generateProofPack(activeJob.id)}
            disabled={isGenerating || activeJob.tailoredResume?.readiness!=='READY' || activeJob.assessmentStatus!=='ASSESSED'}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
          >
            Generate Now
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Generated {new Date(proofPack.generatedAt).toLocaleDateString()} ·{' '}
              {proofPack.claims.length} defensible claims prepared
            </span>
            <span className="text-emerald-400 font-medium">{proofPack.provenance?.validationStatus || 'DRAFT'}</span>
          </div>

          <ArtifactStatus artifact={proofPack} />
          {proofPack.claims.map((claim: InterviewProofClaim, idx: number) => {
            const isExpanded = expandedClaimId === claim.id || (!expandedClaimId && idx === 0);
            return (
              <div
                key={claim.id || idx}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3"
              >
                {/* Claim Top: The Resume Bullet */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                      Resume Claim #{idx + 1}
                    </span>
                    <p className="text-sm font-semibold text-white leading-snug">
                      &quot;{claim.resumeBulletText}&quot;
                    </p>
                  </div>

                  <button
                    onClick={() => setExpandedClaimId(isExpanded ? '__none' : claim.id)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="pt-3 border-t border-slate-800/80 space-y-4 text-xs">
                    {/* Anticipated Skeptical Question */}
                    <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/50 space-y-1">
                      <div className="text-[11px] font-bold text-amber-400 flex items-center space-x-1 uppercase tracking-wider">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Anticipated Skeptical Interviewer Question</span>
                      </div>
                      <p className="text-slate-200 font-medium italic">
                        &quot;{claim.likelyFollowUpQuestion}&quot;
                      </p>
                    </div>

                    {/* Defensible Explanation */}
                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                      <div className="text-[11px] font-bold text-emerald-400 flex items-center space-x-1 uppercase tracking-wider">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Defensible, Truthful Explanation</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">
                        {claim.defensibleExplanation}
                      </p>
                      <p className="text-slate-400">Technical context: {claim.technicalContext}</p>
                      <p className="text-amber-300">Avoid extending this claim to undocumented architecture, scale, leadership or outcomes.</p>
                    </div>

                    {/* STAR Story Breakdown */}
                    {claim.starStory && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                          <span className="text-[10px] font-bold text-indigo-400 uppercase">Situation</span>
                          <p className="text-slate-300 mt-0.5">{claim.starStory.situation}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                          <span className="text-[10px] font-bold text-blue-400 uppercase">Task</span>
                          <p className="text-slate-300 mt-0.5">{claim.starStory.task}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase">Action</span>
                          <p className="text-slate-300 mt-0.5">{claim.starStory.action}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                          <span className="text-[10px] font-bold text-pink-400 uppercase">Result</span>
                          <p className="text-slate-300 mt-0.5">{claim.starStory.result}</p>
                        </div>
                      </div>
                    )}

                    {/* Copy Full Answer Button */}
                    <div className="flex justify-end pt-1">
                      <button
                        disabled={!canCopyArtifact(proofPack)}
                        onClick={() =>
                          handleCopy(
                            `Interviewer Question: ${claim.likelyFollowUpQuestion}\n\nDefensible Answer: ${claim.defensibleExplanation}\n\nSTAR Breakdown:\nSituation: ${claim.starStory?.situation}\nTask: ${claim.starStory?.task}\nAction: ${claim.starStory?.action}\nResult: ${claim.starStory?.result}`,
                            claim.id
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center space-x-1.5 transition cursor-pointer"
                      >
                        {copiedId === claim.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied Prep Notes</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Prep Material</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
