import { useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CloseIcon from '@mui/icons-material/Close';
import { WizardShell } from './components/WizardShell';
import { IngestDropzone } from './components/IngestDropzone';
import { useStore } from './store';

export default function App() {
  const [ingestOpen, setIngestOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const resetAll = useStore((s) => s.resetAll);
  const services = useStore((s) => s.services);
  const addService = useStore((s) => s.addService);
  const setActiveService = useStore((s) => s.setActiveService);

  const handleReset = () => {
    if (window.confirm('Reset all data and start over?')) {
      resetAll();
    }
  };

  const handleStart = () => {
    if (services.length === 0) {
      const id = addService();
      setActiveService(id);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static" elevation={1}>
        <Toolbar variant="dense">
          <Typography variant="h6" sx={{ flex: 1, fontWeight: 700, letterSpacing: '-0.5px' }}>
            SI File Generator
          </Typography>
          <Button
            color="inherit"
            startIcon={<UploadFileIcon />}
            onClick={() => setIngestOpen(true)}
            size="small"
            sx={{ mr: 1 }}
          >
            Import SI.xml
          </Button>
          <Tooltip title="Help">
            <IconButton color="inherit" size="small" onClick={() => setHelpOpen(true)}>
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
            <Button
              variant="outlined"
              size="large"
              startIcon={<UploadFileIcon />}
              onClick={() => setIngestOpen(true)}
            >
              Import SI.xml
            </Button>
          </Box>
          <Box sx={{ mt: 2, maxWidth: 480, width: '100%' }}>
            <IngestDropzone onIngested={() => setIngestOpen(false)} />
          </Box>
        </Box>
      ) : (
        <WizardShell />
      )}

      <Dialog open={ingestOpen} onClose={() => setIngestOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Import SI.xml
          <IconButton size="small" onClick={() => setIngestOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <IngestDropzone onIngested={() => setIngestOpen(false)} />
        </DialogContent>
      </Dialog>

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
  );
}
