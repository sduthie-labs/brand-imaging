import Handlebars from 'handlebars';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileExists } from '../../utils/fs.js';

/**
 * Built-in partial templates that are always available.
 */
const BUILT_IN_PARTIALS: Record<string, string> = {
  'logo-block': `<div class="logo-block" style="display: flex; align-items: center; gap: 12px;">
  {{#if brand.logos.primary}}
    <img src="{{brand.logos.primary}}" alt="{{brand.name}} logo" class="brand-logo" style="max-height: 48px; width: auto;" />
  {{/if}}
  {{#if showName}}
    <span class="brand-name" style="font-family: var(--font-heading, sans-serif); font-size: 18px; font-weight: 700; color: var(--brand-text, #333);">
      {{brand.name}}
    </span>
  {{/if}}
</div>`,

  footer: `<footer class="template-footer" style="position: absolute; bottom: 0; left: 0; right: 0; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; font-family: var(--font-body, sans-serif); font-size: 12px; color: var(--brand-text, #666);">
  {{#if brand.logos.icon}}
    <img src="{{brand.logos.icon}}" alt="" style="height: 24px; width: 24px; border-radius: 4px;" />
  {{/if}}
  {{#if footerText}}
    <span>{{footerText}}</span>
  {{else if brand.name}}
    <span>{{brand.name}}</span>
  {{/if}}
  {{#if url}}
    <span class="footer-url" style="opacity: 0.7;">{{url}}</span>
  {{/if}}
</footer>`,
};

/**
 * Register all built-in partials with the given Handlebars instance.
 */
export function registerBuiltInPartials(
  instance: typeof Handlebars,
): void {
  for (const [name, template] of Object.entries(BUILT_IN_PARTIALS)) {
    instance.registerPartial(name, template);
  }
}

/**
 * Load partial .hbs files from a directory and register them.
 * Each file is registered as a partial with the filename (without extension) as the name.
 */
export async function loadPartialsFromDir(
  instance: typeof Handlebars,
  partialsDir: string,
): Promise<void> {
  const absDir = resolve(partialsDir);
  const exists = await fileExists(absDir);
  if (!exists) return;

  // Read common partial files
  const partialFiles = [
    'logo-block.hbs',
    'footer.hbs',
    'header.hbs',
    'cta-button.hbs',
    'social-links.hbs',
  ];

  for (const file of partialFiles) {
    const filePath = join(absDir, file);
    const partialExists = await fileExists(filePath);
    if (partialExists) {
      const content = await readFile(filePath, 'utf-8');
      const name = file.replace('.hbs', '');
      instance.registerPartial(name, content);
    }
  }
}
