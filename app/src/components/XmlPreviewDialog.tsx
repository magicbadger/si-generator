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

const C = {
  punct:   '#808080',
  tag:     '#4ec9b0',
  attr:    '#9cdcfe',
  value:   '#ce9178',
  comment: '#6a9955',
  text:    '#d4d4d4',
  pi:      '#c8c8c8',
};

function highlightXml(xml: string): React.ReactNode {
  let key = 0;
  const s = (color: string, t: string) => <span key={key++} style={{ color }}>{t}</span>;

  function parseAttrs(attrs: string): React.ReactNode[] {
    const nodes: React.ReactNode[] = [];
    const re = /(\s+)([\w:.-]+)(=)("([^"]*)"|'([^']*)')|(\s+)([\w:.-]+)|(\s+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(attrs)) !== null) {
      if (m[1] !== undefined) {
        nodes.push(s(C.text, m[1]), s(C.attr, m[2]), s(C.punct, m[3]), s(C.value, m[4]));
      } else if (m[7] !== undefined) {
        nodes.push(s(C.text, m[7]), s(C.attr, m[8]));
      } else if (m[9] !== undefined) {
        nodes.push(s(C.text, m[9]));
      }
    }
    return nodes;
  }

  const nodes: React.ReactNode[] = [];
  // Outer tokenizer: comment | PI | close-tag | open/self-close tag | text
  const re = /(<!--[\s\S]*?-->)|(<\?[\s\S]*?\?>)|(<\/)([\w:.-]+)(\s*>)|(<)([\w:.-]+)((?:\s+[\w:.-]+=(?:"[^"]*"|'[^']*')|\s+[\w:.-]+)*\s*)(\/?>)|([^<]+)/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(xml)) !== null) {
    const [, comment, pi, closeLt, closeName, closeGt, openLt, openName, openAttrs, openGt, text] = m;
    if (comment) {
      nodes.push(s(C.comment, comment));
    } else if (pi) {
      nodes.push(s(C.pi, pi));
    } else if (closeLt) {
      nodes.push(s(C.punct, closeLt), s(C.tag, closeName), s(C.punct, closeGt));
    } else if (openLt) {
      nodes.push(s(C.punct, openLt), s(C.tag, openName));
      if (openAttrs) nodes.push(...parseAttrs(openAttrs));
      nodes.push(s(C.punct, openGt));
    } else if (text) {
      nodes.push(s(C.text, text));
    }
  }

  return <>{nodes}</>;
}

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
          {highlightXml(xml)}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
