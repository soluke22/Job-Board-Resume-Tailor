import React, { useRef, useState } from 'react';
import {
  Database,
  Search,
  PlusCircle,
  Filter,
  CheckCircle2,
  Trash2,
  Edit2,
  Shield,
  Layers,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EvidenceItem, RoleFamily } from '../types';
import { evidenceClaimFields, evidenceReviewStatus, isEvidenceReviewed } from '../utils/evidenceReview';

export function EvidenceReviewBadge({ item, canReview, onReview }: { item: EvidenceItem; canReview: boolean; onReview: () => void }) {
  return <div className="flex items-center justify-between gap-2 text-xs">
    <span>{evidenceReviewStatus(item)}</span>
    {!isEvidenceReviewed(item) && canReview && <button type="button" className="font-medium underline" onClick={onReview}>Review &amp; approve</button>}
  </div>;
}
const reviewLabels: Record<string, string> = { rawEvidence: 'Evidence statement', employer: 'Employer', role: 'Role', period: 'Period', technologies: 'Technologies',
  responsibilities: 'Responsibilities', outcomes: 'Outcomes', supportedVerbs: 'Supported actions', supportedMetrics: 'Supported metrics', context: 'Context',
  sourceType: 'Source type', sourceLocation: 'Source location', source: 'Source', notes: 'Notes', strength: 'Strength', roleFamilyRelevance: 'Relevant roles' };

