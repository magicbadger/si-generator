import React, { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store';
import { BearerForm } from '../components/BearerForm';
import type { Bearer, RadioDNS } from '../store/types';
import { DABPLUS_MIME } from '../constants/mimeTypes';

const BEARER_TYPES: Array<{ value: Bearer['type']; label: string }> = [
  { value: 'dab', label: 'DAB' },
  { value: 'fm', label: 'FM / RDS' },
  { value: 'ip_stream', label: 'IP Audio Stream' },
  { value: 'ip_playlist', label: 'IP Playlist' },
];

const DEFAULT_COSTS: Record<Bearer['type'], number> = {
  dab: 0,
  fm: 50,
  ip_stream: 100,
  ip_playlist: 100,
};

export function StepBearers() {
  const services = useStore((s) => s.services);
  const activeServiceId = useStore((s) => s.activeServiceId);
  const updateService = useStore((s) => s.updateService);
  const validate = useStore((s) => s.validate);

  const [addType, setAddType] = useState<Bearer['type']>('dab');
  const [showRadioDns, setShowRadioDns] = useState(false);

  const svc = services.find((s) => s.id === activeServiceId);
  if (!svc) return <Alert severity="info">Add a service first using the sidebar.</Alert>;

  const addBearer = () => {
    const bearer: Bearer = {
      id: uuidv4(),
      type: addType,
      uri: '',
      cost: DEFAULT_COSTS[addType],
      mimeValue: addType === 'dab' ? DABPLUS_MIME : undefined,
    };
    updateService(svc.id, { bearers: [...svc.bearers, bearer] });
    validate();
  };

  const removeBearer = (id: string) => {
    updateService(svc.id, { bearers: svc.bearers.filter((b) => b.id !== id) });
    validate();
  };

  const updateBearer = (id: string, changes: Partial<Bearer>) => {
    updateService(svc.id, {
      bearers: svc.bearers.map((b) => (b.id === id ? { ...b, ...changes } : b)),
    });
    validate();
  };

  const updateRadioDns = (changes: Partial<RadioDNS>) => {
    updateService(svc.id, { radiodns: { ...(svc.radiodns ?? { fqdn: '', serviceIdentifier: '' }), ...changes } });
    validate();
  };

  const removeRadioDns = () => {
    updateService(svc.id, { radiodns: undefined });
    validate();
  };

  const hasRadioDns = !!svc.radiodns;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6">Ways of Listening (Bearers)</Typography>
      <Typography variant="body2" color="text.secondary">
        A bearer describes how listeners can tune in. At least one bearer or RadioDNS element is required.
      </Typography>

      {svc.bearers.map((bearer) => (
        <Accordion key={bearer.id} defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, mr: 1 }}>
              <Typography variant="subtitle2">
                {BEARER_TYPES.find((t) => t.value === bearer.type)?.label ?? bearer.type}
              </Typography>
              {bearer.uri && (
                <Chip label={bearer.uri} size="small" variant="outlined" />
              )}
            </Box>
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); removeBearer(bearer.id); }}
              sx={{ mr: 1 }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </AccordionSummary>
          <AccordionDetails>
            <BearerForm
              bearer={bearer}
              onChange={(changes) => updateBearer(bearer.id, changes)}
            />
          </AccordionDetails>
        </Accordion>
      ))}

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Select
          value={addType}
          onChange={(e) => setAddType(e.target.value as Bearer['type'])}
          size="small"
          sx={{ minWidth: 160 }}
        >
          {BEARER_TYPES.map((t) => (
            <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
          ))}
        </Select>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={addBearer} size="small">
          Add bearer
        </Button>
      </Box>

      <Divider />

      <Box>
        <FormControlLabel
          control={
            <Checkbox
              checked={hasRadioDns}
              onChange={(e) => {
                if (e.target.checked) {
                  setShowRadioDns(true);
                  updateService(svc.id, { radiodns: { fqdn: '', serviceIdentifier: '' } });
                } else {
                  removeRadioDns();
                  setShowRadioDns(false);
                }
              }}
            />
          }
          label="Add RadioDNS element (for hybrid service following)"
        />
        {hasRadioDns && (
          <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
            <TextField
              label="FQDN"
              placeholder="bbc.co.uk"
              value={svc.radiodns?.fqdn ?? ''}
              size="small"
              sx={{ width: 280 }}
              onChange={(e) => updateRadioDns({ fqdn: e.target.value })}
            />
            <TextField
              label="Service Identifier (1-16 lowercase alphanumeric)"
              placeholder="radio2"
              value={svc.radiodns?.serviceIdentifier ?? ''}
              size="small"
              sx={{ width: 300 }}
              inputProps={{ maxLength: 16 }}
              onChange={(e) => updateRadioDns({ serviceIdentifier: e.target.value.replace(/[^a-z0-9]/g, '').slice(0, 16) })}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}
