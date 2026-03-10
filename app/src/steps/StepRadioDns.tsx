import {
  Alert,
  Box,
  Button,
  TextField,
  Typography,
} from '@mui/material';
import { useStore } from '../store';
import type { RadioDNS } from '../store/types';

export function StepRadioDns() {
  const services = useStore((s) => s.services);
  const activeServiceId = useStore((s) => s.activeServiceId);
  const updateService = useStore((s) => s.updateService);
  const validate = useStore((s) => s.validate);

  const svc = services.find((s) => s.id === activeServiceId);
  if (!svc) return <Alert severity="info">Add a service first using the sidebar.</Alert>;

  const updateRadioDns = (changes: Partial<RadioDNS>) => {
    updateService(svc.id, {
      radiodns: { ...(svc.radiodns ?? { fqdn: '', serviceIdentifier: '' }), ...changes },
    });
    validate();
  };

  const removeRadioDns = () => {
    updateService(svc.id, { radiodns: undefined });
    validate();
  };

  const hasRadioDns = !!svc.radiodns;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6">RadioDNS Lookup Configuration (Optional)</Typography>
      <Typography variant="body2" color="text.secondary">
        A RadioDNS element enables hybrid service following — receivers can automatically
        switch between broadcast and IP delivery. It also counts as a bearer for validation
        purposes.
      </Typography>

      {!hasRadioDns ? (
        <Box>
          <Button variant="outlined" onClick={() => updateRadioDns({ fqdn: '', serviceIdentifier: '' })}>
            Add RadioDNS element
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              label="Authoritative FQDN"
              placeholder="bbc.co.uk"
              value={svc.radiodns?.fqdn ?? ''}
              size="small"
              sx={{ width: 280 }}
              onChange={(e) => updateRadioDns({ fqdn: e.target.value })}
            />
            <TextField
              label="Service Identifier (1–16 lowercase alphanumeric)"
              placeholder="radio2"
              value={svc.radiodns?.serviceIdentifier ?? ''}
              size="small"
              sx={{ width: 320 }}
              inputProps={{ maxLength: 16 }}
              onChange={(e) =>
                updateRadioDns({
                  serviceIdentifier: e.target.value.replace(/[^a-z0-9]/g, '').slice(0, 16),
                })
              }
            />
          </Box>
          {svc.radiodns?.fqdn && svc.radiodns?.serviceIdentifier && (
            <Typography variant="caption" color="text.secondary">
              Lookup FQDN:{' '}
              <code>
                {svc.radiodns.serviceIdentifier}.{svc.radiodns.fqdn}
              </code>
            </Typography>
          )}
          <Box>
            <Button variant="text" color="error" size="small" onClick={removeRadioDns}>
              Remove RadioDNS element
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
