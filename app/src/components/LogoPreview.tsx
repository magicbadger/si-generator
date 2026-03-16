import { useState, useEffect } from 'react';
import { Box, Card, CardContent, Chip, Typography } from '@mui/material';
import BrokenImageIcon from '@mui/icons-material/BrokenImage';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { Multimedia } from '../store/types';

function dataUrlBytes(dataUrl: string): number {
  const b64 = dataUrl.split(',')[1] ?? '';
  const padding = (b64.match(/=+$/) ?? [''])[0].length;
  return (b64.length * 3) / 4 - padding;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

interface Props {
  logo: Multimedia;
  hasError?: boolean;
}

const LOGO_SIZES: Record<string, { w: number; h: number }> = {
  logo_colour_square: { w: 32, h: 32 },
  logo_colour_rectangle: { w: 112, h: 32 },
};

const MAX_DISPLAY = 300;

function isSafeLogoUrl(url: string): boolean {
  if (url.startsWith('data:image/')) return true;
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

export function LogoPreview({ logo, hasError }: Props) {
  const [imgError, setImgError] = useState(false);
  const [fileSize, setFileSize] = useState<string | null>(null);

  useEffect(() => {
    setFileSize(null);
    if (logo.url.startsWith('data:')) {
      setFileSize(formatBytes(dataUrlBytes(logo.url)));
    } else if (logo.url.startsWith('https://') || logo.url.startsWith('http://')) {
      fetch(logo.url)
        .then((r) => r.blob())
        .then((b) => setFileSize(formatBytes(b.size)))
        .catch(() => { /* size unavailable */ });
    }
  }, [logo.url]);

  let displayW: number;
  let displayH: number;
  let sizeLabel: string;

  if (logo.logoType === 'logo_unrestricted') {
    const w = logo.width || 100;
    const h = logo.height || 100;
    const scale = Math.min(1, MAX_DISPLAY / Math.max(w, h));
    displayW = Math.round(w * scale);
    displayH = Math.round(h * scale);
    sizeLabel = `${w}×${h}`;
  } else {
    const sz = LOGO_SIZES[logo.logoType];
    displayW = sz.w;
    displayH = sz.h;
    sizeLabel = `${sz.w}×${sz.h}`;
  }

  const canLink = isSafeLogoUrl(logo.url) && !imgError;

  const imageBox = (
    <Box
      sx={{
        width: displayW,
        height: displayH,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.100',
        border: '1px dashed',
        borderColor: 'grey.300',
        borderRadius: 1,
        overflow: 'hidden',
      }}
    >
      {imgError || !isSafeLogoUrl(logo.url) ? (
        <BrokenImageIcon color="disabled" />
      ) : (
        <img
          src={logo.url}
          alt="logo preview"
          width={displayW}
          height={displayH}
          style={{ objectFit: 'contain' }}
          onError={() => setImgError(true)}
        />
      )}
    </Box>
  );

  return (
    <Card variant="outlined" sx={{ display: 'inline-flex', flexDirection: 'column', p: 1, gap: 1 }}>
      {canLink ? (
        <a href={logo.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', lineHeight: 0 }}>
          {imageBox}
        </a>
      ) : imageBox}
      <CardContent sx={{ p: '4px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
          <Chip label={sizeLabel} size="small" variant="outlined" />
          {logo.mimeValue && <Chip label={logo.mimeValue} size="small" variant="outlined" />}
          {fileSize && <Chip label={fileSize} size="small" variant="outlined" />}
          {hasError && (
            <WarningAmberIcon sx={{ fontSize: 16, color: 'warning.main' }} />
          )}
        </Box>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          {logo.logoType.replace(/_/g, ' ')}
        </Typography>
      </CardContent>
    </Card>
  );
}
