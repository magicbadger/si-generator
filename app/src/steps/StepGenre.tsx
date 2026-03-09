import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  TextField,
  Typography,
} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '../store';
import { GENRE_OPTIONS } from '../constants/genres';
import type { Genre } from '../store/types';

// Re-derive main/secondary from position after any reorder or removal
function assignTypes(genres: Genre[]): Genre[] {
  return genres.map((g, i) => ({ ...g, type: i === 0 ? 'main' : 'secondary' }));
}

function SortableGenreRow({
  genre,
  onRemove,
}: {
  genre: Genre;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: genre.href });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 0.75,
        px: 1,
        borderRadius: 1,
        bgcolor: isDragging ? 'action.hover' : 'transparent',
        transform: CSS.Transform.toString(transform),
        transition,
        userSelect: 'none',
      }}
    >
      <Box
        {...attributes}
        {...listeners}
        sx={{ display: 'flex', alignItems: 'center', cursor: 'grab', color: 'action.active', '&:active': { cursor: 'grabbing' } }}
      >
        <DragIndicatorIcon fontSize="small" />
      </Box>
      <Chip
        label={genre.type}
        size="small"
        color={genre.type === 'main' ? 'primary' : 'default'}
        sx={{ minWidth: 80 }}
      />
      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', flex: 1 }}>
        {genre.href}
      </Typography>
      <Button size="small" color="error" onClick={onRemove}>
        Remove
      </Button>
    </Box>
  );
}

export function StepGenre() {
  const services = useStore((s) => s.services);
  const activeServiceId = useStore((s) => s.activeServiceId);
  const updateService = useStore((s) => s.updateService);
  const [customUrn, setCustomUrn] = useState('');

  const sensors = useSensors(useSensor(PointerSensor));

  const svc = services.find((s) => s.id === activeServiceId);
  if (!svc) return <Alert severity="info">Add a service first using the sidebar.</Alert>;

  const addGenre = (href: string) => {
    if (!href || svc.genres.some((g) => g.href === href)) return;
    updateService(svc.id, {
      genres: assignTypes([...svc.genres, { href, type: 'secondary' }]),
    });
  };

  const removeGenre = (href: string) => {
    updateService(svc.id, {
      genres: assignTypes(svc.genres.filter((g) => g.href !== href)),
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = svc.genres.findIndex((g) => g.href === active.id);
    const newIndex = svc.genres.findIndex((g) => g.href === over.id);
    updateService(svc.id, {
      genres: assignTypes(arrayMove(svc.genres, oldIndex, newIndex)),
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6">Genre (optional)</Typography>
      <Typography variant="body2" color="text.secondary">
        The first genre is tagged as "main"; additional genres are "secondary". Drag to reorder.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="subtitle2">Common genres:</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {GENRE_OPTIONS.map((opt) => {
            const selected = svc.genres.some((g) => g.href === opt.urn);
            return (
              <Chip
                key={opt.urn}
                label={opt.label}
                variant={selected ? 'filled' : 'outlined'}
                color={selected ? 'primary' : 'default'}
                onClick={() => (selected ? removeGenre(opt.urn) : addGenre(opt.urn))}
                onDelete={selected ? () => removeGenre(opt.urn) : undefined}
              />
            );
          })}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <TextField
          label="Custom TV-Anytime URN"
          value={customUrn}
          onChange={(e) => setCustomUrn(e.target.value)}
          size="small"
          sx={{ flex: 1, maxWidth: 480 }}
          placeholder="urn:tva:metadata:cs:ContentCS:2002:3.x.y"
        />
        <Button
          variant="outlined"
          size="small"
          sx={{ mt: 0.5 }}
          onClick={() => { addGenre(customUrn); setCustomUrn(''); }}
          disabled={!customUrn}
        >
          Add
        </Button>
      </Box>

      {svc.genres.length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>Selected genres:</Typography>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={svc.genres.map((g) => g.href)}
              strategy={verticalListSortingStrategy}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                {svc.genres.map((g) => (
                  <SortableGenreRow
                    key={g.href}
                    genre={g}
                    onRemove={() => removeGenre(g.href)}
                  />
                ))}
              </Box>
            </SortableContext>
          </DndContext>
        </Box>
      )}
    </Box>
  );
}
