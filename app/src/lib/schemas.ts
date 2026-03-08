import { z } from 'zod';

export const documentMetaSchema = z.object({
  serviceProvider: z.string().max(128, 'Max 128 characters'),
  lang: z.string().min(2, 'Required').max(10),
  creationTime: z.string().min(1, 'Required'),
  version: z.number().int().positive(),
  originator: z.string().max(128),
});

export const bearerBaseSchema = z.object({
  cost: z.number().int().min(0).max(255),
  mimeValue: z.string().optional(),
  bitrate: z.number().int().positive().optional(),
});

export const dabBearerSchema = bearerBaseSchema.extend({
  ecc: z.string().regex(/^[0-9a-f]{2}$/, 'Must be 2 hex digits (e.g. ce)'),
  eid: z.string().regex(/^[0-9a-f]{4}$/, 'Must be 4 hex digits (e.g. 1066)'),
  sid: z.string().regex(/^[0-9a-f]{4,8}$/, 'Must be 4 or 8 hex digits'),
  scids: z.number().int().min(0).max(15),
});

export const fmBearerSchema = bearerBaseSchema.extend({
  cc: z.string().min(2, 'Required'),
  pi: z.string().regex(/^[0-9a-f]{4}$/, 'Must be 4 hex digits (e.g. c204)'),
  freq: z.string().regex(/^[0-9]{5}$/, 'Must be 5 digits (e.g. 09910)'),
});

export const ipBearerSchema = bearerBaseSchema.extend({
  url: z.string().url('Must be a valid URL'),
  mimeValue: z.string().min(1, 'Required'),
});

export const multimediaSchema = z.object({
  url: z.string().min(1, 'URL is required'),
  logoType: z.enum(['logo_colour_square', 'logo_colour_rectangle', 'logo_unrestricted']),
  mimeValue: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export const linkSchema = z.object({
  uri: z.string().url('Must be a valid URL'),
  description: z.string().max(180).optional(),
  mimeValue: z.string().optional(),
});

export const radiodnsSchema = z.object({
  fqdn: z.string().min(1, 'Required'),
  serviceIdentifier: z
    .string()
    .regex(/^[a-z0-9]{1,16}$/, 'Use 1–16 lowercase letters and digits only'),
});
