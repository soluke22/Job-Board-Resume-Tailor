import React, { useState } from 'react';
import { X, Sparkles, Database, Target, RotateCcw, Loader2 } from 'lucide-react';
import { ResumeBullet } from '../types';

interface WhyBulletModalProps {
  isOpen: boolean;
  onClose: () => void;
  bullet: ResumeBullet | null;
  employerOrProject: string;
  onRegenerate: (targetReq: string, underlyingEvidence: string) => Promise<void>;
  onRestoreMaster?: () => void;
}

export const WhyBulletModal: React.FC<WhyBulletModalProps> = ({
  isOpen,
  onClose,
  bullet,
  employerOrProject,
  onRegenerate,
  onRestoreMaster
}) => {
  const [isRegenerating, setIsRegenerating] = useState(false);

  if (!isOpen || !bullet) return null;

  const handleRegen = async () => {
    setIsRegenerating(true);
    try {
      await onRegenerate(bullet.targetRequirement || '', bullet.underlyingEvidence || '');
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-xl overflow-hidden my-8">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Bullet Evidence & Tailoring Rationale
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs">
          {/* Active Bullet Text */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider block">
              Active Bullet Text ({employerOrProject})
            </span>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium leading-relaxed">
              {bullet.text}
            </div>
          </div>

          {/* Target Requirement */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider flex items-center space-x-1">
              <Target className="w-3.5 h-3.5" />
              <span>Target JD Requirement</span>
            </span>
            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-lg text-slate-800 dark:text-slate-200">
              {bullet.targetRequirement || 'General frontend engineering and reliability.'}
            </div>
          </div>

          {/* Underlying Candidate Evidence */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase text-blue-600 dark:text-blue-400 tracking-wider flex items-center space-x-1">
              <Database className="w-3.5 h-3.5" />
              <span>Grounded Evidence Record</span>
            </span>
            <div className="p-3 bg-blue-50/40 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-lg text-slate-800 dark:text-slate-200">
              {bullet.underlyingEvidence || 'Verified engineering record from candidate repository.'}
            </div>
          </div>

          {/* Why this bullet? */}
          {bullet.whyThisBullet && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider block">
                Why This Bullet Outranked Alternatives
              </span>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                {bullet.whyThisBullet}
              </p>
            </div>
          )}

          {/* Master Text Comparison */}
          {bullet.masterText && bullet.masterText !== bullet.text && (
            <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider block">
                Original Master Resume Wording
              </span>
              <div className="p-2.5 bg-slate-100 dark:bg-slate-800/80 rounded text-slate-600 dark:text-slate-400 text-[11px]">
                {bullet.masterText}
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            {bullet.masterText && onRestoreMaster && (
              <button
                type="button"
                onClick={onRestoreMaster}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center space-x-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Master Text</span>
              </button>
            )}

            <div className="flex items-center space-x-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Done
              </button>
              <button
                type="button"
                onClick={handleRegen}
                disabled={isRegenerating}
                className="px-4 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                {isRegenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Regenerating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Regenerate Single Bullet</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
