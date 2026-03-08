import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import type { Bearer } from '../store/types';
import { DAB_MIME, DABPLUS_MIME, IP_STREAM_MIMES, IP_PLAYLIST_MIMES } from '../constants/mimeTypes';

interface Props {
  bearer: Bearer;
  onChange: (updated: Partial<Bearer>) => void;
}

// Parse DAB URI: dab:<gcc>.<eid>.<sid>.<scids>
function parseDabUri(uri: string) {
  const m = uri.match(/^dab:([0-9a-f]{3})\.([0-9a-f]{4})\.([0-9a-f]{4,8})\.([0-9]+)$/i);
  if (!m) return null;
  const gcc = m[1].toLowerCase();
  const eid = m[2].toLowerCase();
  const sid = m[3].toLowerCase();
  const scids = parseInt(m[4], 10);
  const ecc = gcc.slice(0, 2);
  const eidCountry = gcc[2];
  return { ecc, eidCountry, eid, sid, scids };
}

function buildDabUri(ecc: string, eid: string, sid: string, scids: number): string {
  const country = eid.length >= 4 ? eid[0] : '0';
  const gcc = ecc.toLowerCase() + country;
  return `dab:${gcc}.${eid.toLowerCase()}.${sid.toLowerCase()}.${scids}`;
}

function parseFmUri(uri: string) {
  const m = uri.match(/^fm:([a-z]{2})\.([0-9a-f]{4})\.([0-9]{5})$/i);
  if (!m) return null;
  return { cc: m[1].toLowerCase(), pi: m[2].toLowerCase(), freq: m[3] };
}

function DabBearerForm({ bearer, onChange }: Props) {
  const parsed = parseDabUri(bearer.uri);
  const [ecc, setEcc] = React.useState(parsed?.ecc ?? '');
  const [eid, setEid] = React.useState(parsed?.eid ?? '');
  const [sid, setSid] = React.useState(parsed?.sid ?? '');
  const [scids, setScids] = React.useState(parsed?.scids ?? 0);

  const pushUri = (newEcc: string, newEid: string, newSid: string, newScids: number) => {
    onChange({ uri: buildDabUri(newEcc, newEid, newSid, newScids) });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="caption" color="text.secondary">
        URI will be: <code>{bearer.uri || 'dab:<gcc>.<eid>.<sid>.<scids>'}</code>
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          label="ECC (hex, 2 digits)"
          placeholder="ce"
          value={ecc}
          size="small"
          sx={{ width: 140 }}
          inputProps={{ maxLength: 2 }}
          onChange={(e) => {
            const v = e.target.value.toLowerCase().replace(/[^0-9a-f]/g, '').slice(0, 2);
            setEcc(v);
            pushUri(v, eid, sid, scids);
          }}
        />
        <TextField
          label="EId (hex, 4 digits)"
          placeholder="1066"
          value={eid}
          size="small"
          sx={{ width: 140 }}
          inputProps={{ maxLength: 4 }}
          onChange={(e) => {
            const v = e.target.value.toLowerCase().replace(/[^0-9a-f]/g, '').slice(0, 4);
            setEid(v);
            pushUri(ecc, v, sid, scids);
          }}
        />
        <TextField
          label="SId (hex, 4-8 digits)"
          placeholder="c1f8"
          value={sid}
          size="small"
          sx={{ width: 160 }}
          inputProps={{ maxLength: 8 }}
          onChange={(e) => {
            const v = e.target.value.toLowerCase().replace(/[^0-9a-f]/g, '').slice(0, 8);
            setSid(v);
            pushUri(ecc, eid, v, scids);
          }}
        />
        <TextField
          label="SCIdS (0-15)"
          placeholder="0"
          type="number"
          value={scids}
          size="small"
          sx={{ width: 120 }}
          inputProps={{ min: 0, max: 15 }}
          onChange={(e) => {
            const v = Math.min(15, Math.max(0, parseInt(e.target.value) || 0));
            setScids(v);
            pushUri(ecc, eid, sid, v);
          }}
        />
      </Box>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ width: 200 }}>
          <InputLabel>MIME Type</InputLabel>
          <Select
            value={bearer.mimeValue || DABPLUS_MIME}
            label="MIME Type"
            onChange={(e) => onChange({ mimeValue: e.target.value })}
          >
            <MenuItem value={DAB_MIME}>audio/mpeg (DAB)</MenuItem>
            <MenuItem value={DABPLUS_MIME}>audio/aacp (DAB+)</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Cost (0-255)"
          type="number"
          value={bearer.cost}
          size="small"
          sx={{ width: 130 }}
          inputProps={{ min: 0, max: 255 }}
          onChange={(e) => onChange({ cost: Math.min(255, Math.max(0, parseInt(e.target.value) || 0)) })}
        />
      </Box>
    </Box>
  );
}

