import { Box, Button, Paper, Tab, Tabs } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useStore } from '../store';
import type { NavState } from '../store/types';
import type { Service } from '../store/types';
import { ProgressSidebar } from './ProgressSidebar';
import { ValidationBanner } from './ValidationBanner';
import { StepDocumentMeta } from '../steps/StepDocumentMeta';
import { StepServiceNames } from '../steps/StepServiceNames';
import { StepDescriptions } from '../steps/StepDescriptions';
import { StepBearers } from '../steps/StepBearers';
import { StepRadioDns } from '../steps/StepRadioDns';
import { StepLogos } from '../steps/StepLogos';
import { StepGenre } from '../steps/StepGenre';
import { StepKeywords } from '../steps/StepKeywords';
import { StepLinks } from '../steps/StepLinks';
import { StepReview } from '../steps/StepReview';

const SIDEBAR_WIDTH = 220;

const SERVICE_STEPS = 8;

const STEP_LABELS = ['Names', 'Descriptions', 'Bearers', 'RadioDNS', 'Logos', 'Genres', 'Keywords', 'Links'];

const SERVICE_STEP_COMPONENTS = [
  StepServiceNames,
  StepDescriptions,
  StepBearers,
  StepRadioDns,
  StepLogos,
  StepGenre,
  StepKeywords,
  StepLinks,
];

function svcDisplayName(svc: Service, lang: string): string {
  return svc.longNames.find(n => n.lang === lang)?.value ||
    svc.longNames[0]?.value ||
    svc.shortNames.find(n => n.lang === lang)?.value ||
    svc.shortNames[0]?.value ||
    'Untitled Service';
}

function nextNav(nav: NavState, services: Service[]): NavState | null {
  if (nav.view === 'document') {
    if (services.length === 0) return { view: 'export' };
    return { view: 'service', serviceId: services[0].id, step: 0 };
  }
  if (nav.view === 'service') {
    if (nav.step < SERVICE_STEPS - 1) return { view: 'service', serviceId: nav.serviceId, step: nav.step + 1 };
    const idx = services.findIndex(s => s.id === nav.serviceId);
    if (idx < services.length - 1) return { view: 'service', serviceId: services[idx + 1].id, step: 0 };
    return { view: 'export' };
  }
  return null;
}

function prevNav(nav: NavState, services: Service[]): NavState | null {
  if (nav.view === 'export') {
    if (services.length === 0) return { view: 'document' };
    return { view: 'service', serviceId: services[services.length - 1].id, step: SERVICE_STEPS - 1 };
  }
  if (nav.view === 'service') {
    if (nav.step > 0) return { view: 'service', serviceId: nav.serviceId, step: nav.step - 1 };
    const idx = services.findIndex(s => s.id === nav.serviceId);
    if (idx > 0) return { view: 'service', serviceId: services[idx - 1].id, step: SERVICE_STEPS - 1 };
    return { view: 'document' };
  }
  return null;
}

function nextLabel(nav: NavState, services: Service[], lang: string): string {
  if (nav.view === 'document') {
    if (services.length === 0) return 'Review & Export';
    return svcDisplayName(services[0], lang);
  }
  if (nav.view === 'service') {
    if (nav.step < SERVICE_STEPS - 1) return STEP_LABELS[nav.step + 1];
    const idx = services.findIndex(s => s.id === nav.serviceId);
    if (idx < services.length - 1) return svcDisplayName(services[idx + 1], lang);
    return 'Review & Export';
  }
  return '';
}


export function WizardShell() {
  const nav = useStore((s) => s.nav);
  const services = useStore((s) => s.services);
  const validationErrors = useStore((s) => s.validationErrors);
  const meta = useStore((s) => s.meta);
  const setNav = useStore((s) => s.setNav);
  const addService = useStore((s) => s.addService);
  const validate = useStore((s) => s.validate);

  const lang = meta.lang || 'en';

  const handleNext = () => {
    validate();
    const next = nextNav(nav, services);
    if (next) setNav(next);
  };

  const handleBack = () => {
    const prev = prevNav(nav, services);
    if (prev) setNav(prev);
  };

  const handleAddService = () => {
    const id = addService();
    setNav({ view: 'service', serviceId: id, step: 0 });
  };

  const prev = prevNav(nav, services);
  const next = nextNav(nav, services);
  const label = nextLabel(nav, services, lang);

  let StepComponent: React.ComponentType;
  if (nav.view === 'document') {
    StepComponent = StepDocumentMeta;
  } else if (nav.view === 'service') {
    StepComponent = SERVICE_STEP_COMPONENTS[nav.step];
  } else {
    StepComponent = StepReview;
  }

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      {/* Sidebar */}
      <Paper
        elevation={0}
        square
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          borderRight: '1px solid',
          borderColor: 'divider',
          overflowY: 'auto',
        }}
      >
        <ProgressSidebar
          nav={nav}
          services={services}
          validationErrors={validationErrors}
          lang={lang}
          onNav={setNav}
          onAddService={handleAddService}
        />
      </Paper>

      {/* Main content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        {/* Service step tabs */}
        {nav.view === 'service' && (
          <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', flexShrink: 0 }}>
            <Tabs
              value={nav.step}
              onChange={(_, v) => setNav({ view: 'service', serviceId: nav.serviceId, step: v as number })}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ px: 2 }}
            >
              {STEP_LABELS.map((label, idx) => {
                const hasErr = validationErrors.some(e => {
                  if (e.serviceId !== nav.serviceId) return false;
                  if (idx === 0) return e.field === 'shortName' || e.field === 'mediumName';
                  if (idx === 1) return e.field === 'shortDescription' || e.field === 'longDescription';
                  if (idx === 2) return e.field === 'bearers' || e.field.startsWith('bearer.');
                  if (idx === 3) return e.field === 'radiodns.serviceIdentifier';
                  if (idx === 4) return e.field.startsWith('multimedia.');
                  if (idx === 5) return e.field === 'genres';
                  if (idx === 7) return e.field.startsWith('link.');
                  return false;
                });
                return (
                  <Tab
                    key={idx}
                    value={idx}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {label}
                        {hasErr && <WarningAmberIcon sx={{ fontSize: 12, color: 'error.main' }} />}
                      </Box>
                    }
                  />
                );
              })}
            </Tabs>
          </Box>
        )}

        <Box sx={{ flex: 1, overflowY: 'auto', bgcolor: 'background.default' }}>
          <Box sx={{ p: 3 }}>
            <ValidationBanner
              errors={validationErrors}
              services={services}
              lang={lang}
            />

            <StepComponent />
          </Box>
        </Box>

        {/* Navigation footer */}
        <Box
          sx={{
            p: 2,
            px: 3,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'space-between',
            bgcolor: 'background.paper',
          }}
        >
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            disabled={!prev}
            variant="outlined"
          >
            Back
          </Button>
          {next ? (
            <Button
              endIcon={<ArrowForwardIcon />}
              onClick={handleNext}
              variant="contained"
            >
              Next: {label}
            </Button>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}
