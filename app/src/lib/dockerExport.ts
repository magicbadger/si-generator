import JSZip from 'jszip';
import { generateXml } from './xmlGenerate';
import type { DocumentMeta, Service } from '../store/types';

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'service';
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; ext: string } {
  if (!dataUrl.startsWith('data:image/')) {
    throw new Error('Invalid logo data: must be an image data URI');
  }
  const [header, b64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png';
  const rawExt = mime.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png';
  const ext = /^[a-z0-9]+$/.test(rawExt) ? rawExt : 'bin';
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { bytes, ext };
  } catch {
    throw new Error('Invalid base64 data in logo image');
  }
}

export async function generateDockerPackage(
  meta: DocumentMeta,
  services: Service[],
  baseUrl: string,
): Promise<Blob> {
  // Trim trailing slash
  const base = baseUrl.replace(/\/$/, '');
  const zip = new JSZip();
  const logosDir = zip.folder('logos')!;

  // Resolve data URLs → files, replace with real URLs
  const resolvedServices: Service[] = services.map((svc) => {
    const shortName = svc.shortNames[0]?.value || 'service';
    const slug = slugify(shortName);
    const svcDir = logosDir.folder(slug)!;

    const usedFilenames = new Set<string>();
    const multimedia = svc.multimedia.map((mm) => {
      if (!mm.url.startsWith('data:')) return mm;
      const { bytes, ext } = dataUrlToBytes(mm.url);
      const base_name = mm.width && mm.height
        ? `logo-${mm.width}x${mm.height}.${ext}`
        : `logo.${ext}`;
      // Deduplicate filenames
      let filename = base_name;
      let n = 1;
      while (usedFilenames.has(filename)) {
        filename = base_name.replace(`.${ext}`, `-${n}.${ext}`);
        n++;
      }
      usedFilenames.add(filename);
      svcDir.file(filename, bytes);
      return { ...mm, url: `${base}/logos/${slug}/${filename}` };
    });

    return { ...svc, multimedia };
  });

  // SI.xml with real URLs
  zip.file('SI.xml', generateXml(meta, resolvedServices));

  // Dockerfile
  zip.file('Dockerfile', [
    'FROM nginx:alpine',
    'COPY nginx.conf /etc/nginx/conf.d/default.conf',
    'COPY logos/ /usr/share/nginx/html/logos/',
    'COPY SI.xml /usr/share/nginx/html/SI.xml',
    'EXPOSE 80',
    '',
  ].join('\n'));

  // nginx.conf
  zip.file('nginx.conf', [
    'server {',
    '    listen 80;',
    '    server_name _;',
    '',
    '    location / {',
    '        root /usr/share/nginx/html;',
    '        add_header Access-Control-Allow-Origin *;',
    '        add_header Cache-Control "public, max-age=86400";',
    '    }',
    '}',
    '',
  ].join('\n'));

  // README
  zip.file('README.md', [
    '# SI Logo Server',
    '',
    'Build and run:',
    '',
    '```bash',
    'docker build -t si-logo-server .',
    `docker run -p 8080:80 si-logo-server`,
    '```',
    '',
    `SI.xml will be served at: ${base}/SI.xml`,
    '',
    '## Logos',
    ...resolvedServices.flatMap((svc) =>
      svc.multimedia.map((mm) => `- ${mm.url}`)
    ),
    '',
  ].join('\n'));

  return zip.generateAsync({ type: 'blob' });
}

export async function generateFolderExport(
  meta: DocumentMeta,
  services: Service[],
  baseUrl: string,
): Promise<Blob> {
  const base = baseUrl.replace(/\/$/, '');
  const zip = new JSZip();
  const logosDir = zip.folder('logos')!;

  const resolvedServices: Service[] = services.map((svc) => {
    const shortName = svc.shortNames[0]?.value || 'service';
    const slug = slugify(shortName);
    const svcDir = logosDir.folder(slug)!;

    const usedFilenames = new Set<string>();
    const multimedia = svc.multimedia.map((mm) => {
      if (!mm.url.startsWith('data:')) return mm;
      const { bytes, ext } = dataUrlToBytes(mm.url);
      const base_name = mm.width && mm.height
        ? `logo-${mm.width}x${mm.height}.${ext}`
        : `logo.${ext}`;
      let filename = base_name;
      let n = 1;
      while (usedFilenames.has(filename)) {
        filename = base_name.replace(`.${ext}`, `-${n}.${ext}`);
        n++;
      }
      usedFilenames.add(filename);
      svcDir.file(filename, bytes);
      return { ...mm, url: `${base}/logos/${slug}/${filename}` };
    });

    return { ...svc, multimedia };
  });

  zip.file('SI.xml', generateXml(meta, resolvedServices));

  return zip.generateAsync({ type: 'blob' });
}
