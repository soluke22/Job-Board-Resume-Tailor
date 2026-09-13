import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  FileText,
  Terminal,
  Briefcase,
  User,
  Download,
  Share2,
  ExternalLink,
  Code2,
  Layers,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface QuickDataGrabModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickDataGrabModal: React.FC<QuickDataGrabModalProps> = ({ isOpen, onClose }) => {
  const { profile, masterResume, activeJob, skills, projects, evidence } = useApp();
  const [activeTab, setActiveTab] = useState<'ats-text' | 'skills' | 'experience' | 'contact' | 'summary' | 'projects'>('ats-text');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentResume = activeJob?.tailoredResume || masterResume;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Generate clean ATS plain text
  const generateAtsPlainText = () => {
    let text = `${currentResume.header.name.toUpperCase()}\n`;
    text += `${currentResume.header.location} | ${currentResume.header.email} | ${currentResume.header.phone}\n`;
    text += `${currentResume.header.links.map((l) => `${l.label}: ${l.url}`).join(' | ')}\n\n`;

    if (currentResume.professionalSummary) {
      text += `PROFESSIONAL SUMMARY\n${currentResume.professionalSummary}\n\n`;
    }

    text += `TECHNICAL SKILLS\n`;
    currentResume.skills.forEach((s) => {
      text += `${s.category}: ${s.skills.join(', ')}\n`;
    });
    text += `\n`;

    text += `PROFESSIONAL EXPERIENCE\n`;
    currentResume.experience.forEach((e) => {
      text += `${e.employer} - ${e.title} (${e.period})\n`;
      e.bullets
        .filter((b) => b.enabled !== false)
        .forEach((b) => {
          text += `* ${b.text}\n`;
        });
      text += `\n`;
    });

    text += `TECHNICAL PROJECTS\n`;
    currentResume.projects.forEach((p) => {
      text += `${p.name} [${p.technologies?.join(', ')}] (${p.period})\n`;
      p.bullets
        .filter((b) => b.enabled !== false)
        .forEach((b) => {
          text += `* ${b.text}\n`;
        });
      text += `\n`;
    });

    text += `EDUCATION\n`;
    currentResume.education.forEach((edu) => {
      text += `${edu.institution}, ${edu.degree} (${edu.period})\n`;
      if (edu.details) text += `${edu.details}\n`;
    });

    return text;
  };

  const atsPlainText = generateAtsPlainText();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Quick Data Grabber & Application Clipboard
              </h2>
              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                ATS-Safe
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              1-click grab for application portals (Workday, Greenhouse, Lever, Ashby, LinkedIn Easy Apply).
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 dark:border-slate-800 px-5 flex items-center space-x-1 overflow-x-auto bg-white dark:bg-slate-900">
          {[
            { id: 'ats-text', label: 'Full ATS Plain Text', icon: FileText },
            { id: 'skills', label: 'Skills by Category', icon: Terminal },
            { id: 'experience', label: 'Experience Bullets', icon: Briefcase },
            { id: 'projects', label: 'Projects Bullets', icon: Layers },
            { id: 'contact', label: 'Contact Info', icon: User },
            { id: 'summary', label: 'Summary & Bio', icon: Sparkles }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3 text-xs font-medium border-b-2 flex items-center space-x-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                  isActive
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* TAB 1: Full ATS Plain Text */}
          {activeTab === 'ats-text' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">
                  Clean ASCII text formatted for legacy and modern ATS text boxes:
                </span>
                <button
                  onClick={() => copyToClipboard(atsPlainText, 'full-ats-text')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium flex items-center space-x-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  {copiedKey === 'full-ats-text' ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedKey === 'full-ats-text' ? 'Copied to Clipboard!' : 'Copy Full ATS Text'}</span>
                </button>
              </div>

              <textarea
                readOnly
                rows={16}
                value={atsPlainText}
                className="w-full font-mono text-[11px] p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl leading-relaxed text-slate-800 dark:text-slate-200 focus:outline-none select-all"
              />
            </div>
          )}

          {/* TAB 2: Skills By Category */}
          {activeTab === 'skills' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Copy skill lists directly into application forms:</span>
                <button
                  onClick={() => {
                    const allSkills = currentResume.skills.flatMap((s) => s.skills).join(', ');
                    copyToClipboard(allSkills, 'all-skills');
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium flex items-center space-x-1.5 cursor-pointer"
                >
                  {copiedKey === 'all-skills' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy All Skills (Comma-Separated)</span>
                </button>
              </div>

              <div className="space-y-3">
                {currentResume.skills.map((s, idx) => {
                  const skillsStr = s.skills.join(', ');
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <span className="font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                          {s.category}
                        </span>
                        <p className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                          {skillsStr}
                        </p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(skillsStr, `skill-${idx}`)}
                        className="px-3 py-1 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 font-medium flex items-center space-x-1 shrink-0 self-start sm:self-auto cursor-pointer"
                      >
                        {copiedKey === `skill-${idx}` ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedKey === `skill-${idx}` ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Experience Bullets */}
          {activeTab === 'experience' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white block">
                    {currentResume.experience[0]?.employer || 'Experience'}
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    {[currentResume.experience[0]?.title, currentResume.experience[0]?.period].filter(Boolean).join(' · ')}
                  </span>
                </div>
                <button
                  onClick={() => {
                    const allBullets = currentResume.experience
                      .flatMap((e) => e.bullets)
                      .map((b) => `* ${b.text}`)
                      .join('\n');
                    copyToClipboard(allBullets, 'all-experience-bullets');
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium flex items-center space-x-1.5 cursor-pointer"
                >
                  {copiedKey === 'all-experience-bullets' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy All Bullets</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {currentResume.experience
                  .flatMap((e) => e.bullets)
                  .map((b, idx) => (
                    <div
                      key={b.id || idx}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-start justify-between gap-3 group"
                    >
                      <div className="space-y-1 leading-relaxed text-slate-800 dark:text-slate-200">
                        <p>{b.text}</p>
                        {b.targetRequirement && (
                          <span className="text-[10px] text-slate-400 block font-mono">
                            Mapped to: {b.targetRequirement}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => copyToClipboard(b.text, `bullet-${idx}`)}
                        className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 text-[11px] font-medium flex items-center space-x-1 shrink-0 cursor-pointer"
                      >
                        {copiedKey === `bullet-${idx}` ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedKey === `bullet-${idx}` ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 4: Projects Bullets */}
          {activeTab === 'projects' && (
            <div className="space-y-3">
              <span className="text-slate-500 block">
                Defensible project evidence with verified architectures:
              </span>
              <div className="space-y-4">
                {currentResume.projects.map((proj, pIdx) => (
                  <div
                    key={proj.id || pIdx}
                    className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {proj.name} ({proj.period})
                      </span>
                      <button
                        onClick={() => {
                          const pText = `${proj.name}\n${proj.bullets.map((b) => `* ${b.text}`).join('\n')}`;
                          copyToClipboard(pText, `proj-${pIdx}`);
                        }}
                        className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 text-[11px] font-medium flex items-center space-x-1 cursor-pointer"
                      >
                        {copiedKey === `proj-${pIdx}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>Copy Project</span>
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {proj.bullets.map((b, bIdx) => (
                        <div key={bIdx} className="flex items-start justify-between gap-2 text-slate-700 dark:text-slate-300">
                          <p className="text-[11px] leading-relaxed">• {b.text}</p>
                          <button
                            onClick={() => copyToClipboard(b.text, `proj-b-${pIdx}-${bIdx}`)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                            title="Copy bullet"
                          >
                            {copiedKey === `proj-b-${pIdx}-${bIdx}` ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: Contact Info */}
          {activeTab === 'contact' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Candidate identification details:</span>
                <button
                  onClick={() => {
                    const block = `${profile.name}\n${profile.title}\nEmail: ${profile.email}\nPhone: ${profile.phone}\nLocation: ${profile.location}\nLinkedIn: ${profile.links.find((l) => l.label === 'LinkedIn')?.url || ''}\nGitHub: ${profile.links.find((l) => l.label === 'GitHub')?.url || ''}`;
                    copyToClipboard(block, 'all-contact');
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium flex items-center space-x-1.5 cursor-pointer"
                >
                  {copiedKey === 'all-contact' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Complete Contact Block</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'Full Legal Name', val: profile.fullName || profile.name || '', key: 'c-fullname' },
                  { label: 'Display Name', val: profile.name || '', key: 'c-name' },
                  { label: 'Professional Title', val: profile.title, key: 'c-title' },
                  { label: 'Email Address', val: profile.email, key: 'c-email' },
                  { label: 'Phone Number', val: profile.phone, key: 'c-phone' },
                  { label: 'Location', val: profile.location, key: 'c-location' },
                  ...profile.links.map((link) => ({
                    label: `${link.label} Profile`,
                    val: link.url,
                    key: `c-link-${link.label}`
                  }))
                ].map((item) => (
                  <div
                    key={item.key}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        {item.label}
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                        {item.val}
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(item.val, item.key)}
                      className="p-1.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 cursor-pointer shrink-0"
                    >
                      {copiedKey === item.key ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: Professional Summary */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    Master Baseline Professional Summary
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(currentResume.professionalSummary || '', 'summary-master')
                    }
                    className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedKey === 'summary-master' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>Copy Summary</span>
                  </button>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl leading-relaxed text-slate-800 dark:text-slate-200 text-xs">
                  {currentResume.professionalSummary}
                </div>
              </div>

              {activeJob?.tailoredCoverLetter && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      Tailored Cover Letter Body ({activeJob.company})
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          activeJob.tailoredCoverLetter?.paragraphs.join('\n\n') || '',
                          'cl-body'
                        )
                      }
                      className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium flex items-center space-x-1 cursor-pointer"
                    >
                      {copiedKey === 'cl-body' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>Copy Letter Text</span>
                    </button>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl leading-relaxed text-slate-800 dark:text-slate-200 text-xs whitespace-pre-line">
                    {activeJob.tailoredCoverLetter.paragraphs.join('\n\n')}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Current Document: {activeJob ? `${activeJob.company} Tailored Resume` : 'Master Baseline Resume'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
