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
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AddIcon from '@mui/icons-material/Add';
import ArticleIcon from '@mui/icons-material/Article';
import SummarizeIcon from '@mui/icons-material/Summarize';
import type { NavState, ValidationError } from '../store/types';

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

export function ProgressSidebar({ nav, services, validationErrors, lang, onNav, onAddService }: Props) {
  const svcHasErrors = (svcId: string) => validationErrors.some(e => e.serviceId === svcId);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 1 }}>

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
              <Typography variant="body2" fontWeight={nav.view === 'document' ? 600 : 400}
                color={nav.view === 'document' ? 'primary.main' : 'text.primary'}>
                Document Info
              </Typography>
            }
          />
        </ListItemButton>
      </List>

      <Typography variant="overline" sx={{ px: 1.5, pt: 1, pb: 0.25, color: 'text.secondary', fontWeight: 600, display: 'block' }}>
        Services
      </Typography>

      <List dense disablePadding sx={{ flex: 1, overflowY: 'auto' }}>
        {services.map((svc) => {
          const isActive = nav.view === 'service' && nav.serviceId === svc.id;
          const hasErr = svcHasErrors(svc.id);
          return (
            <ListItemButton
              key={svc.id}
              selected={isActive}
              onClick={() => onNav({ view: 'service', serviceId: svc.id, step: 0 })}
              sx={{ borderRadius: 1, mb: 0.25 }}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body2" noWrap sx={{ flex: 1, fontWeight: isActive ? 600 : 400, color: isActive ? 'primary.main' : 'text.primary' }}>
                      {svcDisplayName(svc, lang)}
                    </Typography>
                    {hasErr && <WarningAmberIcon sx={{ fontSize: 14, color: 'error.main', flexShrink: 0 }} />}
                  </Box>
                }
              />
            </ListItemButton>
          );
        })}
      </List>

      <Button size="small" startIcon={<AddIcon />} onClick={onAddService}
        sx={{ mx: 1, mb: 1, justifyContent: 'flex-start' }}>
        Add service
      </Button>

      <Divider sx={{ my: 1 }} />

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
              <Typography variant="body2" fontWeight={nav.view === 'export' ? 600 : 400}
                color={nav.view === 'export' ? 'primary.main' : 'text.primary'}>
                Review & Export
              </Typography>
            }
          />
        </ListItemButton>
      </List>
    </Box>
  );
}
