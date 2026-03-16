/**
 * RadioDNS lookup helpers (ETSI TS 103 270 + TS 102 818)
 * DNS queries use Cloudflare DNS-over-HTTPS (browser-safe, CORS-friendly).
 */

const DOH = 'https://cloudflare-dns.com/dns-query';

interface DohAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

interface DohResponse {
  Status: number;
  Answer?: DohAnswer[];
}

async function dohQuery(name: string, type: string): Promise<DohResponse> {
  const resp = await fetch(`${DOH}?name=${encodeURIComponent(name)}&type=${type}`, {
    headers: { Accept: 'application/dns-json' },
  });
  if (!resp.ok) throw new Error(`DNS query failed (HTTP ${resp.status})`);
  return resp.json() as Promise<DohResponse>;
}

/** FM RadioDNS lookup name: <freq>.<pi>.<gcc>.fm.radiodns.org */
export function buildFmLookup(gcc: string, pi: string, freq: string): string {
  return `${freq.toLowerCase()}.${pi.toLowerCase()}.${gcc.toLowerCase()}.fm.radiodns.org`;
}

/** DAB RadioDNS lookup name: <scids>.<sid>.<eid>.<gcc>.dab.radiodns.org */
export function buildDabLookup(gcc: string, eid: string, sid: string, scids: string): string {
  return `${scids.toLowerCase()}.${sid.toLowerCase()}.${eid.toLowerCase()}.${gcc.toLowerCase()}.dab.radiodns.org`;
}

/**
 * Perform CNAME lookup to get Authoritative FQDN.
 * Throws if the service is not registered in RadioDNS.
 */
const DNS_STATUS: Record<number, string> = {
  1: 'Format error — the DNS server could not interpret the query.',
  2: 'Server failure — the DNS server encountered an internal error.',
  3: 'Not found (NXDOMAIN) — this broadcaster has not registered with RadioDNS. They may not support hybrid radio, or their broadcast parameters may be incorrect.',
  4: 'Not implemented — the DNS server does not support this query type.',
  5: 'Refused — the DNS server refused the query.',
};

export async function resolveAuthFqdn(lookupName: string): Promise<string> {
  const result = await dohQuery(lookupName, 'CNAME');
  if (result.Status !== 0) {
    const detail = DNS_STATUS[result.Status] ?? `Unexpected DNS status ${result.Status}.`;
    throw new Error(`DNS lookup failed for:\n${lookupName}\n\n${detail}`);
  }
  const cname = result.Answer?.find((a) => a.type === 5);
  if (!cname) {
    throw new Error(
      `Service not registered in RadioDNS — no CNAME record for:\n${lookupName}`
    );
  }
  return cname.data.replace(/\.$/, '');
}

/**
 * Discover SI.xml URL via SRV lookup (TS 102 818 §5).
 * Tries _radiospi._tcp (TLS) then _radioepg._tcp (non-TLS).
 */
export async function discoverSiUrl(authFqdn: string): Promise<string> {
  const candidates: Array<[string, string]> = [
    [`_radiospi._tcp.${authFqdn}`, 'https'],
    [`_radioepg._tcp.${authFqdn}`, 'http'],
  ];
  for (const [svcName, scheme] of candidates) {
    const result = await dohQuery(svcName, 'SRV');
    if (result.Status === 0 && result.Answer) {
      const srv = result.Answer.find((a) => a.type === 33);
      if (srv) {
        const parts = srv.data.trim().split(/\s+/);
        const port = Number(parts[2] ?? (scheme === 'https' ? '443' : '80'));
        const target = (parts[3] ?? authFqdn).replace(/\.$/, '');
        const defaultPort = scheme === 'https' ? 443 : 80;
        const portPart = port !== defaultPort ? `:${port}` : '';
        return `${scheme}://${target}${portPart}/radiodns/spi/3.1/SI.xml`;
      }
    }
  }
  throw new Error(
    `No SPI service registered for ${authFqdn} (tried _radiospi._tcp and _radioepg._tcp)`
  );
}

const CORS_PROXY = 'https://api.allorigins.win/get?url=';
const MAX_SI_BYTES = 1 * 1024 * 1024; // 1 MB

/** Returns true for http(s) URLs that are not private/loopback addresses. */
function isSafeUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== 'https:' && protocol !== 'http:') return false;
    const h = hostname.toLowerCase();
    if (h === 'localhost' || h === '0.0.0.0') return false;
    if (/^127\./.test(h) || h === '::1') return false;
    if (/^10\./.test(h)) return false;
    if (/^192\.168\./.test(h)) return false;
    if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(h)) return false;
    if (/^169\.254\./.test(h)) return false;
    if (h.endsWith('.local')) return false;
    return true;
  } catch {
    return false;
  }
}

async function doFetch(url: string): Promise<string> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} from ${url}`);
  const cl = resp.headers.get('content-length');
  if (cl && parseInt(cl, 10) > MAX_SI_BYTES) {
    throw new Error(`Response too large from ${url}`);
  }
  const text = await resp.text();
  if (text.length > MAX_SI_BYTES) {
    throw new Error(`Response too large from ${url}`);
  }
  if (!text.includes('serviceInformation')) {
    throw new Error(`Response from ${url} does not appear to be a valid SI.xml`);
  }
  return text;
}

async function doFetchViaProxy(url: string): Promise<string> {
  const resp = await fetch(CORS_PROXY + encodeURIComponent(url));
  if (!resp.ok) throw new Error(`HTTP ${resp.status} from proxy`);
  const json = await resp.json() as { contents?: string };
  const text = json.contents;
  if (typeof text !== 'string') throw new Error('Proxy returned no content');
  if (text.length > MAX_SI_BYTES) throw new Error('Response too large from proxy');
  if (!text.includes('serviceInformation')) {
    throw new Error('Response via proxy does not appear to be a valid SI.xml');
  }
  return text;
}

/**
 * Fetch and return the SI.xml text.
 * If the direct fetch is blocked by CORS, automatically retries via whateverorigin.org.
 * Pass an optional onStatus callback to report progress to the UI.
 */
export async function fetchSiXml(url: string, onStatus?: (s: string) => void): Promise<string> {
  if (!isSafeUrl(url)) {
    throw new Error(`Refused to fetch from unsafe or private URL: ${url}`);
  }
  try {
    return await doFetch(url);
  } catch (e) {
    // TypeError = network/CORS failure; retry via proxy
    if (e instanceof TypeError) {
      onStatus?.(`Direct fetch blocked by CORS — retrying via proxy…`);
      try {
        return await doFetchViaProxy(url);
      } catch (e2) {
        throw new Error(
          `CORS blocked and proxy also failed.\n${e2 instanceof Error ? e2.message : String(e2)}`
        );
      }
    }
    throw e;
  }
}
