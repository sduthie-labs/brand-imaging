import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

export class AssetResolver {
  private cache: Map<string, string> = new Map();

  async resolveToDataUri(
    filePath: string,
    basePath?: string,
  ): Promise<string> {
    const absPath = basePath ? resolve(basePath, filePath) : resolve(filePath);

    const cached = this.cache.get(absPath);
    if (cached) return cached;

    const ext = extname(absPath).toLowerCase();
    const mime = MIME_TYPES[ext];
    if (!mime) {
      throw new Error(`Unsupported file type: ${ext}`);
    }

    const buffer = await readFile(absPath);
    const dataUri = `data:${mime};base64,${buffer.toString('base64')}`;

    this.cache.set(absPath, dataUri);
    return dataUri;
  }

  async resolveFontFace(
    family: string,
    filePath: string,
    basePath?: string,
    weight?: string | number,
    style?: string,
  ): Promise<string> {
    const dataUri = await this.resolveToDataUri(filePath, basePath);

    const ext = extname(filePath).toLowerCase();
    let formatHint: string;
    switch (ext) {
      case '.woff2':
        formatHint = 'woff2';
        break;
      case '.woff':
        formatHint = 'woff';
        break;
      case '.ttf':
        formatHint = 'truetype';
        break;
      case '.otf':
        formatHint = 'opentype';
        break;
      default:
        formatHint = 'woff2';
    }

    return `@font-face {
  font-family: '${family}';
  src: url('${dataUri}') format('${formatHint}');
  font-weight: ${weight ?? 'normal'};
  font-style: ${style ?? 'normal'};
  font-display: block;
}`;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
