import React, { useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Lock, Key, LogOut, CheckCircle2, AlertTriangle, EyeOff } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    workspaceMode,
    setWorkspaceMode,
    authSession,
    login,
    logout,
    error,
    clearError
  } = useApp();

  const [email, setEmail] = useState('solomonlucasthornton@gmail.com');
  const [tokenInput, setTokenInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    clearError();
    setIsSubmitting(true);

    try {
      const success = await login(email, tokenInput);
      if (!success) {
        setLoginError('Authentication denied. Only authorized owner email can access private workspace.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSwitchToDemo = () => {
    setWorkspaceMode('PUBLIC_DEMO');
    setIsAuthModalOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setIsAuthModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 id="auth-modal-title" className="text-lg font-semibold text-white">
                Workspace Security & Access
              </h2>
              <p className="text-xs text-slate-400">
                Single-owner verified privacy and mode switcher
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Current Status Pill */}
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs flex items-start space-x-3">
            {authSession.isAuthenticated ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-emerald-400">Authenticated Owner Active</div>
                  <div className="text-slate-300 mt-0.5">
                    Logged in as <span className="text-white font-mono">{authSession.userEmail}</span>. Full access to private candidate records, search queries, and local backups.
                  </div>
                </div>
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-amber-400">Public Demo Mode Active</div>
                  <div className="text-slate-400 mt-0.5">
                    Using synthetic candidate fixture (Jordan Taylor). Real career history and unreleased evidence are locked and excluded from client bundles.
                  </div>
                </div>
              </>
            )}
          </div>

          {authSession.isAuthenticated ? (
            <div className="space-y-4">
              <div className="text-sm text-slate-300">
                You are currently in the <strong className="text-white">Private Workspace</strong>. Real candidate evidence, private applications, and outcome tracking are active.
              </div>

              <div className="flex flex-col space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleSwitchToDemo}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition cursor-pointer"
                >
                  Switch View to Public Demo Mode
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2.5 px-4 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-300 text-sm font-medium border border-red-800/40 flex items-center justify-center space-x-2 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Lock & Sign Out of Private Workspace</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Authorized Owner Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Passkey / Session Token (Optional for Owner)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Enter passkey if configured"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Access fails closed if email does not match the configured owner allowlist.
                </p>
              </div>

              {(loginError || error) && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{loginError || error}</span>
                </div>
              )}

              <div className="pt-2 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium shadow-lg shadow-emerald-900/30 flex items-center justify-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isSubmitting ? 'Verifying...' : 'Unlock Workspace'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3.5 bg-slate-950/60 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Security: Single-Owner Air-Gapped Sandbox</span>
          <span className="text-emerald-400 font-mono">v2.0-secure</span>
        </div>
      </div>
    </div>
  );
};
