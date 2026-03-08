import React from 'react';
import {
  Alert,
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store';
import { LogoPreview } from '../components/LogoPreview';
import type { Multimedia } from '../store/types';
import { IMAGE_MIMES } from '../constants/mimeTypes';

export function StepLogos() {
  const services = useStore((s) => s.services);
  const activeServiceId = useStore((s) => s.activeServiceId);
  const updateService = useStore((s) => s.updateService);
  const validate = useStore((s) => s.validate);
  const validationErrors = useStore((s) => s.validationErrors);

  const svc = services.find((s) => s.id === activeServiceId);
  if (!svc) return <Alert severity="info">Add a service first using the sidebar.</Alert>;

  const addLogo = () => {
    const mm: Multimedia = {
      id: uuidv4(),
      url: '',
      logoType: 'logo_colour_square',
    };
    updateService(svc.id, { multimedia: [...svc.multimedia, mm] });
  };

  const removeLogo = (id: string) => {
    updateService(svc.id, { multimedia: svc.multimedia.filter((m) => m.id !== id) });
    validate();
  };

  const updateLogo = (id: string, changes: Partial<Multimedia>) => {
    updateService(svc.id, {
      multimedia: svc.multimedia.map((m) => (m.id === id ? { ...m, ...changes } : m)),
    });
    validate();
  };

  const hasError = (id: string) =>
    validationErrors.some((e) => e.field === `multimedia.${id}`);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6">Logos</Typography>
      <Typography variant="body2" color="text.secondary">
        Logos are displayed on receivers. For IP delivery, recommended sizes are 32×32, 112×32, 128×128, 320×240, and 600×600 (PNG).
      </Typography>

      {svc.multimedia.map((mm) => (
        <Box
          key={mm.id}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle2">Logo</Typography>
            <IconButton size="small" onClick={() => removeLogo(mm.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {mm.url && <LogoPreview logo={mm} hasError={hasError(mm.id)} />}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 280 }}>
              <TextField
                label="Logo URL"
                value={mm.url}
                onChange={(e) => updateLogo(mm.id, { url: e.target.value })}
                size="small"
                fullWidth
                placeholder="https://example.com/logo.png"
              />

              <FormControl size="small" sx={{ maxWidth: 280 }}>
                <InputLabel>Logo Type</InputLabel>
                <Select
                  value={mm.logoType}
                  label="Logo Type"
                  onChange={(e) => {
                    const lt = e.target.value as Multimedia['logoType'];
                    // Clear forbidden attrs for typed logos
                    const clear = lt !== 'logo_unrestricted'
                      ? { mimeValue: undefined, width: undefined, height: undefined }
                      : {};
                    updateLogo(mm.id, { logoType: lt, ...clear });
                  }}
                >
                  <MenuItem value="logo_colour_square">logo_colour_square (32×32)</MenuItem>
                  <MenuItem value="logo_colour_rectangle">logo_colour_rectangle (112×32)</MenuItem>
                  <MenuItem value="logo_unrestricted">logo_unrestricted (custom)</MenuItem>
                </Select>
              </FormControl>

              {mm.logoType === 'logo_unrestricted' && (
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <TextField
                    label="Width (px)"
                    type="number"
                    value={mm.width || ''}
                    size="small"
                    sx={{ width: 120 }}
                    inputProps={{ min: 1 }}
                    onChange={(e) => updateLogo(mm.id, { width: parseInt(e.target.value) || undefined })}
                  />
                  <TextField
                    label="Height (px)"
                    type="number"
                    value={mm.height || ''}
                    size="small"
                    sx={{ width: 120 }}
                    inputProps={{ min: 1 }}
                    onChange={(e) => updateLogo(mm.id, { height: parseInt(e.target.value) || undefined })}
                  />
                  <FormControl size="small" sx={{ width: 160 }}>
                    <InputLabel>MIME Type</InputLabel>
                    <Select
                      value={mm.mimeValue || ''}
                      label="MIME Type"
                      onChange={(e) => updateLogo(mm.id, { mimeValue: e.target.value })}
                    >
                      {IMAGE_MIMES.map((m) => (
                        <MenuItem key={m} value={m}>{m}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      ))}

      <Button variant="outlined" startIcon={<AddIcon />} onClick={addLogo} sx={{ alignSelf: 'flex-start' }}>
        Add logo
      </Button>
    </Box>
  );
}
