import React from 'react';
import {
  Box,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { useStore } from '../store';

const COMMON_LANGS = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'es', label: 'Spanish' },
  { code: 'it', label: 'Italian' },
  { code: 'nl', label: 'Dutch' },
  { code: 'pl', label: 'Polish' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'sv', label: 'Swedish' },
  { code: 'da', label: 'Danish' },
  { code: 'nb', label: 'Norwegian' },
  { code: 'fi', label: 'Finnish' },
];

export function StepDocumentMeta() {
  const meta = useStore((s) => s.meta);
  const setMeta = useStore((s) => s.setMeta);

  const handleNow = () => {
    const now = new Date();
    const offset = -now.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const h = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
    const m = String(Math.abs(offset) % 60).padStart(2, '0');
    const ts = now.toISOString().slice(0, 19) + `${sign}${h}:${m}`;
    setMeta({ creationTime: ts });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6">Document Information</Typography>
      <Typography variant="body2" color="text.secondary">
        These settings apply to the entire SI file and all services within it.
      </Typography>

      <TextField
        label="Service Provider / Organisation"
        value={meta.serviceProvider}
        onChange={(e) => setMeta({ serviceProvider: e.target.value.slice(0, 128) })}
        helperText={`${meta.serviceProvider.length}/128 characters. Displayed on receivers.`}
        inputProps={{ maxLength: 128 }}
        size="small"
        fullWidth
        placeholder="e.g. BBC, Global Radio"
      />

      <TextField
        select
        label="Default metadata language"
        value={meta.lang}
        onChange={(e) => setMeta({ lang: e.target.value })}
        helperText="All service names and descriptions default to this language."
        size="small"
        sx={{ maxWidth: 300 }}
      >
        {COMMON_LANGS.map((l) => (
          <MenuItem key={l.code} value={l.code}>
            {l.label} ({l.code})
          </MenuItem>
        ))}
      </TextField>

      <Box>
        <TextField
          label="Creation Time (ISO 8601)"
          value={meta.creationTime}
          onChange={(e) => setMeta({ creationTime: e.target.value })}
          helperText='Format: YYYY-MM-DDThh:mm:ss+hh:mm'
          size="small"
          sx={{ maxWidth: 360, mr: 1 }}
          placeholder="2025-01-01T12:00:00+00:00"
        />
        <Typography
          component="span"
          variant="body2"
          color="primary"
          sx={{ cursor: 'pointer', verticalAlign: 'middle' }}
          onClick={handleNow}
        >
          Use now
        </Typography>
      </Box>

      <TextField
        label="Originator (optional)"
        value={meta.originator}
        onChange={(e) => setMeta({ originator: e.target.value.slice(0, 128) })}
        helperText="System or tool that generated this file (optional)."
        size="small"
        sx={{ maxWidth: 360 }}
        placeholder="e.g. SI Generator v1.0"
      />
    </Box>
  );
}
