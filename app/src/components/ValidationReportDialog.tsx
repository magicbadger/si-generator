import React, { useMemo } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { validateStore } from '../lib/validate';
import type { DocumentMeta, Service } from '../store/types';

interface Props {
  open: boolean;
  xml: string;
  meta: DocumentMeta;
  services: Service[];
  onClose: () => void;
}

interface CheckResult {
  label: string;
  pass: boolean;
  detail?: string;
}

function CheckRow({ label, pass, detail }: CheckResult) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, py: 0.75 }}>
      {pass
        ? <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main', mt: 0.2, flexShrink: 0 }} />
        : <ErrorIcon sx={{ fontSize: 18, color: 'error.main', mt: 0.2, flexShrink: 0 }} />}
      <Box>
        <Typography variant="body2">{label}</Typography>
        {detail && (
          <Typography variant="caption" color={pass ? 'text.secondary' : 'error.main'}>
            {detail}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export function ValidationReportDialog({ open, xml, meta, services, onClose }: Props) {
  const { wellFormed, parseError, errors } = useMemo(() => {
    if (!open) return { wellFormed: true, parseError: '', errors: [] };
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const errNode = doc.querySelector('parsererror');
    const wellFormed = !errNode;
    const parseError = errNode?.textContent?.trim() ?? '';
    const errors = validateStore(meta, services);
    return { wellFormed, parseError, errors };
  }, [open, xml, meta, services]);

  const docErrors = errors.filter((e) => !e.serviceId);
  const allPassed = wellFormed && errors.length === 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        Validation Report
        <Chip
          label={allPassed ? 'PASS' : 'FAIL'}
          size="small"
          color={allPassed ? 'success' : 'error'}
          sx={{ ml: 'auto' }}
        />
      </DialogTitle>

      <DialogContent dividers>
        {/* XML well-formedness */}
        <Typography variant="subtitle2" gutterBottom>XML Structure</Typography>
        <CheckRow
          label="Well-formed XML"
          pass={wellFormed}
          detail={!wellFormed ? parseError : undefined}
        />

        <Divider sx={{ my: 1.5 }} />

        {/* Document-level constraints */}
        <Typography variant="subtitle2" gutterBottom>Document</Typography>
        <CheckRow
          label="Service provider name ≤128 chars"
          pass={!docErrors.some((e) => e.field === 'meta.serviceProvider')}
        />

        {services.length === 0 && (
          <CheckRow label="At least one service defined" pass={false} />
        )}

        {/* Per-service constraints */}
        {services.map((svc) => {
          const lang = meta.lang || 'en';
          const name =
            svc.shortNames.find((n) => n.lang === lang)?.value ||
            svc.shortNames[0]?.value ||
            'Untitled Service';
          const svcErrors = errors.filter((e) => e.serviceId === svc.id);

          const checks: CheckResult[] = [
            {
              label: 'Short name present and ≤8 chars',
              pass: !svcErrors.some((e) => e.field === 'shortName'),
              detail: svcErrors.find((e) => e.field === 'shortName')?.message,
            },
            {
              label: 'Medium name present and ≤16 chars',
              pass: !svcErrors.some((e) => e.field === 'mediumName'),
              detail: svcErrors.find((e) => e.field === 'mediumName')?.message,
            },
            {
              label: 'At least one bearer or RadioDNS',
              pass: !svcErrors.some((e) => e.field === 'bearers'),
              detail: svcErrors.find((e) => e.field === 'bearers')?.message,
            },
            ...svcErrors
              .filter((e) => e.field.startsWith('bearer.'))
              .map((e) => ({ label: `Bearer: ${e.message}`, pass: false, detail: e.suggestion })),
            {
              label: 'RadioDNS serviceIdentifier valid (if set)',
              pass: !svcErrors.some((e) => e.field === 'radiodns.serviceIdentifier'),
              detail: svcErrors.find((e) => e.field === 'radiodns.serviceIdentifier')?.message,
            },
            ...svcErrors
              .filter((e) => e.field.startsWith('multimedia.'))
              .map((e) => ({ label: `Logo: ${e.message}`, pass: false, detail: e.suggestion })),
          ].filter((c) => c.pass !== true || !c.label.startsWith('RadioDNS') || svc.radiodns);

          return (
            <Box key={svc.id}>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="subtitle2" gutterBottom>
                Service: {name}
                {svcErrors.length > 0 && (
                  <Chip label={`${svcErrors.length} issue${svcErrors.length !== 1 ? 's' : ''}`} size="small" color="error" sx={{ ml: 1 }} />
                )}
              </Typography>
              {checks.map((c, i) => <CheckRow key={i} {...c} />)}
            </Box>
          );
        })}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
