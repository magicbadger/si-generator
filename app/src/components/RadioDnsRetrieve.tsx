import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import { buildFmLookup, buildDabLookup, resolveAuthFqdn, discoverSiUrl, fetchSiXml } from '../lib/radiodnsLookup';
import { ingestXml } from '../lib/xmlIngest';
import { useStore } from '../store';
import { ECC_BY_COUNTRY } from '../constants/ecc';

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

  // GCC helpers
  const [dabHelperOpen, setDabHelperOpen] = useState(false);
  const [dabHelperCountry, setDabHelperCountry] = useState('');
  const [fmHelperOpen, setFmHelperOpen] = useState(false);
  const [fmHelperCountry, setFmHelperCountry] = useState('');

  const dabHelperEcc = ECC_BY_COUNTRY.find((e) => e.country === dabHelperCountry)?.ecc ?? '';
  const dabCountryNibble = dabEid.length >= 1 ? dabEid[0] : '?';
  const dabComputedGcc = dabHelperEcc ? dabCountryNibble + dabHelperEcc : '';
  const dabGccMismatch = dabGcc.length === 3 && dabEid.length >= 1 && dabGcc[0] !== dabEid[0];

  const fmHelperEcc = ECC_BY_COUNTRY.find((e) => e.country === fmHelperCountry)?.ecc ?? '';
  const fmCountryNibble = fmPi.length >= 1 ? fmPi[0] : '';
  const fmComputedGcc = fmHelperEcc && fmCountryNibble ? fmCountryNibble + fmHelperEcc : '';
  const fmGccMismatch = fmGcc.length === 3 && fmPi.length >= 1 && fmGcc[0] !== fmPi[0];

  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const { resetAll, setMeta, addService, updateService, setActiveService, setNav, setSource } = useStore();

  const loadXml = (xml: string) => {
    const result = ingestXml(xml);
    if (result.error) throw new Error(result.error);
    resetAll();
    setMeta(result.meta);
    let firstId: string | null = null;
    for (const svc of result.services) {
      const id = addService();
      if (!firstId) firstId = id;
      const { id: _id, ...svcData } = svc;
      updateService(id, svcData);
    }
    if (firstId) setActiveService(firstId);
    setNav({ view: 'document' });
  };

  const handleRetrieve = async () => {
    setError('');
    setStatus('');
    setBusy(true);
    try {
      let xml: string;
      let siUrl: string;

      if (mode === 'radiodns') {
        // Direct FQDN — skip CNAME, go straight to SRV
        setStatus('Discovering SPI application…');
        siUrl = await discoverSiUrl(directFqdn.trim());
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
        siUrl = await discoverSiUrl(authFqdn);
        setStatus(`Fetching SI.xml from ${siUrl}…`);
        xml = await fetchSiXml(siUrl, setStatus);
      }

      setStatus('Importing…');
      loadXml(xml);
      setSource(siUrl, xml);
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
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <TextField label="GCC" placeholder="ce1" value={fmGcc} size="small" sx={{ width: 80 }}
                    inputProps={{ maxLength: 3 }}
                    onChange={(e) => setFmGcc(e.target.value.replace(/[^0-9a-fA-F]/g, '').toLowerCase())}
                    helperText="3 hex" />
                  <Button size="small" variant="text"
                    sx={{ fontSize: '0.7rem', p: 0, minWidth: 0, textTransform: 'none', alignSelf: 'flex-start' }}
                    onClick={() => setFmHelperOpen((o) => !o)}>
                    {fmHelperOpen ? 'Hide helper' : 'Help me find GCC'}
                  </Button>
                </Box>
                <TextField label="PI" placeholder="c586" value={fmPi} size="small" sx={{ width: 90 }}
                  inputProps={{ maxLength: 4 }}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9a-fA-F]/g, '').toLowerCase();
                    setFmPi(v);
                    if (v.length >= 1 && fmGcc.length === 3 && fmGcc[2] === '?') {
                      setFmGcc(fmGcc.slice(0, 2) + v[0]);
                    }
                  }}
                  helperText="4 hex" />
                <TextField label="Frequency" placeholder="09580" value={fmFreq} size="small" sx={{ width: 110 }}
                  inputProps={{ maxLength: 5 }}
                  onChange={(e) => setFmFreq(e.target.value.replace(/[^0-9]/g, ''))}
                  helperText="5 digits, 10 kHz" />
              </Box>
              {fmGccMismatch && (
                <Typography variant="caption" color="warning.main">
                  GCC first digit (<strong>{fmGcc[0]}</strong>) does not match the first digit of PI (<strong>{fmPi[0]}</strong>). GCC should be PI[0] + ECC.
                </Typography>
              )}
              <Collapse in={fmHelperOpen}>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5,
                  display: 'flex', flexDirection: 'column', gap: 1, bgcolor: 'action.hover' }}>
                  <Typography variant="caption" color="text.secondary">
                    GCC = first hex digit of RDS PI + ECC (2 hex, from country).
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                      <InputLabel>Country</InputLabel>
                      <Select value={fmHelperCountry} label="Country"
                        onChange={(e) => setFmHelperCountry(e.target.value)}>
                        {ECC_BY_COUNTRY.map((entry) => (
                          <MenuItem key={entry.country} value={entry.country}>{entry.country}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {fmHelperEcc && (
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        ECC = <strong>{fmHelperEcc}</strong>
                        {fmCountryNibble ? (
                          <> &rarr; GCC = PI[0]=<em>{fmCountryNibble}</em> + ECC &rarr; <strong>{fmComputedGcc}</strong></>
                        ) : (
                          <> &mdash; enter PI above</>
                        )}
                      </Typography>
                    )}
                    <Button size="small" variant="contained" disabled={!fmComputedGcc}
                      onClick={() => {
                        if (!fmComputedGcc) return;
                        setFmGcc(fmComputedGcc);
                        setFmHelperOpen(false);
                      }}>
                      Use GCC {fmComputedGcc || '…'}
                    </Button>
                  </Box>
                </Box>
              </Collapse>
            </Box>
          </Collapse>

          <Collapse in={mode === 'dab'} unmountOnExit>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <TextField label="GCC" placeholder="ce1" value={dabGcc} size="small" sx={{ width: 80 }}
                    inputProps={{ maxLength: 3 }}
                    onChange={(e) => setDabGcc(e.target.value.replace(/[^0-9a-fA-F]/g, '').toLowerCase())}
                    helperText="3 hex" />
                  <Button size="small" variant="text"
                    sx={{ fontSize: '0.7rem', p: 0, minWidth: 0, textTransform: 'none', alignSelf: 'flex-start' }}
                    onClick={() => setDabHelperOpen((o) => !o)}>
                    {dabHelperOpen ? 'Hide helper' : 'Help me find GCC'}
                  </Button>
                </Box>
                <TextField label="EId" placeholder="1066" value={dabEid} size="small" sx={{ width: 90 }}
                  inputProps={{ maxLength: 4 }}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9a-fA-F]/g, '').toLowerCase();
                    setDabEid(v);
                    if (v.length >= 1 && dabGcc.length === 3 && dabGcc[0] === '?') {
                      setDabGcc(v[0] + dabGcc.slice(1, 3));
                    }
                  }}
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
              {dabGccMismatch && (
                <Typography variant="caption" color="warning.main">
                  GCC first digit (<strong>{dabGcc[0]}</strong>) does not match the first digit of EId (<strong>{dabEid[0]}</strong>). GCC should be EId[0] + ECC.
                </Typography>
              )}
              <Collapse in={dabHelperOpen}>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5,
                  display: 'flex', flexDirection: 'column', gap: 1, bgcolor: 'action.hover' }}>
                  <Typography variant="caption" color="text.secondary">
                    GCC = first hex digit of EId + ECC (2 hex, from country).
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                      <InputLabel>Country</InputLabel>
                      <Select value={dabHelperCountry} label="Country"
                        onChange={(e) => setDabHelperCountry(e.target.value)}>
                        {ECC_BY_COUNTRY.map((entry) => (
                          <MenuItem key={entry.country} value={entry.country}>{entry.country}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {dabHelperEcc && (
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        ECC = <strong>{dabHelperEcc}</strong>
                        {dabEid.length >= 1 && (
                          <> &rarr; GCC = EId[0]=<em>{dabCountryNibble}</em> + ECC &rarr; <strong>{dabComputedGcc}</strong></>
                        )}
                      </Typography>
                    )}
                    <Button size="small" variant="contained" disabled={!dabHelperEcc}
                      onClick={() => {
                        if (!dabHelperEcc) return;
                        const gcc = dabCountryNibble + dabHelperEcc;
                        setDabGcc(gcc);
                        setDabHelperOpen(false);
                      }}>
                      Use ECC {dabHelperEcc || '…'}
                    </Button>
                  </Box>
                </Box>
              </Collapse>
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