function FmBearerForm({ bearer, onChange }: Props) {
  const parsed = parseFmUri(bearer.uri);
  const [cc, setCc] = React.useState(parsed?.cc ?? '');
  const [pi, setPi] = React.useState(parsed?.pi ?? '');
  const [freq, setFreq] = React.useState(parsed?.freq ?? '');

  const pushUri = (newCc: string, newPi: string, newFreq: string) => {
    onChange({ uri: `fm:${newCc}.${newPi}.${newFreq}` });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="caption" color="text.secondary">
        URI will be: <code>{bearer.uri || 'fm:<cc>.<pi>.<freq>'}</code>
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          label="Country code (ISO 3166-1)"
          placeholder="gb"
          value={cc}
          size="small"
          sx={{ width: 180 }}
          inputProps={{ maxLength: 2 }}
          onChange={(e) => {
            const v = e.target.value.toLowerCase().replace(/[^a-z]/g, '').slice(0, 2);
            setCc(v);
            pushUri(v, pi, freq);
          }}
        />
        <TextField
          label="RDS PI (hex, 4 digits)"
          placeholder="c204"
          value={pi}
          size="small"
          sx={{ width: 160 }}
          inputProps={{ maxLength: 4 }}
          onChange={(e) => {
            const v = e.target.value.toLowerCase().replace(/[^0-9a-f]/g, '').slice(0, 4);
            setPi(v);
            pushUri(cc, v, freq);
          }}
        />
        <TextField
          label="Frequency (10 kHz units)"
          placeholder="09910"
          value={freq}
          size="small"
          sx={{ width: 180 }}
          helperText="e.g. 09910 = 99.1 MHz"
          inputProps={{ maxLength: 5 }}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 5);
            setFreq(v);
            pushUri(cc, pi, v);
          }}
        />
        <TextField
          label="Cost (default 50)"
          type="number"
          value={bearer.cost}
          size="small"
          sx={{ width: 130 }}
          inputProps={{ min: 0, max: 255 }}
          onChange={(e) => onChange({ cost: Math.min(255, Math.max(0, parseInt(e.target.value) || 0)) })}
        />
      </Box>
    </Box>
  );
}

export function BearerForm({ bearer, onChange }: Props) {
  if (bearer.type === 'dab') {
    return <DabBearerForm bearer={bearer} onChange={onChange} />;
  }

  if (bearer.type === 'fm') {
    return <FmBearerForm bearer={bearer} onChange={onChange} />;
  }

  if (bearer.type === 'ip_stream') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Stream URL"
          placeholder="https://stream.example.com/live.aac"
          value={bearer.uri}
          size="small"
          fullWidth
          onChange={(e) => onChange({ uri: e.target.value })}
        />
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ width: 200 }}>
            <InputLabel>MIME Type</InputLabel>
            <Select
              value={bearer.mimeValue || ''}
              label="MIME Type"
              onChange={(e) => onChange({ mimeValue: e.target.value })}
            >
              {IP_STREAM_MIMES.map((m) => (
                <MenuItem key={m} value={m}>{m}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Bitrate (kbps, optional)"
            type="number"
            value={bearer.bitrate || ''}
            size="small"
            sx={{ width: 160 }}
            inputProps={{ min: 1 }}
            onChange={(e) => onChange({ bitrate: e.target.value ? parseInt(e.target.value) : undefined })}
          />
          <TextField
            label="Cost (default 100)"
            type="number"
            value={bearer.cost}
            size="small"
            sx={{ width: 130 }}
            inputProps={{ min: 0, max: 255 }}
            onChange={(e) => onChange({ cost: Math.min(255, Math.max(0, parseInt(e.target.value) || 0)) })}
          />
        </Box>
      </Box>
    );
  }

  if (bearer.type === 'ip_playlist') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Playlist URL"
          placeholder="https://example.com/playlist.m3u8"
          value={bearer.uri}
          size="small"
          fullWidth
          onChange={(e) => onChange({ uri: e.target.value })}
        />
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ width: 280 }}>
            <InputLabel>Playlist MIME Type</InputLabel>
            <Select
              value={bearer.mimeValue || ''}
              label="Playlist MIME Type"
              onChange={(e) => onChange({ mimeValue: e.target.value })}
            >
              {IP_PLAYLIST_MIMES.map((m) => (
                <MenuItem key={m} value={m}>{m}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Cost (default 100)"
            type="number"
            value={bearer.cost}
            size="small"
            sx={{ width: 130 }}
            inputProps={{ min: 0, max: 255 }}
            onChange={(e) => onChange({ cost: Math.min(255, Math.max(0, parseInt(e.target.value) || 0)) })}
          />
        </Box>
      </Box>
    );
  }

  return null;
}
