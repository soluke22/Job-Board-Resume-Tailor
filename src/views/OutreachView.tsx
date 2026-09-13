import type { ApplicationQuestion } from '../types/artifacts';
import { ArtifactStatus } from '../components/ArtifactStatus';
import { canCopyArtifact } from '../utils/artifactReadiness';
import React, { useState } from 'react';
import {
  Send,
  MessageSquare,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  Mail,
  UserCheck,
  FileQuestion,
  Plus
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const OutreachView: React.FC = () => {
  const {
    jobs,
    activeJobId,
    activeJob,
    setActiveJobId,
    generateOutreach,
    generateAnswers,
    generateReferral,
    isGenerating
  } = useApp();

  const [activeTab, setActiveTab] = useState<'recruiter' | 'answers' | 'referral'>('recruiter');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Referral state
  const [contactName, setContactName] = useState('');
  const [relationship, setRelationship] = useState('');
  const generatedReferralText=activeJob?.referralContact?.referralMessage || null;
  const [isGeneratingReferral, setIsGeneratingReferral] = useState(false);

  // Portal Questions state
  const [portalQuestions, setPortalQuestions] = useState<ApplicationQuestion[]>([
    {question:'Why are you interested in this role?'},
    {question:'Describe a challenging technical project you worked on and your specific contributions.'}
  ]);
  const [newQuestionInput, setNewQuestionInput] = useState('');
  const [overrideReason,setOverrideReason]=useState('');
  const skip=activeJob?.fit?.applicationPriority==='SKIP' || activeJob?.fit?.recommendation==='SKIP' || !!activeJob?.fit?.blockers?.length;

  const outreach = activeJob?.recruiterOutreach;
  const answers = activeJob?.applicationAnswers;

  const handleCopy = (text: string, key: string) => {
    const a=key.startsWith('ans-')?answers?.[Number(key.slice(4))]:key==='referral'?activeJob?.referralContact:outreach;
    if(!canCopyArtifact(a))return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJob || !contactName.trim()) return;
    setIsGeneratingReferral(true);
    try {
      await generateReferral(activeJob.id, contactName, relationship,overrideReason);
    } finally {
      setIsGeneratingReferral(false);
    }
  };

  const handleAddQuestion = () => {
    if (!newQuestionInput.trim()) return;
    setPortalQuestions([...portalQuestions, {question:newQuestionInput.trim()}]);
    setNewQuestionInput('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
              Outreach &amp; Application
            </span>
            <span className="text-xs text-slate-400">Evidence-grounded drafts</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Outreach &amp; Application Portal</h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Generates high-signal recruiter messages, tailored portal answers, and low-pressure referral requests grounded in verified candidate evidence.
          </p>
        </div>

        {/* Target Job Selector */}
        <div className="flex items-center space-x-3 shrink-0">
          <select
            value={activeJobId || ''}
            onChange={(e) => setActiveJobId(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
          >
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.company} - {j.title}
              </option>
            ))}
          </select>

          {activeTab === 'recruiter' && (
            <button
              onClick={() => activeJob && generateOutreach(activeJob.id,overrideReason)}
              disabled={isGenerating || !activeJob || activeJob.assessmentStatus!=='ASSESSED' || skip && !overrideReason.trim()}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-900/30 flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Drafting...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{outreach ? 'Regenerate Outreach' : 'Draft Outreach'}</span>
                </>
              )}
            </button>
          )}

          {activeTab === 'answers' && (
            <button
              onClick={() => activeJob && generateAnswers(activeJob.id, portalQuestions)}
              disabled={isGenerating || !activeJob || !portalQuestions.length}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-900/30 flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Answers</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('recruiter')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-2 ${
            activeTab === 'recruiter'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Recruiter InMail &amp; Email</span>
        </button>

        <button
          onClick={() => setActiveTab('answers')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-2 ${
            activeTab === 'answers'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <FileQuestion className="w-3.5 h-3.5" />
          <span>Portal Question Answers</span>
        </button>

        <button
          onClick={() => setActiveTab('referral')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-2 ${
            activeTab === 'referral'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Referral Request</span>
        </button>
      </div>

      {activeTab==='recruiter' && outreach && <ArtifactStatus artifact={outreach} />}
      {activeTab==='referral' && activeJob?.referralContact && <ArtifactStatus artifact={activeJob.referralContact} />}
      {activeJob?.assessmentStatus!=='ASSESSED' && <p className="text-xs text-amber-300">Reassess before generating fit-dependent drafts. Profile and manual questions can still be classified.</p>}
      {skip && activeTab!=='answers' && <div className="text-xs text-amber-300 space-y-2"><p>SKIP / assessment blocker: {activeJob?.fit?.blockers?.join('; ') || activeJob?.priorityReason}. Generation requires your reason to override and remains NEEDS REVIEW.</p><input aria-label="Outreach override reason" value={overrideReason} onChange={e=>setOverrideReason(e.target.value)} placeholder="Why is outreach appropriate despite this blocker?" className="w-full bg-slate-900 rounded p-2" /></div>}
      {/* Tab 1: Recruiter InMail & Email */}
      {activeTab === 'recruiter' && (
        <div className="space-y-6">
          {!outreach ? (
            <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
              <Send className="w-12 h-12 text-purple-400 mx-auto" />
              <h2 className="text-base font-bold text-white">No Outreach Drafted Yet</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Click &quot;Draft Outreach&quot; above to formulate concise, high-conversion messages tailored for LinkedIn InMail (under 300 characters) and direct executive emails.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LinkedIn InMail Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    <h3 className="text-sm font-bold text-white">LinkedIn Direct Message</h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {outreach.linkedInMessage?.length || 0} / 300 chars
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans select-all whitespace-pre-wrap">
                  {outreach.linkedInMessage}
                </div>

                <div className="flex justify-end">
                  <button
                    disabled={!canCopyArtifact(outreach)}
                    onClick={() => handleCopy(outreach.linkedInMessage, 'inmail')}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    {copiedKey === 'inmail' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy InMail</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Email Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-bold text-white">Direct Recruiter / Hiring Manager Email</h3>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] text-slate-400">Subject:</div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-medium">
                    {outreach.emailSubject}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] text-slate-400">Body:</div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {outreach.emailBody}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    disabled={!canCopyArtifact(outreach)}
                    onClick={() => handleCopy(`${outreach.emailSubject}\n\n${outreach.emailBody}`, 'email')}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    {copiedKey === 'email' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied Full Email</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Email</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Application Portal Answers */}
      {activeTab === 'answers' && (
        <div className="space-y-6">
          {/* Question inputs */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white">Target Questions to Answer</h3>
            <div className="space-y-2">
              {portalQuestions.map((q, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 flex items-center justify-between"
                >
                  <div className="flex-1 space-y-2"><span>{q.question}</span>
                    <div className="flex gap-2">
                      <input aria-label="Character limit" type="number" min="1" placeholder="Character limit" value={q.characterLimit || ''} className="w-32 bg-slate-900 p-2 rounded" onChange={e=>setPortalQuestions(portalQuestions.map((v,index)=>index===i?{...v,characterLimit:e.target.value?Number(e.target.value):undefined}:v))} />
                      <input aria-label="Word limit" type="number" min="1" placeholder="Word limit" value={q.wordLimit || ''} className="w-32 bg-slate-900 p-2 rounded" onChange={e=>setPortalQuestions(portalQuestions.map((v,index)=>index===i?{...v,wordLimit:e.target.value?Number(e.target.value):undefined}:v))} />
                    </div>
                    <input aria-label="Personal motivation" placeholder="Your personal motivation, if this question asks for it" value={q.motivation || ''} className="w-full bg-slate-900 p-2 rounded" onChange={e=>setPortalQuestions(portalQuestions.map((v,index)=>index===i?{...v,motivation:e.target.value}:v))} />
                  </div>
                  <button
                    onClick={() => setPortalQuestions(portalQuestions.filter((_, idx) => idx !== i))}
                    className="text-slate-500 hover:text-red-400 text-xs"
                  >
                    âœ•
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newQuestionInput}
                onChange={(e) => setNewQuestionInput(e.target.value)}
                placeholder="Add custom portal question..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
              >
                Add Question
              </button>
            </div>
          </div>

          {/* Generated Answers */}
          {answers && answers.length > 0 && (
            <div className="space-y-4">
              {answers.map((ans: any, i: number) => (
                <div
                  key={i}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg"
                >
                  <h4 className="text-xs font-bold text-purple-300">
                    Question: &quot;{ans.question}&quot;
                  </h4>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed">
                    {ans.answer}
                  </div>
                  <ArtifactStatus artifact={ans} />
                  <p className="text-xs text-slate-400">{ans.category} · {ans.inputStatus}</p>
                  <div className="flex justify-end">
                    <button
                      disabled={!canCopyArtifact(ans)}
                      onClick={() => handleCopy(ans.answer, `ans-${i}`)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-medium flex items-center space-x-1.5"
                    >
                      {copiedKey === `ans-${i}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Answer</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Referral Request */}
      {activeTab === 'referral' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl max-w-2xl mx-auto">
          <div>
            <h3 className="text-base font-bold text-white">Generate Low-Pressure Referral Outreach</h3>
            <p className="text-xs text-slate-400 mt-1">
              Creates a polite, specific message asking a former colleague, manager, or alumni connection for a warm introduction or referral.
            </p>
          </div>

          <form onSubmit={handleCreateReferral} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Contact Name</label>
              <input
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Sarah Chen"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Relationship Context</label>
              <input
                type="text"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="e.g. Former engineering team colleague at Aura"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isGeneratingReferral || !activeJob || activeJob.assessmentStatus!=='ASSESSED' || skip && !overrideReason.trim()}
                className="px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {isGeneratingReferral ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Writing Request...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Referral Note</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {generatedReferralText && (
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-white">Drafted Referral Request:</h4>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                {generatedReferralText}
              </div>
              <div className="flex justify-end">
                <button
                  disabled={!canCopyArtifact(activeJob?.referralContact)}
                  onClick={() => handleCopy(generatedReferralText, 'referral')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-medium flex items-center space-x-1.5"
                >
                  {copiedKey === 'referral' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Message</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
