import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Collapse,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import AdjustIcon from '@mui/icons-material/Adjust';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ArticleIcon from '@mui/icons-material/Article';
import SummarizeIcon from '@mui/icons-material/Summarize';
import type { NavState, ValidationError } from '../store/types';

const STEP_LABELS = ['Names', 'Descriptions', 'Bearers', 'RadioDNS', 'Logos', 'Genre', 'Keywords', 'Links'];

interface Props {
  nav: NavState;
  services: Array<{
    id: string;
    shortNames: Array<{ lang: string; value: string }>;
    longNames: Array<{ lang: string; value: string }>;
  }>;
  validationErrors: ValidationError[];
  lang: string;
  onNav: (nav: NavState) => void;
  onAddService: () => void;
}

function svcDisplayName(svc: Props['services'][0], lang: string): string {
  return svc.longNames.find(n => n.lang === lang)?.value ||
    svc.longNames[0]?.value ||
    svc.shortNames.find(n => n.lang === lang)?.value ||
    svc.shortNames[0]?.value ||
    'Untitled Service';
}

function stepHasErrors(svcId: string, stepIdx: number, errors: ValidationError[]): boolean {
  const svcErrors = errors.filter(e => e.serviceId === svcId);
  if (stepIdx === 0) return svcErrors.some(e => e.field === 'shortName' || e.field === 'mediumName');
  if (stepIdx === 1) return svcErrors.some(e => e.field === 'shortDescription' || e.field === 'longDescription');
  if (stepIdx === 2) return svcErrors.some(e => e.field === 'bearers' || e.field.startsWith('bearer.'));
  if (stepIdx === 3) return svcErrors.some(e => e.field === 'radiodns.serviceIdentifier');
  if (stepIdx === 4) return svcErrors.some(e => e.field.startsWith('multimedia.'));
  if (stepIdx === 7) return svcErrors.some(e => e.field.startsWith('link.'));
  return false;
}

export function ProgressSidebar({
  nav,
  services,
  validationErrors,
  lang,
  onNav,
  onAddService,
}: Props) {
  const currentSvcId = nav.view === 'service' ? nav.serviceId : null;

  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(currentSvcId ? [currentSvcId] : [])
  );

  // Auto-expand when nav moves to a different service
  useEffect(() => {
    if (nav.view === 'service') {
      setExpanded(prev => {
        if (prev.has(nav.serviceId)) return prev;
        const next = new Set(prev);
        next.add(nav.serviceId);
        return next;
      });
    }
  }, [nav]);

  const toggleExpanded = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const svcHasErrors = (svcId: string) =>
    validationErrors.some(e => e.serviceId === svcId);

  const isExpanded = (svcId: string) =>
    expanded.has(svcId) || (nav.view === 'service' && nav.serviceId === svcId);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 1 }}>
      {/* Document Info */}
      <List dense disablePadding>
        <ListItemButton
          selected={nav.view === 'document'}
          onClick={() => onNav({ view: 'document' })}
          sx={{ borderRadius: 1, mb: 0.5 }}
        >
          <ListItemIcon sx={{ minWidth: 30 }}>
            <ArticleIcon sx={{ fontSize: 18, color: nav.view === 'document' ? 'primary.main' : 'action.active' }} />
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography
                variant="body2"
                fontWeight={nav.view === 'document' ? 600 : 400}
                color={nav.view === 'document' ? 'primary.main' : 'text.primary'}
              >
                Document Info
              </Typography>
            }
          />
        </ListItemButton>
      </List>

      {/* Services section */}
      <Typography variant="overline" sx={{ px: 1.5, pt: 1, pb: 0.25, color: 'text.secondary', fontWeight: 600, display: 'block' }}>
        Services
      </Typography>

      <List dense disablePadding sx={{ flex: 1, overflowY: 'auto' }}>
        {services.map((svc) => {
          const isCurrentSvc = nav.view === 'service' && nav.serviceId === svc.id;
          const open = isExpanded(svc.id);
          const hasErr = svcHasErrors(svc.id);

          return (
            <Box key={svc.id}>
              {/* Service header row */}
              <Box sx={{ display: 'flex', alignItems: 'center', borderRadius: 1, mb: 0.25 }}>
                <ListItemButton
                  selected={isCurrentSvc}
                  onClick={() => onNav({ view: 'service', serviceId: svc.id, step: 0 })}
                  sx={{ borderRadius: 1, flex: 1, py: 0.5, pr: 0.5 }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2" noWrap sx={{ flex: 1, fontWeight: isCurrentSvc ? 600 : 400, color: isCurrentSvc ? 'primary.main' : 'text.primary' }}>
                          {svcDisplayName(svc, lang)}
                        </Typography>
                        {hasErr && (
                          <WarningAmberIcon sx={{ fontSize: 14, color: 'error.main', flexShrink: 0 }} />
                        )}
                      </Box>
                    }
                  />
                </ListItemButton>
                <IconButton
                  size="small"
                  onClick={() => toggleExpanded(svc.id)}
                  sx={{ ml: 0.5 }}
                >
                  {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </IconButton>
              </Box>

              {/* Step rows */}
              <Collapse in={open} unmountOnExit>
                <List dense disablePadding>
                  {STEP_LABELS.map((label, idx) => {
                    const isCurrent = isCurrentSvc && nav.view === 'service' && nav.step === idx;
                    const hasStepErr = stepHasErrors(svc.id, idx, validationErrors);

                    let icon: React.ReactNode;
                    if (hasStepErr) {
                      icon = <WarningAmberIcon sx={{ fontSize: 16, color: 'error.main' }} />;
                    } else if (isCurrent) {
                      icon = <AdjustIcon sx={{ fontSize: 16, color: 'primary.main' }} />;
                    } else {
                      icon = <RadioButtonUncheckedIcon sx={{ fontSize: 16, color: 'action.disabled' }} />;
                    }

                    return (
                      <ListItemButton
                        key={idx}
                        selected={isCurrent}
                        onClick={() => onNav({ view: 'service', serviceId: svc.id, step: idx })}
                        sx={{ borderRadius: 1, mb: 0.1, py: 0.4, pl: 3 }}
                      >
                        <ListItemIcon sx={{ minWidth: 26 }}>{icon}</ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography
                              variant="caption"
                              fontWeight={isCurrent ? 600 : 400}
                              color={isCurrent ? 'primary.main' : 'text.secondary'}
                            >
                              {label}
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    );
                  })}
                </List>
              </Collapse>
            </Box>
          );
        })}
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

      {/* Review & Export */}
      <List dense disablePadding>
        <ListItemButton
          selected={nav.view === 'export'}
          onClick={() => onNav({ view: 'export' })}
          sx={{ borderRadius: 1 }}
        >
          <ListItemIcon sx={{ minWidth: 30 }}>
            <SummarizeIcon sx={{ fontSize: 18, color: nav.view === 'export' ? 'primary.main' : 'action.active' }} />
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography
                variant="body2"
                fontWeight={nav.view === 'export' ? 600 : 400}
                color={nav.view === 'export' ? 'primary.main' : 'text.primary'}
              >
                Review & Export
              </Typography>
            }
          />
        </ListItemButton>
      </List>
    </Box>
  );
}
