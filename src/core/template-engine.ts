import Handlebars from 'handlebars';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type {
  TemplateManifest,
  CompiledTemplate,
  TemplateData,
  ImageFormat,
} from '../types/index.js';
import type { BrandKit } from '../types/brand.js';

export class TemplateEngine {
  private handlebars: typeof Handlebars;
  private templateCache: Map<string, CompiledTemplate>;

  constructor() {
    this.handlebars = Handlebars.create();
    this.templateCache = new Map();
    this.registerDefaultHelpers();
  }

  private registerDefaultHelpers(): void {
    this.handlebars.registerHelper(
      'truncate',
      function (str: unknown, length: unknown): string {
        const text = String(str ?? '');
        const max = typeof length === 'number' ? length : 100;
        if (text.length <= max) return text;
        return text.slice(0, max).trimEnd() + '...';
      },
    );

    this.handlebars.registerHelper(
      'slugify',
      function (str: unknown): string {
        return String(str ?? '')
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_]+/g, '-')
          .replace(/-+/g, '-');
      },
    );

    this.handlebars.registerHelper(
      'uppercase',
      function (str: unknown): string {
        return String(str ?? '').toUpperCase();
      },
    );

    this.handlebars.registerHelper(
      'lowercase',
      function (str: unknown): string {
        return String(str ?? '').toLowerCase();
      },
    );

    this.handlebars.registerHelper(
      'eq',
      function (a: unknown, b: unknown): boolean {
        return a === b;
      },
    );

    this.handlebars.registerHelper(
      'ne',
      function (a: unknown, b: unknown): boolean {
        return a !== b;
      },
    );

    this.handlebars.registerHelper(
      'gt',
      function (a: unknown, b: unknown): boolean {
        return Number(a) > Number(b);
      },
    );

    this.handlebars.registerHelper(
      'lt',
      function (a: unknown, b: unknown): boolean {
        return Number(a) < Number(b);
      },
    );

    this.handlebars.registerHelper(
      'and',
      function (...args: unknown[]): boolean {
        // Last argument is the Handlebars options object
        const values = args.slice(0, -1);
        return values.every(Boolean);
      },
    );

    this.handlebars.registerHelper(
      'or',
      function (...args: unknown[]): boolean {
        // Last argument is the Handlebars options object
        const values = args.slice(0, -1);
        return values.some(Boolean);
      },
    );

    this.handlebars.registerHelper(
      'json',
      function (context: unknown): string {
        return JSON.stringify(context, null, 2);
      },
    );

    this.handlebars.registerHelper(
      'substring',
      function (str: unknown, start: unknown, end: unknown): string {
        const text = String(str ?? '');
        const s = typeof start === 'number' ? start : 0;
        const e = typeof end === 'number' ? end : text.length;
        return text.substring(s, e);
      },
    );
  }

  async loadTemplate(templateDir: string): Promise<CompiledTemplate> {
    const absDir = resolve(templateDir);
    const cached = this.templateCache.get(absDir);
    if (cached) return cached;

    const [manifestRaw, html, css] = await Promise.all([
      readFile(join(absDir, 'manifest.json'), 'utf-8'),
      readFile(join(absDir, 'template.hbs'), 'utf-8'),
      readFile(join(absDir, 'styles.css'), 'utf-8').catch(() => ''),
    ]);

    const manifest: TemplateManifest = JSON.parse(manifestRaw);
    const compiled: CompiledTemplate = {
      manifest,
      html,
      css,
      templateDir: absDir,
    };
    this.templateCache.set(absDir, compiled);
    return compiled;
  }

  compile(
    template: CompiledTemplate,
    data: TemplateData,
    format: ImageFormat,
    brandKit?: BrandKit,
  ): string {
    const compiledTemplate = this.handlebars.compile(template.html);

    const brandCss = brandKit ? this.generateBrandCss(brandKit) : '';

    const templateData: TemplateData = {
      ...data,
      format: {
        id: format.id,
        name: format.name,
        width: format.width,
        height: format.height,
        platform: format.platform,
      },
      brand: brandKit
        ? {
            name: brandKit.name,
            colors: brandKit.colors,
            typography: brandKit.typography,
            logos: brandKit.logos,
          }
        : undefined,
    };

    const body = compiledTemplate(templateData);

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root {
      --canvas-width: ${format.width}px;
      --canvas-height: ${format.height}px;
      --scale-factor: 1;
      ${brandCss}
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: ${format.width}px;
      height: ${format.height}px;
      overflow: hidden;
    }
    ${template.css}
  </style>
</head>
<body>${body}</body>
</html>`;
  }

  private generateBrandCss(brandKit: BrandKit): string {
    const lines: string[] = [];

    for (const [key, value] of Object.entries(brandKit.colors)) {
      lines.push(`--brand-${key}: ${value};`);
    }

    if (brandKit.typography.heading) {
      lines.push(
        `--font-heading: '${brandKit.typography.heading.family}', ${brandKit.typography.heading.fallback};`,
      );
    }

    if (brandKit.typography.body) {
      lines.push(
        `--font-body: '${brandKit.typography.body.family}', ${brandKit.typography.body.fallback};`,
      );
    }

    if (brandKit.typography.accent) {
      lines.push(
        `--font-accent: '${brandKit.typography.accent.family}', ${brandKit.typography.accent.fallback};`,
      );
    }

    return lines.join('\n      ');
  }

  registerHelper(name: string, fn: Handlebars.HelperDelegate): void {
    this.handlebars.registerHelper(name, fn);
  }

  registerPartial(name: string, template: string): void {
    this.handlebars.registerPartial(name, template);
  }

  clearCache(): void {
    this.templateCache.clear();
  }
}
