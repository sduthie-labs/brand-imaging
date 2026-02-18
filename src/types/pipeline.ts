import type { RenderJob, RenderResult } from './template.js';

export interface BatchConfig {
  jobs: BatchJobConfig[];
  outputDir: string;
  concurrency?: number;
  brandKit?: string;
  defaults?: {
    template?: string;
    formats?: string[];
    quality?: number;
    scaleFactor?: number;
    outputType?: 'png' | 'html';
  };
}

export interface BatchJobConfig {
  template: string;
  formats: string[];
  data: Record<string, unknown>;
  outputDir?: string;
  /** Output filename pattern, e.g. '{template}-{format}-{date}' */
  filePattern?: string;
  outputType?: 'png' | 'html';
}

export interface BatchResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    job: RenderJob;
    result?: RenderResult;
    error?: Error;
  }>;
  /** Total batch duration in milliseconds */
  durationMs: number;
}

export interface PipelineOptions {
  concurrency?: number;
  onProgress?: (completed: number, total: number) => void;
  onJobComplete?: (job: RenderJob, result: RenderResult) => void;
  onJobError?: (job: RenderJob, error: Error) => void;
}
