import { describe, it, expect } from 'vitest';
import { generateOutputPath } from '../../src/pipeline/output-writer.js';
import type { ImageFormat } from '../../src/types/format.js';

const ogFormat: ImageFormat = {
  id: 'og',
  name: 'Open Graph',
  platform: 'og',
  category: 'web',
  width: 1200,
  height: 630,
  aspectRatio: '40:21',
};

const twitterFormat: ImageFormat = {
  id: 'twitter-card',
  name: 'Twitter Card',
  platform: 'twitter',
  category: 'social',
  width: 1200,
  height: 628,
  aspectRatio: '300:157',
};

describe('generateOutputPath', () => {
  it('generates a path with the default pattern "{template}-{format}"', () => {
    const path = generateOutputPath({
      outputDir: '/output',
      template: 'minimal',
      format: ogFormat,
    });
    expect(path).toContain('minimal-og.png');
    expect(path).toMatch(/^\/output/);
  });

  it('generates a path with a custom pattern', () => {
    const path = generateOutputPath({
      outputDir: '/output',
      template: 'minimal',
      format: twitterFormat,
      pattern: '{platform}_{template}_{format}',
    });
    expect(path).toContain('twitter_minimal_twitter-card.png');
  });

  it('replaces {template} token', () => {
    const path = generateOutputPath({
      outputDir: '/out',
      template: 'bold-headline',
      format: ogFormat,
      pattern: '{template}',
    });
    expect(path).toContain('bold-headline.png');
  });

  it('replaces {format} token', () => {
    const path = generateOutputPath({
      outputDir: '/out',
      template: 'minimal',
      format: twitterFormat,
      pattern: '{format}',
    });
    expect(path).toContain('twitter-card.png');
  });

  it('replaces {platform} token', () => {
    const path = generateOutputPath({
      outputDir: '/out',
      template: 'minimal',
      format: twitterFormat,
      pattern: '{platform}',
    });
    expect(path).toContain('twitter.png');
  });

  it('replaces {width} and {height} tokens', () => {
    const path = generateOutputPath({
      outputDir: '/out',
      template: 'minimal',
      format: ogFormat,
      pattern: '{width}x{height}',
    });
    expect(path).toContain('1200x630.png');
  });

  it('replaces {date} token with ISO date string', () => {
    const path = generateOutputPath({
      outputDir: '/out',
      template: 'minimal',
      format: ogFormat,
      pattern: '{template}-{date}',
    });
    // Date should match YYYY-MM-DD format
    const todayIso = new Date().toISOString().split('T')[0];
    expect(path).toContain(`minimal-${todayIso}.png`);
  });

  it('appends .png extension to the output path', () => {
    const path = generateOutputPath({
      outputDir: '/out',
      template: 'minimal',
      format: ogFormat,
    });
    expect(path).toMatch(/\.png$/);
  });

  it('appends .html extension when outputType is html', () => {
    const path = generateOutputPath({
      outputDir: '/out',
      template: 'email-welcome',
      format: ogFormat,
      outputType: 'html',
    });
    expect(path).toMatch(/\.html$/);
    expect(path).toContain('email-welcome-og.html');
  });

  it('appends .png extension when outputType is png', () => {
    const path = generateOutputPath({
      outputDir: '/out',
      template: 'minimal',
      format: ogFormat,
      outputType: 'png',
    });
    expect(path).toMatch(/\.png$/);
  });

  it('defaults to .png when outputType is not specified', () => {
    const path = generateOutputPath({
      outputDir: '/out',
      template: 'minimal',
      format: ogFormat,
    });
    expect(path).toMatch(/\.png$/);
    expect(path).not.toMatch(/\.html$/);
  });
});
