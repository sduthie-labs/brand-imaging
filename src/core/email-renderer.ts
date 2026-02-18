import juice from 'juice';
import { writeFile } from 'node:fs/promises';
import type { ImageFormat, RenderResult } from '../types/index.js';
import { ensureParentDir } from '../utils/fs.js';

export interface EmailRendererOptions {
  /** Preserve @media queries in a <style> block instead of inlining them */
  preserveMediaQueries?: boolean;
  /** Preserve @font-face declarations */
  preserveFontFaces?: boolean;
}

export class EmailRenderer {
  private options: Required<EmailRendererOptions>;

  constructor(options?: EmailRendererOptions) {
    this.options = {
      preserveMediaQueries: options?.preserveMediaQueries ?? true,
      preserveFontFaces: options?.preserveFontFaces ?? true,
    };
  }

  render(html: string, format: ImageFormat): RenderResult {
    const start = performance.now();

    const inlined = juice(html, {
      preserveMediaQueries: this.options.preserveMediaQueries,
      preserveFontFaces: this.options.preserveFontFaces,
      removeStyleTags: false,
      preserveImportant: true,
    });

    return {
      buffer: Buffer.from(inlined, 'utf-8'),
      format,
      width: format.width,
      height: format.height,
      durationMs: performance.now() - start,
      html: inlined,
      outputType: 'html',
    };
  }

  async renderToFile(
    html: string,
    format: ImageFormat,
    outputPath: string,
  ): Promise<RenderResult> {
    const result = this.render(html, format);

    await ensureParentDir(outputPath);
    await writeFile(outputPath, result.html!, 'utf-8');

    return {
      ...result,
      outputPath,
    };
  }
}
