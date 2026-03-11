import { useState } from 'react';
import {
  Box,
  Button,
  Divider,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import DeleteIcon from '@mui/icons-material/Delete';
import { useStore } from '../store';
import { LogoPreview } from '../components/LogoPreview';
import { LogoWorkshop } from '../components/LogoWorkshop';
import type { Multimedia } from '../store/types';

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

function logoArea(mm: Multimedia): number {
  if (mm.logoType === 'logo_colour_square') return 32 * 32;
  if (mm.logoType === 'logo_colour_rectangle') return 112 * 32;
  return (mm.width ?? 0) * (mm.height ?? 0);
}

export function StepDocumentMeta() {
  const meta = useStore((s) => s.meta);
  const setMeta = useStore((s) => s.setMeta);
  const [workshopOpen, setWorkshopOpen] = useState(false);

  const handleNow = () => {
    const now = new Date();
    const offset = -now.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const h = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
    const m = String(Math.abs(offset) % 60).padStart(2, '0');
    const ts = now.toISOString().slice(0, 19) + `${sign}${h}:${m}`;
    setMeta({ creationTime: ts });
  };

  const logos = meta.serviceProviderLogos ?? [];
  const sortedLogos = [...logos].sort((a, b) => logoArea(a) - logoArea(b));

  const removeLogo = (id: string) => {
    setMeta({ serviceProviderLogos: logos.filter((m) => m.id !== id) });
  };

  const handleWorkshopAdd = (added: Multimedia[]) => {
    setMeta({ serviceProviderLogos: [...logos, ...added] });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6">Document Information</Typography>
      <Typography variant="body2" color="text.secondary">
        These settings apply to the entire SI file and all services within it.
      </Typography>

      <Typography variant="subtitle2" color="text.secondary">Service Provider</Typography>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          label="Short Name"
          value={meta.serviceProvider ?? ''}
          onChange={(e) => setMeta({ serviceProvider: e.target.value.slice(0, 8) })}
          helperText={`${(meta.serviceProvider ?? '').length}/8 chars`}
          inputProps={{ maxLength: 8 }}
          size="small"
          sx={{ width: 160 }}
          placeholder="e.g. BBC"
        />
        <TextField
          label="Medium Name"
          value={meta.serviceProviderMediumName ?? ''}
          onChange={(e) => setMeta({ serviceProviderMediumName: e.target.value.slice(0, 16) })}
          helperText={`${(meta.serviceProviderMediumName ?? '').length}/16 chars`}
          inputProps={{ maxLength: 16 }}
          size="small"
          sx={{ width: 240 }}
          placeholder="e.g. BBC Radio"
        />
        <TextField
          label="Long Name (optional)"
          value={meta.serviceProviderLongName ?? ''}
          onChange={(e) => setMeta({ serviceProviderLongName: e.target.value.slice(0, 128) })}
          helperText={`${(meta.serviceProviderLongName ?? '').length}/128 chars`}
          inputProps={{ maxLength: 128 }}
          size="small"
          sx={{ flex: 1, minWidth: 200 }}
          placeholder="e.g. British Broadcasting Corporation"
        />
      </Box>

      <TextField
        label="Short Description (optional)"
        value={meta.serviceProviderShortDesc ?? ''}
        onChange={(e) => setMeta({ serviceProviderShortDesc: e.target.value.slice(0, 180) })}
        helperText={`${(meta.serviceProviderShortDesc ?? '').length}/180 chars`}
        inputProps={{ maxLength: 180 }}
        size="small"
        fullWidth
        placeholder="Brief description of the service provider"
      />

      <TextField
        label="Long Description (optional)"
        value={meta.serviceProviderLongDesc ?? ''}
        onChange={(e) => setMeta({ serviceProviderLongDesc: e.target.value.slice(0, 1200) })}
        helperText={`${(meta.serviceProviderLongDesc ?? '').length}/1200 chars`}
        inputProps={{ maxLength: 1200 }}
        size="small"
        fullWidth
        multiline
        rows={3}
        placeholder="Full description of the service provider"
      />

      {/* Service provider logos */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">Service Provider Logos</Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AutoFixHighIcon />}
            onClick={() => setWorkshopOpen(true)}
          >
            Logo Workshop
          </Button>
        </Box>
        {sortedLogos.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {sortedLogos.map((mm, idx) => (
              <Box key={mm.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5 }}>
                  <LogoPreview logo={mm} />
                  <Typography variant="caption" color="text.secondary" sx={{ flex: 1, wordBreak: 'break-all' }}>
                    {mm.url.startsWith('data:') ? '(embedded image)' : mm.url}
                  </Typography>
                  <IconButton size="small" onClick={() => removeLogo(mm.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
                {idx < sortedLogos.length - 1 && <Divider />}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <Divider />

      <Typography variant="subtitle2" color="text.secondary">Document Settings</Typography>

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

      <LogoWorkshop
        open={workshopOpen}
        onClose={() => setWorkshopOpen(false)}
        onAdd={handleWorkshopAdd}
      />
    </Box>
  );
}
