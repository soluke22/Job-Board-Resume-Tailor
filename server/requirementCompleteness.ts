import type { ExtractionReview, Requirement } from '../src/types/assessment.js';

/** Source-grounded warning, never requirement invention or a completeness certificate. */
export function reviewRequirementCompleteness(jd: string, requirements: Requirement[]): ExtractionReview {
  const potentialOmissions: ExtractionReview['potentialOmissions'] = [];
  let preferredSection = false;
  // Keep original offsets: never normalize the JD before returning source spans.
  for (const line of jd.matchAll(/[^\r\n]+/g)) {
    const text = line[0];
    if (/^\s*(?:preferred qualifications|nice to have|bonus qualifications)\s*:?\s*$/i.test(text)) preferredSection = true;
    else if (/^\s*(?:(?:minimum|required|basic) qualifications|requirements|responsibilities|what you(?:'|’)ll do)\s*:?\s*$/i.test(text)) preferredSection = false;
    if (preferredSection) continue;
    for (const clause of text.matchAll(/[^,.;!?]+/g)) {
      const raw = clause[0];
      if (!/\b(?:experience|engineering|development|web|frontend|front-end)\b/i.test(raw)) continue;
      if (/\b(?:preferred|optional|nice to have|not required|not necessary|no minimum|do not need|don['’]t need)\b/i.test(raw)) continue;
      if (/\b(?:we|our company)\s+(?:have|has|are|was|were)\b/i.test(raw)) continue;
      const duration = /\b(?:(?:minimum(?: of)?|at least)\s+)?(?:\d+(?:\s*(?:\+|[-–]\s*\d+))?|three|four|five|six|seven|eight|nine|ten)\s*(?:or more\s*)?years?\b/gi;
      for (const match of raw.matchAll(duration)) {
        const start = line.index! + clause.index! + match.index!;
        const end = start + match[0].length;
        const represented = requirements.some(r => r.kind === 'hard' && r.start <= start && r.end >= end && /\b(?:experience|engineering|development|web|frontend|front-end)\b/i.test(r.excerpt));
        if (!represented) {
          const leading = raw.length - raw.trimStart().length;
          const excerptStart = line.index! + clause.index! + leading;
          const excerpt = raw.trim();
          if (!potentialOmissions.some(o => o.start === excerptStart)) potentialOmissions.push({excerpt,start:excerptStart,end:excerptStart+excerpt.length,reason:'EXPLICIT_DURATION_NOT_REPRESENTED'});
        }
      }
    }
  }
  return {status:potentialOmissions.length?'NEEDS_REVIEW':'NOT_FLAGGED',potentialOmissions,
    limitations:'Limited deterministic check of explicit professional duration constraints. NOT_FLAGGED is not proof of complete extraction; review other material requirements and ambiguous language manually.'};
}
