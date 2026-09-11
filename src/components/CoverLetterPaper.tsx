import React from 'react';
import { TailoredCoverLetter, CandidateProfile } from '../types';

interface CoverLetterPaperProps {
  coverLetter: TailoredCoverLetter;
  profile: CandidateProfile;
}

export const CoverLetterPaper: React.FC<CoverLetterPaperProps> = ({
  coverLetter,
  profile
}) => {
  return (
    <div
      id="cover-letter-printable-area"
      className="bg-white text-slate-900 shadow-xl mx-auto rounded-sm border border-slate-200 print:border-none print:shadow-none print:m-0 w-full max-w-[816px] min-h-[1056px] p-10 text-[13.5px] leading-relaxed font-sans space-y-6"
      style={{
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      {/* Sender Header */}
      <header className="border-b border-slate-300 pb-4 space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-slate-950 uppercase">
          {profile.name}
        </h1>
        <div className="text-xs text-slate-600 flex items-center space-x-2 flex-wrap">
          <span>{profile.location}</span>
          <span>•</span>
          <span>{profile.email}</span>
          <span>•</span>
          <span>{profile.phone}</span>
        </div>
      </header>

      {/* Date & Recipient */}
      <div className="text-xs text-slate-700 space-y-3">
        <p>{coverLetter.date}</p>
        <div className="space-y-0.5">
          <p className="font-semibold text-slate-900">{coverLetter.recipientName}</p>
          <p>{coverLetter.companyName}</p>
          <p className="italic">Re: Application for {coverLetter.roleTitle}</p>
        </div>
      </div>

      {/* Body Paragraphs */}
      <div className="space-y-4 text-slate-800 text-[13px] leading-relaxed text-justify">
        {coverLetter.paragraphs.map((para, idx) => (
          <p key={idx}>{para}</p>
        ))}
      </div>

      {/* Sign-off */}
      <div className="pt-6 space-y-2 text-xs text-slate-900">
        <p className="whitespace-pre-line">{coverLetter.signOff}</p>
      </div>

      {/* Grounded Themes Indicator (hidden in print) */}
      {coverLetter.evidenceThemesUsed && coverLetter.evidenceThemesUsed.length > 0 && (
        <div className="print:hidden pt-8 border-t border-slate-200 text-[11px] text-slate-400">
          <span className="font-medium text-slate-500">Verified Evidence Themes Grounded: </span>
          {coverLetter.evidenceThemesUsed.join(', ')}
        </div>
      )}
    </div>
  );
};
