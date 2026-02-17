import type { RenderJob, ImageFormat, TemplateData } from '../types/index.js';

export function createRenderJob(params: {
  template: string;
  format: ImageFormat;
  data: TemplateData;
  brandKit?: string;
  outputPath?: string;
  quality?: number;
  scaleFactor?: number;
}): RenderJob {
  return { ...params };
}
