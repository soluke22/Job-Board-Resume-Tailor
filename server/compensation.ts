import type { CompensationDetails, CompensationRange } from '../src/types/index.js';

type Provider = 'greenhouse' | 'ashby' | 'lever';
type Disclosure = { ranges: CompensationRange[]; malformed: boolean; raw?: string };
const record = (value: unknown): Record<string, any> | undefined => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : undefined;
const text = (value: unknown) => typeof value === 'string' ? value.trim().slice(0, 12_000) : '';
const canonicalText = (value: unknown) => typeof value === 'string' ? value.trim().slice(0, 200_000) : '';
const join = (...values: unknown[]) => values.map(text).filter(Boolean).join('\n');
const present = (value: unknown) => value !== undefined && value !== null;

function plain(value: unknown): string {
  let result = canonicalText(value);
  // Decode provider-escaped markup only for compensation parsing, never rendering.
  for (let pass = 0; pass < 2; pass++) result = result.replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#(?:39|x27);/gi, "'").replace(/&nbsp;|&#160;/gi, ' ');
  return result.replace(/<\/?(?:p|li|div|br|h[1-6])\b[^>]*>/gi, '\n').replace(/<[^>]*>/g, ' ');
}

function period(value: unknown): CompensationRange['interval'] {
  const normalized = text(value).toLowerCase().replace(/\s+/g, ' ');
  if (/^(?:year|yearly|annual|annually|1 year)$/.test(normalized)) return 'year';
  if (/^(?:month|monthly|1 month)$/.test(normalized)) return 'month';
  if (/^(?:hour|hourly|1 hour)$/.test(normalized)) return 'hour';
}
function textPeriod(value: string): CompensationRange['interval'] {
  const periods = new Set<CompensationRange['interval']>();
  if (/\bannual(?:ly)?\b|\byearly\b|(?:per|a|each|\/)\s*year\b/i.test(value)) periods.add('year');
  if (/\bmonthly\b|(?:per|a|each|\/)\s*month\b/i.test(value)) periods.add('month');
  if (/\bhourly\b|(?:per|an?|each|\/)\s*hour\b/i.test(value)) periods.add('hour');
  return periods.size === 1 ? [...periods][0] : undefined;
}
function currency(value: unknown): string | undefined {
  const candidate = text(value);
  return /^[a-z]{3}$/i.test(candidate) ? candidate.toUpperCase() : undefined;
}
function kind(value: string): CompensationRange['kind'] {
  if (/\btotal compensation\b|\bon.target earnings\b|\bote\b/i.test(value)) return 'total';
  if (/\bbase(?: salary| pay)?\b|\bsalary\b/i.test(value)) return 'base';
  if (/\bbonus\b/i.test(value)) return 'bonus';
  if (/\bequity\b/i.test(value)) return 'equity';
  return 'unknown';
}
function applicability(value: string): string | undefined {
  const scope = plain(value).match(/\b(?:[Ff]or|[Ii]n)\s+([A-Za-z][A-Za-z ,()-]{0,80}?)(?=\s+(?:is|ranges?|[A-Z]{3})\b|[:;.\n$\d]|$)/)?.[1]?.trim();
  return scope && !/^(?:this|the) (?:role|position|job)$/.test(scope) ? scope : undefined;
}
function disclosedKind(label: string, context: string): CompensationRange['kind'] {
  if (/\b(?:includes?|including|inclusive of|consists of)\s+(?:annual\s+)?(?:bonus(?:es)?|equity|stock|commission)\b/i.test(context))
    return /\bbase\b/i.test(label) ? 'unknown' : 'total';
  return kind(label) === 'unknown' ? kind(context) : kind(label);
}
function bounds(minimum: unknown, maximum: unknown, scale = 1) {
  const invalid = (value: unknown) => present(value) && (typeof value !== 'number' || !Number.isFinite(value) || value < 0);
  const min = typeof minimum === 'number' && Number.isFinite(minimum) && minimum >= 0 ? minimum / scale : undefined;
  const max = typeof maximum === 'number' && Number.isFinite(maximum) && maximum >= 0 ? maximum / scale : undefined;
  return { min, max, malformed: invalid(minimum) || invalid(maximum) || min !== undefined && max !== undefined && min > max };
}

