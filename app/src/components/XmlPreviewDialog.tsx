import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface Props {
  open: boolean;
  xml: string;
  onClose: () => void;
}

export function XmlPreviewDialog({ open, xml, onClose }: Props) {
  const handleCopy = () => {
    navigator.clipboard.writeText(xml);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        XML Preview
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton size="small" onClick={handleCopy} title="Copy to clipboard">
            <ContentCopyIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <Box
          component="pre"
          sx={{
            m: 0,
            p: 2,
            overflowX: 'auto',
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            bgcolor: '#1e1e1e',
            color: '#d4d4d4',
            lineHeight: 1.5,
            minHeight: 300,
            maxHeight: '70vh',
          }}
        >
          {xml}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
