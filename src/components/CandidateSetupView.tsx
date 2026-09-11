import React, { useState } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Download,
  RotateCcw,
  Save,
  ShieldCheck,
  Check,
  Layers
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { storageService } from '../services/storage';
import { EvidenceItem } from '../types';

export const CandidateSetupView: React.FC = () => {
  const { evidence, addEvidenceItem, resetAllData, importWorkspaceJson, exportWorkspaceJson } = useApp();

  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [extractedClaims, setExtractedClaims] = useState<string[]>([]);
  const [parsedItemsPreview, setParsedItemsPreview] = useState<EvidenceItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isBackupExported, setIsBackupExported] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsProcessing(true);
    setImportStatus(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseUploadedContent(content, file.name);
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  const parseUploadedContent = (text: string, filename: string) => {
    // Check if JSON backup
    try {
      const parsedJson = JSON.parse(text);
      if (parsedJson.profile && parsedJson.evidence) {
        // This is a full app backup
        const result = importWorkspaceJson(text);
        if (result.success) {
          setImportStatus('Successfully restored full database backup!');
          setTimeout(() => window.location.reload(), 1500);
          return;
        }
      }
    } catch {
      // Not a JSON backup, process as text/markdown/latex
    }

    // Heuristic extraction of bullet claims from plain text or markdown
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 20 && (l.startsWith('-') || l.startsWith('*') || l.startsWith('•') || /^[A-Z]/.test(l)));

    const extracted = lines.slice(0, 15);
    setExtractedClaims(extracted);

    const items: EvidenceItem[] = extracted.map((claim, idx) => ({
      id: `imported-${Date.now()}-${idx}`,
      sourceType: 'user-interview',
      sourceLocation: filename,
      verificationStatus: 'unverified',
      employer: filename.toLowerCase().includes('disney') ? 'The Walt Disney Company' : 'Imported Document',
      role: 'Software Engineer',
      period: 'Pending Review',
      context: `Imported from ${filename}`,
      rawEvidence: claim.replace(/^[-*•]\s*/, ''),
      technologies: [],
      responsibilities: [claim],
      outcomes: [],
      supportedVerbs: ['implemented'],
      supportedMetrics: [],
      strength: 'Medium',
      roleFamilyRelevance: ['frontend-product-engineer'],
      source: filename,
      enabled: true
    }));

    setParsedItemsPreview(items);
  };

  const handleConfirmImport = () => {
    parsedItemsPreview.forEach((item) => addEvidenceItem(item));
    setImportStatus(`Successfully added ${parsedItemsPreview.length} records to Evidence Bank.`);
    setParsedItemsPreview([]);
    setExtractedClaims([]);
    setUploadedFileName(null);
  };

  const handleExportBackup = () => {
    const json = exportWorkspaceJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume_studio_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setIsBackupExported(true);
    setTimeout(() => setIsBackupExported(false), 3000);
  };

  const handleReset = () => {
    if (confirm('Reset all jobs, evidence, and resumes to initial workspace state?')) {
      resetAllData();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
          Candidate Setup & Claims Ingestion
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Upload resumes, work logs, or transcripts. Claims are parsed and require candidate verification before entering the Evidence Bank.
        </p>
      </div>

      {/* Upload Drag & Drop Box */}
      <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div>
          <label className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer">
            <span>Click to upload evidence file</span>
            <input
              type="file"
              accept=".txt,.md,.json,.tex"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <span className="text-xs text-slate-500"> or drag and drop</span>
        </div>
        <p className="text-[11px] text-slate-400">
          Supports Plain Text (.txt), Markdown (.md), LaTeX (.tex), or Studio JSON Backups.
        </p>

        {uploadedFileName && (
          <div className="inline-flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-full px-3 py-1 text-xs text-emerald-800 dark:text-emerald-300">
            <FileText className="w-3.5 h-3.5" />
            <span>Loaded: {uploadedFileName}</span>
          </div>
        )}
      </div>

      {importStatus && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{importStatus}</span>
        </div>
      )}

      {/* Extracted Claims Preview & Candidate Confirmation */}
      {parsedItemsPreview.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Review Extracted Claims ({parsedItemsPreview.length})</span>
              </h2>
              <p className="text-xs text-slate-500">
                Confirm truthfulness before permanently ingesting into the Evidence Bank.
              </p>
            </div>

            <button
              onClick={handleConfirmImport}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Authorize & Save to Bank</span>
            </button>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1 text-xs">
            {parsedItemsPreview.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 leading-relaxed text-slate-800 dark:text-slate-200"
              >
                {item.rawEvidence}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Database Backup & Master Reset */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Data Management & Portability
        </h2>
        <p className="text-xs text-slate-500">
          Export your complete candidate profile, evidence bank, projects, and tailored applications as a single JSON archive.
        </p>

        <div className="flex items-center space-x-3 pt-2">
          <button
            onClick={handleExportBackup}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isBackupExported ? 'Archive Downloaded' : 'Export Full JSON Backup'}</span>
          </button>

          <button
            onClick={handleReset}
            className="px-4 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Solomon Master Baseline</span>
          </button>
        </div>
      </div>
    </div>
  );
};
