import React, { useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  TextField,
  Typography,
} from '@mui/material';
import { useStore } from '../store';
import { GENRE_OPTIONS } from '../constants/genres';
import type { Genre } from '../store/types';

export function StepGenre() {
  const services = useStore((s) => s.services);
  const activeServiceId = useStore((s) => s.activeServiceId);
  const updateService = useStore((s) => s.updateService);

  const [customUrn, setCustomUrn] = useState('');

  const svc = services.find((s) => s.id === activeServiceId);
  if (!svc) return <Alert severity="info">Add a service first using the sidebar.</Alert>;

  const addGenre = (href: string) => {
    if (!href || svc.genres.some((g) => g.href === href)) return;
    const type: Genre['type'] = svc.genres.length === 0 ? 'main' : 'secondary';
    updateService(svc.id, { genres: [...svc.genres, { href, type }] });
  };

  const removeGenre = (href: string) => {
    let updated = svc.genres.filter((g) => g.href !== href);
    // Promote first to main if needed
    if (updated.length > 0 && !updated.some((g) => g.type === 'main')) {
      updated = updated.map((g, i) => (i === 0 ? { ...g, type: 'main' } : g));
    }
    updateService(svc.id, { genres: updated });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6">Genre (optional)</Typography>
      <Typography variant="body2" color="text.secondary">
        The first genre is tagged as "main"; additional genres are "secondary".
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="subtitle2">Common genres:</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {GENRE_OPTIONS.map((opt) => {
            const selected = svc.genres.some((g) => g.href === opt.urn);
            return (
              <Chip
                key={opt.urn}
                label={opt.label}
                variant={selected ? 'filled' : 'outlined'}
                color={selected ? 'primary' : 'default'}
                onClick={() => (selected ? removeGenre(opt.urn) : addGenre(opt.urn))}
                onDelete={selected ? () => removeGenre(opt.urn) : undefined}
              />
            );
          })}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <TextField
          label="Custom TV-Anytime URN"
          value={customUrn}
          onChange={(e) => setCustomUrn(e.target.value)}
          size="small"
          sx={{ flex: 1, maxWidth: 480 }}
          placeholder="urn:tva:metadata:cs:ContentCS:2002:3.x.y"
        />
        <Button
          variant="outlined"
          size="small"
          sx={{ mt: 0.5 }}
          onClick={() => { addGenre(customUrn); setCustomUrn(''); }}
          disabled={!customUrn}
        >
          Add
        </Button>
      </Box>

      {svc.genres.length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>Selected genres:</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {svc.genres.map((g) => (
              <Box key={g.href} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={g.type}
                  size="small"
                  color={g.type === 'main' ? 'primary' : 'default'}
                />
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {g.href}
                </Typography>
                <Button size="small" color="error" onClick={() => removeGenre(g.href)}>
                  Remove
                </Button>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
