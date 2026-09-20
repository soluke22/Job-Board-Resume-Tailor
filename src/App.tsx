import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navigation } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { DiscoverView } from './views/DiscoverView';
import { PipelineView } from './views/PipelineView';
import { ProofPackView } from './views/ProofPackView';
import { OutreachView } from './views/OutreachView';
import { AnalyticsView } from './views/AnalyticsView';
import { JobsView } from './components/JobsView';
import { JobAnalysisView } from './components/JobAnalysisView';
import { ResumeEditorView } from './components/ResumeEditorView';
import { MasterResumeView } from './components/MasterResumeView';
import { EvidenceBankView } from './components/EvidenceBankView';
import { ProjectsView } from './components/ProjectsView';
import { SkillsView } from './components/SkillsView';
import { CandidateSetupView } from './components/CandidateSetupView';
import { QuickDataGrabModal } from './components/QuickDataGrabModal';
import { AtsGuardsModal } from './components/AtsGuardsModal';
import { AuthModal } from './components/AuthModal';
import { AlertCircle, X, Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const {
    workspaceMode, workspaceEpoch, syncStatus, sessionLoading,
    currentView,
    setCurrentView,
    error,
    clearError,
    isAnalyzing,
    isGenerating,
    isDiscovering,
    isQuickGrabOpen,
    setIsQuickGrabOpen,
    isAtsGuardsOpen,
    setIsAtsGuardsOpen
  } = useApp();

  if (sessionLoading) return <div role="status" className="p-8 text-slate-500">Loading workspace…</div>;
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Navigation Bar */}
      <Navigation />

      {/* Global Error Banner */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/80 border-b border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 px-4 py-3 flex items-center justify-between shadow-xs sticky top-16 z-30">
          <div className="max-w-7xl mx-auto flex items-center space-x-2 text-xs font-medium w-full">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              onClick={clearError}
              className="text-rose-500 hover:text-rose-800 dark:hover:text-rose-100 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main View Router */}
      {workspaceMode === 'PRIVATE_WORKSPACE' && <div role="status" className="px-6 py-2 text-xs text-slate-500">{syncStatus}</div>}
      <main key={`main-workspace-${workspaceMode}-${workspaceEpoch}`} className="flex-1 pb-16">
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'discover' && <DiscoverView />}
        {currentView === 'pipeline' && <PipelineView />}
        {currentView === 'jobs' && <JobsView />}
        {currentView === 'job-detail' && <JobAnalysisView />}
        {currentView === 'resume-editor' && <ResumeEditorView />}
        {currentView === 'proof-packs' && <ProofPackView />}
        {currentView === 'outreach' && <OutreachView />}
        {currentView === 'analytics' && <AnalyticsView />}
        {currentView === 'master-resume' && <MasterResumeView />}
        {currentView === 'evidence-bank' && <EvidenceBankView />}
        {currentView === 'projects' && <ProjectsView />}
        {currentView === 'skills' && <SkillsView />}
        {currentView === 'candidate-setup' && <CandidateSetupView />}
      </main>

      {/* Modals */}
      <QuickDataGrabModal key={`quick-data-grab-workspace-${workspaceMode}-${workspaceEpoch}`}
        isOpen={isQuickGrabOpen}
        onClose={() => setIsQuickGrabOpen(false)}
      />
      <AtsGuardsModal
        isOpen={isAtsGuardsOpen}
        onClose={() => setIsAtsGuardsOpen(false)}
        onOpenStudio={() => setCurrentView('resume-editor')}
      />
      <AuthModal />

      {/* Non-intrusive Processing Toast/Indicator */}
      {(isAnalyzing || isGenerating || isDiscovering) && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-800 text-white px-4 py-3 rounded-xl shadow-xl flex items-center space-x-3 text-xs">
          <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
          <span className="font-medium">
            {isDiscovering
              ? 'Discovering active ATS postings with search grounding...'
              : isAnalyzing
              ? 'Analyzing job requirements against candidate evidence...'
              : 'Synthesizing tailored artifacts & defensible proof packs...'}
          </span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
