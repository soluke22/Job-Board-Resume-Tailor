/** Minimize candidate identifiers in outbound model prompts, including free text. */
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
