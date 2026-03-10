import { Box, Button, Paper, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useStore } from '../store';
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

const STEP_LABELS = [
  'Document Info',
  'Service Names',
  'Descriptions',
  'Bearers',
  'RadioDNS',
  'Logos',
  'Genre',
  'Keywords',
  'Links',
  'Review & Export',
];

const STEP_COMPONENTS = [
  StepDocumentMeta,
  StepServiceNames,
  StepDescriptions,
  StepBearers,
  StepRadioDns,
  StepLogos,
  StepGenre,
  StepKeywords,
  StepLinks,
  StepReview,
];

const SIDEBAR_WIDTH = 220;

export function WizardShell() {
  const currentStep = useStore((s) => s.currentStep);
  const services = useStore((s) => s.services);
  const activeServiceId = useStore((s) => s.activeServiceId);
  const validationErrors = useStore((s) => s.validationErrors);
  const meta = useStore((s) => s.meta);
  const setStep = useStore((s) => s.setStep);
  const setActiveService = useStore((s) => s.setActiveService);
  const addService = useStore((s) => s.addService);
  const validate = useStore((s) => s.validate);

  const StepComponent = STEP_COMPONENTS[currentStep];

  const handleNext = () => {
    validate();
    if (currentStep < STEP_COMPONENTS.length - 1) {
      setStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setStep(currentStep - 1);
  };

  const handleAddService = () => {
    const id = addService();
    setActiveService(id);
  };

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
          currentStep={currentStep}
          services={services}
          activeServiceId={activeServiceId}
          validationErrors={validationErrors}
          lang={meta.lang || 'en'}
          onStepClick={setStep}
          onServiceClick={setActiveService}
          onAddService={handleAddService}
        />
      </Paper>

      {/* Main content */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ p: 3, flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Step {currentStep + 1} of {STEP_COMPONENTS.length}
          </Typography>

          <ValidationBanner
            errors={validationErrors}
            services={services}
            lang={meta.lang || 'en'}
          />

          <StepComponent />
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
            disabled={currentStep === 0}
            variant="outlined"
          >
            Back
          </Button>
          {currentStep < STEP_COMPONENTS.length - 1 ? (
            <Button
              endIcon={<ArrowForwardIcon />}
              onClick={handleNext}
              variant="contained"
            >
              Next: {STEP_LABELS[currentStep + 1]}
            </Button>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}
