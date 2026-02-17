import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import YAML from 'yaml';
import { brandKitSchema } from './schema.js';
import { AssetResolver } from '../core/asset-resolver.js';
import { fileExists } from '../utils/fs.js';
import type { BrandKit } from '../types/index.js';

export async function loadBrandKit(brandKitDir: string): Promise<BrandKit> {
  const absDir = resolve(brandKitDir);
  const ymlPath = join(absDir, 'brand.yml');

  let raw: string;
  try {
    raw = await readFile(ymlPath, 'utf-8');
  } catch (err) {
    throw new Error(
      `Could not read brand kit at ${ymlPath}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = YAML.parse(raw);
  } catch (err) {
    throw new Error(
      `Invalid YAML in ${ymlPath}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const result = brandKitSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Brand kit validation failed for ${ymlPath}:\n${issues}`);
  }

  const brandKit = result.data as BrandKit;

  // Resolve logo paths to data URIs so they render in Puppeteer's setContent()
  const resolver = new AssetResolver();
  const logoKeys = Object.keys(brandKit.logos) as Array<keyof typeof brandKit.logos>;
  for (const key of logoKeys) {
    const logoPath = brandKit.logos[key];
    if (logoPath && !logoPath.startsWith('data:')) {
      const absLogoPath = resolve(absDir, logoPath);
      if (await fileExists(absLogoPath)) {
        brandKit.logos[key] = await resolver.resolveToDataUri(logoPath, absDir);
      }
    }
  }

  return brandKit;
}
