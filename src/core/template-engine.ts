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

  compileEmail(
    template: CompiledTemplate,
    data: TemplateData,
    format: ImageFormat,
    brandKit?: BrandKit,
  ): string {
    const compiledTemplate = this.handlebars.compile(template.html);

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

    const emailResetCss = this.generateEmailResetCss();
    const emailBrandCss = brandKit ? this.generateEmailBrandCss(brandKit) : '';

    // Build Google Fonts link tags
    const fontLinks: string[] = [];
    if (brandKit) {
      const families: string[] = [];
      for (const role of ['heading', 'body', 'accent'] as const) {
        const font = brandKit.typography[role];
        if (font) {
          const weight = font.weight ?? (role === 'heading' ? 700 : 400);
          families.push(`${font.family.replace(/ /g, '+')}:wght@${weight}`);
        }
      }
      if (families.length > 0) {
        const uniqueFamilies = [...new Set(families)];
        fontLinks.push(
          `<link href="https://fonts.googleapis.com/css2?${uniqueFamilies.map((f) => `family=${f}`).join('&')}&display=swap" rel="stylesheet">`,
        );
      }
    }

    return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <title></title>
  ${fontLinks.join('\n  ')}
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    ${emailResetCss}
    ${emailBrandCss}
    ${template.css}
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100%; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  ${body}
</body>
</html>`;
  }

  private generateEmailResetCss(): string {
    return `/* Email resets */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .fluid { max-width: 100% !important; height: auto !important; }
      .stack-column { display: block !important; width: 100% !important; max-width: 100% !important; }
      .stack-column-center { text-align: center !important; }
      .center-on-narrow { text-align: center !important; display: block !important; margin-left: auto !important; margin-right: auto !important; float: none !important; }
      table.center-on-narrow { display: inline-block !important; }
      .hide-on-mobile { display: none !important; }
    }`;
  }

  private generateEmailBrandCss(brandKit: BrandKit): string {
    const heading = brandKit.typography.heading;
    const body = brandKit.typography.body;
    const lines: string[] = [];

    lines.push(`.brand-heading { font-family: '${heading.family}', ${heading.fallback}; font-weight: ${heading.weight ?? 700}; color: ${brandKit.colors.text}; }`);
    lines.push(`.brand-body { font-family: '${body.family}', ${body.fallback}; font-weight: ${body.weight ?? 400}; color: ${brandKit.colors.text}; }`);
    lines.push(`.brand-bg-primary { background-color: ${brandKit.colors.primary}; }`);
    lines.push(`.brand-bg-secondary { background-color: ${brandKit.colors.secondary}; }`);
    lines.push(`.brand-bg-accent { background-color: ${brandKit.colors.accent}; }`);
    lines.push(`.brand-bg-background { background-color: ${brandKit.colors.background}; }`);
    lines.push(`.brand-text-primary { color: ${brandKit.colors.primary}; }`);
    lines.push(`.brand-text-secondary { color: ${brandKit.colors.secondary}; }`);
    lines.push(`.brand-text-accent { color: ${brandKit.colors.accent}; }`);

    return lines.join('\n    ');
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
