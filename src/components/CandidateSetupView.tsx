import React, { useEffect, useRef, useState } from 'react';
import { createSynchronousSubmitGuard, durableUiLabel, shouldAdoptCandidateDraft, useApp, validateAndPersistSearchPreferences, validateSearchPreferencesDraft } from '../context/AppContext';
import { previewImport, readLegacyWorkspace, selectedImport, type ImportChoice } from '../services/legacyImport';
import { PrivateFilesView } from './PrivateFilesView';
import type { PrimaryRoleFamily, SearchProfile } from '../types';
import { searchProfileSchema } from '../../server/db/workspaceValidation';

export type CommonSearchPreferences = {
  roleFamilies: PrimaryRoleFamily[]; seniority: string; allowedEmploymentTypes: string; excludedEmploymentTypes: string;
  remotePreference: SearchProfile['remotePreference']; locations: string; maximumOnsiteFrequency: string;
  relocationAllowed: boolean; clearancePolicy: SearchProfile['clearancePolicy']; roleExclusions: string;
  companyExclusions: string; technologyStrengths: string; technologyAdjacencies: string; technologyGaps: string;
};

export const ROLE_FAMILY_OPTIONS: ReadonlyArray<{ value: PrimaryRoleFamily; label: string }> = [
  { value: 'frontend-product', label: 'Frontend product' },
  { value: 'ui-platform-design-systems', label: 'UI platform and design systems' },
  { value: 'frontend-heavy-fullstack', label: 'Frontend-heavy full stack' },
  { value: 'production-support-frontend', label: 'Production support frontend' },
  { value: 'forward-deployed-software', label: 'Forward-deployed software' }
];

export function ordinaryRoleFamilies(values: readonly string[]): PrimaryRoleFamily[] {
  const allowed = new Set(ROLE_FAMILY_OPTIONS.map(option => option.value));
  return [...new Set(values.filter((value): value is PrimaryRoleFamily => allowed.has(value as PrimaryRoleFamily)))];
}

export function toggleOrdinaryRoleFamily(current: readonly PrimaryRoleFamily[], value: string): PrimaryRoleFamily[] {
  if (!ROLE_FAMILY_OPTIONS.some(option => option.value === value)) throw new Error('Unsupported ordinary role family.');
  const family = value as PrimaryRoleFamily;
  return current.includes(family) ? current.filter(item => item !== family) : [...current, family];
}

// Semicolons keep ordinary place names such as "San Francisco, CA" intact.
const listText = (values: string[]) => values.join('; ');
const listValue = (value: string) => value.split(';').map(item => item.trim()).filter(Boolean);

export function commonSearchPreferences(profile: SearchProfile): CommonSearchPreferences {
  return {
    roleFamilies: ordinaryRoleFamilies(profile.preferredRoleFamilies), seniority: listText(profile.targetSeniority),
    allowedEmploymentTypes: listText(profile.allowedEmploymentTypes), excludedEmploymentTypes: listText(profile.excludedEmploymentTypes),
    remotePreference: profile.remotePreference, locations: listText(profile.hybridLocations), maximumOnsiteFrequency: profile.maximumOnsiteFrequency,
    relocationAllowed: profile.relocationAllowed, clearancePolicy: profile.clearancePolicy,
    roleExclusions: listText(profile.excludedRolePatterns), companyExclusions: listText(profile.companyExclusions),
    technologyStrengths: listText(profile.technologyStrengths), technologyAdjacencies: listText(profile.technologyAdjacencies), technologyGaps: listText(profile.technologyGaps)
  };
}

