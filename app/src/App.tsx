import { useState, useMemo } from 'react';
import {
  AppBar,
  Box,
  Button,
  Chip,
  CssBaseline,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  ThemeProvider,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CloseIcon from '@mui/icons-material/Close';
import LinkIcon from '@mui/icons-material/Link';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { WizardShell } from './components/WizardShell';
import { IngestDropzone } from './components/IngestDropzone';
import { RadioDnsRetrieve } from './components/RadioDnsRetrieve';
import { XmlPreviewDialog } from './components/XmlPreviewDialog';
import { useStore } from './store';
import { createAppTheme } from './theme';

export default function App() {
  const [helpOpen, setHelpOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(
    () => localStorage.getItem('darkMode') === 'true'
  );

  const theme = useMemo(() => createAppTheme(darkMode ? 'dark' : 'light'), [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      localStorage.setItem('darkMode', String(!prev));
      return !prev;
    });
  };
  const resetAll = useStore((s) => s.resetAll);
  const services = useStore((s) => s.services);
  const addService = useStore((s) => s.addService);
  const setNav = useStore((s) => s.setNav);
  const sourceUrl = useStore((s) => s.sourceUrl);
  const sourceXml = useStore((s) => s.sourceXml);

  const handleReset = () => {
    if (window.confirm('Reset all data and start over?')) {
      resetAll();
    }
  };

  const handleStart = () => {
    if (services.length === 0) {
      const id = addService();
      setNav({ view: 'service', serviceId: id, step: 0 });
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static" elevation={1} sx={{ bgcolor: 'primary.dark' }}>
        <Toolbar variant="dense">
          <Typography variant="h6" sx={{ flex: 1, fontWeight: 700, letterSpacing: '-0.5px' }}>
            SI File Generator
          </Typography>
          {(sourceUrl || sourceXml) && services.length > 0 && (
            <Chip
              icon={<LinkIcon />}
              label={sourceUrl ? new URL(sourceUrl).hostname : 'Imported SI.xml'}
              size="small"
              onClick={sourceXml ? () => setSourceOpen(true) : undefined}
              sx={{
                mr: 1,
                color: 'inherit',
                borderColor: 'rgba(255,255,255,0.5)',
                '& .MuiChip-icon': { color: 'inherit' },
                ...(!sourceXml && { cursor: 'default' }),
              }}
              variant="outlined"
              title={sourceUrl || undefined}
            />
          )}
          <Tooltip title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
            <IconButton color="inherit" size="small" onClick={toggleDarkMode} sx={{ ml: 0.5 }}>
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Help">
            <IconButton color="inherit" size="small" onClick={() => setHelpOpen(true)} sx={{ ml: 0.5 }}>
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset all data">
            <IconButton color="inherit" size="small" onClick={handleReset} sx={{ ml: 0.5 }}>
              <RestartAltIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {services.length === 0 ? (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            p: 4,
            bgcolor: 'background.default',
          }}
        >
          <Typography variant="h4" fontWeight={700} color="primary">
            SI File Generator
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center" maxWidth={480}>
            Create a conformant ETSI TS 102 818 SI.xml file for DAB/DAB+ radio services.
            Start fresh or import an existing file.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="contained" size="large" onClick={handleStart}>
              Start new file
            </Button>
          </Box>
          <Box sx={{ maxWidth: 480, width: '100%' }}>
            <RadioDnsRetrieve onIngested={() => {}} />
          </Box>
          <Box sx={{ mt: 1, maxWidth: 480, width: '100%' }}>
            <IngestDropzone onIngested={() => {}} />
          </Box>
        </Box>
      ) : (
        <WizardShell />
      )}

      {sourceXml && (
        <XmlPreviewDialog
          open={sourceOpen}
          xml={sourceXml}
          title={sourceUrl ? `Source SI.xml — ${sourceUrl}` : 'Source SI.xml'}
          onClose={() => setSourceOpen(false)}
        />
      )}

      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Help
          <IconButton size="small" onClick={() => setHelpOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            This tool guides you through creating a conformant <strong>SI.xml</strong> file per{' '}
            <strong>ETSI TS 102 818 v3.5.1</strong> for DAB/DAB+ digital radio services.
          </Typography>
          <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
            <li>Set document-level metadata (provider, language, date)</li>
            <li>Add one or more services with names, descriptions, and bearers</li>
            <li>Optionally add logos, genre tags, keywords, and links</li>
            <li>Review and download the generated SI.xml</li>
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Progress is saved automatically in your browser. Use "Import SI.xml" to edit an existing file.
          </Typography>
        </DialogContent>
      </Dialog>
    </Box>
    </ThemeProvider>
  );
}
