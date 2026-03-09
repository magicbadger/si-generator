import React, { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  IconButton,
  Typography,
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import DeleteIcon from '@mui/icons-material/Delete';
import { useStore } from '../store';
import { LogoPreview } from '../components/LogoPreview';
import { LogoWorkshop } from '../components/LogoWorkshop';
import type { Multimedia } from '../store/types';

// Sort logos smallest → largest by pixel area
function logoArea(mm: Multimedia): number {
  if (mm.logoType === 'logo_colour_square') return 32 * 32;
  if (mm.logoType === 'logo_colour_rectangle') return 112 * 32;
  return (mm.width ?? 0) * (mm.height ?? 0);
}

function dataUrlKb(dataUrl: string): string {
  if (!dataUrl.startsWith('data:')) return '';
  const b64 = dataUrl.split(',')[1] ?? '';
  const padding = (b64.match(/=+$/) ?? [''])[0].length;
  const bytes = (b64.length * 3) / 4 - padding;
  return (bytes / 1024).toFixed(1) + ' KB';
}

export function StepLogos() {
  const services = useStore((s) => s.services);
  const activeServiceId = useStore((s) => s.activeServiceId);
  const updateService = useStore((s) => s.updateService);
  const validate = useStore((s) => s.validate);
  const validationErrors = useStore((s) => s.validationErrors);
  const [workshopOpen, setWorkshopOpen] = useState(false);

  const svc = services.find((s) => s.id === activeServiceId);

  // Remove any empty-URL entries left over from the old manual-entry form
  useEffect(() => {
    if (svc && svc.multimedia.some((m) => !m.url)) {
      updateService(svc.id, { multimedia: svc.multimedia.filter((m) => !!m.url) });
    }
  }, [svc?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!svc) return <Alert severity="info">Add a service first using the sidebar.</Alert>;

  const removeLogo = (id: string) => {
    updateService(svc.id, { multimedia: svc.multimedia.filter((m) => m.id !== id) });
    validate();
  };

  const handleWorkshopAdd = (logos: Multimedia[]) => {
    updateService(svc.id, { multimedia: [...svc.multimedia, ...logos] });
    validate();
  };

  const hasError = (id: string) =>
    validationErrors.some((e) => e.field === `multimedia.${id}`);

  const sorted = [...svc.multimedia].sort((a, b) => logoArea(a) - logoArea(b));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h6">Logos</Typography>
          <Typography variant="body2" color="text.secondary">
            Recommended sizes: 32×32, 112×32, 128×128, 320×240, 600×600 (PNG).
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AutoFixHighIcon />}
          onClick={() => setWorkshopOpen(true)}
          sx={{ flexShrink: 0, ml: 2 }}
        >
          Logo Workshop
        </Button>
      </Box>

      <Divider />

      {svc.multimedia.length === 0 ? (
        <Alert severity="info">
          No logos added yet. Open the Logo Workshop to generate all standard sizes from a single source image.
        </Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {sorted.map((mm, idx) => (
            <Box key={mm.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5 }}>
                <LogoPreview logo={mm} hasError={hasError(mm.id)} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ wordBreak: 'break-all' }}>
                    {mm.url.startsWith('data:') ? '(embedded — will be hosted via Docker export)' : mm.url}
                  </Typography>
                  {mm.url.startsWith('data:') && (
                    <Typography variant="caption" color="text.secondary">
                      {dataUrlKb(mm.url)}
                    </Typography>
                  )}
                </Box>
                <IconButton size="small" onClick={() => removeLogo(mm.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
              {idx < sorted.length - 1 && <Divider />}
            </Box>
          ))}
        </Box>
      )}

      <LogoWorkshop
        open={workshopOpen}
        onClose={() => setWorkshopOpen(false)}
        onAdd={handleWorkshopAdd}
      />
    </Box>
  );
}
