import { useCallback, useState } from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { ingestXml } from '../lib/xmlIngest';
import { useStore } from '../store';

interface Props {
  onIngested?: () => void;
}

export function IngestDropzone({ onIngested }: Props) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setMeta, addService, updateService } = useStore();
  const resetAll = useStore((s) => s.resetAll);
  const setStep = useStore((s) => s.setStep);
  const setActiveService = useStore((s) => s.setActiveService);

  const processFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith('.xml') && file.type !== 'text/xml' && file.type !== 'application/xml') {
        setError('Please upload an XML file.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const result = ingestXml(text);
        if (result.error) {
          setError(result.error);
          return;
        }
        resetAll();
        setMeta(result.meta);
        let firstId: string | null = null;
        for (const svc of result.services) {
          const id = addService();
          if (!firstId) firstId = id;
          updateService(id, svc);
        }
        if (firstId) setActiveService(firstId);
        setStep(0);
        setError(null);
        onIngested?.();
      };
      reader.readAsText(file);
    },
    [resetAll, setMeta, addService, updateService, setActiveService, setStep, onIngested]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  return (
    <Box>
      <Box
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        sx={{
          border: '2px dashed',
          borderColor: dragging ? 'primary.main' : 'grey.400',
          borderRadius: 2,
          p: 3,
          textAlign: 'center',
          bgcolor: dragging ? 'primary.50' : 'grey.50',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <UploadFileIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
        <Typography variant="body1" gutterBottom>
          Drag & drop an SI.xml file here
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          or
        </Typography>
        <Button variant="outlined" component="label" size="small">
          Browse file
          <input type="file" hidden accept=".xml,text/xml,application/xml" onChange={handleFileInput} />
        </Button>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </Box>
  );
}
