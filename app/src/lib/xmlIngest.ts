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
    logoType: (mm['@_type'] as Multimedia['logoType']) || 'logo_colour_square',
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

  const meta: DocumentMeta = {
    serviceProvider: extractServiceProvider(si),
    lang: (si['@_xml:lang'] as string) || 'en',
    creationTime: (si['@_creationTime'] as string) || new Date().toISOString().slice(0, 19) + '+00:00',
    version: parseInt((si['@_version'] as string) || '1', 10),
    originator: (si['@_originator'] as string) || '',
  };

  const servicesNode = si['services'] as Record<string, unknown> | undefined;
  const serviceList = (servicesNode?.['service'] as Record<string, unknown>[]) || [];

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

    const shortDescs = asArray(svcRaw['shortDescription']).map((d: Record<string, unknown>) => ({
      lang: (d['@_xml:lang'] as string) || meta.lang,
      value: typeof d === 'string' ? d : (d['#text'] as string) || '',
    }));

    const longDescs = asArray(svcRaw['longDescription']).map((d: Record<string, unknown>) => ({
      lang: (d['@_xml:lang'] as string) || meta.lang,
      value: typeof d === 'string' ? d : (d['#text'] as string) || '',
    }));

    const bearerList = asArray(svcRaw['bearer']).map((b) =>
      parseBearer(b as Record<string, string>)
    ).filter(Boolean) as Bearer[];

    const multimediaList = asArray(svcRaw['mediaDescription']).flatMap((md) => {
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

function extractServiceProvider(si: Record<string, unknown>): string {
  if (typeof si['serviceProvider'] === 'object' && si['serviceProvider'] !== null) {
    const sp = si['serviceProvider'] as Record<string, unknown>;
    const sn = sp['shortName'];
    if (typeof sn === 'string') return sn;
    if (typeof sn === 'object' && sn !== null) return (sn as Record<string, string>)['#text'] || '';
  }
  return '';
}

function defaultMeta(): DocumentMeta {
  return {
    serviceProvider: '',
    lang: 'en',
    creationTime: new Date().toISOString().slice(0, 19) + '+00:00',
    version: 1,
    originator: '',
  };
}
