import React, { useState, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import AddIcon from '@mui/icons-material/Add';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import UploadFileIcon from '@mui/icons-material/UploadFile';
// @ts-ignore — CJS module exports a pre-constructed instance
import ImageTracer from 'imagetracerjs';
import type { Multimedia } from '../store/types';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Standard sizes per ETSI TS 102 818
// ---------------------------------------------------------------------------
interface SizeSpec {
  width: number;
  height: number;
  logoType: Multimedia['logoType'];
  label: string;
}

const STANDARD_SIZES: SizeSpec[] = [
  { width: 32,  height: 32,  logoType: 'logo_colour_square',    label: 'Square (32×32)'     },
  { width: 112, height: 32,  logoType: 'logo_colour_rectangle', label: 'Rectangle (112×32)' },
  { width: 128, height: 128, logoType: 'logo_unrestricted',     label: '128×128'             },
  { width: 320, height: 240, logoType: 'logo_unrestricted',     label: '320×240'             },
  { width: 600, height: 600, logoType: 'logo_unrestricted',     label: '600×600'             },
];

// Max display box for previews — images are scaled to fit within this
const PREVIEW_MAX_W = 200;
const PREVIEW_MAX_H = 120;

// ---------------------------------------------------------------------------
// Canvas / image helpers
// ---------------------------------------------------------------------------
function drawContained(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
) {
  const scale = Math.min(dstW / srcW, dstH / srcH);
  const w = srcW * scale;
  const h = srcH * scale;
  ctx.clearRect(0, 0, dstW, dstH);
  ctx.drawImage(src, (dstW - w) / 2, (dstH - h) / 2, w, h);
}

function resizeToDataUrl(img: HTMLImageElement, w: number, h: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawContained(canvas.getContext('2d')!, img, img.naturalWidth, img.naturalHeight, w, h);
  return canvas.toDataURL('image/png');
}

function vectoriseImage(img: HTMLImageElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  // getImageData throws SecurityError on tainted (cross-origin) canvas
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return ImageTracer.imagedataToSVG(imageData, {
    numberofcolors: 32,
    ltres: 1,
    qtres: 1,
    pathomit: 8,
    rightangleenhance: true,
    viewbox: true, // viewBox so the SVG scales to any size
  }) as string;
}

function renderSvgAtSize(svgString: string, w: number, h: number): Promise<string> {
  return new Promise((resolve, reject) => {
    // Inject explicit dimensions so the browser knows the intrinsic size
    const sized = svgString.replace(
      /<svg /,
      `<svg width="${w}" height="${h}" `,
    );
    const blob = new Blob([sized], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG render failed')); };
    img.src = url;
  });
}

function loadImageFromSrc(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image. Check the URL, or drag & drop the file directly.'));
    img.src = src;
  });
}

