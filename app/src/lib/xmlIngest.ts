import { XMLParser } from 'fast-xml-parser';
import { v4 as uuidv4 } from 'uuid';
import type { DocumentMeta, Service, Bearer, Multimedia, Genre, Link } from '../store/types';

interface IngestResult {
  meta: DocumentMeta;
  services: Service[];
  error?: string;
}

function parseBearer(b: Record<string, string>): Bearer | null {
  const uri = b['@_id'] || '';
  const cost = parseInt(b['@_cost'] ?? '0', 10);
  const mimeValue = b['@_mimeValue'];
  const bitrate = b['@_bitrate'] ? parseInt(b['@_bitrate'], 10) : undefined;

  let type: Bearer['type'] = 'ip_stream';
  if (uri.startsWith('dab:')) {
    type = 'dab';
  } else if (uri.startsWith('fm:')) {
    type = 'fm';
  } else if (uri.startsWith('drm:') || uri.startsWith('amss:')) {
    type = 'ip_stream';
  } else {
    // IP stream or playlist
    const playlistMimes = ['application/dash+xml', 'application/vnd.apple.mpegurl', 'audio/x-scpls'];
    if (mimeValue && playlistMimes.includes(mimeValue)) {
      type = 'ip_playlist';
    } else {
      type = 'ip_stream';
    }
  }

  return { id: uuidv4(), type, uri, mimeValue, bitrate, cost };
}

function parseMultimedia(mm: Record<string, string>): Multimedia {
  return {
    id: uuidv4(),
    url: mm['@_url'] || '',
    logoType: (mm['@_type'] as Multimedia['logoType']) || 'logo_unrestricted',
    mimeValue: mm['@_mimeValue'],
    width: mm['@_width'] ? parseInt(mm['@_width'], 10) : undefined,
    height: mm['@_height'] ? parseInt(mm['@_height'], 10) : undefined,
    lang: mm['@_xml:lang'],
  };
}

export function ingestXml(xmlString: string): IngestResult {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) =>
      ['service', 'bearer', 'multimedia', 'genre', 'link', 'mediaDescription',
        'shortName', 'mediumName', 'longName', 'shortDescription', 'longDescription'].includes(name),
  });

  let parsed: Record<string, unknown>;
  try {
    parsed = parser.parse(xmlString);
  } catch (e) {
    return { meta: defaultMeta(), services: [], error: `XML parse error: ${String(e)}` };
  }

  const si = (parsed['serviceInformation'] || parsed['epg:serviceInformation']) as Record<string, unknown>;
  if (!si) {
    return { meta: defaultMeta(), services: [], error: 'Root element is not serviceInformation.' };
  }

  const docLang = (si['@_xml:lang'] as string) || 'en';
  const servicesNode = si['services'] as Record<string, unknown> | undefined;
  const spInfo = extractServiceProviderInfo(servicesNode, si, docLang);
  const meta: DocumentMeta = {
    serviceProvider: spInfo.shortName,
    serviceProviderMediumName: spInfo.mediumName,
    serviceProviderLongName: spInfo.longName,
    serviceProviderShortDesc: spInfo.shortDesc,
    serviceProviderLongDesc: spInfo.longDesc,
    serviceProviderLogos: spInfo.logos,
    lang: docLang,
    creationTime: (si['@_creationTime'] as string) || new Date().toISOString().slice(0, 19) + '+00:00',
    version: parseInt((si['@_version'] as string) || '1', 10),
    originator: (si['@_originator'] as string) || '',
  };

  const serviceList = (servicesNode?.['service'] as Record<string, unknown>[]) || [];

  if (serviceList.length > 200) {
    return { meta: defaultMeta(), services: [], error: `File contains too many services (${serviceList.length}). Maximum supported is 200.` };
  }

  const services: Service[] = serviceList.map((s) => {
    const svcRaw = s as Record<string, unknown>;

    const shortNames = asArray(svcRaw['shortName']).map((n: Record<string, unknown>) => ({
      lang: (n['@_xml:lang'] as string) || meta.lang,
      value: typeof n === 'string' ? n : (n['#text'] as string) || '',
    }));

    const mediumNames = asArray(svcRaw['mediumName']).map((n: Record<string, unknown>) => ({
      lang: (n['@_xml:lang'] as string) || meta.lang,
      value: typeof n === 'string' ? n : (n['#text'] as string) || '',
    }));

    const longNames = asArray(svcRaw['longName']).map((n: Record<string, unknown>) => ({
      lang: (n['@_xml:lang'] as string) || meta.lang,
      value: typeof n === 'string' ? n : (n['#text'] as string) || '',
    }));

    // Descriptions and multimedia are wrapped in <mediaDescription> per ETSI TS 102 818,
    // but some implementations also place them directly on the service node — handle both.
    const mediaDescNodes = asArray(svcRaw['mediaDescription']);

    const shortDescs = [
      ...asArray(svcRaw['shortDescription']),
      ...mediaDescNodes.flatMap((md) => asArray((md as Record<string, unknown>)['shortDescription'])),
    ].map((d: Record<string, unknown>) => ({
      lang: (d['@_xml:lang'] as string) || meta.lang,
      value: typeof d === 'string' ? d : (d['#text'] as string) || '',
    }));

    const longDescs = [
      ...asArray(svcRaw['longDescription']),
      ...mediaDescNodes.flatMap((md) => asArray((md as Record<string, unknown>)['longDescription'])),
    ].map((d: Record<string, unknown>) => ({
      lang: (d['@_xml:lang'] as string) || meta.lang,
      value: typeof d === 'string' ? d : (d['#text'] as string) || '',
    }));

    const bearerList = asArray(svcRaw['bearer']).map((b) =>
      parseBearer(b as Record<string, string>)
    ).filter(Boolean) as Bearer[];

    const multimediaList = mediaDescNodes.flatMap((md) => {
      const mmNode = (md as Record<string, unknown>)['multimedia'];
      return asArray(mmNode).map((mm) => parseMultimedia(mm as Record<string, string>));
    });

    const genreList: Genre[] = asArray(svcRaw['genre']).map((g: Record<string, unknown>) => ({
      href: (g['@_href'] as string) || '',
      type: ((g['@_type'] as string) || 'main') as Genre['type'],
    }));

    const linkList: Link[] = asArray(svcRaw['link']).map((l: Record<string, unknown>) => ({
      id: uuidv4(),
      uri: (l['@_uri'] as string) || '',
      description: l['@_description'] as string | undefined,
      mimeValue: l['@_mimeValue'] as string | undefined,
      lang: l['@_xml:lang'] as string | undefined,
      expiryTime: l['@_expiryTime'] as string | undefined,
    }));

    const rdns = svcRaw['radiodns'] as Record<string, string> | undefined;

    const keywords = (svcRaw['keywords'] as string) || '';

    return {
      id: uuidv4(),
      shortNames: shortNames.length ? shortNames : [{ lang: meta.lang, value: '' }],
      mediumNames: mediumNames.length ? mediumNames : [{ lang: meta.lang, value: '' }],
      longNames,
      shortDescriptions: shortDescs,
      longDescriptions: longDescs,
      bearers: bearerList,
      radiodns: rdns
        ? { fqdn: rdns['@_fqdn'] || '', serviceIdentifier: rdns['@_serviceIdentifier'] || '' }
        : undefined,
      multimedia: multimediaList,
      genres: genreList,
      keywords: typeof keywords === 'object' ? '' : String(keywords || ''),
      links: linkList,
    };
  });

  return { meta, services };
}

