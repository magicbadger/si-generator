import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import { buildFmLookup, buildDabLookup, resolveAuthFqdn, discoverSiUrl, fetchSiXml } from '../lib/radiodnsLookup';
import { ingestXml } from '../lib/xmlIngest';
import { useStore } from '../store';

type Mode = 'fm' | 'dab' | 'radiodns';

interface Props {
  onIngested?: () => void;
}

export function RadioDnsRetrieve({ onIngested }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<Mode>('dab');

  // FM fields
  const [fmGcc, setFmGcc] = useState('');
  const [fmPi, setFmPi] = useState('');
  const [fmFreq, setFmFreq] = useState('');

  // DAB fields
  const [dabGcc, setDabGcc] = useState('');
  const [dabEid, setDabEid] = useState('');
  const [dabSid, setDabSid] = useState('');
  const [dabScids, setDabScids] = useState('0');

  // RadioDNS direct field
  const [directFqdn, setDirectFqdn] = useState('');

  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const { resetAll, setMeta, addService, updateService, setActiveService, setNav } = useStore();

  const loadXml = (xml: string) => {
    const result = ingestXml(xml);
    if (result.error) throw new Error(result.error);
    resetAll();
    setMeta(result.meta);
    let firstId: string | null = null;
    for (const svc of result.services) {
      const id = addService();
      if (!firstId) firstId = id;
      updateService(id, svc);
    }
    if (firstId) setActiveService(firstId);
    setNav(firstId ? { view: 'service', serviceId: firstId, step: 0 } : { view: 'document' });
  };

  const handleRetrieve = async () => {
    setError('');
    setStatus('');
    setBusy(true);
    try {
      let xml: string;

      if (mode === 'radiodns') {
        // Direct FQDN — skip CNAME, go straight to SRV
        setStatus('Discovering SPI application…');
        const siUrl = await discoverSiUrl(directFqdn.trim());
        setStatus(`Fetching SI.xml from ${siUrl}…`);
        xml = await fetchSiXml(siUrl, setStatus);
      } else {
        // Build RadioDNS lookup name from broadcast parameters
        const lookupName = mode === 'fm'
          ? buildFmLookup(fmGcc, fmPi, fmFreq)
          : buildDabLookup(dabGcc, dabEid, dabSid, dabScids);
        setStatus(`Resolving ${lookupName}…`);
        const authFqdn = await resolveAuthFqdn(lookupName);
        setStatus(`Found ${authFqdn}. Discovering SPI application…`);
        const siUrl = await discoverSiUrl(authFqdn);
        setStatus(`Fetching SI.xml from ${siUrl}…`);
        xml = await fetchSiXml(siUrl, setStatus);
      }

      setStatus('Importing…');
      loadXml(xml);
      onIngested?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('');
    } finally {
      setBusy(false);
    }
  };

  const canRetrieve = !busy && (
    mode === 'fm' ? (fmGcc.length === 3 && fmPi.length === 4 && fmFreq.length === 5) :
    mode === 'dab' ? (dabGcc.length === 3 && dabEid.length === 4 && dabSid.length >= 4) :
    directFqdn.trim().length > 0
  );

  return (
    <Box sx={{ width: '100%', maxWidth: 480 }}>
      {!expanded ? (
        <Button
          variant="outlined"
          size="large"
          startIcon={<TravelExploreIcon />}
          onClick={() => setExpanded(true)}
          fullWidth
        >
          Retrieve from broadcast
        </Button>
      ) : (
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle2">Retrieve from broadcast via RadioDNS</Typography>
            <Button size="small" onClick={() => setExpanded(false)} sx={{ minWidth: 0 }}>
              ✕
            </Button>
          </Box>

          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, v) => v && setMode(v)}
            size="small"
            fullWidth
          >
            <ToggleButton value="dab">DAB</ToggleButton>
            <ToggleButton value="fm">FM</ToggleButton>
            <ToggleButton value="radiodns">RadioDNS</ToggleButton>
          </ToggleButtonGroup>

          <Collapse in={mode === 'fm'} unmountOnExit>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <TextField label="GCC" placeholder="ce1" value={fmGcc} size="small" sx={{ width: 80 }}
                inputProps={{ maxLength: 3 }}
                onChange={(e) => setFmGcc(e.target.value.replace(/[^0-9a-fA-F]/g, '').toLowerCase())}
                helperText="3 hex" />
              <TextField label="PI" placeholder="c586" value={fmPi} size="small" sx={{ width: 90 }}
                inputProps={{ maxLength: 4 }}
                onChange={(e) => setFmPi(e.target.value.replace(/[^0-9a-fA-F]/g, '').toLowerCase())}
                helperText="4 hex" />
              <TextField label="Frequency" placeholder="09580" value={fmFreq} size="small" sx={{ width: 110 }}
                inputProps={{ maxLength: 5 }}
                onChange={(e) => setFmFreq(e.target.value.replace(/[^0-9]/g, ''))}
                helperText="5 digits, 10 kHz" />
            </Box>
          </Collapse>

          <Collapse in={mode === 'dab'} unmountOnExit>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <TextField label="GCC" placeholder="ce1" value={dabGcc} size="small" sx={{ width: 80 }}
                inputProps={{ maxLength: 3 }}
                onChange={(e) => setDabGcc(e.target.value.replace(/[^0-9a-fA-F]/g, '').toLowerCase())}
                helperText="3 hex" />
              <TextField label="EId" placeholder="1066" value={dabEid} size="small" sx={{ width: 90 }}
                inputProps={{ maxLength: 4 }}
                onChange={(e) => setDabEid(e.target.value.replace(/[^0-9a-fA-F]/g, '').toLowerCase())}
                helperText="4 hex" />
              <TextField label="SId" placeholder="c1f8" value={dabSid} size="small" sx={{ width: 100 }}
                inputProps={{ maxLength: 8 }}
                onChange={(e) => setDabSid(e.target.value.replace(/[^0-9a-fA-F]/g, '').toLowerCase())}
                helperText="4–8 hex" />
              <TextField label="SCIdS" placeholder="0" value={dabScids} size="small" sx={{ width: 75 }}
                inputProps={{ maxLength: 1 }}
                onChange={(e) => setDabScids(e.target.value.replace(/[^0-9a-fA-F]/g, '').toLowerCase())}
                helperText="1 hex" />
            </Box>
          </Collapse>

          <Collapse in={mode === 'radiodns'} unmountOnExit>
            <TextField
              label="Authoritative FQDN"
              placeholder="bbc.co.uk"
              value={directFqdn}
              size="small"
              fullWidth
              onChange={(e) => setDirectFqdn(e.target.value)}
              helperText="Skip CNAME lookup — enter FQDN directly"
            />
          </Collapse>

          <Button
            variant="contained"
            onClick={handleRetrieve}
            disabled={!canRetrieve}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <TravelExploreIcon />}
          >
            {busy ? 'Retrieving…' : 'Retrieve'}
          </Button>

          {status && !error && (
            <Typography variant="caption" color="text.secondary">{status}</Typography>
          )}
          {error && (
            <Alert severity="error" onClose={() => setError('')} sx={{ whiteSpace: 'pre-line' }}>
              {error}
            </Alert>
          )}
        </Box>
      )}
    </Box>
  );
}
