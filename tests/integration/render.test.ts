import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { join } from 'node:path';
import { unlink } from 'node:fs/promises';
import { Renderer } from '../../src/core/renderer.js';
import { TemplateEngine } from '../../src/core/template-engine.js';
import type { ImageFormat } from '../../src/types/format.js';
import type { BrandKit } from '../../src/types/brand.js';

const TEMPLATES_DIR = join(process.cwd(), 'templates');
const MINIMAL_DIR = join(TEMPLATES_DIR, 'minimal');
const TEST_OUTPUT_DIR = join(process.cwd(), 'tests', '.test-output');

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
  },
  logos: {},
};

// PNG magic bytes: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('Renderer integration', () => {
  let renderer: Renderer;
  let engine: TemplateEngine;
  const outputFiles: string[] = [];

  beforeAll(async () => {
    renderer = new Renderer();
    engine = new TemplateEngine();
    await renderer.initialize();
  }, 30000);

  afterAll(async () => {
    await renderer.close();

    // Clean up any test output files
    for (const filePath of outputFiles) {
      try {
        await unlink(filePath);
      } catch {
        // File may not exist, ignore
      }
    }
  }, 15000);

  it('renders the minimal template to a buffer', async () => {
    const compiled = await engine.loadTemplate(MINIMAL_DIR);
    const html = engine.compile(
      compiled,
      { title: 'Integration Test', subtitle: 'Testing renderer output' },
      ogFormat,
    );

    const result = await renderer.render(html, ogFormat);
    expect(result).toBeDefined();
    expect(result.buffer).toBeDefined();
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it('produces a valid PNG buffer (magic bytes check)', async () => {
    const compiled = await engine.loadTemplate(MINIMAL_DIR);
    const html = engine.compile(
      compiled,
      { title: 'PNG Check' },
      ogFormat,
    );

    const result = await renderer.render(html, ogFormat);
    const header = result.buffer.subarray(0, 8);
    expect(Buffer.compare(header, PNG_MAGIC)).toBe(0);
  });

  it('renders an image with the correct dimensions', async () => {
    const compiled = await engine.loadTemplate(MINIMAL_DIR);
    const html = engine.compile(
      compiled,
      { title: 'Dimension Check' },
      ogFormat,
    );

    const result = await renderer.render(html, ogFormat);
    expect(result.width).toBe(ogFormat.width);
    expect(result.height).toBe(ogFormat.height);
    expect(result.format.id).toBe(ogFormat.id);
  });

  it('renders with a brand kit applied', async () => {
    const compiled = await engine.loadTemplate(MINIMAL_DIR);
    const html = engine.compile(
      compiled,
      { title: 'Brand Kit Render' },
      ogFormat,
      sampleBrandKit,
    );

    // The HTML should contain brand CSS variables
    expect(html).toContain('--brand-primary');

    const result = await renderer.render(html, ogFormat);
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it('renders to a file and creates the output file', async () => {
    const compiled = await engine.loadTemplate(MINIMAL_DIR);
    const html = engine.compile(
      compiled,
      { title: 'File Output Test' },
      ogFormat,
    );

    const outputPath = join(TEST_OUTPUT_DIR, 'render-test-output.png');
    outputFiles.push(outputPath);

    const result = await renderer.renderToFile(html, ogFormat, outputPath);
    expect(result.outputPath).toBe(outputPath);
    expect(result.buffer).toBeInstanceOf(Buffer);

    // Verify the file was actually created by reading its magic bytes
    const { readFile } = await import('node:fs/promises');
    const fileBuffer = await readFile(outputPath);
    const header = fileBuffer.subarray(0, 8);
    expect(Buffer.compare(header, PNG_MAGIC)).toBe(0);
  });

  it('reports render duration in milliseconds', async () => {
    const compiled = await engine.loadTemplate(MINIMAL_DIR);
    const html = engine.compile(
      compiled,
      { title: 'Duration Check' },
      ogFormat,
    );

    const result = await renderer.render(html, ogFormat);
    expect(result.durationMs).toBeDefined();
    expect(typeof result.durationMs).toBe('number');
    expect(result.durationMs).toBeGreaterThan(0);
  });
});
