import React, { useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Chip,
  TextField,
  Typography,
} from '@mui/material';
import { useStore } from '../store';

export function StepKeywords() {
  const services = useStore((s) => s.services);
  const activeServiceId = useStore((s) => s.activeServiceId);
  const updateService = useStore((s) => s.updateService);

  const svc = services.find((s) => s.id === activeServiceId);
  if (!svc) return <Alert severity="info">Add a service first using the sidebar.</Alert>;

  const keywords = svc.keywords
    ? svc.keywords.split(',').map((k) => k.trim()).filter(Boolean)
    : [];

  const setKeywords = (kws: string[]) => {
    updateService(svc.id, { keywords: kws.join(', ') });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6">Keywords (optional)</Typography>
      <Typography variant="body2" color="text.secondary">
        Keywords help with service discovery. Enter terms separated by commas.
      </Typography>

      <Autocomplete
        multiple
        freeSolo
        options={[]}
        value={keywords}
        onChange={(_, newValue) => setKeywords(newValue as string[])}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              variant="outlined"
              label={option}
              size="small"
              {...getTagProps({ index })}
              key={option}
            />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label="Keywords"
            placeholder="Type a keyword and press Enter"
            helperText="Press Enter or comma to add each keyword"
            size="small"
          />
        )}
        sx={{ maxWidth: 600 }}
      />

      {keywords.length > 0 && (
        <Typography variant="caption" color="text.secondary">
          {keywords.length} keyword{keywords.length !== 1 ? 's' : ''} — stored as: <em>{svc.keywords}</em>
        </Typography>
      )}
    </Box>
  );
}