/** Only explicitly labelled monetary disclosures; no market/title/location inference. */
function descriptionRanges(value: string): Disclosure {
  const ranges: CompensationRange[] = [];
  const raw: string[] = [];
  let malformed = false;
  const clauses = plain(value).split(/\n|;|[.!?](?:\s|$)|\bplus\b|\band (?=(?:an? )?(?:bonus|equity)\b)/i);
  for (const clauseValue of clauses) {
    const clause = clauseValue.trim();
    const label = clause.match(/^(?:(?:the|our|your|expected|estimated|annual|monthly|hourly|starting|target|anticipated)\s+)*(base(?: salary| pay)?|salary(?: range)?|pay range|total compensation|on.target earnings|bonus|equity|compensation)\b/i);
    if (!label) continue;
    raw.push(clause.slice(0, 1000));
    const rest = clause.slice(label[0].length);
    // Arbitrary numbers elsewhere in prose cannot become a salary disclosure.
    const amount = rest.match(/^\s*(?:(?:range )?(?:is|of|will be|ranges? from|ranges? between|between|from|starts? at|starting at|up to)\s*)?[:=]?\s*(?:(?:for this (?:role|position))\s+(?:is\s+)?)?(?:(?:for|in) ([A-Za-z][A-Za-z ,()-]{0,70}?)\s*[:=]?\s+)?((?:[A-Z]{3}|US\$|C\$)\s*)?\$?(\d[\d,]*(?:\.\d+)?\s*[kK]?)(?:\s*%|\s*(?:-|–|—|to|and)\s*((?:[A-Z]{3}|US\$|C\$)\s*)?\$?(\d[\d,]*(?:\.\d+)?\s*[kK]?)\s*%?)?/);
    if (!amount) continue;
    const numeric = (token: string) => Number(token.replace(/[,\sKk]/g, '')) * (/k/i.test(token) ? 1000 : 1);
    const validNumber = (token: string) => /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?\s*[kK]?$/.test(token.trim());
    if (!validNumber(amount[3]) || amount[5] && !validNumber(amount[5])) { malformed = true; continue; }
    const first = numeric(amount[3]), second = amount[5] ? numeric(amount[5]) : undefined;
    const maxOnly = /\bup to\b/i.test(amount[0]), minOnly = /\b(?:starts? at|starting at|from)\b/i.test(amount[0]) && second === undefined;
    const parsed = bounds(maxOnly ? undefined : first, maxOnly ? first : second ?? (minOnly ? undefined : first));
    malformed ||= parsed.malformed;
    const code = (token: string) => token.trim() === 'US$' ? 'USD' : currency(token.trim());
    const trailingCurrency = rest.slice(amount[0].length).match(/^\s*([A-Z]{3})\b/)?.[1];
    const firstCurrency = code(amount[2] || ''), secondCurrency = code(amount[4] || trailingCurrency || '');
    const conflict = !!firstCurrency && !!secondCurrency && firstCurrency !== secondCurrency;
    // A second monetary disclosure in the same clause is not one universal band.
    if (/\d/.test(rest.slice(amount[0].length).replace(/\b(?:year|month|hour)\b/gi, ''))) continue;
    if (!parsed.malformed) ranges.push({ min: parsed.min, max: parsed.max,
      currency: conflict ? undefined : firstCurrency || secondCurrency, interval: textPeriod(clause),
      kind: disclosedKind(label[1],clause), unit: /%/.test(amount[0]) ? 'percent' : undefined,
      applicability: amount[1]?.trim() || applicability(rest.slice(amount[0].length)), source: 'description', raw: clause.slice(0, 1000) });
  }
  return { ranges:ranges.slice(0,100), malformed:malformed || ranges.length > 100, raw:raw.length ? raw.join('\n').slice(0,12_000) : undefined };
}

