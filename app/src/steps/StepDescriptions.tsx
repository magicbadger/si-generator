import React from 'react';
import { Alert, Box, TextField, Typography } from '@mui/material';
import { useStore } from '../store';

export function StepDescriptions() {
  const meta = useStore((s) => s.meta);
  const services = useStore((s) => s.services);
  const activeServiceId = useStore((s) => s.activeServiceId);
  const updateService = useStore((s) => s.updateService);
  const validate = useStore((s) => s.validate);

  const svc = services.find((s) => s.id === activeServiceId);
  if (!svc) return <Alert severity="info">Add a service first using the sidebar.</Alert>;

  const lang = meta.lang || 'en';

  const getVal = (arr: Array<{ lang: string; value: string }>) =>
    arr.find((d) => d.lang === lang)?.value ?? '';

  const setVal = (
    field: 'shortDescriptions' | 'longDescriptions',
    val: string
  ) => {
    const existing = svc[field];
    const idx = existing.findIndex((d) => d.lang === lang);
    let updated: Array<{ lang: string; value: string }>;
    if (idx >= 0) {
      updated = existing.map((d, i) => (i === idx ? { ...d, value: val } : d));
    } else if (val) {
      updated = [...existing, { lang, value: val }];
    } else {
      return;
    }
    // Remove if empty
    if (!val) updated = updated.filter((d) => d.lang !== lang);
    updateService(svc.id, { [field]: updated });
    validate();
  };

  const shortVal = getVal(svc.shortDescriptions);
  const longVal = getVal(svc.longDescriptions);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6">Service Descriptions</Typography>
      <Typography variant="body2" color="text.secondary">
        Both fields are optional. Descriptions help listeners discover your service.
      </Typography>

      <TextField
        label="Short Description (optional)"
        value={shortVal}
        onChange={(e) => setVal('shortDescriptions', e.target.value)}
        multiline
        rows={3}
        error={shortVal.length > 180}
        helperText={
          shortVal.length > 180
            ? `${shortVal.length}/180 — exceeds limit.`
            : `${shortVal.length}/180 characters`
        }
        inputProps={{ maxLength: 200 }}
        size="small"
        fullWidth
        placeholder="A brief description for display on receivers."
      />

      <TextField
        label="Long Description (optional)"
        value={longVal}
        onChange={(e) => setVal('longDescriptions', e.target.value)}
        multiline
        rows={5}
        error={longVal.length > 1200}
        helperText={
          longVal.length > 1200
            ? `${longVal.length}/1200 — exceeds limit.`
            : `${longVal.length}/1200 characters`
        }
        inputProps={{ maxLength: 1250 }}
        size="small"
        fullWidth
        placeholder="A full description for apps and hybrid radio."
      />
    </Box>
  );
}
