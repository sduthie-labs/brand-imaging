import { describe, it, expect } from 'vitest';
import {
  brandKitSchema,
  templateManifestSchema,
  batchConfigSchema,
} from '../../src/config/schema.js';

describe('Zod schemas', () => {
  // ---------------------------------------------------------------------------
  // brandKitSchema
  // ---------------------------------------------------------------------------

  describe('brandKitSchema', () => {
    const validBrandKit = {
      name: 'Test Brand',
      version: '1.0',
      colors: {
        primary: '#6366f1',
        secondary: '#8b5cf6',
        accent: '#f59e0b',
        text: '#1e293b',
        background: '#ffffff',
      },
      typography: {
        heading: {
          family: 'Inter',
          fallback: 'system-ui, sans-serif',
          weight: 700,
        },
        body: {
          family: 'Inter',
          fallback: 'system-ui, sans-serif',
          weight: 400,
        },
      },
      logos: {
        primary: 'logos/logo.svg',
      },
    };

    it('validates a valid brand kit', () => {
      const result = brandKitSchema.safeParse(validBrandKit);
      expect(result.success).toBe(true);
    });

    it('rejects missing required fields', () => {
      const incomplete = {
        name: 'Missing Colors',
        // missing: colors, typography, logos
      };
      const result = brandKitSchema.safeParse(incomplete);
      expect(result.success).toBe(false);
    });

    it('rejects invalid color (non-string)', () => {
      const invalidColors = {
        ...validBrandKit,
        colors: {
          ...validBrandKit.colors,
          primary: 12345, // Should be a string
        },
      };
      const result = brandKitSchema.safeParse(invalidColors);
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // templateManifestSchema
  // ---------------------------------------------------------------------------

  describe('templateManifestSchema', () => {
    const validManifest = {
      name: 'minimal',
      description: 'A clean, minimal template',
      version: '1.0.0',
      supportedFormats: ['*'],
      layoutStrategy: 'scale' as const,
      tags: ['simple', 'gradient'],
    };

    it('validates a valid manifest', () => {
      const result = templateManifestSchema.safeParse(validManifest);
      expect(result.success).toBe(true);
    });

    it('rejects manifest missing required fields', () => {
      const incomplete = {
        name: 'test',
        // missing: description, supportedFormats, layoutStrategy
      };
      const result = templateManifestSchema.safeParse(incomplete);
      expect(result.success).toBe(false);
    });

    it('rejects invalid layoutStrategy value', () => {
      const invalid = {
        ...validManifest,
        layoutStrategy: 'invalid-strategy',
      };
      const result = templateManifestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // batchConfigSchema
  // ---------------------------------------------------------------------------

  describe('batchConfigSchema', () => {
    const validBatchConfig = {
      jobs: [
        {
          template: 'minimal',
          formats: ['og', 'twitter-card'],
          data: { title: 'Test' },
        },
      ],
      outputDir: './output',
      concurrency: 4,
    };

    it('validates a valid batch config', () => {
      const result = batchConfigSchema.safeParse(validBatchConfig);
      expect(result.success).toBe(true);
    });

    it('rejects batch config missing required fields', () => {
      const incomplete = {
        // missing: jobs, outputDir
        concurrency: 4,
      };
      const result = batchConfigSchema.safeParse(incomplete);
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Error messages
  // ---------------------------------------------------------------------------

  describe('error messages', () => {
    it('provides meaningful error messages on validation failure', () => {
      const result = brandKitSchema.safeParse({ name: 123 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        const messages = result.error.issues.map((i) => i.message);
        expect(messages.some((m) => typeof m === 'string' && m.length > 0)).toBe(true);
      }
    });
  });
});
