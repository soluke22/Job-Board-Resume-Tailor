import React from 'react';
import { TailoredResume } from '../types';

interface ResumePaperProps {
  resume: TailoredResume;
  onBulletClick?: (bulletId: string) => void;
  selectedBulletId?: string | null;
}

export const ResumePaper: React.FC<ResumePaperProps> = ({
  resume,
  onBulletClick,
  selectedBulletId
}) => {
  const { header, professionalSummary, skills, experience, projects, education } = resume;

  return (
    <div
      id="resume-printable-area"
      className="bg-white text-slate-900 shadow-xl mx-auto rounded-sm border border-slate-200 print:border-none print:shadow-none print:m-0 w-full max-w-[816px] min-h-[1056px] p-8 sm:p-10 text-[13px] leading-relaxed font-sans"
      style={{
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      {/* Contact Header */}
      <header className="border-b border-slate-300 pb-3 mb-3 text-center space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 uppercase">
          {header.name}
        </h1>
        <div className="flex items-center justify-center space-x-2 text-xs text-slate-700 flex-wrap">
          <span>{header.location}</span>
          <span>•</span>
          <a href={`mailto:${header.email}`} className="hover:underline text-slate-800">
            {header.email}
          </a>
          <span>•</span>
          <span>{header.phone}</span>
          {header.links.map((link, i) => (
            <React.Fragment key={i}>
              <span>•</span>
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="text-slate-800 hover:underline"
              >
                {link.label}: {link.url.replace(/^https?:\/\//, '')}
              </a>
            </React.Fragment>
          ))}
        </div>
      </header>

      {/* Professional Summary */}
      {professionalSummary && (
        <section className="mb-3.5">
          <h2 className="text-[11.5px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-1.5">
            Professional Summary
          </h2>
          <p className="text-slate-800 text-[12.5px] leading-snug">
            {professionalSummary}
          </p>
        </section>
      )}

      {/* Technical Skills */}
      {skills && skills.length > 0 && (
        <section className="mb-3.5">
          <h2 className="text-[11.5px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-1.5">
            Technical Skills
          </h2>
          <div className="space-y-0.5 text-[12px]">
            {skills.map((cat, idx) => (
              <div key={idx} className="flex leading-tight">
                <span className="font-semibold text-slate-900 w-44 shrink-0">
                  {cat.category}:
                </span>
                <span className="text-slate-800">{cat.skills.join(', ')}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Professional Experience */}
      {experience && experience.length > 0 && (
        <section className="mb-3.5">
          <h2 className="text-[11.5px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-2">
            Professional Experience
          </h2>
          <div className="space-y-3">
            {experience.map((exp) => (
              <div key={exp.id} className="space-y-1">
                <div className="flex items-baseline justify-between text-[12.5px]">
                  <div>
                    <span className="font-bold text-slate-950">{exp.employer}</span>
                    <span className="text-slate-700">, {exp.title}</span>
                  </div>
                  <span className="text-xs text-slate-600 font-medium">{exp.period}</span>
                </div>
                <ul className="list-disc list-outside ml-4 space-y-1 text-[12px] text-slate-800">
                  {exp.bullets
                    .filter((b) => b.enabled !== false)
                    .map((bullet) => {
                      const isSelected = selectedBulletId === bullet.id;
                      return (
                        <li
                          key={bullet.id}
                          onClick={() => onBulletClick && onBulletClick(bullet.id)}
                          className={`cursor-pointer transition-colors leading-snug rounded-xs ${
                            isSelected
                              ? 'bg-emerald-50 text-emerald-950 font-medium px-1 -mx-1'
                              : 'hover:bg-slate-100/70'
                          }`}
                        >
                          {bullet.text}
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {projects && projects.length > 0 && (
        <section className="mb-3.5">
          <h2 className="text-[11.5px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-2">
            Selected Technical Projects
          </h2>
          <div className="space-y-2.5">
            {projects.map((proj) => (
              <div key={proj.id} className="space-y-0.5">
                <div className="flex items-baseline justify-between text-[12.5px]">
                  <div>
                    <span className="font-bold text-slate-950">{proj.name}</span>
                    {proj.technologies && proj.technologies.length > 0 && (
                      <span className="text-xs text-slate-600 italic ml-2">
                        ({proj.technologies.join(', ')})
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-600 font-medium">{proj.period}</span>
                </div>
                <ul className="list-disc list-outside ml-4 space-y-1 text-[12px] text-slate-800">
                  {proj.bullets
                    .filter((b) => b.enabled !== false)
                    .map((bullet) => {
                      const isSelected = selectedBulletId === bullet.id;
                      return (
                        <li
                          key={bullet.id}
                          onClick={() => onBulletClick && onBulletClick(bullet.id)}
                          className={`cursor-pointer transition-colors leading-snug rounded-xs ${
                            isSelected
                              ? 'bg-emerald-50 text-emerald-950 font-medium px-1 -mx-1'
                              : 'hover:bg-slate-100/70'
                          }`}
                        >
                          {bullet.text}
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {education && education.length > 0 && (
        <section>
          <h2 className="text-[11.5px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-1.5">
            Education
          </h2>
          <div className="space-y-1">
            {education.map((edu, idx) => (
              <div key={idx} className="flex items-baseline justify-between text-[12px]">
                <div>
                  <span className="font-bold text-slate-950">{edu.institution}</span>
                  <span className="text-slate-700">, {edu.degree}</span>
                  {edu.details && (
                    <span className="block text-slate-600 text-[11px]">{edu.details}</span>
                  )}
                </div>
                <span className="text-xs text-slate-600 font-medium">{edu.period}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
