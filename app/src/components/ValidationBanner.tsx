import React, { useState } from 'react';
import {
  Alert,
  AlertTitle,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import type { ValidationError } from '../store/types';

interface Props {
  errors: ValidationError[];
  services: Array<{ id: string; shortNames: Array<{ lang: string; value: string }> }>;
  lang: string;
}

export function ValidationBanner({ errors, services, lang }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (errors.length === 0) return null;

  const getServiceName = (id: string) => {
    const svc = services.find((s) => s.id === id);
    if (!svc) return 'Service';
    return svc.shortNames.find((n) => n.lang === lang)?.value || svc.shortNames[0]?.value || 'Service';
  };

  return (
    <Alert
      severity="error"
      sx={{ mb: 2, '& .MuiAlert-message': { width: '100%' } }}
      action={
        <IconButton size="small" onClick={() => setExpanded((e) => !e)}>
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      }
    >
      <AlertTitle>
        {errors.length} validation {errors.length === 1 ? 'error' : 'errors'}
        {!expanded && ' — click to expand'}
      </AlertTitle>
      <Collapse in={expanded}>
        <List dense disablePadding>
          {errors.map((err, i) => (
            <ListItem key={i} disablePadding sx={{ display: 'block', py: 0.25 }}>
              <ListItemText
                primary={
                  <Typography variant="body2" fontWeight={500}>
                    {err.serviceId ? `[${getServiceName(err.serviceId)}] ` : ''}
                    {err.message}
                  </Typography>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    {err.suggestion}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>
      </Collapse>
    </Alert>
  );
}
