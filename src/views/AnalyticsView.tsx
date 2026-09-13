import React from 'react';
import { useApp } from '../context/AppContext';
import type { Cohort, OutcomeAnalytics } from '../utils/outcomeAnalytics';

export const AnalyticsView: React.FC = () => {
  const { analytics: a, workspaceMode } = useApp();
  const stages = [['Applications',a.totalApplications],['Any interview',a.totalAnyInterviews],['Recruiter screens',a.totalScreens],
    ['Hiring manager',a.totalHiringManager],['Technical',a.totalTechnicalInterviews],['Final / onsite',a.totalFinalInterviews],
    ['Offers',a.totalOffers],['Rejections',a.totalRejections],['Withdrawals',a.totalWithdrawals]] as const;
  const groups: [string,Record<string,Cohort>][] = [['Role family',a.conversionByFamily],['Fit band / priority / algorithm',a.conversionByFitBand],
    ['Modifiers',a.conversionByModifier],['Application channel',a.conversionByChannel],['Publication freshness at application',a.conversionByFreshness],
    ['ATS provider',a.conversionByAts],['Discovery source',a.conversionBySource]];
  return <div className="max-w-7xl mx-auto p-6 space-y-6 text-slate-300">
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2">
      <h1 className="text-2xl font-bold text-white">Observed application outcomes</h1>
      {workspaceMode==='PUBLIC_DEMO' && <p className="text-amber-300">Synthetic demo history — these are not your private outcomes.</p>}
      <p>Current status is separate from historical stages. Each application counts once per explicitly recorded stage; skipped stages are not inferred.</p>
      <p>Rejection does not establish a reason or prove a fit assessment was wrong. Outcomes do not change ranking.</p>
      <p>Sample: n={a.totalApplications} · {a.sampleState.replaceAll('_',' ')}. Under 5 applications is insufficient; 5–14 is an early signal; 15 or more is observed data, without a claim of statistical significance.</p>
      {a.totalApplications===0 && <p>No trustworthy application submissions recorded yet.</p>}
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{stages.map(([name,count])=><div key={name} className="bg-slate-900 rounded-xl p-4"><div>{name}</div><strong className="text-xl text-white">{count}</strong></div>)}</div>
    <p>Application → any interview: {a.totalAnyInterviews}/{a.totalApplications} · technical: {a.totalTechnicalInterviews}/{a.totalApplications} · offer: {a.totalOffers}/{a.totalApplications}. Denominator: recorded applications, including rejected, withdrawn and archived records.</p>
    <div className="grid md:grid-cols-2 gap-4">{groups.map(([name,group])=><section key={name} className="bg-slate-900 rounded-2xl p-5 space-y-3">
      <h2 className="font-bold text-white">Observed outcomes by {name.toLowerCase()}</h2>
      {!Object.keys(group).length && <p>No application cohort data.</p>}
      {Object.entries(group).map(([key,c])=><div key={key} className="border border-slate-700 rounded-xl p-3 space-y-1 text-sm">
        <strong>{key}</strong><p>n={c.total} · {c.sampleState.replaceAll('_',' ')}</p>
        <p>{c.interviews}/{c.total} reached an interview{c.sampleState==='INSUFFICIENT_SAMPLE'?' — too few to draw a reliable conclusion':` (${Math.round(c.rate*100)}% observed)`}</p>
        <p>{c.technical} technical · {c.offers} offers · {c.rejections} rejections · {c.withdrawals} withdrawals</p>
      </div>)}
    </section>)}</div>
    <p>Segments use application-time snapshots. Current reassessments never rewrite these cohorts. UNKNOWN / LEGACY means the historical assessment is unavailable. ATS provider and discovery source are separate from application channel. Modifier cohorts may overlap; these are observations, not causal effects.</p>
    <section className="bg-slate-900 rounded-2xl p-5"><h2 className="font-bold text-white">Time from application</h2>
      {Object.entries(a.timeToEvent as OutcomeAnalytics['timeToEvent']).map(([key,t])=><p key={key}>{key}: n={t.sampleCount} · {t.medianDays===null?'Median withheld — fewer than 5 valid timestamp pairs':`${t.medianDays.toFixed(1)} median days`}</p>)}
    </section>
  </div>;
};
