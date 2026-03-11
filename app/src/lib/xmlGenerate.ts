import type { DocumentMeta, Service } from '../store/types';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

type AttrMap = Record<string, string | number | undefined>;

function attrsStr(obj: AttrMap): string {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => ` ${k}="${esc(String(v!))}"`)
    .join('');
}

function selfClose(name: string, obj: AttrMap): string {
  return `<${name}${attrsStr(obj)}/>`;
}

function wrap(name: string, obj: AttrMap, content: string): string {
  return `<${name}${attrsStr(obj)}>${content}</${name}>`;
}

export function generateXml(meta: DocumentMeta, services: Service[]): string {
  const lang = meta.lang || 'en';
  const siAttrs: AttrMap = {
    xmlns: 'http://www.worlddab.org/schemas/spi',
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'xsi:schemaLocation':
      'http://www.worlddab.org/schemas/spi https://www.worlddab.org/schemas/spi/spi_35.xsd',
    'xml:lang': lang,
    version: String(meta.version || 1),
    creationTime: meta.creationTime,
    ...(meta.originator ? { originator: meta.originator } : {}),
  };

  const siChildren: string[] = [];

  if (meta.serviceProvider || meta.serviceProviderMediumName || meta.serviceProviderLongName ||
      meta.serviceProviderShortDesc || meta.serviceProviderLongDesc || meta.serviceProviderLogos?.length) {
    const spChildren: string[] = [];
    if (meta.serviceProvider) spChildren.push(wrap('shortName', {}, esc(meta.serviceProvider)));
    if (meta.serviceProviderMediumName) spChildren.push(wrap('mediumName', {}, esc(meta.serviceProviderMediumName)));
    if (meta.serviceProviderLongName) spChildren.push(wrap('longName', {}, esc(meta.serviceProviderLongName)));
    if (meta.serviceProviderShortDesc) {
      spChildren.push(wrap('mediaDescription', {}, '\n      ' + wrap('shortDescription', {}, esc(meta.serviceProviderShortDesc)) + '\n    '));
    }
    if (meta.serviceProviderLongDesc) {
      spChildren.push(wrap('mediaDescription', {}, '\n      ' + wrap('longDescription', {}, esc(meta.serviceProviderLongDesc)) + '\n    '));
    }
    for (const mm of meta.serviceProviderLogos ?? []) {
      const a: AttrMap = { url: mm.url, type: mm.logoType };
      if (mm.logoType === 'logo_unrestricted') {
        if (mm.mimeValue) a.mimeValue = mm.mimeValue;
        if (mm.width) a.width = mm.width;
        if (mm.height) a.height = mm.height;
      }
      spChildren.push(wrap('mediaDescription', {}, '\n      ' + selfClose('multimedia', a) + '\n    '));
    }
    siChildren.push(
      '  ' + wrap('serviceProvider', {}, '\n    ' + spChildren.join('\n    ') + '\n  ')
    );
  }

  const svcLines: string[] = [];
  for (const svc of services) {
    const svcChildren: string[] = [];

    // Names
    for (const name of svc.shortNames) {
      const a: AttrMap = name.lang !== lang ? { 'xml:lang': name.lang } : {};
      svcChildren.push(wrap('shortName', a, esc(name.value)));
    }
    for (const name of svc.mediumNames) {
      const a: AttrMap = name.lang !== lang ? { 'xml:lang': name.lang } : {};
      svcChildren.push(wrap('mediumName', a, esc(name.value)));
    }
    for (const name of svc.longNames) {
      const a: AttrMap = name.lang !== lang ? { 'xml:lang': name.lang } : {};
      svcChildren.push(wrap('longName', a, esc(name.value)));
    }

    // Descriptions
    for (const desc of svc.shortDescriptions) {
      const a: AttrMap = desc.lang !== lang ? { 'xml:lang': desc.lang } : {};
      svcChildren.push(wrap('shortDescription', a, esc(desc.value)));
    }
    for (const desc of svc.longDescriptions) {
      const a: AttrMap = desc.lang !== lang ? { 'xml:lang': desc.lang } : {};
      svcChildren.push(wrap('longDescription', a, esc(desc.value)));
    }

    // Media descriptions (logos)
    for (const mm of svc.multimedia) {
      const a: AttrMap = { url: mm.url, type: mm.logoType };
      if (mm.lang && mm.lang !== lang) a['xml:lang'] = mm.lang;
      if (mm.logoType === 'logo_unrestricted') {
        if (mm.mimeValue) a.mimeValue = mm.mimeValue;
        if (mm.width) a.width = mm.width;
        if (mm.height) a.height = mm.height;
      }
      svcChildren.push(wrap('mediaDescription', {}, '\n      ' + selfClose('multimedia', a) + '\n    '));
    }

    // Genres
    for (const genre of svc.genres) {
      svcChildren.push(selfClose('genre', { href: genre.href, type: genre.type }));
    }

    // Keywords
    if (svc.keywords && svc.keywords.trim()) {
      svcChildren.push(wrap('keywords', {}, esc(svc.keywords)));
    }

    // Links
    for (const link of svc.links) {
      const a: AttrMap = { uri: link.uri };
      if (link.description) a.description = link.description;
      if (link.mimeValue) a.mimeValue = link.mimeValue;
      if (link.lang) a['xml:lang'] = link.lang;
      if (link.expiryTime) a.expiryTime = link.expiryTime;
      svcChildren.push(selfClose('link', a));
    }

    // RadioDNS
    if (svc.radiodns) {
      svcChildren.push(selfClose('radiodns', {
        fqdn: svc.radiodns.fqdn,
        serviceIdentifier: svc.radiodns.serviceIdentifier,
      }));
    }

    // Bearers
    for (const bearer of svc.bearers) {
      const a: AttrMap = { id: bearer.uri, cost: bearer.cost };
      if (bearer.mimeValue) a.mimeValue = bearer.mimeValue;
      if (bearer.bitrate) a.bitrate = bearer.bitrate;
      if (bearer.offset !== undefined) a.offset = bearer.offset;
      svcChildren.push(selfClose('bearer', a));
    }

    const svcBody = svcChildren.length
      ? '\n' + svcChildren.map((c) => '      ' + c).join('\n') + '\n    '
      : '';
    svcLines.push('    ' + wrap('service', {}, svcBody));
  }

  const servicesBody = svcLines.length ? '\n' + svcLines.join('\n') + '\n  ' : '';
  siChildren.push('  ' + wrap('services', {}, servicesBody));

  const siBody = '\n' + siChildren.join('\n') + '\n';
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + wrap('serviceInformation', siAttrs, siBody) + '\n';
}
