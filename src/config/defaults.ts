export const DEFAULTS = {
  quality: 90,
  scaleFactor: 1,
  format: 'og',
  outputDir: './output',
  concurrency: 4,
  templateDir: 'templates',
  brandKitDir: 'brand-kits',
  filePattern: '{template}-{format}',
} as const;