// The spread deliberately preserves advanced preferences (compensation, hiring
// process and modifiers) when the owner uses ordinary form controls.
export function mergeCommonSearchPreferences(profile: SearchProfile, common: CommonSearchPreferences): SearchProfile {
  const original = commonSearchPreferences(profile);
  const selectedFamilies = new Set(ordinaryRoleFamilies(common.roleFamilies));
  const retainedFamilies = profile.preferredRoleFamilies.filter(family =>
    !ROLE_FAMILY_OPTIONS.some(option => option.value === family) || selectedFamilies.has(family));
  for (const family of selectedFamilies) if (!retainedFamilies.includes(family)) retainedFamilies.push(family);
  const changed = <K extends keyof CommonSearchPreferences>(field: K) =>
    JSON.stringify(common[field]) !== JSON.stringify(original[field]);
  return {
    ...profile,
    preferredRoleFamilies: changed('roleFamilies') ? retainedFamilies : profile.preferredRoleFamilies,
    targetSeniority: changed('seniority') ? listValue(common.seniority) : profile.targetSeniority,
    allowedEmploymentTypes: changed('allowedEmploymentTypes') ? listValue(common.allowedEmploymentTypes) : profile.allowedEmploymentTypes,
    excludedEmploymentTypes: changed('excludedEmploymentTypes') ? listValue(common.excludedEmploymentTypes) : profile.excludedEmploymentTypes,
    remotePreference: changed('remotePreference') ? common.remotePreference : profile.remotePreference,
    hybridLocations: changed('locations') ? listValue(common.locations) : profile.hybridLocations,
    maximumOnsiteFrequency: changed('maximumOnsiteFrequency') ? common.maximumOnsiteFrequency : profile.maximumOnsiteFrequency,
    relocationAllowed: changed('relocationAllowed') ? common.relocationAllowed : profile.relocationAllowed,
    clearancePolicy: changed('clearancePolicy') ? common.clearancePolicy : profile.clearancePolicy,
    excludedRolePatterns: changed('roleExclusions') ? listValue(common.roleExclusions) : profile.excludedRolePatterns,
    companyExclusions: changed('companyExclusions') ? listValue(common.companyExclusions) : profile.companyExclusions,
    technologyStrengths: changed('technologyStrengths') ? listValue(common.technologyStrengths) : profile.technologyStrengths,
    technologyAdjacencies: changed('technologyAdjacencies') ? listValue(common.technologyAdjacencies) : profile.technologyAdjacencies,
    technologyGaps: changed('technologyGaps') ? listValue(common.technologyGaps) : profile.technologyGaps
  };
}

export function isPrivateOnboarding(workspaceMode: string, isOwner: boolean) {
  return workspaceMode === 'PRIVATE_WORKSPACE' && isOwner;
}

export function canHideAdvancedPreferences(draft: string, profile: SearchProfile) {
  return draft === JSON.stringify(profile, null, 2);
}

// Applying full JSON transfers ownership to that draft, including its common fields.
export function applyAdvancedSearchPreferencesDraft(advancedDraft: string) {
  const parsed = validateSearchPreferencesDraft(advancedDraft);
  if (parsed.kind === 'invalid') return parsed;
  if (!searchProfileSchema.safeParse(parsed.value).success)
    return { kind: 'invalid' as const, message: 'Invalid search preferences. Fix the JSON and try again.' };
  return { kind: 'valid' as const, value: parsed.value, common: commonSearchPreferences(parsed.value) };
}

