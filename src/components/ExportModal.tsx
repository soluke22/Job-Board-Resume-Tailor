import React, { useState } from 'react';
import { X, Printer, Copy, Check, Download, FileCode, FileText } from 'lucide-react';
import { TailoredResume, TailoredCoverLetter } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  resume: TailoredResume;
  coverLetter?: TailoredCoverLetter;
  activeMode: 'resume' | 'cover-letter';
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  resume,
  coverLetter,
  activeMode
}) => {
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  if (!isOpen) return null;

  const generatePlainText = () => {
    if (activeMode === 'cover-letter' && coverLetter) {
      return `${resume.header.name}\n${resume.header.email} | ${resume.header.phone} | ${resume.header.location}\n\n${coverLetter.date}\n\n${coverLetter.recipientName}\n${coverLetter.companyName}\nRe: ${coverLetter.roleTitle}\n\n${coverLetter.paragraphs.join('\n\n')}\n\n${coverLetter.signOff}`;
    }

    let text = `${resume.header.name.toUpperCase()}\n`;
    text += `${resume.header.location} | ${resume.header.email} | ${resume.header.phone}\n`;
    text += `${resume.header.links.map((l) => `${l.label}: ${l.url}`).join(' | ')}\n\n`;

    if (resume.professionalSummary) {
      text += `PROFESSIONAL SUMMARY\n${resume.professionalSummary}\n\n`;
    }

    text += `TECHNICAL SKILLS\n`;
    resume.skills.forEach((s) => {
      text += `${s.category}: ${s.skills.join(', ')}\n`;
    });
    text += `\n`;

    text += `PROFESSIONAL EXPERIENCE\n`;
    resume.experience.forEach((e) => {
      text += `${e.employer}, ${e.title} (${e.period})\n`;
      e.bullets
        .filter((b) => b.enabled !== false)
        .forEach((b) => {
          text += `  * ${b.text}\n`;
        });
      text += `\n`;
    });

    text += `SELECTED TECHNICAL PROJECTS\n`;
    resume.projects.forEach((p) => {
      text += `${p.name} [${p.technologies?.join(', ')}] (${p.period})\n`;
      p.bullets
        .filter((b) => b.enabled !== false)
        .forEach((b) => {
          text += `  * ${b.text}\n`;
        });
      text += `\n`;
    });

    text += `EDUCATION\n`;
    resume.education.forEach((edu) => {
      text += `${edu.institution}, ${edu.degree} (${edu.period})\n`;
      if (edu.details) text += `  ${edu.details}\n`;
    });

    return text;
  };

  const generateMarkdown = () => {
    if (activeMode === 'cover-letter' && coverLetter) {
      return `# ${resume.header.name}
**${resume.header.email} | ${resume.header.phone} | ${resume.header.location}**

${coverLetter.date}

**${coverLetter.recipientName}**  
${coverLetter.companyName}  
*Re: ${coverLetter.roleTitle}*

${coverLetter.paragraphs.join('\n\n')}

${coverLetter.signOff}
`;
    }

    let md = `# ${resume.header.name}\n`;
    md += `**${resume.header.location} | ${resume.header.email} | ${resume.header.phone}**  \n`;
    md += `${resume.header.links.map((l) => `[${l.label}](${l.url})`).join(' | ')}\n\n---\n\n`;

    if (resume.professionalSummary) {
      md += `## Professional Summary\n${resume.professionalSummary}\n\n`;
    }

    md += `## Technical Skills\n`;
    resume.skills.forEach((s) => {
      md += `- **${s.category}:** ${s.skills.join(', ')}\n`;
    });
    md += `\n`;

    md += `## Professional Experience\n`;
    resume.experience.forEach((e) => {
      md += `### ${e.employer} | ${e.title} *(${e.period})*\n`;
      e.bullets
        .filter((b) => b.enabled !== false)
        .forEach((b) => {
          md += `- ${b.text}\n`;
        });
      md += `\n`;
    });

    md += `## Selected Technical Projects\n`;
    resume.projects.forEach((p) => {
      md += `### ${p.name} *(${p.technologies?.join(', ')})* — ${p.period}\n`;
      p.bullets
        .filter((b) => b.enabled !== false)
        .forEach((b) => {
          md += `- ${b.text}\n`;
        });
      md += `\n`;
    });

    md += `## Education\n`;
    resume.education.forEach((edu) => {
      md += `**${edu.institution}** - ${edu.degree} *(${edu.period})*  \n`;
      if (edu.details) md += `${edu.details}\n`;
    });

    return md;
  };

  const escapeLatex = (text: string = ''): string => {
    return text
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/([&%$#_{}])/g, '\\$1')
      .replace(/~/g, '\\textasciitilde{}')
      .replace(/\^/g, '\\textasciicircum{}')
      .replace(/—/g, '---')
      .replace(/–/g, '--');
  };

  const generateLatex = () => {
    // Clean standard ModernCV/article LaTeX output
    const contactParts = [
      resume.header.location,
      resume.header.email,
      resume.header.phone
    ].filter(Boolean).map(escapeLatex);

    const contactLine = contactParts.join(' \\ $|$ \\ ');
    const linkLine = resume.header.links
      .map((l) => `\\href{${l.url}}{${escapeLatex(l.label)}}`)
      .join(' \\ $|$ \\ ');

    return `% LaTeX Resume - ${escapeLatex(resume.header.name)}
\\documentclass[10pt,letterpaper]{article}
\\usepackage[margin=0.6in]{geometry}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\setlist[itemize]{noitemsep, topsep=0pt, leftmargin=1.5em}

\\begin{document}
\\pagestyle{empty}

\\begin{center}
    {\\LARGE \\textbf{${escapeLatex(resume.header.name.toUpperCase())}}} \\\\ \\vspace{4pt}
    ${contactLine} ${linkLine ? `\\\\ \n    ${linkLine}` : ''}
\\end{center}

\\vspace{-8pt}
\\section*{Professional Summary}
${escapeLatex(resume.professionalSummary || '')}

\\vspace{-4pt}
\\section*{Technical Skills}
\\begin{itemize}
${resume.skills
  .map(
    (s) =>
      `  \\item \\textbf{${escapeLatex(s.category)}:} ${escapeLatex(s.skills.join(', '))}`
  )
  .join('\n')}
\\end{itemize}

\\vspace{-4pt}
\\section*{Professional Experience}
${resume.experience
  .map(
    (e) => `\\textbf{${escapeLatex(e.employer)}} \\hfill ${escapeLatex(e.period)} \\\\
\\textit{${escapeLatex(e.title)}}
\\begin{itemize}
${e.bullets
  .filter((b) => b.enabled !== false)
  .map((b) => `  \\item ${escapeLatex(b.text)}`)
  .join('\n')}
\\end{itemize}`
  )
  .join('\n\\vspace{4pt}\n')}

\\vspace{-4pt}
\\section*{Selected Technical Projects}
${resume.projects
  .map(
    (p) => `\\textbf{${escapeLatex(p.name)}} \\textit{(${escapeLatex(p.technologies?.join(', '))})} \\hfill ${escapeLatex(p.period)}
\\begin{itemize}
${p.bullets
  .filter((b) => b.enabled !== false)
  .map((b) => `  \\item ${escapeLatex(b.text)}`)
  .join('\n')}
\\end{itemize}`
  )
  .join('\n\\vspace{4pt}\n')}

\\vspace{-4pt}
\\section*{Education}
${resume.education
  .map(
    (edu) => `\\textbf{${escapeLatex(edu.institution)}} \\hfill ${escapeLatex(edu.period)} \\\\
\\textit{${escapeLatex(edu.degree)}} ${edu.details ? `\\\\ \\small{${escapeLatex(edu.details)}}` : ''}`
  )
  .join('\n')}

\\end{document}`;
  };

  const handleCopy = (format: 'text' | 'md' | 'json' | 'latex', content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const handleDownload = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden my-8">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Export {activeMode === 'cover-letter' ? 'Cover Letter' : 'Tailored Resume'}
            </h2>
            <p className="text-xs text-slate-500">
              Select your preferred production or plaintext format.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {/* Primary Action: Print to PDF */}
          <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-semibold text-emerald-950 dark:text-emerald-200 text-sm flex items-center space-x-1.5">
                <Printer className="w-4 h-4 text-emerald-600" />
                <span>Print / Save as PDF</span>
              </span>
              <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                Uses print stylesheet tuned for an exact 8.5" x 11" one-page sheet.
              </p>
            </div>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium shadow-xs transition-colors cursor-pointer shrink-0"
            >
              Print / PDF
            </button>
          </div>

          {/* Other Formats */}
          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
              Digital & ATS Export Formats
            </span>

            {/* Plain Text */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <div>
                  <span className="font-medium text-slate-800 dark:text-slate-200 block">
                    Plain Text (.txt)
                  </span>
                  <span className="text-[10px] text-slate-500">Universal ATS copy-paste</span>
                </div>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => handleCopy('text', generatePlainText())}
                  className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 hover:text-emerald-600 cursor-pointer flex items-center space-x-1"
                >
                  {copiedFormat === 'text' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedFormat === 'text' ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => handleDownload('solomon_resume.txt', generatePlainText(), 'text/plain')}
                  className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  title="Download"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Markdown */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-slate-500" />
                <div>
                  <span className="font-medium text-slate-800 dark:text-slate-200 block">
                    Markdown (.md)
                  </span>
                  <span className="text-[10px] text-slate-500">GitHub, Notion, Obsidian</span>
                </div>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => handleCopy('md', generateMarkdown())}
                  className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 hover:text-emerald-600 cursor-pointer flex items-center space-x-1"
                >
                  {copiedFormat === 'md' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedFormat === 'md' ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => handleDownload('solomon_resume.md', generateMarkdown(), 'text/markdown')}
                  className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  title="Download"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* LaTeX */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-slate-500" />
                <div>
                  <span className="font-medium text-slate-800 dark:text-slate-200 block">
                    LaTeX (.tex)
                  </span>
                  <span className="text-[10px] text-slate-500">Overleaf / PDF compilation</span>
                </div>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => handleCopy('latex', generateLatex())}
                  className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 hover:text-emerald-600 cursor-pointer flex items-center space-x-1"
                >
                  {copiedFormat === 'latex' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedFormat === 'latex' ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => handleDownload('solomon_resume.tex', generateLatex(), 'application/x-latex')}
                  className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  title="Download"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Structured JSON */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-slate-500" />
                <div>
                  <span className="font-medium text-slate-800 dark:text-slate-200 block">
                    JSON Data
                  </span>
                  <span className="text-[10px] text-slate-500">Full structured object</span>
                </div>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => handleCopy('json', JSON.stringify(resume, null, 2))}
                  className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 hover:text-emerald-600 cursor-pointer flex items-center space-x-1"
                >
                  {copiedFormat === 'json' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedFormat === 'json' ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => handleDownload('solomon_resume.json', JSON.stringify(resume, null, 2), 'application/json')}
                  className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  title="Download"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
