import { useState } from 'react';
import { Box, Card, CardContent, Chip, Typography } from '@mui/material';
import BrokenImageIcon from '@mui/icons-material/BrokenImage';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { Multimedia } from '../store/types';

interface Props {
  logo: Multimedia;
  hasError?: boolean;
}

const LOGO_SIZES: Record<string, { w: number; h: number }> = {
  logo_colour_square: { w: 32, h: 32 },
  logo_colour_rectangle: { w: 112, h: 32 },
};

const MAX_DISPLAY = 300;

export function LogoPreview({ logo, hasError }: Props) {
  const [imgError, setImgError] = useState(false);

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

  return (
    <Card variant="outlined" sx={{ display: 'inline-flex', flexDirection: 'column', p: 1, gap: 1 }}>
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
        {imgError ? (
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
      <CardContent sx={{ p: '4px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
          <Chip label={sizeLabel} size="small" variant="outlined" />
          {logo.mimeValue && <Chip label={logo.mimeValue} size="small" variant="outlined" />}
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