export function privateOnboardingSteps(state: { profileStarted: boolean; searchPreferencesStarted: boolean; masterResumeStarted: boolean; evidenceCount: number; projectCount: number; skillCount: number; jobCount: number }) {
  return [
    { id: 'profile', view: 'candidate-setup' as const, title: '1. Add your candidate profile', detail: state.profileStarted ? 'Profile information is present; review it for accuracy.' : 'Start here with the basics you want to use in your workspace.', status: state.profileStarted ? 'Information present' : 'Not started' },
    { id: 'search-preferences', view: 'candidate-setup' as const, title: '2. Set Search Preferences', detail: state.searchPreferencesStarted ? 'Search preferences are present; review them for accuracy before discovery.' : 'Set roles, locations, work style, and technologies for future job discovery.', status: state.searchPreferencesStarted ? 'Preferences present' : 'Not started' },
    { id: 'master-resume', view: 'master-resume' as const, title: '3. Inspect your Master Resume', detail: `${state.masterResumeStarted ? 'Master content is present; claim support still needs review. ' : ''}Use selective import when applicable to populate structured records, then inspect or update the Master summary. Source documents are stored without automatic parsing or trust.`, status: state.masterResumeStarted ? 'Content present' : 'Not started' },
    { id: 'evidence', view: 'evidence-bank' as const, title: '4. Review your Evidence Bank', detail: state.evidenceCount ? `${state.evidenceCount} record(s) present; review status separately before using claims.` : 'Add evidence, then review it before it supports claims.', status: state.evidenceCount ? `${state.evidenceCount} record(s)` : 'Not started' },
    { id: 'projects', view: 'projects' as const, title: '5. Review project records', detail: state.projectCount ? `${state.projectCount} project record(s) present; presence does not verify claims.` : 'Project records can arrive through selective import and need supporting reviewed evidence.', status: state.projectCount ? `${state.projectCount} record(s)` : 'Not started' },
    { id: 'skills', view: 'skills' as const, title: '6. Review skill records', detail: state.skillCount ? `${state.skillCount} skill record(s) present; presence does not verify proficiency.` : 'Skill records can arrive through selective import and need supporting reviewed evidence.', status: state.skillCount ? `${state.skillCount} record(s)` : 'Not started' },
    { id: 'pipeline', view: 'pipeline' as const, title: '7. Start your Pipeline', detail: state.jobCount ? `${state.jobCount} job record(s) present.` : 'Add a job only when you are ready to assess it against reviewed evidence.', status: state.jobCount ? `${state.jobCount} record(s)` : 'Not started' }
  ];
}

const profileLabels = { name: 'Name', title: 'Target title', email: 'Email', phone: 'Phone', location: 'Location', workAuthorization: 'Work authorization' } as const;

