import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import CodeIcon from '@mui/icons-material/Code';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import DnsIcon from '@mui/icons-material/Dns';
import { useStore } from '../store';
import { generateXml } from '../lib/xmlGenerate';
import { generateDockerPackage, generateFolderExport } from '../lib/dockerExport';
import { generateZonefile } from '../lib/zonefileGenerate';
import { downloadBlob } from '../lib/download';
import { XmlPreviewDialog } from '../components/XmlPreviewDialog';
import { ValidationReportDialog } from '../components/ValidationReportDialog';

export function StepReview() {
  const meta = useStore((s) => s.meta);
  const services = useStore((s) => s.services);
  const validationErrors = useStore((s) => s.validationErrors);
  const [previewOpen, setPreviewOpen] = useState(false);

  const xml = generateXml(meta, services);
  const [dockerOpen, setDockerOpen] = useState(false);
  const [baseUrl, setBaseUrl] = useState('http://localhost:8080');
  const [dockerBusy, setDockerBusy] = useState(false);
  const [validateOpen, setValidateOpen] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const [folderUrl, setFolderUrl] = useState('https://example.com/radio');
  const [folderBusy, setFolderBusy] = useState(false);

  const handleFolderExport = async () => {
    setFolderBusy(true);
    try {
      downloadBlob(await generateFolderExport(meta, services, folderUrl), 'si-export.zip');
      setFolderOpen(false);
    } finally {
      setFolderBusy(false);
    }
  };

  const handleZonefileDownload = () => {
    downloadBlob(
      new Blob([generateZonefile(meta, services)], { type: 'text/plain;charset=utf-8' }),
      'radiodns.zone'
    );
  };

  const hasDataUrlLogos = services.some((svc) =>
    svc.multimedia.some((mm) => mm.url.startsWith('data:'))
  );

  const handleDownload = () => {
    downloadBlob(new Blob([xml], { type: 'application/xml;charset=utf-8' }), 'SI.xml');
  };

  const handleDockerExport = async () => {
    setDockerBusy(true);
    try {
      downloadBlob(await generateDockerPackage(meta, services, baseUrl), 'si-docker-package.zip');
      setDockerOpen(false);
    } finally {
      setDockerBusy(false);
    }
  };

  const lang = meta.lang || 'en';

  const getNames = (svc: (typeof services)[0]) => ({
    short: svc.shortNames.find((n) => n.lang === lang)?.value || svc.shortNames[0]?.value || '—',
    medium: svc.mediumNames.find((n) => n.lang === lang)?.value || svc.mediumNames[0]?.value || '—',
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6">Review & Export</Typography>

      {validationErrors.length === 0 ? (
        <Alert severity="success" icon={<CheckCircleIcon />}>
          All validation checks passed. Your SI.xml is ready to download.
        </Alert>
      ) : (
        <Alert severity="warning">
          {validationErrors.length} validation {validationErrors.length === 1 ? 'issue' : 'issues'} found. You can still download, but the file may not be fully conformant.
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
          disabled={services.length === 0}
        >
          Download SI.xml
        </Button>
        <Button
          variant="outlined"
          startIcon={<CodeIcon />}
          onClick={() => setPreviewOpen(true)}
          disabled={services.length === 0}
        >
          Preview XML
        </Button>
        <Button
          variant="outlined"
          color="info"
          startIcon={<FactCheckIcon />}
          onClick={() => setValidateOpen(true)}
          disabled={services.length === 0}
        >
          Validate
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<FolderZipIcon />}
          onClick={() => setFolderOpen(true)}
          disabled={services.length === 0}
        >
          Export Folder
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<DownloadIcon />}
          onClick={() => setDockerOpen(true)}
          disabled={services.length === 0}
        >
          Export Docker Package
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<DnsIcon />}
          onClick={handleZonefileDownload}
          disabled={services.length === 0}
        >
          Export Zone File
        </Button>
      </Box>

      {hasDataUrlLogos && (
        <Alert severity="info">
          This service has logos stored as embedded data. Use <strong>Export Docker Package</strong> to
          bundle them into a self-contained server — the exported SI.xml will have proper URLs pointing
          to the container.
        </Alert>
      )}

      <Divider />

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>Document</Typography>
          <List dense disablePadding>
            <ListItem disablePadding>
              <ListItemText primary="Service Provider" secondary={meta.serviceProvider || '(not set)'} />
            </ListItem>
            <ListItem disablePadding>
              <ListItemText primary="Language" secondary={meta.lang} />
            </ListItem>
            <ListItem disablePadding>
              <ListItemText primary="Creation Time" secondary={meta.creationTime} />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {services.map((svc) => {
        const names = getNames(svc);
        const svcErrors = validationErrors.filter((e) => e.serviceId === svc.id);
        return (
          <Card key={svc.id} variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="subtitle1">{names.short}</Typography>
                <Typography variant="body2" color="text.secondary">— {names.medium}</Typography>
                {svcErrors.length > 0 && (
                  <Chip label={`${svcErrors.length} errors`} size="small" color="error" />
                )}
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                {svc.bearers.map((b) => (
                  <Chip key={b.id} label={`${b.type}: ${b.uri}`} size="small" variant="outlined" />
                ))}
                {svc.radiodns && (
                  <Chip label={`RadioDNS: ${svc.radiodns.fqdn}/${svc.radiodns.serviceIdentifier}`} size="small" variant="outlined" color="info" />
                )}
              </Box>

              {svc.genres.length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                  {svc.genres.map((g) => (
                    <Chip key={g.href} label={`${g.type}: ${g.href.split(':').pop()}`} size="small" />
                  ))}
                </Box>
              )}

              {svc.multimedia.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {svc.multimedia.length} logo{svc.multimedia.length !== 1 ? 's' : ''}
                </Typography>
              )}

              {svcErrors.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  {svcErrors.map((e, i) => (
                    <Typography key={i} variant="caption" color="error" display="block">
                      {e.message}
                    </Typography>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={dockerOpen} onClose={() => setDockerOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Export Docker Package</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Typography variant="body2">
            The package contains your logos, a generated <code>SI.xml</code> with proper URLs,
            a <code>Dockerfile</code>, and an <code>nginx.conf</code>. Build and run with:
          </Typography>
          <Box component="pre" sx={{ bgcolor: 'grey.100', p: 1.5, borderRadius: 1, fontSize: '0.8rem', overflow: 'auto' }}>
            {`docker build -t si-logo-server .\ndocker run -p 8080:80 si-logo-server`}
          </Box>
          <TextField
            label="Server base URL"
            helperText="The URL where the container will be reachable. Used to construct logo URLs in SI.xml."
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            size="small"
            fullWidth
            placeholder="http://localhost:8080"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDockerOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDockerExport}
            disabled={dockerBusy || !baseUrl.trim()}
          >
            {dockerBusy ? 'Generating…' : 'Download ZIP'}
          </Button>
        </DialogActions>
      </Dialog>

      {services.length === 0 && (
        <Alert severity="info">Add at least one service to generate an SI.xml file.</Alert>
      )}

      <XmlPreviewDialog
        open={previewOpen}
        xml={xml}
        onClose={() => setPreviewOpen(false)}
      />

      <ValidationReportDialog
        open={validateOpen}
        xml={xml}
        meta={meta}
        services={services}
        onClose={() => setValidateOpen(false)}
      />

      {/* Export Folder dialog */}
      <Dialog open={folderOpen} onClose={() => setFolderOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Export Folder</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Typography variant="body2">
            Generates a ZIP with <code>SI.xml</code> and a <code>logos/</code> folder ready to
            upload directly to your web server. Logo URLs in SI.xml will point to the base URL
            you set below.
          </Typography>
          <TextField
            label="Server base URL"
            helperText="The URL where the files will be served from (e.g. https://example.com/radio)."
            value={folderUrl}
            onChange={(e) => setFolderUrl(e.target.value)}
            size="small"
            fullWidth
            placeholder="https://example.com/radio"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFolderOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<FolderZipIcon />}
            onClick={handleFolderExport}
            disabled={folderBusy || !folderUrl.trim()}
          >
            {folderBusy ? 'Generating…' : 'Download ZIP'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
