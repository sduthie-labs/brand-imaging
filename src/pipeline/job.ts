import type { RenderJob, ImageFormat, TemplateData, OutputType } from '../types/index.js';

export function createRenderJob(params: {
  template: string;
  format: ImageFormat;
  data: TemplateData;
  brandKit?: string;
  outputPath?: string;
  quality?: number;
  scaleFactor?: number;
  outputType?: OutputType;
}): RenderJob {
  return { ...params };
}
