import pLimit from 'p-limit';
import type {
  RenderJob,
  RenderResult,
  BatchResult,
  PipelineOptions,
} from '../types/index.js';
import { Renderer } from '../core/renderer.js';
import { EmailRenderer } from '../core/email-renderer.js';
import { TemplateEngine } from '../core/template-engine.js';
import { loadBrandKit } from '../config/brand-kit.js';
import type { BrandKit } from '../types/brand.js';

export class BatchProcessor {
  private renderer: Renderer;
  private emailRenderer: EmailRenderer;
  private templateEngine: TemplateEngine;

  constructor() {
    this.renderer = new Renderer();
    this.emailRenderer = new EmailRenderer();
    this.templateEngine = new TemplateEngine();
  }

  async process(
    jobs: RenderJob[],
    options?: PipelineOptions,
  ): Promise<BatchResult> {
    const concurrency = options?.concurrency ?? 4;
    const limit = pLimit(concurrency);
    const start = performance.now();

    const hasPngJobs = jobs.some((j) => j.outputType !== 'html');
    if (hasPngJobs) {
      await this.renderer.initialize();
    }

    const results: BatchResult['results'] = [];
    let successful = 0;
    let failed = 0;

    const brandKitCache = new Map<string, BrandKit>();

    const promises = jobs.map((job) =>
      limit(async () => {
        try {
          let brandKit: BrandKit | undefined;
          if (job.brandKit) {
            if (brandKitCache.has(job.brandKit)) {
              brandKit = brandKitCache.get(job.brandKit);
            } else {
              brandKit = await loadBrandKit(job.brandKit);
              brandKitCache.set(job.brandKit, brandKit);
            }
          }

          const template = await this.templateEngine.loadTemplate(job.template);

          let result: RenderResult;

          if (job.outputType === 'html') {
            const html = this.templateEngine.compileEmail(
              template,
              job.data,
              job.format,
              brandKit,
            );

            if (job.outputPath) {
              result = await this.emailRenderer.renderToFile(
                html,
                job.format,
                job.outputPath,
              );
            } else {
              result = this.emailRenderer.render(html, job.format);
            }
          } else {
            const html = this.templateEngine.compile(
              template,
              job.data,
              job.format,
              brandKit,
            );

            if (job.outputPath) {
              result = await this.renderer.renderToFile(
                html,
                job.format,
                job.outputPath,
                {
                  quality: job.quality,
                  scaleFactor: job.scaleFactor,
                },
              );
            } else {
              result = await this.renderer.render(html, job.format, {
                quality: job.quality,
                scaleFactor: job.scaleFactor,
              });
            }
          }

          successful++;
          options?.onJobComplete?.(job, result);
          options?.onProgress?.(successful + failed, jobs.length);
          results.push({ job, result });
        } catch (err) {
          failed++;
          const error =
            err instanceof Error ? err : new Error(String(err));
          options?.onJobError?.(job, error);
          options?.onProgress?.(successful + failed, jobs.length);
          results.push({ job, error });
        }
      }),
    );

    await Promise.all(promises);

    if (hasPngJobs) {
      await this.renderer.close();
    }

    return {
      total: jobs.length,
      successful,
      failed,
      results,
      durationMs: performance.now() - start,
    };
  }
}
