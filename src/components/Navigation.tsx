import React from 'react';
import {
  LayoutDashboard,
  Compass,
  Briefcase,
  FileCheck2,
  ShieldCheck,
  Send,
  BarChart3,
  Database,
  FileText,
  UploadCloud,
  ChevronRight,
  ClipboardCopy,
  Lock,
  EyeOff
} from 'lucide-react';
import { useApp, AppView } from '../context/AppContext';

export const Navigation: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    jobs,
    activeJob,
    evidence,
    profile,
    workspaceMode,
    authSession,
    setIsQuickGrabOpen,
    setIsAtsGuardsOpen,
    setIsAuthModalOpen
  } = useApp();

  const navItems: { id: AppView; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'discover', label: 'Discover', icon: Compass, badge: jobs.filter((j) => j.freshnessBand === 'NEW').length || undefined },
    { id: 'pipeline', label: 'Pipeline', icon: Briefcase, badge: jobs.length },
    { id: 'resume-editor', label: 'Studio', icon: FileCheck2 },
    { id: 'proof-packs', label: 'Proof Packs', icon: ShieldCheck },
    { id: 'outreach', label: 'Outreach', icon: Send },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'evidence-bank', label: 'Evidence', icon: Database, badge: evidence.length },
    { id: 'master-resume', label: 'Master', icon: FileText },
    { id: 'candidate-setup', label: 'Setup', icon: UploadCloud }
  ];

  const displayName = profile.name || (workspaceMode === 'PRIVATE_WORKSPACE' ? 'Solomon Lucas-Thornton' : 'Jordan Taylor');

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-slate-100 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Candidate Info */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="flex items-center space-x-2.5 text-left focus:outline-none group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-600/30 transition-colors">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold tracking-tight text-white block text-sm sm:text-base leading-none">
                    Job Search &amp; Resume OS
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 block mt-0.5 truncate max-w-[180px]">
                  {displayName}
                </span>
              </div>
            </button>

            {/* Privacy Mode Badge */}
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition cursor-pointer ${
                workspaceMode === 'PRIVATE_WORKSPACE'
                  ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-amber-950/60 border-amber-700/60 text-amber-300 hover:bg-amber-900/60'
              }`}
              title="Click to toggle between Public Demo and Private Workspace"
            >
              {workspaceMode === 'PRIVATE_WORKSPACE' ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Private Workspace</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>Demo Mode</span>
                  <Lock className="w-3 h-3 text-amber-400/80 ml-0.5" />
                </>
              )}
            </button>
          </div>

          {/* Quick Tools & Context */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsQuickGrabOpen(true)}
              className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
              title="Quickly grab ATS plain text, skills, or bullets for job portals"
            >
              <ClipboardCopy className="w-3.5 h-3.5 text-emerald-400" />
              <span>Quick Grab</span>
            </button>

            <button
              onClick={() => setIsAtsGuardsOpen(true)}
              className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
              title="Audit ATS and AI Hiring Guardrails"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>ATS Guards</span>
            </button>

            {/* Active Job Context Pill */}
            {activeJob && (
              <div className="hidden lg:flex items-center space-x-2 text-xs bg-slate-800/80 border border-slate-700/60 rounded-full px-3 py-1 text-slate-300">
                <span className="text-slate-400">Target:</span>
                <span className="font-semibold text-white max-w-[120px] truncate">{activeJob.company}</span>
                <ChevronRight className="w-3 h-3 text-slate-500" />
                <span className="text-slate-300 max-w-[120px] truncate">{activeJob.title}</span>
                {activeJob.fit && (
                  <span
                    className={`ml-1 px-2 py-0.2 rounded text-[10px] font-semibold uppercase ${
                      activeJob.fit.verdict === 'Apply'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {activeJob.fit.tailoredFitScore}/10
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Desktop Navigation Items */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                        isActive ? 'bg-slate-700 text-slate-200' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Navigation Scrollable Strip */}
      <div className="md:hidden border-t border-slate-800/80 bg-slate-900/95 overflow-x-auto py-2 px-3 flex space-x-1.5 scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`px-2.5 py-1.5 rounded-xl text-xs whitespace-nowrap flex items-center space-x-1 font-medium transition cursor-pointer ${
                isActive ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
