import { join } from 'node:path';
import { ensureDir } from '../utils/fs.js';
import type { ImageFormat, OutputType } from '../types/index.js';

export function generateOutputPath(params: {
  outputDir: string;
  template: string;
  format: ImageFormat;
  pattern?: string;
  outputType?: OutputType;
}): string {
  const {
    outputDir,
    template,
    format,
    pattern = '{template}-{format}',
    outputType = 'png',
  } = params;

  const ext = outputType === 'html' ? '.html' : '.png';

  const filename = pattern
    .replace('{template}', template)
    .replace('{format}', format.id)
    .replace('{platform}', format.platform)
    .replace('{width}', String(format.width))
    .replace('{height}', String(format.height))
    .replace('{date}', new Date().toISOString().split('T')[0]);

  return join(outputDir, `${filename}${ext}`);
}

export async function prepareOutputDir(outputDir: string): Promise<void> {
  await ensureDir(outputDir);
}
