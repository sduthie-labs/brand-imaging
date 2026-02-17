import puppeteer, { type Browser, type Page } from 'puppeteer';
import { writeFile } from 'node:fs/promises';
import type { ImageFormat, RenderResult } from '../types/index.js';
import { ensureParentDir } from '../utils/fs.js';

export interface RendererOptions {
  scaleFactor?: number;
  quality?: number;
  timeout?: number;
}

export class Renderer {
  private browser: Browser | null = null;

  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
  }

  async render(
    html: string,
    format: ImageFormat,
    options?: RendererOptions,
  ): Promise<RenderResult> {
    if (!this.browser) {
      throw new Error(
        'Renderer not initialized. Call initialize() before render().',
      );
    }

    const scaleFactor = options?.scaleFactor ?? 1;
    const timeout = options?.timeout ?? 30_000;
    const start = performance.now();

    let page: Page | null = null;
    try {
      page = await this.browser.newPage();
      page.setDefaultTimeout(timeout);

      const viewportWidth = Math.round(format.width * scaleFactor);
      const viewportHeight = Math.round(format.height * scaleFactor);

      await page.setViewport({
        width: viewportWidth,
        height: viewportHeight,
        deviceScaleFactor: scaleFactor,
      });

      await page.setContent(html, { waitUntil: 'networkidle0', timeout });

      const buffer = Buffer.from(
        await page.screenshot({
          fullPage: false,
          type: 'png',
          encoding: 'binary',
        }),
      );

      const durationMs = performance.now() - start;

      return {
        buffer,
        format,
        width: viewportWidth,
        height: viewportHeight,
        durationMs,
      };
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  async renderToFile(
    html: string,
    format: ImageFormat,
    outputPath: string,
    options?: RendererOptions,
  ): Promise<RenderResult> {
    const result = await this.render(html, format, options);

    await ensureParentDir(outputPath);
    await writeFile(outputPath, result.buffer);

    return {
      ...result,
      outputPath,
    };
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
