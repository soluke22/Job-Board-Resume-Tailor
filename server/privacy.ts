/** Minimize candidate identifiers in outbound model prompts, including free text. */
export function isSensitiveText(text: string) {
  return /\brace\b|ethnic|disabil|veteran|gender|\bsex\b|religio|sexual orientation|criminal|medical|accommodat|health condition|pregnan|bipolar|\badhd\b|autis|depress|anxiety|psychiatr|mental health|\bhiv\b|diabet|cancer|diagnos|\bblind\b|deaf|\bage\b|year.old|date of birth|born in|\btransgender\b|\bnon.binary\b|\bgay\b|\blesbian\b/.test(text.toLowerCase());
}

/** Candidate-context triage differs from demographic application questions. */
export function isSensitiveCandidateText(text: string) {
  const domainText = text.replace(/\brace conditions?\b/gi, 'concurrency')
    .replace(/\bmedical (?:dashboards?|software|applications?|devices?)\b/gi, 'domain software')
    .replace(/\baccommodation booking\b/gi, 'booking');
  return isSensitiveText(domainText);
}

export function redactAiPayload<T>(payload: T, profile?: Record<string, any>): T {
  const identifiers = [profile?.name, profile?.fullName, profile?.preferredName, profile?.phone, profile?.email, profile?.location, ...(profile?.links || []).map((link: any) => link.url)]
    .filter((value): value is string => typeof value === 'string' && value.trim().length >= 3);
  const redact = (value: any): any => {
    if (typeof value === 'string') {
      let text = value;
      for (const identifier of identifiers) text = text.split(identifier).join('[candidate identifier]');
      return text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
        .replace(/(?:\+?\d[\d ().-]{7,}\d)/g, '[phone or identifier]');
    }
    if (Array.isArray(value)) return value.map(redact);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redact(item)]));
    return value;
  };
  return redact(payload);
}
