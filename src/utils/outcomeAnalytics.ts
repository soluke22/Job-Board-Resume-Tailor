import type { JobRecord } from '../types';
import { effectiveEvents, normalizeHistory, type ApplicationStatus } from '../types/application';

export type SampleState = 'INSUFFICIENT_SAMPLE' | 'EARLY_SIGNAL' | 'OBSERVED';
export const sampleState = (n: number): SampleState => n < 5 ? 'INSUFFICIENT_SAMPLE' : n < 15 ? 'EARLY_SIGNAL' : 'OBSERVED';
export interface Cohort {
  total: number; interviews: number; technical: number; offers: number; rejections: number; withdrawals: number;
  rate: number; technicalRate: number; offerRate: number; sampleState: SampleState;
}
export interface OutcomeAnalytics {
  totalApplications:number;totalAnyInterviews:number;totalScreens:number;totalHiringManager:number;
  totalTechnicalInterviews:number;totalFinalInterviews:number;totalOffers:number;totalRejections:number;totalWithdrawals:number;
  conversionByFamily:Record<string,Cohort>;conversionByModifier:Record<string,Cohort>;conversionByChannel:Record<string,Cohort>;
  conversionByFitBand:Record<string,Cohort>;conversionByFreshness:Record<string,Cohort>;conversionByAts:Record<string,Cohort>;conversionBySource:Record<string,Cohort>;
  interviewRate:number|null;technicalRate:number|null;offerRate:number|null;sampleState:SampleState;smallSampleWarning:boolean;
  timeToEvent:Record<string,{sampleCount:number;sampleState:SampleState;medianDays:number|null}>;mode:'EVENT_ACTIVITY'|'LIFETIME';
}
export function computeOutcomeAnalytics(jobs: readonly JobRecord[], window?: { start: string; end: string }): OutcomeAnalytics {
  const counts = { totalApplications: 0, totalAnyInterviews: 0, totalScreens: 0, totalHiringManager: 0,
    totalTechnicalInterviews: 0, totalFinalInterviews: 0, totalOffers: 0, totalRejections: 0, totalWithdrawals: 0 };
  const groups = { conversionByFamily: Object.create(null) as Record<string,Cohort>, conversionByModifier: Object.create(null) as Record<string,Cohort>,
    conversionByChannel: Object.create(null) as Record<string,Cohort>, conversionByFitBand: Object.create(null) as Record<string,Cohort>,
    conversionByFreshness: Object.create(null) as Record<string,Cohort>, conversionByAts: Object.create(null) as Record<string,Cohort>,
    conversionBySource: Object.create(null) as Record<string,Cohort> };
  const unknown = 'UNKNOWN / LEGACY';
  const durationSamples: Record<string,number[]> = { firstInterview: [], rejection: [], offer: [] };
  const interviewStages: ApplicationStatus[] = ['RECRUITER_SCREEN','HIRING_MANAGER','TECHNICAL','FINAL_ONSITE'];
  const inWindow = (time: string) => !window || Date.parse(time) >= Date.parse(window.start) && Date.parse(time) < Date.parse(window.end);
  for (const job of jobs) {
    const events = effectiveEvents(normalizeHistory(job.statusHistory).events).slice().sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp));
    const applied = events.find(e => e.to === 'APPLIED');
    // A recorded legacy submission date can establish submission only. A current
    // REJECTED/TECHNICAL status alone cannot establish an application or any stage.
    const appliedAt = applied?.timestamp || (!job.applicationSnapshot && job.appliedDate && Number.isFinite(Date.parse(job.appliedDate)) ? job.appliedDate : undefined);
    if (!appliedAt) continue;
    const reached = new Set(events.filter(e => inWindow(e.timestamp)).map(e => e.to));
    const submitted = inWindow(appliedAt);
    const interview = interviewStages.some(stage => reached.has(stage));
    if (submitted) counts.totalApplications++;
    if (interview) counts.totalAnyInterviews++;
    for (const [stage,key] of [['RECRUITER_SCREEN','totalScreens'],['HIRING_MANAGER','totalHiringManager'],['TECHNICAL','totalTechnicalInterviews'],['FINAL_ONSITE','totalFinalInterviews'],['OFFER','totalOffers'],['REJECTED','totalRejections'],['WITHDRAWN','totalWithdrawals']] as const) if(reached.has(stage))counts[key]++;
    // Window mode is event activity, not a submission-cohort conversion report.
    if (!submitted || window) continue;
    const s = job.applicationSnapshot?.appliedAt === appliedAt ? job.applicationSnapshot : undefined;
    const known = s?.assessmentState === 'KNOWN';
    const band = !known ? unknown : `${s.assessmentAlgorithmVersion} | ${s.applicationPriority} | fit ${s.qualificationFit === undefined ? 'UNKNOWN' : s.qualificationFit >= 8.8 ? '8.8–10' : s.qualificationFit >= 7 ? '7–<8.8' : '<7'}`;
    const entries: [Record<string,Cohort>,string[]][] = [
      [groups.conversionByFamily,[known && s.roleFamily || unknown]],
      [groups.conversionByModifier,known ? s.modifiers.length ? [...new Set(s.modifiers)] : ['NONE RECORDED'] : [unknown]],
      [groups.conversionByChannel,[s?.applicationChannel || applied?.applicationChannel || 'UNKNOWN']],
      [groups.conversionByFitBand,[band]], [groups.conversionByFreshness,[s?.freshnessBand || unknown]],
      [groups.conversionByAts,[s?.atsProvider || unknown]], [groups.conversionBySource,[s?.sourceChannel || unknown]],
    ];
    for (const [group,keys] of entries) for (const key of keys) {
      const c = group[key] ||= { total:0,interviews:0,technical:0,offers:0,rejections:0,withdrawals:0,rate:0,technicalRate:0,offerRate:0,sampleState:'INSUFFICIENT_SAMPLE' };
      c.total++; if(interview)c.interviews++; if(reached.has('TECHNICAL'))c.technical++;
      if(reached.has('OFFER'))c.offers++; if(reached.has('REJECTED'))c.rejections++; if(reached.has('WITHDRAWN'))c.withdrawals++;
      c.rate=c.interviews/c.total; c.technicalRate=c.technical/c.total; c.offerRate=c.offers/c.total; c.sampleState=sampleState(c.total);
    }
    for (const [key,stages] of [['firstInterview',interviewStages],['rejection',['REJECTED']],['offer',['OFFER']]] as [string,string[]][]) {
      const times=events.filter(e=>stages.includes(e.to)).map(e=>Date.parse(e.timestamp)).filter(t=>t>=Date.parse(appliedAt));
      if(times.length)durationSamples[key].push((Math.min(...times)-Date.parse(appliedAt))/86_400_000);
    }
  }
  const rate = (n:number) => counts.totalApplications ? n/counts.totalApplications : 0;
  return { ...counts,...groups, interviewRate:window?null:rate(counts.totalAnyInterviews), technicalRate:window?null:rate(counts.totalTechnicalInterviews),
    offerRate:window?null:rate(counts.totalOffers), sampleState:sampleState(counts.totalApplications), smallSampleWarning:counts.totalApplications<15,
    timeToEvent:Object.fromEntries(Object.entries(durationSamples).map(([key,values])=>{
      values.sort((a,b)=>a-b); const n=values.length;
      return [key,{sampleCount:n,sampleState:sampleState(n),medianDays:n<5?null:n%2?values[Math.floor(n/2)]:(values[n/2-1]+values[n/2])/2}] as const;
    })) as Record<string,{sampleCount:number;sampleState:SampleState;medianDays:number|null}>, mode:window?'EVENT_ACTIVITY' as const:'LIFETIME' as const };
}
