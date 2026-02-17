import { z } from 'zod';

// Brand font schema
const brandFontSchema = z.object({
  family: z.string(),
  fallback: z.string(),
  weight: z.union([z.number(), z.string()]).optional(),
  style: z.string().optional(),
  localFile: z.string().optional(),
});

// Brand kit schema matching the BrandKit type
export const brandKitSchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  colors: z
    .object({
      primary: z.string(),
      secondary: z.string(),
      accent: z.string(),
      text: z.string(),
      background: z.string(),
    })
    .catchall(z.string()),
  typography: z.object({
    heading: brandFontSchema,
    body: brandFontSchema,
    accent: brandFontSchema.optional(),
  }),
  logos: z.object({
    primary: z.string().optional(),
    light: z.string().optional(),
    dark: z.string().optional(),
    icon: z.string().optional(),
  }),
  defaults: z
    .object({
      format: z.string().optional(),
      quality: z.number().min(1).max(100).optional(),
      scaleFactor: z.number().positive().optional(),
    })
    .optional(),
});

// Template manifest schema
export const templateManifestSchema = z.object({
  name: z.string(),
  description: z.string(),
  author: z.string().optional(),
  version: z.string().optional(),
  supportedFormats: z.array(z.string()),
  layoutStrategy: z.enum(['scale', 'adaptive', 'per-format']),
  dataSchema: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

// Batch config schema
export const batchConfigSchema = z.object({
  jobs: z.array(
    z.object({
      template: z.string(),
      formats: z.array(z.string()),
      data: z.record(z.unknown()),
      outputDir: z.string().optional(),
      filePattern: z.string().optional(),
    }),
  ),
  outputDir: z.string(),
  concurrency: z.number().positive().optional(),
  brandKit: z.string().optional(),
  defaults: z
    .object({
      template: z.string().optional(),
      formats: z.array(z.string()).optional(),
      quality: z.number().min(1).max(100).optional(),
      scaleFactor: z.number().positive().optional(),
    })
    .optional(),
});

export type ValidatedBrandKit = z.infer<typeof brandKitSchema>;
export type ValidatedBatchConfig = z.infer<typeof batchConfigSchema>;