export const EvidenceBankView: React.FC = () => {
  const { evidence, toggleEvidenceItem, deleteEvidenceItem, addEvidenceItem, approveEvidenceItem, workspaceMode } = useApp();
  const [reviewing, setReviewing] = useState<EvidenceItem | null>(null);
  const [approving, setApproving] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [strengthFilter, setStrengthFilter] = useState<string>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const addSubmitting = useRef(false);
  const approvalSubmitting = useRef(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  // New evidence form state
  const [newEmployer, setNewEmployer] = useState('');
  const [newRole, setNewRole] = useState('Software Engineer');
  const [newRawEvidence, setNewRawEvidence] = useState('');
  const [newTechs, setNewTechs] = useState('React, TypeScript');
  const [newMetrics, setNewMetrics] = useState('');
  const [newVerbs, setNewVerbs] = useState('built, implemented, optimized');
  const [newOutcomes, setNewOutcomes] = useState('');
  const [newStrength, setNewStrength] = useState<'Strong' | 'Medium' | 'Weak'>('Strong');

  const filteredEvidence = evidence.filter((item) => {
    const matchesSearch =
      item.rawEvidence.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.technologies.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.employer || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStrength =
      strengthFilter === 'All' || item.strength === strengthFilter;

    return matchesSearch && matchesStrength;
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRawEvidence.trim() || addSubmitting.current) return;

    const newItem: EvidenceItem = {
      id: `evidence-custom-${Date.now()}`,
      sourceType: 'manual-entry',
      sourceLocation: 'Candidate Manual Entry',
      verificationStatus: 'session-unreviewed',
      requiresUserReview: true,
      employer: newEmployer,
      role: newRole,
      period: 'Self-reported',
      context: 'Candidate Provided',
      rawEvidence: newRawEvidence,
      technologies: newTechs.split(',').map((s) => s.trim()).filter(Boolean),
      responsibilities: [newRawEvidence],
      outcomes: newOutcomes ? [newOutcomes] : [],
      supportedVerbs: newVerbs.split(',').map((s) => s.trim()).filter(Boolean),
      supportedMetrics: newMetrics.split(',').map((s) => s.trim()).filter(Boolean),
      strength: newStrength,
      roleFamilyRelevance: ['frontend-product-engineer', 'ui-platform-design-systems'],
      source: 'User Entered Record',
      enabled: true
    };

    addSubmitting.current = true;
    setAdding(true); setAddError('');
    try {
      await addEvidenceItem(newItem);
      setIsAddModalOpen(false);
      setNewRawEvidence('');
      setNewMetrics('');
      setNewOutcomes('');
    } catch (error) {
      setAddError(error instanceof Error ? error.message : 'Evidence was not saved. Reload required.');
    } finally {
      addSubmitting.current = false;
      setAdding(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Principle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
              Candidate Evidence Bank
            </h1>
            <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
              {evidence.length} Records
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            The single source of truth for all resume tailoring. Any claim not backed by this bank is rejected.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg shadow-xs transition-colors flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Evidence</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search evidence by keyword, technology (e.g. React, GraphQL), or employer..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-1 self-start sm:self-auto">
          {(['All', 'Strong', 'Medium', 'Weak'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStrengthFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                strengthFilter === s
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Evidence Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEvidence.map((item) => (
          <div
            key={item.id}
            className={`bg-white dark:bg-slate-900 border rounded-xl p-5 shadow-xs transition-all space-y-3 ${
              item.enabled
                ? 'border-slate-200 dark:border-slate-800'
                : 'border-slate-200/50 dark:border-slate-800/40 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <span className="font-semibold text-slate-900 dark:text-white text-sm">
                  {item.employer}
                </span>
                <div className="flex items-center space-x-2 text-xs text-slate-500">
                  <span>{item.role}</span>
                  <span>•</span>
                  <span>{item.period}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    item.strength === 'Strong'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                      : item.strength === 'Medium'
                      ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                  }`}
                >
                  {item.strength}
                </span>

                <button
                  onClick={() => toggleEvidenceItem(item.id)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium border cursor-pointer ${
                    item.enabled
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 border-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-100 text-slate-500 border-slate-300'
                  }`}
                >
                  {item.enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>

            {/* Raw Evidence Text */}
            <EvidenceReviewBadge item={item} canReview={workspaceMode === 'PRIVATE_WORKSPACE'} onReview={() => { setReviewing(structuredClone(item)); setReviewError(''); }} />
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
              "{item.rawEvidence}"
            </p>

            {/* Technologies */}
            <div className="flex items-center flex-wrap gap-1">
              {item.technologies.map((t, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  {t}
                </span>
              ))}
            </div>

            {/* Metrics & Verbs */}
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-slate-400 block font-medium">Supported Verbs:</span>
                <span className="text-slate-700 dark:text-slate-300 truncate block">
                  {item.supportedVerbs.join(', ')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Supported Metrics:</span>
                <span className="text-slate-700 dark:text-slate-300 truncate block">
                  {item.supportedMetrics.length > 0
                    ? item.supportedMetrics.join(', ')
                    : 'Qualitative only'}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
              <span>Source: {item.source}</span>
              <button
                onClick={() => deleteEvidenceItem(item.id)}
                className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                title="Delete Record"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {reviewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="evidence-review-title" className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto space-y-4">
            <h2 id="evidence-review-title">Review evidence</h2>
            <p className="text-sm">Inspect the statement and its scope. Approve only facts you can support. Approval makes enabled evidence available for assessment and generation.</p>
            <dl className="text-sm space-y-2">
              {evidenceClaimFields.map(field => <div key={field}><dt className="font-semibold">{reviewLabels[field]}</dt><dd className="whitespace-pre-wrap break-words">{Array.isArray(reviewing[field]) ? (reviewing[field] as string[]).join(', ') || 'Unspecified' : String(reviewing[field] || 'Unspecified')}</dd></div>)}
            </dl>
            {reviewError && <p role="alert">{reviewError}</p>}
            <div className="flex gap-4">
              <button type="button" disabled={approving} onClick={() => setReviewing(null)}>Cancel</button>
              <button type="button" disabled={approving} onClick={async () => {
                if (approvalSubmitting.current) return;
                approvalSubmitting.current = true;
                setApproving(true); setReviewError('');
                try { await approveEvidenceItem(reviewing); setReviewing(null); }
                catch (error) { setReviewError(error instanceof Error ? error.message : 'Approval failed. Review again before retrying.'); }
                finally { approvalSubmitting.current = false; setApproving(false); }
              }}>{approving ? 'Approving…' : 'Approve evidence'}</button>
            </div>
          </section>
        </div>
      )}
      {/* Add Custom Evidence Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden my-8">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Add Evidence Record
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                disabled={adding}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Employer
                  </label>
                  <input
                    type="text"
                    required
                    value={newEmployer}
                    onChange={(e) => setNewEmployer(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Role Title
                  </label>
                  <input
                    type="text"
                    required
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Raw Engineering Evidence *
                </label>
                <textarea
                  required
                  rows={4}
                  value={newRawEvidence}
                  onChange={(e) => setNewRawEvidence(e.target.value)}
                  placeholder="Describe exact past work, systems touched, PRs shipped, architectural decisions..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Technologies (comma-separated)
                </label>
                <input
                  type="text"
                  value={newTechs}
                  onChange={(e) => setNewTechs(e.target.value)}
                  placeholder="React, TypeScript, GraphQL, Jest"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Supported Metrics (Optional)
                  </label>
                  <input
                    type="text"
                    value={newMetrics}
                    onChange={(e) => setNewMetrics(e.target.value)}
                    placeholder="e.g. 15% reduction, 99.9% uptime"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Evidence Strength
                  </label>
                  <select
                    value={newStrength}
                    onChange={(e) => setNewStrength(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                  >
                    <option value="Strong">Strong (Direct production PRs)</option>
                    <option value="Medium">Medium (Collaborative / secondary)</option>
                    <option value="Weak">Weak (Conceptual / academic)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={adding}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="px-5 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer"
                >
                  {adding ? 'Saving…' : 'Save Evidence'}
                </button>
              </div>
              {addError && <p role="alert">{addError}</p>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
