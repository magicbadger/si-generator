import { Alert, Box, TextField, Typography } from '@mui/material';
import { useStore } from '../store';

export function StepServiceNames() {
  const meta = useStore((s) => s.meta);
  const services = useStore((s) => s.services);
  const activeServiceId = useStore((s) => s.activeServiceId);
  const updateService = useStore((s) => s.updateService);
  const validate = useStore((s) => s.validate);

  const svc = services.find((s) => s.id === activeServiceId);
  if (!svc) return <Alert severity="info">Add a service first using the sidebar.</Alert>;

  const lang = meta.lang || 'en';

  const getNameVal = (
    names: Array<{ lang: string; value: string }>,
    l: string
  ) => names.find((n) => n.lang === l)?.value ?? '';

  const setNameVal = (
    field: 'shortNames' | 'mediumNames' | 'longNames',
    val: string
  ) => {
    const existing = svc[field];
    const idx = existing.findIndex((n) => n.lang === lang);
    let updated: Array<{ lang: string; value: string }>;
    if (idx >= 0) {
      updated = existing.map((n, i) => (i === idx ? { ...n, value: val } : n));
    } else {
      updated = [...existing, { lang, value: val }];
    }
    updateService(svc.id, { [field]: updated });
    validate();
  };

  const shortVal = getNameVal(svc.shortNames, lang);
  const mediumVal = getNameVal(svc.mediumNames, lang);
  const longVal = getNameVal(svc.longNames, lang);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6">Service Names</Typography>
      <Typography variant="body2" color="text.secondary">
        Names have strict length limits. The short name appears on small displays.
      </Typography>

      <Box>
        <TextField
          label="Short Name"
          value={shortVal}
          onChange={(e) => setNameVal('shortNames', e.target.value)}
          required
          error={shortVal.length > 8}
          helperText={
            shortVal.length > 8
              ? `${shortVal.length}/8 — exceeds limit. Receivers will truncate.`
              : `${shortVal.length}/8 characters (required)`
          }
          inputProps={{ maxLength: 10 }}
          size="small"
          sx={{ maxWidth: 300 }}
          placeholder="e.g. Radio 2"
        />
      </Box>

      <Box>
        <TextField
          label="Medium Name"
          value={mediumVal}
          onChange={(e) => setNameVal('mediumNames', e.target.value)}
          required
          error={mediumVal.length > 16}
          helperText={
            mediumVal.length > 16
              ? `${mediumVal.length}/16 — exceeds limit.`
              : `${mediumVal.length}/16 characters (required)`
          }
          inputProps={{ maxLength: 20 }}
          size="small"
          sx={{ maxWidth: 360 }}
          placeholder="e.g. BBC Radio 2"
        />
      </Box>

      <Box>
        <TextField
          label="Long Name (optional)"
          value={longVal}
          onChange={(e) => setNameVal('longNames', e.target.value)}
          error={longVal.length > 128}
          helperText={
            longVal.length > 128
              ? `${longVal.length}/128 — exceeds limit.`
              : `${longVal.length}/128 characters (optional)`
          }
          inputProps={{ maxLength: 140 }}
          size="small"
          sx={{ maxWidth: 480 }}
          placeholder="e.g. BBC Radio 2 — The Home of Easy Listening"
        />
      </Box>
    </Box>
  );
}
