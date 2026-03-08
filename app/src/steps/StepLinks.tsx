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
import type { Link } from '../store/types';

const LINK_MIME_TYPES = ['text/html', 'application/rss+xml', 'application/atom+xml', 'text/plain'];

export function StepLinks() {
  const services = useStore((s) => s.services);
  const activeServiceId = useStore((s) => s.activeServiceId);
  const updateService = useStore((s) => s.updateService);

  const svc = services.find((s) => s.id === activeServiceId);
  if (!svc) return <Alert severity="info">Add a service first using the sidebar.</Alert>;

  const addLink = () => {
    const link: Link = { id: uuidv4(), uri: '' };
    updateService(svc.id, { links: [...svc.links, link] });
  };

  const removeLink = (id: string) => {
    updateService(svc.id, { links: svc.links.filter((l) => l.id !== id) });
  };

  const updateLink = (id: string, changes: Partial<Link>) => {
    updateService(svc.id, {
      links: svc.links.map((l) => (l.id === id ? { ...l, ...changes } : l)),
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6">Links (optional)</Typography>
      <Typography variant="body2" color="text.secondary">
        Add website or social media links associated with this service.
      </Typography>

      {svc.links.map((link) => (
        <Box
          key={link.id}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle2">Link</Typography>
            <IconButton size="small" onClick={() => removeLink(link.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="URL"
              value={link.uri}
              onChange={(e) => updateLink(link.id, { uri: e.target.value })}
              size="small"
              fullWidth
              placeholder="https://www.example.com"
            />
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Description (optional, max 180 chars)"
                value={link.description || ''}
                onChange={(e) => updateLink(link.id, { description: e.target.value.slice(0, 180) || undefined })}
                size="small"
                sx={{ flex: 1, minWidth: 240 }}
                inputProps={{ maxLength: 180 }}
                helperText={`${(link.description || '').length}/180`}
              />
              <FormControl size="small" sx={{ width: 200 }}>
                <InputLabel>MIME Type (optional)</InputLabel>
                <Select
                  value={link.mimeValue || ''}
                  label="MIME Type (optional)"
                  onChange={(e) => updateLink(link.id, { mimeValue: e.target.value || undefined })}
                >
                  <MenuItem value="">None</MenuItem>
                  {LINK_MIME_TYPES.map((m) => (
                    <MenuItem key={m} value={m}>{m}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
        </Box>
      ))}

      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={addLink}
        sx={{ alignSelf: 'flex-start' }}
      >
        Add link
      </Button>
    </Box>
  );
}
