import { mkdir, access } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';

export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export async function ensureParentDir(filePath: string): Promise<void> {
  await ensureDir(dirname(filePath));
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves a template name or path to an absolute directory containing manifest.json.
 * Search order: literal path, ./templates/<name>, built-in templates.
 */
export async function resolveTemplatePath(templateArg: string): Promise<string> {
  const candidates = [
    resolve(templateArg),
    resolve('templates', templateArg),
  ];

  for (const candidate of candidates) {
    if (await fileExists(join(candidate, 'manifest.json'))) {
      return candidate;
    }
  }

  // Fall back to literal path (let caller handle the error)
  return resolve(templateArg);
}
