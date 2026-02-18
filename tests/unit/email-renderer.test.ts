import { describe, it, expect } from 'vitest';
import { EmailRenderer } from '../../src/core/email-renderer.js';
import type { ImageFormat } from '../../src/types/format.js';

const emailFormat: ImageFormat = {
  id: 'email-template',
  name: 'Email Template',
  platform: 'email',
  category: 'email',
  width: 600,
  height: 800,
  aspectRatio: '3:4',
};

const sampleHtml = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { background-color: #0a0f18; color: #e2e8f0; }
    .heading { font-family: 'Outfit', sans-serif; color: #4fd1c5; }
    .accent { color: #f6ad55; }
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; }
    }
  </style>
</head>
<body>
  <table class="heading" width="600" cellpadding="0" cellspacing="0">
    <tr>
      <td class="accent">Hello World</td>
    </tr>
  </table>
</body>
</html>`;

describe('EmailRenderer', () => {
  it('inlines CSS onto elements', () => {
    const renderer = new EmailRenderer();
    const result = renderer.render(sampleHtml, emailFormat);

    expect(result.html).toBeDefined();
    // juice should inline background-color onto the body
    expect(result.html).toContain('background-color');
    // The .heading class styles should be inlined on the table
    expect(result.html).toContain("font-family: 'Outfit', sans-serif");
    // The .accent class should be inlined on the td
    expect(result.html).toContain('color: #f6ad55');
  });

  it('preserves @media queries', () => {
    const renderer = new EmailRenderer();
    const result = renderer.render(sampleHtml, emailFormat);

    expect(result.html).toContain('@media');
    expect(result.html).toContain('max-width: 620px');
  });

  it('returns correct output type and format', () => {
    const renderer = new EmailRenderer();
    const result = renderer.render(sampleHtml, emailFormat);

    expect(result.outputType).toBe('html');
    expect(result.format.id).toBe('email-template');
    expect(result.width).toBe(600);
    expect(result.height).toBe(800);
  });

  it('returns a buffer with the HTML content', () => {
    const renderer = new EmailRenderer();
    const result = renderer.render(sampleHtml, emailFormat);

    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer.toString('utf-8')).toBe(result.html);
  });

  it('tracks render duration', () => {
    const renderer = new EmailRenderer();
    const result = renderer.render(sampleHtml, emailFormat);

    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('preserves brand colors in output', () => {
    const renderer = new EmailRenderer();
    const result = renderer.render(sampleHtml, emailFormat);

    expect(result.html).toContain('#0a0f18');
    expect(result.html).toContain('#4fd1c5');
    expect(result.html).toContain('#f6ad55');
    expect(result.html).toContain('#e2e8f0');
  });
});
