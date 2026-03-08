import React from 'react';
import {
  Box,
  Button,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import AdjustIcon from '@mui/icons-material/Adjust';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AddIcon from '@mui/icons-material/Add';
import type { ValidationError } from '../store/types';

const STEPS = [
  'Document Info',
  'Service Names',
  'Descriptions',
  'Bearers',
  'Logos',
  'Genre',
  'Keywords',
  'Links',
  'Review & Export',
];

interface Props {
  currentStep: number;
  services: Array<{ id: string; shortNames: Array<{ lang: string; value: string }> }>;
  activeServiceId: string | null;
  validationErrors: ValidationError[];
  lang: string;
  onStepClick: (step: number) => void;
  onServiceClick: (id: string) => void;
  onAddService: () => void;
}

export function ProgressSidebar({
  currentStep,
  services,
  activeServiceId,
  validationErrors,
  lang,
  onStepClick,
  onServiceClick,
  onAddService,
}: Props) {
  const getServiceName = (svc: (typeof services)[0]) =>
    svc.shortNames.find((n) => n.lang === lang)?.value ||
    svc.shortNames[0]?.value ||
    'Untitled Service';

  const serviceErrorIds = new Set(validationErrors.map((e) => e.serviceId).filter(Boolean));

  const stepHasError = (step: number): boolean => {
    if (step === 0) return validationErrors.some((e) => !e.serviceId);
    if (step === 1) return validationErrors.some((e) => e.field === 'shortName' || e.field === 'mediumName' || e.field === 'longName');
    if (step === 2) return validationErrors.some((e) => e.field === 'shortDescription' || e.field === 'longDescription');
    if (step === 3) return validationErrors.some((e) => e.field === 'bearers' || e.field.startsWith('bearer.'));
    if (step === 4) return validationErrors.some((e) => e.field.startsWith('multimedia.'));
    if (step === 7) return validationErrors.some((e) => e.field.startsWith('link.'));
    return false;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 1 }}>
      <Typography variant="overline" sx={{ px: 1.5, py: 1, color: 'text.secondary', fontWeight: 600 }}>
        Services
      </Typography>

      <List dense disablePadding>
        {services.map((svc) => (
          <ListItemButton
            key={svc.id}
            selected={svc.id === activeServiceId}
            onClick={() => onServiceClick(svc.id)}
            sx={{ borderRadius: 1, mb: 0.5 }}
          >
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                    {getServiceName(svc)}
                  </Typography>
                  {serviceErrorIds.has(svc.id) && (
                    <WarningAmberIcon sx={{ fontSize: 14, color: 'error.main' }} />
                  )}
                </Box>
              }
            />
          </ListItemButton>
        ))}
      </List>

      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={onAddService}
        sx={{ mx: 1, mb: 1, justifyContent: 'flex-start' }}
      >
        Add service
      </Button>

      <Divider sx={{ my: 1 }} />

      <Typography variant="overline" sx={{ px: 1.5, py: 0.5, color: 'text.secondary', fontWeight: 600 }}>
        Steps
      </Typography>

      <List dense disablePadding sx={{ flex: 1 }}>
        {STEPS.map((label, idx) => {
          const isCurrent = idx === currentStep;
          const isDone = idx < currentStep;
          const hasError = stepHasError(idx);

          let icon: React.ReactNode;
          if (hasError) {
            icon = <WarningAmberIcon sx={{ fontSize: 18, color: 'error.main' }} />;
          } else if (isCurrent) {
            icon = <AdjustIcon sx={{ fontSize: 18, color: 'primary.main' }} />;
          } else if (isDone) {
            icon = <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />;
          } else {
            icon = <RadioButtonUncheckedIcon sx={{ fontSize: 18, color: 'action.disabled' }} />;
          }

          return (
            <ListItemButton
              key={idx}
              selected={isCurrent}
              onClick={() => onStepClick(idx)}
              disabled={idx > currentStep && services.length === 0 && idx > 0}
              sx={{ borderRadius: 1, mb: 0.25, py: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 30 }}>{icon}</ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    variant="body2"
                    fontWeight={isCurrent ? 600 : 400}
                    color={isCurrent ? 'primary.main' : 'text.primary'}
                  >
                    {label}
                  </Typography>
                }
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
}
