import type { DocumentMeta, Service, ValidationError } from '../store/types';

export function validateStore(meta: DocumentMeta, services: Service[]): ValidationError[] {
  const errors: ValidationError[] = [];

  // Document-level
  if (meta.serviceProvider && meta.serviceProvider.length > 128) {
    errors.push({
      field: 'meta.serviceProvider',
      message: 'Service provider name exceeds 128 characters.',
      suggestion: 'Shorten the service provider name to 128 characters or fewer.',
    });
  }

  for (const svc of services) {
    const sid = svc.id;

    // Short name
    const shortName = svc.shortNames.find((n) => n.lang === (meta.lang || 'en'));
    if (!shortName || !shortName.value.trim()) {
      errors.push({
        serviceId: sid,
        field: 'shortName',
        message: 'Short name is required.',
        suggestion: 'Add a short name (max 8 characters) for the default language.',
      });
    } else if (shortName.value.length > 8) {
      errors.push({
        serviceId: sid,
        field: 'shortName',
        message: `Short name "${shortName.value}" exceeds 8 characters.`,
        suggestion: 'Shorten to 8 characters. Receivers truncate at this limit.',
      });
    }

    // Medium name
    const mediumName = svc.mediumNames.find((n) => n.lang === (meta.lang || 'en'));
    if (!mediumName || !mediumName.value.trim()) {
      errors.push({
        serviceId: sid,
        field: 'mediumName',
        message: 'Medium name is required.',
        suggestion: 'Add a medium name (max 16 characters) for the default language.',
      });
    } else if (mediumName.value.length > 16) {
      errors.push({
        serviceId: sid,
        field: 'mediumName',
        message: `Medium name "${mediumName.value}" exceeds 16 characters.`,
        suggestion: 'Shorten to 16 characters.',
      });
    }

    // Long names
    for (const ln of svc.longNames) {
      if (ln.value.length > 128) {
        errors.push({
          serviceId: sid,
          field: 'longName',
          message: `Long name exceeds 128 characters.`,
          suggestion: 'Shorten the long name to 128 characters.',
        });
      }
    }

    // Short descriptions
    for (const sd of svc.shortDescriptions) {
      if (sd.value.length > 180) {
        errors.push({
          serviceId: sid,
          field: 'shortDescription',
          message: 'Short description exceeds 180 characters.',
          suggestion: 'Shorten the short description to 180 characters.',
        });
      }
    }

    // Long descriptions
    for (const ld of svc.longDescriptions) {
      if (ld.value.length > 1200) {
        errors.push({
          serviceId: sid,
          field: 'longDescription',
          message: 'Long description exceeds 1200 characters.',
          suggestion: 'Shorten the long description to 1200 characters.',
        });
      }
    }

    // Bearers
    if (svc.bearers.length === 0 && !svc.radiodns) {
      errors.push({
        serviceId: sid,
        field: 'bearers',
        message: 'No bearer or RadioDNS element.',
        suggestion: 'Add at least one bearer (DAB, FM, or IP stream) or a RadioDNS element.',
      });
    }

    for (const bearer of svc.bearers) {
      if (bearer.type === 'dab' && !bearer.mimeValue) {
        errors.push({
          serviceId: sid,
          field: `bearer.${bearer.id}.mimeValue`,
          message: 'DAB bearer is missing mimeValue.',
          suggestion: 'Set mimeValue to audio/mpeg (DAB) or audio/aacp (DAB+).',
        });
      }
      if ((bearer.type === 'ip_stream' || bearer.type === 'ip_playlist') && !bearer.mimeValue) {
        errors.push({
          serviceId: sid,
          field: `bearer.${bearer.id}.mimeValue`,
          message: 'IP bearer is missing mimeValue.',
          suggestion: 'Select the MIME type for this stream or playlist URL.',
        });
      }
      if (!bearer.uri) {
        errors.push({
          serviceId: sid,
          field: `bearer.${bearer.id}.uri`,
          message: 'Bearer is missing a URI.',
          suggestion: 'Fill in all required fields for this bearer.',
        });
      } else if (bearer.type === 'ip_stream' || bearer.type === 'ip_playlist') {
        try {
          const { protocol } = new URL(bearer.uri);
          if (protocol !== 'https:' && protocol !== 'http:') {
            errors.push({
              serviceId: sid,
              field: `bearer.${bearer.id}.uri`,
              message: 'IP bearer URI must use http or https.',
              suggestion: 'Enter a valid https:// or http:// URL.',
            });
          }
        } catch {
          errors.push({
            serviceId: sid,
            field: `bearer.${bearer.id}.uri`,
            message: 'IP bearer URI is not a valid URL.',
            suggestion: 'Enter a valid https:// or http:// URL.',
          });
        }
      }
    }

    // RadioDNS
    if (svc.radiodns) {
      const siPattern = /^[a-z0-9]{1,16}$/;
      if (!siPattern.test(svc.radiodns.serviceIdentifier)) {
        errors.push({
          serviceId: sid,
          field: 'radiodns.serviceIdentifier',
          message: 'RadioDNS serviceIdentifier is invalid.',
          suggestion: 'Use 1–16 lowercase letters and digits only, e.g. radio2.',
        });
      }
    }

    // Genres
    const mainGenres = svc.genres.filter((g) => g.type === 'main');
    if (mainGenres.length > 1) {
      errors.push({
        serviceId: sid,
        field: 'genres',
        message: `${mainGenres.length} genres are tagged as "main" — only one is allowed.`,
        suggestion: 'Open the Genres tab and drag to reorder; only the first entry is treated as main.',
      });
    }

    // Multimedia
    for (const mm of svc.multimedia) {
      if (mm.logoType === 'logo_unrestricted') {
        if (!mm.mimeValue || !mm.width || !mm.height) {
          errors.push({
            serviceId: sid,
            field: `multimedia.${mm.id}`,
            message: 'Unrestricted logo missing width, height, or mimeValue.',
            suggestion: 'Set width, height, and mimeValue for unrestricted logos.',
          });
        }
      } else {
        if (mm.mimeValue || mm.width || mm.height) {
          errors.push({
            serviceId: sid,
            field: `multimedia.${mm.id}`,
            message: `${mm.logoType} logo must not have width, height, or mimeValue.`,
            suggestion: 'Remove width, height, and mimeValue — they are forbidden for typed logos.',
          });
        }
      }
    }
  }

  return errors;
}
