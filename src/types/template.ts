import type { ImageFormat } from './format.js';

export type LayoutStrategy = 'scale' | 'adaptive' | 'per-format';

export interface TemplateManifest {
  name: string;
  description: string;
  author?: string;
  version?: string;
  /** Format IDs this template supports, or ['*'] for all */
  supportedFormats: string[];
  layoutStrategy: LayoutStrategy;
  /** JSON Schema describing the data this template expects */
  dataSchema?: Record<string, unknown>;
  tags?: string[];
}

export interface TemplateData {
  [key: string]: unknown;
}

export interface CompiledTemplate {
  manifest: TemplateManifest;
  /** Compiled Handlebars HTML */
  html: string;
  /** Raw CSS string */
  css: string;
  /** Absolute path to the template directory */
  templateDir: string;
}

export interface RenderJob {
  /** Template name or path */
  template: string;
  format: ImageFormat;
  data: TemplateData;
  /** Path to brand kit directory */
  brandKit?: string;
  outputPath?: string;
  quality?: number;
  scaleFactor?: number;
}

export interface RenderResult {
  buffer: Buffer;
  format: ImageFormat;
  width: number;
  height: number;
  outputPath?: string;
  /** Time taken to render in milliseconds */
  durationMs: number;
}