function previewDimensions(w: number, h: number) {
  const scale = Math.min(PREVIEW_MAX_W / w, PREVIEW_MAX_H / h);
  return { pw: Math.round(w * scale), ph: Math.round(h * scale) };
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

function openInNewTab(dataUrl: string) {
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(`<!doctype html><html><body style="margin:0;background:#666;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${dataUrl}" style="max-width:100%;image-rendering:pixelated"></body></html>`);
    win.document.close();
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Phase = 'input' | 'loaded' | 'processing' | 'results';
type Mode = 'resize' | 'vectorize';

interface SizeResult {
  spec: SizeSpec;
  dataUrl: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (logos: Multimedia[]) => void;
}

// ---------------------------------------------------------------------------
// One row per standard size in the results view
// ---------------------------------------------------------------------------
function SizeResultRow({ result, added, onAdd }: {
  result: SizeResult;
  added: boolean;
  onAdd: (dataUrl: string) => void;
}) {
  const { spec, dataUrl } = result;
  const { pw, ph } = previewDimensions(spec.width, spec.height);

  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', py: 1.5 }}>
      {/* Preview — fixed container, image scaled to fit */}
      <Tooltip title="Click to open at full size in a new tab">
        <Box
          onClick={() => openInNewTab(dataUrl)}
          sx={{
            width: PREVIEW_MAX_W,
            height: PREVIEW_MAX_H,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'grey.100',
            border: '1px dashed',
            borderColor: added ? 'success.main' : 'grey.300',
            borderRadius: 1,
            cursor: 'pointer',
            '&:hover': { borderColor: 'primary.main' },
          }}
        >
          <img
            src={dataUrl}
            alt={spec.label}
            width={pw}
            height={ph}
            style={{ imageRendering: 'pixelated', display: 'block' }}
          />
        </Box>
      </Tooltip>

      {/* Info + actions */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle2">{spec.label}</Typography>
          <Typography variant="caption" color="text.secondary">{spec.logoType}</Typography>
          <Tooltip title="Open full-size in new tab">
            <IconButton size="small" onClick={() => openInNewTab(dataUrl)}>
              <OpenInNewIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>
        <Typography variant="caption" color="text.secondary">
          The URL will be set automatically when you export the Docker package.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant={added ? 'outlined' : 'contained'}
            color={added ? 'success' : 'primary'}
            startIcon={<AddIcon />}
            onClick={() => onAdd(dataUrl)}
          >
            {added ? 'Added ✓' : 'Add to service'}
          </Button>
          <Tooltip title="Download PNG">
            <IconButton
              size="small"
              onClick={() => downloadDataUrl(dataUrl, `logo-${spec.width}x${spec.height}.png`)}
            >
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main workshop dialog
// ---------------------------------------------------------------------------
export function LogoWorkshop({ open, onClose, onAdd }: Props) {
  const [phase, setPhase] = useState<Phase>('input');
  const [mode, setMode] = useState<Mode>('resize');
  const [urlInput, setUrlInput] = useState('');
  const [sourceImg, setSourceImg] = useState<HTMLImageElement | null>(null);
  const [sourceDataUrl, setSourceDataUrl] = useState('');
  const [svgString, setSvgString] = useState('');
  const [results, setResults] = useState<SizeResult[]>([]);
  const [addedLabels, setAddedLabels] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  const reset = () => {
    setPhase('input');
    setUrlInput('');
    setSourceImg(null);
    setSourceDataUrl('');
    setSvgString('');
    setResults([]);
    setAddedLabels(new Set());
    setError('');
  };

  const handleClose = () => { reset(); onClose(); };

  const loadSource = useCallback(async (src: string) => {
    setError('');
    try {
      const img = await loadImageFromSrc(src);
      setSourceImg(img);
      // Capture data URL for safe display (avoids taint issues later)
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext('2d')!.drawImage(img, 0, 0);
        setSourceDataUrl(c.toDataURL('image/png'));
      } catch {
        setSourceDataUrl(src);
      }
      setPhase('loaded');
    } catch (e) {
      setError(String(e));
    }
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please drop an image file.'); return; }
    const reader = new FileReader();
    reader.onload = (e) => loadSource(e.target!.result as string);
    reader.readAsDataURL(file);
  }, [loadSource]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer?.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleGenerate = useCallback(async () => {
    if (!sourceImg) return;
    setPhase('processing');
    setError('');
    try {
      if (mode === 'resize') {
        setResults(STANDARD_SIZES.map((spec) => ({
          spec,
          dataUrl: resizeToDataUrl(sourceImg, spec.width, spec.height),
        })));
        setPhase('results');
      } else {
        let svg: string;
        try {
          svg = vectoriseImage(sourceImg);
        } catch (e) {
          if (e instanceof DOMException && e.name === 'SecurityError') {
            throw new Error(
              'Cannot read pixel data from a cross-origin image URL. ' +
              'Download the image and drag & drop the file instead.'
            );
          }
          throw e;
        }
        setSvgString(svg);
        const rendered = await Promise.all(
          STANDARD_SIZES.map(async (spec) => ({
            spec,
            dataUrl: await renderSvgAtSize(svg, spec.width, spec.height),
          }))
        );
        setResults(rendered);
        setPhase('results');
      }
    } catch (e) {
      setError(String(e));
      setPhase('loaded');
    }
  }, [sourceImg, mode]);

  const handleAddLogo = (spec: SizeSpec, dataUrl: string) => {
    onAdd([{
      id: uuidv4(),
      url: dataUrl,
      logoType: spec.logoType,
      ...(spec.logoType === 'logo_unrestricted'
        ? { width: spec.width, height: spec.height, mimeValue: 'image/png' }
        : {}),
    }]);
    setAddedLabels((prev) => new Set(prev).add(spec.label));
  };

  // Source preview dimensions (max 200×150)
  const srcW = sourceImg?.naturalWidth ?? 0;
  const srcH = sourceImg?.naturalHeight ?? 0;
  const srcScale = Math.min(1, 200 / srcW, 150 / srcH);
  const srcDispW = Math.round(srcW * srcScale);
  const srcDispH = Math.round(srcH * srcScale);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Logo Workshop
        <IconButton size="small" onClick={handleClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent dividers>

        {/* ── INPUT ──────────────────────────────────────────── */}
        {phase === 'input' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                label="Image URL"
                placeholder="https://example.com/logo.png"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && urlInput && loadSource(urlInput)}
                sx={{ flex: 1 }}
              />
              <Button variant="contained" disabled={!urlInput} onClick={() => loadSource(urlInput)}>
                Load
              </Button>
            </Box>
            <Box
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              sx={{
                border: '2px dashed',
                borderColor: dragging ? 'primary.main' : 'grey.400',
                borderRadius: 2, p: 4, textAlign: 'center',
                bgcolor: dragging ? 'primary.50' : 'grey.50',
              }}
            >
              <Button component="label" variant="text" startIcon={<UploadFileIcon />}>
                Drop an image here, or click to browse
                <input type="file" hidden accept="image/*"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </Button>
            </Box>
            {error && <Alert severity="error">{error}</Alert>}
          </Box>
        )}

        {/* ── LOADED ─────────────────────────────────────────── */}
        {phase === 'loaded' && sourceImg && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <Box sx={{ flexShrink: 0 }}>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                  Source — {srcW}×{srcH}px
                </Typography>
                <Box sx={{ bgcolor: 'grey.100', border: '1px dashed', borderColor: 'grey.300', borderRadius: 1, p: 0.5, display: 'inline-block' }}>
                  <img src={sourceDataUrl} alt="source" width={srcDispW} height={srcDispH} style={{ display: 'block' }} />
                </Box>
              </Box>
              <Box sx={{ flex: 1, minWidth: 260 }}>
                <Typography variant="subtitle2" gutterBottom>How to generate standard sizes</Typography>
                <Tabs value={mode} onChange={(_, v) => setMode(v)} sx={{ mb: 2 }}>
                  <Tab value="resize" label="Resize as-is" />
                  <Tab value="vectorize" label="Vectorize to SVG first" />
                </Tabs>
                {mode === 'resize' && (
                  <Typography variant="body2" color="text.secondary">
                    The source image is scaled down (letterboxed) to each standard size using the canvas API.
                    Works best when the source is already high-resolution.
                  </Typography>
                )}
                {mode === 'vectorize' && (
                  <Typography variant="body2" color="text.secondary">
                    The image is first traced into a resolution-independent SVG using ImageTracer,
                    then rendered at each standard size. Produces crisp results for flat-colour logos.
                    Requires the image to be loaded from a file (not a cross-origin URL).
                  </Typography>
                )}
                <Button variant="contained" sx={{ mt: 2 }} onClick={handleGenerate}>
                  Generate previews
                </Button>
              </Box>
            </Box>
            <Button variant="text" size="small" sx={{ alignSelf: 'flex-start' }} onClick={reset}>
              ← Choose a different image
            </Button>
            {error && <Alert severity="error">{error}</Alert>}
          </Box>
        )}

        {/* ── PROCESSING ─────────────────────────────────────── */}
        {phase === 'processing' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              {mode === 'vectorize' ? 'Vectorising to SVG…' : 'Resizing…'}
            </Typography>
          </Box>
        )}

        {/* ── RESULTS ────────────────────────────────────────── */}
        {phase === 'results' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1">
                {mode === 'vectorize' ? 'SVG vectorised — rendered at each standard size' : 'Resized to each standard size'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {mode === 'vectorize' && svgString && (
                  <Button
                    size="small" variant="outlined" startIcon={<DownloadIcon />}
                    onClick={() => downloadDataUrl(
                      'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString),
                      'logo.svg'
                    )}
                  >
                    Download SVG
                  </Button>
                )}
                <Button size="small" variant="text" onClick={() => setPhase('loaded')}>← Back</Button>
              </Box>
            </Box>

            {mode === 'vectorize' && svgString && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                  SVG output (scalable vector):
                </Typography>
                <Box
                  dangerouslySetInnerHTML={{ __html: svgString }}
                  sx={{
                    border: '1px dashed', borderColor: 'grey.300', borderRadius: 1,
                    bgcolor: 'grey.50', p: 1, display: 'inline-block',
                    '& svg': { display: 'block', maxHeight: 160, width: 'auto' },
                  }}
                />
              </Box>
            )}

            <Divider />
            {results.map((result) => (
              <React.Fragment key={result.spec.label}>
                <SizeResultRow
                  result={result}
                  added={addedLabels.has(result.spec.label)}
                  onAdd={(dataUrl) => handleAddLogo(result.spec, dataUrl)}
                />
                <Divider />
              </React.Fragment>
            ))}

            <Alert severity="info" sx={{ mt: 1 }}>
              Logos are stored in the app. When you're ready, use <strong>Export Docker Package</strong> on
              the Review step — it bundles the images, generates a proper SI.xml with real URLs, and
              produces a Dockerfile + nginx config ready to run.
            </Alert>
          </Box>
        )}

      </DialogContent>
    </Dialog>
  );
}
