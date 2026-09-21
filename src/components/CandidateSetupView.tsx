import React, { useEffect, useRef, useState } from 'react';
import { createSynchronousSubmitGuard, durableUiLabel, shouldAdoptCandidateDraft, useApp, validateAndPersistSearchPreferences, validateSearchPreferencesDraft } from '../context/AppContext';
import { previewImport, readLegacyWorkspace, selectedImport, type ImportChoice } from '../services/legacyImport';
import { PrivateFilesView } from './PrivateFilesView';

export const CandidateSetupView: React.FC = () => {
  const { profile, saveProfile, searchProfile, saveSearchProfile, resetPublicDemo, workspaceMode, authSession, importWorkspaceJson, exportWorkspaceJson, setCurrentView, syncStatus } = useApp();
  const [draft, setDraft] = useState(profile);
  const adoptedProfile = useRef(profile);
  const [preferences, setPreferences] = useState(JSON.stringify(searchProfile, null, 2));
  const adoptedPreferences = useRef(JSON.stringify(searchProfile, null, 2));
  const [choices, setChoices] = useState<ImportChoice[]>([]);
  const [selected, setSelected] = useState(new Set<string>());
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferencesSaveState, setPreferencesSaveState] = useState<'clean' | 'dirty' | 'saving' | 'saved' | 'failed'>('clean');
  const [preferencesValidationError, setPreferencesValidationError] = useState('');
  const [confirmDemoReset, setConfirmDemoReset] = useState(false);
  const profileSubmitting = useRef(createSynchronousSubmitGuard());
  const preferencesSubmitting = useRef(createSynchronousSubmitGuard());
  const privateMode = workspaceMode === 'PRIVATE_WORKSPACE' && authSession.isOwner;
  const profileIsDirty = !shouldAdoptCandidateDraft(draft, profile);
  const preferencesIsDirty = preferences !== JSON.stringify(searchProfile, null, 2);
  useEffect(() => {
    if (shouldAdoptCandidateDraft(draft, adoptedProfile.current)) setDraft(profile);
    adoptedProfile.current = profile;
  }, [draft, profile]);
  useEffect(() => {
    const canonical = JSON.stringify(searchProfile, null, 2);
    if (preferences === adoptedPreferences.current) { setPreferences(canonical); setPreferencesSaveState('clean'); }
    adoptedPreferences.current = canonical;
  }, [preferences, searchProfile]);
  const preview = (items: ImportChoice[]) => { setChoices(items); setSelected(new Set()); setMessage(items.length ? 'Select individual records to import. Nothing has been uploaded.' : 'No legacy records found.'); };
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
    setMessage(result.message); if (result.success) { setChoices([]); setSelected(new Set()); }
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
      <div className="grid sm:grid-cols-2 gap-3">{(['name', 'title', 'email', 'phone', 'location', 'workAuthorization'] as const).map(field => <label key={field} className="text-sm">{field}<input className={input} value={draft[field] || ''} onChange={event => setDraft({ ...draft, [field]: event.target.value })} /></label>)}</div>
      <label className="block text-sm">Professional summary<textarea className={input} value={draft.masterSummary} onChange={event => setDraft({ ...draft, masterSummary: event.target.value })} /></label>
      <button disabled={savingProfile} className="text-emerald-600 font-medium disabled:opacity-40">{savingProfile ? 'Saving…' : 'Save profile'}</button><span className="ml-3 text-xs">{savingProfile ? 'Saving…' : profileIsDirty ? 'Unsaved changes' : syncStatus}</span>
    </form>
    <section className={box}>
      <h2 className="font-semibold">Search preferences</h2>
      <p className="text-sm text-slate-500">Set role families, locations, technologies and compensation constraints. Blank values stay unspecified.</p>
      <textarea aria-label="Search preferences JSON" className={input + ' font-mono h-48'} value={preferences} onChange={event => { setPreferences(event.target.value); setPreferencesSaveState('dirty'); setPreferencesValidationError(''); }} />
      <button disabled={savingPreferences} className="text-emerald-600 font-medium disabled:opacity-40" onClick={async () => {
        const validation = validateSearchPreferencesDraft(preferences);
        if (validation.kind === 'invalid') { setPreferencesSaveState('dirty'); setPreferencesValidationError(validation.message); return; }
        if (!preferencesSubmitting.current.acquire()) return;
        setSavingPreferences(true); setPreferencesSaveState('saving'); setPreferencesValidationError(''); setMessage('');
        try { await validateAndPersistSearchPreferences(preferences, saveSearchProfile); setPreferencesSaveState('saved'); setMessage(privateMode ? 'Search preferences saved privately.' : 'Demo search preferences updated.'); }
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
      <button className="text-emerald-600" onClick={() => { try { preview(readLegacyWorkspace(localStorage, authSession.isOwner)); } catch (err: any) { setMessage(err.message); } }}>Inspect legacy browser records</button>
      <label className="block text-sm">Or select a workspace JSON file<input type="file" accept=".json" className="block mt-2" onChange={async event => { const file = event.target.files?.[0]; if (!file) return; try { if (file.size > 2 * 1024 * 1024) throw new Error('Import limit is 2 MiB.'); preview(previewImport(JSON.parse(await file.text()), file.name)); } catch (err: any) { setMessage(err.message); } }} /></label>
      {choices.map(choice => <label key={choice.key} className="block border-t border-slate-300 dark:border-slate-700 pt-3 text-sm"><input type="checkbox" checked={selected.has(choice.key)} onChange={event => setSelected(previous => { const next = new Set(previous); event.target.checked ? next.add(choice.key) : next.delete(choice.key); return next; })} /> <strong>{choice.field}</strong>: {choice.label}<span className="block ml-4 text-xs text-slate-500">Source: {choice.source}. {choice.warning}</span></label>)}
      {choices.length > 0 && <button className="text-emerald-600 disabled:opacity-40" disabled={!selected.size || busy} onClick={confirmImport}>{busy ? 'Importing…' : `Confirm import of ${selected.size} selected records`}</button>}
      <p className="text-xs text-slate-500">Local originals remain untouched, including after successful import.</p>
      <button className="text-emerald-600" onClick={exportData}>Export authorized private workspace</button>
    </section>}
    {message && <p role="status" className="text-sm border rounded p-3">{message}</p>}
    {privateMode && <PrivateFilesView />}
  </div>;
};