function asArray(val: unknown): Record<string, unknown>[] {
  if (val === undefined || val === null) return [];
  if (Array.isArray(val)) return val as Record<string, unknown>[];
  return [val as Record<string, unknown>];
}

interface ServiceProviderInfo {
  shortName: string;
  mediumName: string;
  longName: string;
  shortDesc: string;
  longDesc: string;
  logos: Multimedia[];
}

function pickText(node: unknown): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'object' && node !== null) return (node as Record<string, string>)['#text'] || '';
  return '';
}

function extractServiceProviderInfo(
  servicesNode: Record<string, unknown> | undefined,
  si: Record<string, unknown>,
  lang: string
): ServiceProviderInfo {
  const empty: ServiceProviderInfo = { shortName: '', mediumName: '', longName: '', shortDesc: '', longDesc: '', logos: [] };

  // Attribute form on serviceInformation — no rich data
  if (typeof si['@_serviceProvider'] === 'string' && si['@_serviceProvider']) {
    return { ...empty, shortName: si['@_serviceProvider'] };
  }

  // Child element form — <services><serviceProvider>…</serviceProvider></services>
  const spRaw = servicesNode?.['serviceProvider'];
  if (typeof spRaw !== 'object' || spRaw === null) return empty;
  const sp = spRaw as Record<string, unknown>;

  const firstName = (arr: Record<string, unknown>[], fallback = '') => {
    const match = arr.find(n => (n['@_xml:lang'] as string) === lang) ?? arr[0];
    return match ? pickText(match) : fallback;
  };

  const shortName = firstName(asArray(sp['shortName']));
  const mediumName = firstName(asArray(sp['mediumName']));
  const longName = firstName(asArray(sp['longName']));

  const spMediaDescNodes = asArray(sp['mediaDescription']);

  const shortDesc = firstName([
    ...asArray(sp['shortDescription']),
    ...spMediaDescNodes.flatMap(md => asArray((md as Record<string, unknown>)['shortDescription'])),
  ]);

  const longDesc = firstName([
    ...asArray(sp['longDescription']),
    ...spMediaDescNodes.flatMap(md => asArray((md as Record<string, unknown>)['longDescription'])),
  ]);

  const logos: Multimedia[] = spMediaDescNodes.flatMap(md => {
    const mmNode = (md as Record<string, unknown>)['multimedia'];
    return asArray(mmNode).map(mm => parseMultimedia(mm as Record<string, string>));
  });

  return { shortName, mediumName, longName, shortDesc, longDesc, logos };
}

function defaultMeta(): DocumentMeta {
  return {
    serviceProvider: '',
    serviceProviderMediumName: '',
    serviceProviderLongName: '',
    serviceProviderShortDesc: '',
    serviceProviderLongDesc: '',
    serviceProviderLogos: [],
    lang: 'en',
    creationTime: new Date().toISOString().slice(0, 19) + '+00:00',
    version: 1,
    originator: '',
  };
}