export const CandidateSetupView: React.FC = () => {
  const { profile, saveProfile, searchProfile, saveSearchProfile, resetPublicDemo, workspaceMode, authSession, importWorkspaceJson, exportWorkspaceJson, setCurrentView, syncStatus, evidence, projects, skills, jobs, masterResume } = useApp();
  const [draft, setDraft] = useState(profile);
  const adoptedProfile = useRef(profile);
  const [preferences, setPreferences] = useState(JSON.stringify(searchProfile, null, 2));
  const adoptedPreferences = useRef(JSON.stringify(searchProfile, null, 2));
  const [appliedPreferences, setAppliedPreferences] = useState(searchProfile);
  const [commonPreferences, setCommonPreferences] = useState(() => commonSearchPreferences(searchProfile));
  const [advancedPreferencesOpen, setAdvancedPreferencesOpen] = useState(false);
  const [choices, setChoices] = useState<ImportChoice[]>([]);
  const [selected, setSelected] = useState(new Set<string>());
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferencesSaveState, setPreferencesSaveState] = useState<'clean' | 'dirty' | 'saving' | 'saved' | 'failed'>('clean');
  const [preferencesValidationError, setPreferencesValidationError] = useState('');
  const [confirmDemoReset, setConfirmDemoReset] = useState(false);
  const [importSucceeded, setImportSucceeded] = useState(false);
  const profileSubmitting = useRef(createSynchronousSubmitGuard());
  const preferencesSubmitting = useRef(createSynchronousSubmitGuard());
  const privateMode = isPrivateOnboarding(workspaceMode, authSession.isOwner);
  const profileIsDirty = !shouldAdoptCandidateDraft(draft, profile);
  const composedPreferences = mergeCommonSearchPreferences(appliedPreferences, commonPreferences);
  const preferencesIsDirty = JSON.stringify(composedPreferences) !== JSON.stringify(searchProfile)
    || advancedPreferencesOpen && !canHideAdvancedPreferences(preferences, composedPreferences);
  useEffect(() => {
    if (shouldAdoptCandidateDraft(draft, adoptedProfile.current)) setDraft(profile);
    adoptedProfile.current = profile;
  }, [draft, profile]);
  useEffect(() => {
    const canonical = JSON.stringify(searchProfile, null, 2);
    if (preferences === adoptedPreferences.current
      && JSON.stringify(mergeCommonSearchPreferences(appliedPreferences, commonPreferences), null, 2) === adoptedPreferences.current) {
      setPreferences(canonical); setAppliedPreferences(searchProfile);
      setCommonPreferences(commonSearchPreferences(searchProfile)); setPreferencesSaveState('clean');
    }
    adoptedPreferences.current = canonical;
  }, [searchProfile]);
  const preview = (items: ImportChoice[]) => { setChoices(items); setSelected(new Set()); setImportSucceeded(false); setMessage(items.length ? 'Preview only: select individual records to import. Nothing has been uploaded or changed.' : 'No legacy records found.'); };
  const exportData = async () => {
    try {
      const text = await exportWorkspaceJson();
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = 'private-workspace.json'; a.click(); URL.revokeObjectURL(url);
    } catch (err: any) { setMessage(err.message); }
  };
  const confirmImport = async () => {
    setBusy(true);
    const result = await importWorkspaceJson(JSON.stringify(selectedImport(choices, selected)));
    setMessage(result.message); if (result.success) { setChoices([]); setSelected(new Set()); setImportSucceeded(true); }
    setBusy(false);
  };
  const box = 'rounded-xl border border-slate-300 dark:border-slate-700 p-5 space-y-4';
  const input = 'w-full rounded border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm';
  return <div className="max-w-5xl mx-auto p-6 space-y-6">
    <h1 className="text-xl font-semibold">{privateMode ? 'Set Up Private Workspace' : 'Public Demo Setup'}</h1>
    <p className="text-sm text-slate-500">{privateMode ? 'Start with your own records. Your private workspace contains no preloaded candidate history.' : 'Explore synthetic demo records. Sign in to configure or import a private workspace.'}</p>
    <form className={box} onSubmit={async event => {
      event.preventDefault();
      if (!profileSubmitting.current.acquire()) return;
      setSavingProfile(true); setMessage('');
      try { await saveProfile(draft); setMessage(privateMode ? 'Profile saved privately.' : 'Demo profile updated.'); }
      catch (err: any) { setMessage(err.message || 'Profile was not saved. Reload required.'); }
      finally { profileSubmitting.current.release(); setSavingProfile(false); }
    }}>
      <h2 className="font-semibold">Candidate profile</h2>
      <div className="grid sm:grid-cols-2 gap-3">{(['name', 'title', 'email', 'phone', 'location', 'workAuthorization'] as const).map(field => <label key={field} className="text-sm">{profileLabels[field]}<input className={input} value={draft[field] || ''} onChange={event => setDraft({ ...draft, [field]: event.target.value })} /></label>)}</div>
      <label className="block text-sm">Professional summary<textarea className={input} value={draft.masterSummary} onChange={event => setDraft({ ...draft, masterSummary: event.target.value })} /></label>
      <button disabled={savingProfile} className="text-emerald-600 font-medium disabled:opacity-40">{savingProfile ? 'Saving…' : 'Save profile'}</button><span className="ml-3 text-xs">{savingProfile ? 'Saving…' : profileIsDirty ? 'Unsaved changes' : syncStatus}</span>
    </form>
    {privateMode && <section className={box} aria-labelledby="private-onboarding-title">
      <h2 id="private-onboarding-title" className="font-semibold">Private workspace onboarding</h2>
      <p className="text-sm text-slate-500">Follow these steps in order. Record counts show what is present in this workspace; they do not verify claims, skills, or evidence.</p>
      <ol className="space-y-3">{privateOnboardingSteps({ profileStarted: Boolean(profile.name || profile.title || profile.masterSummary), searchPreferencesStarted: Boolean(searchProfile.preferredRoleFamilies.length || searchProfile.targetSeniority.length || searchProfile.technologyStrengths.length), masterResumeStarted: Boolean(masterResume.professionalSummary || masterResume.experience.length || masterResume.projects.length || masterResume.skills.length), evidenceCount: evidence.length, projectCount: projects.length, skillCount: skills.length, jobCount: jobs.length }).map(step => <li key={step.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <button type="button" className="text-emerald-600 font-medium text-left" onClick={() => setCurrentView(step.view)}>{step.title}</button><span className="text-xs rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5">{step.status}</span><span className="basis-full text-sm text-slate-500">{step.detail}</span>
      </li>)}</ol>
    </section>}
    <section className={box}>
      <h2 className="font-semibold">Search preferences</h2>
      <p className="text-sm text-slate-500">Use ordinary controls for common preferences. Separate multiple values with semicolons; blank values stay unspecified.</p>
      <fieldset disabled={savingPreferences || advancedPreferencesOpen}>
      <div className="grid sm:grid-cols-2 gap-3">{([
        ['seniority', 'Target seniority'], ['locations', 'Hybrid or onsite locations'], ['maximumOnsiteFrequency', 'Maximum onsite frequency'],
        ['allowedEmploymentTypes', 'Allowed employment types'], ['excludedEmploymentTypes', 'Excluded employment types'], ['roleExclusions', 'Role exclusions'], ['companyExclusions', 'Company exclusions'],
        ['technologyStrengths', 'Technology strengths'], ['technologyAdjacencies', 'Technology adjacencies'], ['technologyGaps', 'Technology gaps']
      ] as const).map(([field, label]) => <label key={field} className="text-sm">{label}<input className={input} value={commonPreferences[field]} onChange={event => { setCommonPreferences(previous => ({ ...previous, [field]: event.target.value })); setPreferencesSaveState('dirty'); setPreferencesValidationError(''); }} /></label>)}
        <fieldset className="text-sm sm:col-span-2"><legend>Role families</legend><div className="grid sm:grid-cols-2 gap-2 mt-1">{ROLE_FAMILY_OPTIONS.map(option => <label key={option.value} className="flex items-center gap-2"><input type="checkbox" checked={commonPreferences.roleFamilies.includes(option.value)} onChange={() => { setCommonPreferences(previous => ({ ...previous, roleFamilies: toggleOrdinaryRoleFamily(previous.roleFamilies, option.value) })); setPreferencesSaveState('dirty'); setPreferencesValidationError(''); }} /> {option.label}</label>)}</div></fieldset>
        <label className="text-sm">Remote preference<select className={input} value={commonPreferences.remotePreference} onChange={event => { setCommonPreferences(previous => ({ ...previous, remotePreference: event.target.value as SearchProfile['remotePreference'] })); setPreferencesSaveState('dirty'); }}><option value="any">Any workplace</option><option value="remote_only">Remote only</option><option value="hybrid_flexible">Hybrid flexible</option></select></label>
        <label className="text-sm">Clearance roles<select className={input} value={commonPreferences.clearancePolicy} onChange={event => { setCommonPreferences(previous => ({ ...previous, clearancePolicy: event.target.value as SearchProfile['clearancePolicy'] })); setPreferencesSaveState('dirty'); }}><option value="exclude_clearance">Exclude roles requiring clearance</option><option value="open_to_clearance">Open to clearance roles</option></select></label>
        <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={commonPreferences.relocationAllowed} onChange={event => { setCommonPreferences(previous => ({ ...previous, relocationAllowed: event.target.checked })); setPreferencesSaveState('dirty'); }} /> Open to relocation</label>
      </div>
      </fieldset>
      <button type="button" className="text-slate-600 dark:text-slate-300 text-sm" onClick={() => {
        if (!advancedPreferencesOpen) { setPreferences(JSON.stringify(composedPreferences, null, 2)); setAdvancedPreferencesOpen(true); return; }
        if (!canHideAdvancedPreferences(preferences, composedPreferences)) { setPreferencesSaveState('dirty'); setPreferencesValidationError('Apply or discard Advanced JSON edits before hiding.'); return; }
        setAdvancedPreferencesOpen(false);
      }}> {advancedPreferencesOpen ? 'Hide advanced JSON preferences' : 'Show advanced JSON preferences'} </button>
      {advancedPreferencesOpen && <div className="space-y-2">
        <p className="text-xs text-slate-500">Advanced JSON edits the full Search Profile. Apply it to update the ordinary controls before saving; applying does not save. Ordinary controls are paused while this editor is open.</p>
        <textarea aria-label="Advanced search preferences JSON" className={input + ' font-mono h-48'} value={preferences} disabled={savingPreferences} onChange={event => { setPreferences(event.target.value); setPreferencesSaveState('dirty'); setPreferencesValidationError(''); }} />
        <div className="flex gap-4"><button type="button" disabled={savingPreferences} className="text-emerald-600 font-medium disabled:opacity-40" onClick={() => {
          const applied = applyAdvancedSearchPreferencesDraft(preferences);
          if (applied.kind === 'invalid') { setPreferencesSaveState('dirty'); setPreferencesValidationError(applied.message); return; }
          setAppliedPreferences(applied.value); setCommonPreferences(applied.common);
          setPreferences(JSON.stringify(applied.value, null, 2)); setAdvancedPreferencesOpen(false);
          setPreferencesSaveState(JSON.stringify(applied.value) === JSON.stringify(searchProfile) ? 'clean' : 'dirty'); setPreferencesValidationError('');
        }}>Apply Advanced JSON</button><button type="button" disabled={savingPreferences} className="text-slate-600 dark:text-slate-300 disabled:opacity-40" onClick={() => {
          setPreferences(JSON.stringify(composedPreferences, null, 2)); setAdvancedPreferencesOpen(false); setPreferencesValidationError('');
          setPreferencesSaveState(JSON.stringify(composedPreferences) === JSON.stringify(searchProfile) ? 'clean' : 'dirty');
        }}>Discard Advanced JSON edits</button></div>
      </div>}
      <button disabled={savingPreferences} className="text-emerald-600 font-medium disabled:opacity-40" onClick={async () => {
        if (advancedPreferencesOpen && !canHideAdvancedPreferences(preferences, composedPreferences)) {
          setPreferencesSaveState('dirty'); setPreferencesValidationError('Apply or discard Advanced JSON edits before saving.'); return;
        }
        if (!searchProfileSchema.safeParse(composedPreferences).success) {
          setPreferencesSaveState('dirty'); setPreferencesValidationError('Invalid search preferences. Fix the values and try again.'); return;
        }
        const serialized = JSON.stringify(composedPreferences, null, 2);
        if (!preferencesSubmitting.current.acquire()) return;
        setSavingPreferences(true); setPreferencesSaveState('saving'); setPreferencesValidationError(''); setMessage('');
        try { await validateAndPersistSearchPreferences(serialized, saveSearchProfile); setAppliedPreferences(composedPreferences); setCommonPreferences(commonSearchPreferences(composedPreferences)); setPreferences(serialized); setPreferencesSaveState('saved'); setMessage(privateMode ? 'Search preferences saved privately.' : 'Demo search preferences updated.'); }
        catch (err: any) { setPreferencesSaveState('failed'); setMessage(err.message || 'Search preferences were not saved. Reload required.'); }
        finally { preferencesSubmitting.current.release(); setSavingPreferences(false); }
      }}>{savingPreferences ? 'Saving…' : 'Save search preferences'}</button><span role="status" aria-live="polite" className="ml-3 text-xs">{durableUiLabel(preferencesSaveState === 'clean' && preferencesIsDirty ? 'dirty' : preferencesSaveState, privateMode)}</span>
      {preferencesValidationError && <p role="alert" className="text-sm text-rose-600">{preferencesValidationError}</p>}
    </section>
    <section className={box}>
      <h2 className="font-semibold">Master resume and evidence</h2>
      <div className="flex gap-4 flex-wrap">{(['master-resume', 'evidence-bank', 'projects', 'skills', 'pipeline'] as const).map(view => <button className="text-emerald-600" key={view} onClick={() => setCurrentView(view)}>{view.replaceAll('-', ' ')}</button>)}</div>
      <p className="text-sm text-slate-500">Import a workspace JSON to populate master resume sections, evidence, projects or previous application history. PDF files are stored as source documents; they are not automatically parsed into claims.</p>
    </section>
    {workspaceMode === 'PUBLIC_DEMO' && <section className={box}>
      <h2 className="font-semibold">Public Demo data</h2>
      <p className="text-sm text-slate-500">Restore the original synthetic candidate, preferences, evidence, jobs and master resume. This does not change private workspace or sign-in data.</p>
      {!confirmDemoReset ? <button type="button" className="text-amber-600 font-medium" onClick={() => setConfirmDemoReset(true)}>Reset Public Demo</button> : <div role="group" aria-label="Confirm Public Demo reset" className="space-y-2">
        <p className="text-sm">Reset Public Demo? Your current demo-only edits and synthetic jobs will be removed. Private workspace data stays untouched.</p>
        <div className="flex gap-4">
          <button type="button" className="text-rose-600 font-medium" onClick={() => { try { resetPublicDemo(); } catch (err: any) { setMessage(err.message || 'Public Demo reset failed. Try again.'); } }}>Confirm Reset Public Demo</button>
          <button type="button" className="text-slate-500" onClick={() => setConfirmDemoReset(false)}>Cancel</button>
        </div>
      </div>}
    </section>}
    {privateMode && <section className={box}>
      <h2 className="font-semibold">Import Existing Local Workspace</h2>
      <p className="text-sm text-slate-500">Preview is selective and non-mutating. Each selected item shows its source and destination before you confirm. Imported evidence and claim-bearing content remain untrusted until reviewed in the Evidence Bank.</p>
      <button className="text-emerald-600" onClick={() => { try { preview(readLegacyWorkspace(localStorage, authSession.isOwner)); } catch (err: any) { setMessage(err.message); } }}>Inspect legacy browser records</button>
      <label className="block text-sm">Or select a workspace JSON file<input type="file" accept=".json" className="block mt-2" onChange={async event => { const file = event.target.files?.[0]; if (!file) return; try { if (file.size > 2 * 1024 * 1024) throw new Error('Import limit is 2 MiB.'); preview(previewImport(JSON.parse(await file.text()), file.name)); } catch (err: any) { setMessage(err.message); } }} /></label>
      {choices.map(choice => <label key={choice.key} className="block border-t border-slate-300 dark:border-slate-700 pt-3 text-sm"><input type="checkbox" checked={selected.has(choice.key)} onChange={event => setSelected(previous => { const next = new Set(previous); event.target.checked ? next.add(choice.key) : next.delete(choice.key); return next; })} /> <strong>{choice.destination}</strong>: {choice.label}<span className="block ml-4 text-xs text-slate-500">Import container: {choice.importSource}. Record-declared source: {choice.recordSource || 'Not provided'}. Destination: {choice.destination}. {choice.warning}</span></label>)}
      {choices.length > 0 && <button className="text-emerald-600 disabled:opacity-40" disabled={!selected.size || busy} onClick={confirmImport}>{busy ? 'Importing…' : `Confirm import of ${selected.size} selected records`}</button>}
      <p className="text-xs text-slate-500">Local originals remain untouched, including after successful import.</p>
      {importSucceeded && <div className="flex gap-4 flex-wrap text-sm"><span className="basis-full">Next: review imported evidence before using claims, then update your resume and setup.</span><button type="button" className="text-emerald-600" onClick={() => setCurrentView('evidence-bank')}>Open Evidence Bank</button><button type="button" className="text-emerald-600" onClick={() => setCurrentView('master-resume')}>Open Master Resume</button><button type="button" className="text-emerald-600" onClick={() => setCurrentView('candidate-setup')}>Return to Setup</button></div>}
      <button className="text-emerald-600" onClick={exportData}>Export authorized private workspace</button>
    </section>}
    {message && <p role="status" className="text-sm border rounded p-3">{message}</p>}
    {privateMode && <PrivateFilesView />}
  </div>;
};
