import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import http from 'node:http';
import https from 'node:https';

export function blockedAddress(address: string): boolean {
  const a = address.toLowerCase();
  if (a === '168.63.129.16') return true; // Azure platform virtual/metadata destination.
  if (a.includes(':')) {
    // Conservative: only global-unicast IPv6; mapped IPv4 is rejected.
    return !/^[23][0-9a-f]{3}:/.test(a);
  }
  const p = a.split('.').map(Number);
  return p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255) ||
    p[0] === 0 || p[0] === 10 || p[0] === 127 || p[0] >= 224 ||
    (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
    (p[0] === 192 && (p[1] === 168 || p[1] === 0)) ||
    (p[0] === 100 && p[1] >= 64 && p[1] <= 127) || (p[0] === 198 && [18, 19].includes(p[1]));
}

export function validatePublicUrl(input: string): URL {
  const url = new URL(input);
  const host = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      (url.port && !['80', '443'].includes(url.port)) || !host.includes('.') && !isIP(host) ||
      host === 'localhost' || /\.(localhost|local|internal|home|lan|test|invalid)$/.test(host) ||
      isIP(host) && blockedAddress(host)) throw new Error('Blocked destination');
  return url;
}

// DNS is validated then pinned to the socket, preventing a second lookup/rebinding.
// A single total deadline covers DNS, all redirects and streamed body reads.
export async function safeFetchText(input: string, dependencies = { lookup, http, https }): Promise<{status: number; text: string; url: string}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    let current = input;
    for (let redirects = 0; redirects <= 4; redirects++) {
      const url = validatePublicUrl(current);
      const addresses = await Promise.race([
        dependencies.lookup(url.hostname.replace(/^\[|\]$/g, ''), { all: true }),
        new Promise<never>((_, reject) => controller.signal.addEventListener('abort', () => reject(new Error('Timeout')), { once: true }))
      ]);
      if (!addresses.length || addresses.some(a => blockedAddress(a.address))) throw new Error('Blocked DNS destination');
      const result = await new Promise<{status: number; text: string; location?: string}>((resolve, reject) => {
        const transport = url.protocol === 'https:' ? dependencies.https : dependencies.http;
        const request = transport.get(url, {
          signal: controller.signal,
          lookup: (_host, options, callback) => {
            if ((options as any).all) (callback as any)(null, [addresses[0]]);
            else callback(null, addresses[0].address, addresses[0].family);
          },
          headers: { Accept: 'text/html, text/plain', 'User-Agent': 'CareerOS-ATS-Verifier/3.0' }
        }, response => {
          const status = response.statusCode || 0;
          if ([301, 302, 303, 307, 308].includes(status)) {
            response.destroy(); resolve({ status, text: '', location: response.headers.location }); return;
          }
          if (!/^text\/(html|plain)(;|$)/i.test(response.headers['content-type'] || '')) {
            response.destroy(); reject(new Error('Unsupported content type')); return;
          }
          const chunks: Buffer[] = []; let size = 0;
          response.on('data', chunk => {
            size += chunk.length;
            if (size > 1024 * 1024) { reject(new Error('Response too large')); response.destroy(); return; }
            chunks.push(Buffer.from(chunk));
          });
          response.on('error', reject);
          response.on('end', () => resolve({ status, text: Buffer.concat(chunks).toString('utf8') }));
        });
        request.on('error', reject);
      });
      if ([301, 302, 303, 307, 308].includes(result.status)) {
        if (!result.location || redirects === 4) throw new Error('Redirect limit');
        current = new URL(result.location, url).href; continue;
      }
      return { status: result.status, text: result.text, url: url.href };
    }
    throw new Error('Redirect limit');
  } finally { clearTimeout(timeout); }
}
