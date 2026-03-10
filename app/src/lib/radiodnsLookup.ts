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
export async function resolveAuthFqdn(lookupName: string): Promise<string> {
  const result = await dohQuery(lookupName, 'CNAME');
  if (result.Status !== 0) {
    throw new Error(`DNS error (status ${result.Status}) resolving ${lookupName}`);
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

const CORS_PROXY = 'https://corsproxy.io/?url=';

async function doFetch(url: string): Promise<string> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} from ${url}`);
  const text = await resp.text();
  if (!text.includes('serviceInformation')) {
    throw new Error(`Response from ${url} does not appear to be a valid SI.xml`);
  }
  return text;
}

/**
 * Fetch and return the SI.xml text.
 * If the direct fetch is blocked by CORS, automatically retries via corsproxy.io.
 * Pass an optional onStatus callback to report progress to the UI.
 */
export async function fetchSiXml(url: string, onStatus?: (s: string) => void): Promise<string> {
  try {
    return await doFetch(url);
  } catch (e) {
    // TypeError = network/CORS failure; retry via proxy
    if (e instanceof TypeError) {
      onStatus?.(`Direct fetch blocked by CORS — retrying via proxy…`);
      try {
        return await doFetch(CORS_PROXY + encodeURIComponent(url));
      } catch (e2) {
        throw new Error(
          `CORS blocked and proxy also failed.\n${e2 instanceof Error ? e2.message : String(e2)}`
        );
      }
    }
    throw e;
  }
}
