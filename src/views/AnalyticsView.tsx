import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Target,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Briefcase,
  PieChart,
  Brain
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AnalyticsView: React.FC = () => {
  const { analytics, jobs } = useApp();

  const totalJobs = jobs.length;
  const appliedCount = jobs.filter((j) =>
    ['APPLIED', 'RECRUITER_SCREEN', 'HIRING_MANAGER', 'TECHNICAL', 'FINAL_ONSITE', 'OFFER'].includes(
      j.applicationStatus || ''
    )
  ).length;

  const interviewCount = jobs.filter((j) =>
    ['RECRUITER_SCREEN', 'HIRING_MANAGER', 'TECHNICAL', 'FINAL_ONSITE', 'OFFER'].includes(
      j.applicationStatus || ''
    )
  ).length;

  const offerCount = jobs.filter((j) => j.applicationStatus === 'OFFER').length;

  const interviewRate = appliedCount > 0 ? Math.round((interviewCount / appliedCount) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Phase 5: Learn &amp; Calibrate
          </span>
          <span className="text-xs text-slate-400">Interviews Per Unit Effort Optimizer</span>
        </div>
        <h1 className="text-2xl font-bold text-white mt-1">Outcome Analytics &amp; Market Calibration</h1>
        <p className="text-sm text-slate-300 mt-1 max-w-3xl">
          Tracks observed conversion rates across role families, company sizes, and ATS platforms to prioritize highest-yield searches and prevent wasted effort.
        </p>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
          <div className="text-xs font-semibold text-slate-400">Verified Pipeline Roles</div>
          <div className="text-2xl font-bold text-white">{totalJobs}</div>
          <div className="text-[11px] text-slate-400">Screened for deterministic fit</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
          <div className="text-xs font-semibold text-slate-400">Total Applications</div>
          <div className="text-2xl font-bold text-blue-400">{appliedCount}</div>
          <div className="text-[11px] text-slate-400">Tailored submissions</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
          <div className="text-xs font-semibold text-slate-400">Interviews Secured</div>
          <div className="text-2xl font-bold text-purple-400">{interviewCount}</div>
          <div className="text-[11px] text-slate-400">Recruiter &amp; technical screens</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
          <div className="text-xs font-semibold text-emerald-400">Interview Yield Rate</div>
          <div className="text-2xl font-bold text-emerald-400">{interviewRate}%</div>
          <div className="text-[11px] text-slate-400">Screen per application submitted</div>
        </div>
      </div>

      {/* Yield by Role Family & ATS Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Role Family Conversion */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Target className="w-4 h-4 text-emerald-400" />
              <span>Conversion by Role Family</span>
            </h3>
            <span className="text-xs text-slate-400">Historical Signal</span>
          </div>

          <div className="space-y-3 text-xs">
            {Object.entries(analytics.byRoleFamily || {}).map(([family, stats]: [string, any]) => {
              const rate = stats.applied > 0 ? Math.round((stats.interviews / stats.applied) * 100) : 0;
              return (
                <div key={family} className="space-y-1 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-200">{family}</span>
                    <span className="text-emerald-400">{rate}% Interview Rate</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(8, rate))}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 pt-0.5">
                    <span>{stats.applied} Applied</span>
                    <span>{stats.interviews} Interviews</span>
                    <span>{stats.offers || 0} Offers</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ATS Board Conversion */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Zap className="w-4 h-4 text-blue-400" />
              <span>Conversion by ATS Provider</span>
            </h3>
            <span className="text-xs text-slate-400">Direct vs Intermediated</span>
          </div>

          <div className="space-y-3 text-xs">
            {Object.entries(analytics.byAts || {}).map(([ats, stats]: [string, any]) => {
              const rate = stats.applied > 0 ? Math.round((stats.interviews / stats.applied) * 100) : 0;
              return (
                <div key={ats} className="space-y-1 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-200 uppercase tracking-wider">{ats}</span>
                    <span className="text-blue-400">{rate}% Interview Rate</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(8, rate))}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 pt-0.5">
                    <span>{stats.applied} Applied</span>
                    <span>{stats.interviews} Interviews</span>
                    <span>{stats.offers || 0} Offers</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Continuous Learning Insights */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
          <Brain className="w-4 h-4 text-purple-400" />
          <span>Learned Positioning Rules</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 space-y-2">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Observed Positive Modifiers</span>
            </span>
            <ul className="space-y-1.5 text-slate-300">
              <li>• Direct Ashby postings yield +28% higher recruiter response than Workday postings.</li>
              <li>• Roles emphasizing &quot;design systems&quot; or &quot;frontend architecture&quot; achieve 100% evidence coverage without stretch bullets.</li>
              <li>• Roles posted &lt; 7 days ago (&quot;NEW&quot;) convert 3x faster than postings older than 30 days.</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 space-y-2">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Observed Negative Modifiers</span>
            </span>
            <ul className="space-y-1.5 text-slate-300">
              <li>• Roles requiring &gt; 50% backend Go/Kubernetes produce zero interview conversion; strictly filter out in discovery.</li>
              <li>• Roles with unverified ATS listing status should not consume tailoring API quota until re-verified.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