function structured(provider: Provider, job: Record<string, any>): Disclosure | undefined {
  if (provider === 'greenhouse' && present(job.pay_input_ranges) && (!Array.isArray(job.pay_input_ranges) || job.pay_input_ranges.length)) {
    if (!Array.isArray(job.pay_input_ranges)) return { ranges: [], malformed: true };
    const ranges: CompensationRange[] = []; let malformed = job.pay_input_ranges.length > 100;
    for (const value of job.pay_input_ranges.slice(0, 100)) {
      const row = record(value); if (!row) { malformed = true; continue; }
      const parsed = bounds(row.min_cents, row.max_cents, 100);
      malformed ||= parsed.malformed || !present(row.min_cents) && !present(row.max_cents);
      if (parsed.malformed) continue;
      const title = text(row.title), context = join(title, row.blurb);
      const generic = /^(?:(?:annual|monthly|hourly|base)\s+)*(?:salary|pay|compensation)(?:\s+range)?$/i.test(title);
      ranges.push({min:parsed.min,max:parsed.max,currency:currency(row.currency_type),interval:textPeriod(context),kind:disclosedKind(title,context),
        applicability: title && !generic ? title : applicability(text(row.blurb)), source:'structured',raw:context});
    }
    return {ranges,malformed};
  }
  if (provider === 'lever' && present(job.salaryRange)) {
    const row = record(job.salaryRange); if (!row) return {ranges:[],malformed:true};
    const parsed = bounds(row.min, row.max);
    if (parsed.malformed || !present(row.min) && !present(row.max)) return {ranges:[],malformed:true};
    const raw = plain(join(job.salaryDescriptionPlain || job.salaryDescription));
    const componentKind = disclosedKind(raw,raw);
    const mixedBaseAndTotal = /\bbase(?: salary| pay)?\b/i.test(raw) && /\btotal compensation\b|\bon.target earnings\b|\bote\b/i.test(raw);
    return {ranges:[{min:parsed.min,max:parsed.max,currency:currency(row.currency),interval:period(row.interval),
      kind:mixedBaseAndTotal ? 'unknown' : componentKind === 'unknown' && !/\bbase\b/i.test(raw) ? 'base' : componentKind,applicability:applicability(raw),source:'structured',raw}],malformed:false};
  }
  if (provider === 'ashby' && present(job.compensation)) {
    const data = record(job.compensation); if (!data) return {ranges:[],malformed:true};
    const raw = join(data.compensationTierSummary, data.scrapeableCompensationSalarySummary);
    const tiers = data.compensationTiers;
    if (present(tiers) && !Array.isArray(tiers)) return {ranges:[],malformed:true,raw};
    const groups = Array.isArray(tiers) && tiers.length ? tiers : [{components:data.summaryComponents}];
    if (!groups.some(group => Array.isArray(group?.components))) {
      if (raw) return {...descriptionRanges(data.scrapeableCompensationSalarySummary ? 'Salary '+text(data.scrapeableCompensationSalarySummary) : raw),raw};
      return {ranges:[],malformed:true};
    }
    const ranges: CompensationRange[] = []; let malformed = groups.length > 100;
    for (const group of groups.slice(0, 100)) {
      if (!Array.isArray(group?.components)) { malformed = true; continue; }
      for (const value of group.components) {
        if (ranges.length === 100) { malformed = true; break; }
        const row = record(value); if (!row) { malformed = true; continue; }
        const parsed = bounds(row.minValue,row.maxValue); malformed ||= parsed.malformed;
        if (parsed.malformed) continue;
        const type = text(row.compensationType);
        ranges.push({min:parsed.min,max:parsed.max,currency:currency(row.currencyCode),interval:period(row.interval),
          kind:type === 'Salary' ? 'base' : /^Bonus/.test(type) ? 'bonus' : /^Equity/.test(type) ? 'equity' : /^(?:TotalCompensation|OTE)$/.test(type) ? 'total' : 'unknown',
          unit:/Percentage$/.test(type) ? 'percent' : undefined,applicability:text(group.title) || undefined,source:'structured',raw:text(row.summary)});
      }
    }
    return {ranges,malformed,raw};
  }
}

function display(range: CompensationRange): string {
  const amount = (value: number) => value.toLocaleString('en-US',{maximumFractionDigits:4});
  const value = range.min !== undefined && range.max !== undefined ? range.min === range.max ? amount(range.min) : `${amount(range.min)}–${amount(range.max)}`
    : range.min !== undefined ? `from ${amount(range.min)}` : range.max !== undefined ? `up to ${amount(range.max)}` : 'amount unknown';
  return `${range.applicability ? range.applicability+': ' : ''}${range.kind}: ${range.currency || (range.unit === 'percent' ? '' : 'currency unknown')} ${value}${range.unit === 'percent' ? '%' : range.interval ? '/'+range.interval : ' (period unknown)'}`.trim();
}

/** Shared by public-board discovery and exact verification. Never converts currencies or annualizes. */
export function normalizeAtsCompensation(provider: Provider, input: unknown): CompensationDetails {
  const job = record(input) || {};
  let disclosure = structured(provider,job);
  if (!disclosure) {
    const description = provider === 'greenhouse' ? canonicalText(job.content) : provider === 'ashby' ? canonicalText(job.descriptionPlain || job.descriptionHtml)
      : [job.salaryDescriptionPlain || job.salaryDescription,job.descriptionPlain || job.description,
        ...(Array.isArray(job.lists) ? job.lists.flatMap((entry:any)=>[entry?.text,entry?.content]) : []),job.additionalPlain || job.additional]
        .map(canonicalText).filter(Boolean).join('\n').slice(0,200_000);
    disclosure = descriptionRanges(description);
  }
  const {ranges,malformed} = disclosure;
  const base = ranges.filter(range=>range.kind === 'base');
  const comparable = (range: CompensationRange) => range.unit !== 'percent' && !!range.currency && !!range.interval && (range.min !== undefined || range.max !== undefined);
  const single = !malformed && base.length === 1 && !base[0].applicability && comparable(base[0]) ? base[0] : undefined;
  const ambiguous = ranges.some(range=>range.kind === 'unknown' || (range.unit !== 'percent' && !comparable(range))) || base.length > 1 || base.some(range=>!!range.applicability);
  const status = malformed ? 'malformed' : ranges.length ? ambiguous ? 'ambiguous' : 'available' : disclosure.raw ? 'ambiguous' : 'unavailable';
  return {status, ...(ranges.length ? {ranges} : {}),
    ...(single ? {min:single.min,max:single.max,currency:single.currency,interval:single.interval} : {}),
    raw:ranges.length ? ranges.map(display).join('\n').slice(0,12_000) : disclosure.raw || (malformed ? 'Compensation disclosure needs confirmation' : undefined)};
}
