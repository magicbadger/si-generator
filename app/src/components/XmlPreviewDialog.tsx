import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Box,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

// ─── HTML generation (no React nodes — avoids VDOM diffing overhead) ─────────

const C = {
  punct:   '#808080',
  tag:     '#4ec9b0',
  attr:    '#9cdcfe',
  value:   '#ce9178',
  comment: '#6a9955',
  text:    '#d4d4d4',
  pi:      '#c8c8c8',
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function span(color: string, t: string): string {
  return `<span style="color:${color}">${esc(t)}</span>`;
}

function parseAttrsHtml(attrs: string): string {
  let out = '';
  const re = /(\s+)([\w:.-]+)(=)("([^"]*)"|'([^']*)')|(\s+)([\w:.-]+)|(\s+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(attrs)) !== null) {
    if (m[1] !== undefined) {
      out += span(C.text, m[1]) + span(C.attr, m[2]) + span(C.punct, m[3]) + span(C.value, m[4]);
    } else if (m[7] !== undefined) {
      out += span(C.text, m[7]) + span(C.attr, m[8]);
    } else if (m[9] !== undefined) {
      out += span(C.text, m[9]);
    }
  }
  return out;
}

/** Syntax-highlight an XML string into an HTML string. */
function highlightXmlToHtml(xml: string): string {
  let out = '';
  const re = /(<!--[\s\S]*?-->)|(<\?[\s\S]*?\?>)|(<\/)([\w:.-]+)(\s*>)|(<)([\w:.-]+)((?:\s+[\w:.-]+=(?:"[^"]*"|'[^']*')|\s+[\w:.-]+)*\s*)(\/?>)|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const [, comment, pi, closeLt, closeName, closeGt, openLt, openName, openAttrs, openGt, text] = m;
    if (comment)      out += span(C.comment, comment);
    else if (pi)      out += span(C.pi, pi);
    else if (closeLt) out += span(C.punct, closeLt) + span(C.tag, closeName) + span(C.punct, closeGt);
    else if (openLt)  out += span(C.punct, openLt) + span(C.tag, openName) + (openAttrs ? parseAttrsHtml(openAttrs) : '') + span(C.punct, openGt);
    else if (text)    out += span(C.text, text);
  }
  return out;
}

function findMatches(xml: string, query: string): Array<[number, number]> {
  const matches: Array<[number, number]> = [];
  const lower = xml.toLowerCase();
  const lowerQ = query.toLowerCase();
  let pos = 0;
  while (pos < xml.length) {
    const idx = lower.indexOf(lowerQ, pos);
    if (idx === -1) break;
    matches.push([idx, idx + query.length]);
    pos = idx + query.length;
  }
  return matches;
}

/**
 * Produce syntax-highlighted HTML with search marks embedded.
 * Non-matching segments are syntax-highlighted; matching segments are
 * wrapped in <mark data-match="N"> without colours (marks sit on top).
 */
function buildHtml(xml: string, query: string): { html: string; matchCount: number } {
  if (!query) return { html: highlightXmlToHtml(xml), matchCount: 0 };

  const matches = findMatches(xml, query);
  if (matches.length === 0) return { html: highlightXmlToHtml(xml), matchCount: 0 };

  let html = '';
  let pos = 0;
  for (let i = 0; i < matches.length; i++) {
    const [ms, me] = matches[i];
    if (ms > pos) html += highlightXmlToHtml(xml.slice(pos, ms));
    html += `<mark data-match="${i}" style="background:rgba(255,213,0,0.35);color:#000;border-radius:2px">${esc(xml.slice(ms, me))}</mark>`;
    pos = me;
  }
  if (pos < xml.length) html += highlightXmlToHtml(xml.slice(pos));

  return { html, matchCount: matches.length };
}

// ─── Debounce hook ────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  xml: string;
  title?: string;
  onClose: () => void;
}

export function XmlPreviewDialog({ open, xml, title = 'XML Preview', onClose }: Props) {
  const [query, setQuery] = useState('');
  const [matchIdx, setMatchIdx] = useState(0);
  const containerRef = useRef<HTMLPreElement>(null);

  const debouncedQuery = useDebounce(query, 150);

  // Memoize the expensive HTML generation — only recomputes when xml or query changes
  const { html, matchCount } = useMemo(
    () => buildHtml(xml, debouncedQuery),
    [xml, debouncedQuery],
  );

  // Reset match index when query or xml changes
  useEffect(() => { setMatchIdx(0); }, [debouncedQuery, xml]);

  // Reset search when dialog closes
  useEffect(() => { if (!open) setQuery(''); }, [open]);

  // Update active mark styling and scroll into view via DOM — no re-render needed
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.querySelectorAll<HTMLElement>('mark[data-match]').forEach((el) => {
      el.style.background = 'rgba(255,213,0,0.35)';
      el.style.color = '#000';
    });
    const active = container.querySelector<HTMLElement>(`mark[data-match="${matchIdx}"]`);
    if (active) {
      active.style.background = '#ffd700';
      active.scrollIntoView({ block: 'nearest' });
    }
  }, [matchIdx, html]); // html dep ensures marks exist before we query them

  const prev = useCallback(() => setMatchIdx((i) => (i - 1 + matchCount) % matchCount), [matchCount]);
  const next = useCallback(() => setMatchIdx((i) => (i + 1) % matchCount), [matchCount]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && matchCount > 0) { e.shiftKey ? prev() : next(); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {title}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton size="small" onClick={() => navigator.clipboard.writeText(xml)} title="Copy to clipboard">
            <ContentCopyIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <Box sx={{ px: 2, pt: 1, pb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <TextField
          size="small"
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          sx={{ flex: 1 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        {query && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              {matchCount === 0 ? 'No matches' : `${matchIdx + 1} / ${matchCount}`}
            </Typography>
            <IconButton size="small" onClick={prev} disabled={matchCount === 0}>
              <KeyboardArrowUpIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={next} disabled={matchCount === 0}>
              <KeyboardArrowDownIcon fontSize="small" />
            </IconButton>
          </>
        )}
      </Box>

      <DialogContent dividers sx={{ p: 0 }}>
        <Box
          ref={containerRef}
          component="pre"
          dangerouslySetInnerHTML={{ __html: html }}
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
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
