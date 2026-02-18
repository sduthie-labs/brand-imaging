import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import { TemplateEngine } from '../../src/core/template-engine.js';
import type { ImageFormat } from '../../src/types/format.js';
import type { BrandKit } from '../../src/types/brand.js';

const TEMPLATES_DIR = join(process.cwd(), 'templates');
const MINIMAL_DIR = join(TEMPLATES_DIR, 'minimal');

const ogFormat: ImageFormat = {
  id: 'og',
  name: 'Open Graph',
  platform: 'og',
  category: 'web',
  width: 1200,
  height: 630,
  aspectRatio: '40:21',
};

const sampleBrandKit: BrandKit = {
  name: 'Test Brand',
  colors: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    accent: '#f59e0b',
    text: '#1e293b',
    background: '#ffffff',
  },
  typography: {
    heading: {
      family: 'Inter',
      fallback: 'system-ui, sans-serif',
      weight: 700,
    },
    body: {
      family: 'Inter',
      fallback: 'system-ui, sans-serif',
      weight: 400,
    },
    accent: {
      family: 'Inter',
      fallback: 'system-ui, sans-serif',
      weight: 600,
    },
  },
  logos: {
    primary: 'logos/test-logo.svg',
  },
};

describe('TemplateEngine', () => {
  let engine: TemplateEngine;

  beforeEach(() => {
    engine = new TemplateEngine();
  });

  // ---------------------------------------------------------------------------
  // loadTemplate
  // ---------------------------------------------------------------------------

  describe('loadTemplate', () => {
    it('loads the minimal template successfully', async () => {
      const compiled = await engine.loadTemplate(MINIMAL_DIR);
      expect(compiled).toBeDefined();
      expect(compiled.manifest).toBeDefined();
      expect(compiled.manifest.name).toBe('minimal');
      expect(compiled.html).toBeDefined();
      expect(typeof compiled.html).toBe('string');
      expect(compiled.html.length).toBeGreaterThan(0);
      expect(compiled.css).toBeDefined();
      expect(typeof compiled.css).toBe('string');
      expect(compiled.templateDir).toBeDefined();
    });

    it('caches templates after first load', async () => {
      const first = await engine.loadTemplate(MINIMAL_DIR);
      const second = await engine.loadTemplate(MINIMAL_DIR);
      // Cached instance should be the exact same object reference
      expect(first).toBe(second);
    });

    it('throws an error for an invalid template directory', async () => {
      await expect(
        engine.loadTemplate('/nonexistent/path/to/template'),
      ).rejects.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // compile
  // ---------------------------------------------------------------------------

  describe('compile', () => {
    it('produces valid HTML', async () => {
      const compiled = await engine.loadTemplate(MINIMAL_DIR);
      const html = engine.compile(
        compiled,
        { title: 'Test Title', subtitle: 'Test Subtitle' },
        ogFormat,
      );
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('</html>');
      expect(html).toContain('Test Title');
    });

    it('injects format dimensions into CSS variables', async () => {
      const compiled = await engine.loadTemplate(MINIMAL_DIR);
      const html = engine.compile(compiled, { title: 'Dimension Test' }, ogFormat);
      expect(html).toContain('--canvas-width: 1200px');
      expect(html).toContain('--canvas-height: 630px');
      expect(html).toContain('width: 1200px');
      expect(html).toContain('height: 630px');
    });

    it('injects brand kit CSS variables when brand kit is provided', async () => {
      const compiled = await engine.loadTemplate(MINIMAL_DIR);
      const html = engine.compile(
        compiled,
        { title: 'Brand Test' },
        ogFormat,
        sampleBrandKit,
      );
      expect(html).toContain('--brand-primary: #6366f1');
      expect(html).toContain('--brand-secondary: #8b5cf6');
      expect(html).toContain('--brand-accent: #f59e0b');
      expect(html).toContain('--brand-text: #1e293b');
      expect(html).toContain('--brand-background: #ffffff');
      expect(html).toContain("--font-heading: 'Inter'");
      expect(html).toContain("--font-body: 'Inter'");
      expect(html).toContain("--font-accent: 'Inter'");
    });

    it('omits brand variables when no brand kit is provided', async () => {
      const compiled = await engine.loadTemplate(MINIMAL_DIR);
      const html = engine.compile(compiled, { title: 'No Brand' }, ogFormat);
      // Brand variables should not be defined in :root (though the CSS may reference them via var() fallbacks)
      expect(html).not.toContain('--brand-primary:');
      expect(html).not.toContain('--font-heading:');
    });
  });

  // ---------------------------------------------------------------------------
  // compileEmail
  // ---------------------------------------------------------------------------

  describe('compileEmail', () => {
    it('produces XHTML transitional doctype', async () => {
      const compiled = await engine.loadTemplate(MINIMAL_DIR);
      const html = engine.compileEmail(
        compiled,
        { title: 'Email Test' },
        ogFormat,
      );
      expect(html).toContain('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"');
      expect(html).toContain('xmlns="http://www.w3.org/1999/xhtml"');
    });

    it('does not contain CSS custom properties', async () => {
      const compiled = await engine.loadTemplate(MINIMAL_DIR);
      const html = engine.compileEmail(
        compiled,
        { title: 'Email Test' },
        ogFormat,
        sampleBrandKit,
      );
      // Email output should use class-based CSS, not custom properties
      expect(html).not.toContain('--brand-primary:');
      expect(html).not.toContain('--font-heading:');
      expect(html).not.toContain('--canvas-width:');
    });

    it('includes brand class selectors when brand kit is provided', async () => {
      const compiled = await engine.loadTemplate(MINIMAL_DIR);
      const html = engine.compileEmail(
        compiled,
        { title: 'Brand Email' },
        ogFormat,
        sampleBrandKit,
      );
      expect(html).toContain('.brand-heading');
      expect(html).toContain('.brand-body');
      expect(html).toContain('#6366f1'); // primary color
    });

    it('includes MSO conditional comments', async () => {
      const compiled = await engine.loadTemplate(MINIMAL_DIR);
      const html = engine.compileEmail(
        compiled,
        { title: 'MSO Test' },
        ogFormat,
      );
      expect(html).toContain('<!--[if mso]>');
      expect(html).toContain('<![endif]-->');
    });

    it('includes email reset CSS', async () => {
      const compiled = await engine.loadTemplate(MINIMAL_DIR);
      const html = engine.compileEmail(
        compiled,
        { title: 'Reset CSS Test' },
        ogFormat,
      );
      expect(html).toContain('-webkit-text-size-adjust');
      expect(html).toContain('mso-table-lspace');
    });

    it('includes responsive media queries', async () => {
      const compiled = await engine.loadTemplate(MINIMAL_DIR);
      const html = engine.compileEmail(
        compiled,
        { title: 'Responsive Test' },
        ogFormat,
      );
      expect(html).toContain('@media only screen and (max-width: 620px)');
      expect(html).toContain('.email-container');
    });

    it('includes Google Fonts link when brand kit has fonts', async () => {
      const compiled = await engine.loadTemplate(MINIMAL_DIR);
      const html = engine.compileEmail(
        compiled,
        { title: 'Font Test' },
        ogFormat,
        sampleBrandKit,
      );
      expect(html).toContain('fonts.googleapis.com');
      expect(html).toContain('Inter');
    });
  });

  // ---------------------------------------------------------------------------
  // Handlebars helpers
  // ---------------------------------------------------------------------------

  describe('Handlebars helpers', () => {
    it('truncate helper truncates long strings', async () => {
      const compiled = await engine.loadTemplate(MINIMAL_DIR);
      // Register a test template that uses the truncate helper directly
      const testTemplate = {
        ...compiled,
        html: '{{truncate title 10}}',
      };
      const html = engine.compile(
        testTemplate,
        { title: 'This is a very long title that should be truncated' },
        ogFormat,
      );
      expect(html).toContain('This is a...');
    });

    it('slugify helper converts text to slug', async () => {
      const compiled = await engine.loadTemplate(MINIMAL_DIR);
      const testTemplate = {
        ...compiled,
        html: '{{slugify title}}',
      };
      const html = engine.compile(
        testTemplate,
        { title: 'Hello World Test' },
        ogFormat,
      );
      expect(html).toContain('hello-world-test');
    });

    it('uppercase helper converts text to uppercase', async () => {
      const compiled = await engine.loadTemplate(MINIMAL_DIR);
      const testTemplate = {
        ...compiled,
        html: '{{uppercase title}}',
      };
      const html = engine.compile(testTemplate, { title: 'hello' }, ogFormat);
      expect(html).toContain('HELLO');
    });

    it('lowercase helper converts text to lowercase', async () => {
      const compiled = await engine.loadTemplate(MINIMAL_DIR);
      const testTemplate = {
        ...compiled,
        html: '{{lowercase title}}',
      };
      const html = engine.compile(testTemplate, { title: 'HELLO' }, ogFormat);
      expect(html).toContain('hello');
    });
  });
});
