import { resolve } from 'node:path';
import { readdir } from 'node:fs/promises';
import chalk from 'chalk';
import Table from 'cli-table3';
import type { CommandModule } from 'yargs';
import { IMAGE_FORMATS } from '../../config/formats.js';
import { DEFAULTS } from '../../config/defaults.js';
import { fileExists } from '../../utils/fs.js';
import type { Platform } from '../../types/index.js';

interface ListArgs {
  formats?: boolean;
  templates?: boolean;
  brands?: boolean;
  platform?: string;
}

async function listFormats(platform?: string): Promise<void> {
  let formats = [...IMAGE_FORMATS];

  if (platform) {
    const p = platform.toLowerCase();
    formats = formats.filter((f) => f.platform === p);
    if (formats.length === 0) {
      console.log(
        chalk.yellow(`No formats found for platform: "${platform}"`),
      );
      console.log(
        chalk.gray(
          'Available platforms: og, twitter, facebook, instagram, linkedin, youtube, pinterest, email, ads',
        ),
      );
      return;
    }
    console.log(
      chalk.bold(`Formats for ${chalk.cyan(platform)}:\n`),
    );
  } else {
    console.log(chalk.bold(`All available formats (${formats.length}):\n`));
  }

  const table = new Table({
    head: [
      chalk.white('ID'),
      chalk.white('Name'),
      chalk.white('Platform'),
      chalk.white('Category'),
      chalk.white('Size'),
      chalk.white('Aspect Ratio'),
    ],
    style: { head: [], border: [] },
  });

  for (const f of formats) {
    table.push([
      chalk.cyan(f.id),
      f.name,
      f.platform,
      f.category,
      `${f.width}x${f.height}`,
      f.aspectRatio,
    ]);
  }

  console.log(table.toString());
}

async function listTemplates(): Promise<void> {
  const templatesDir = resolve(DEFAULTS.templateDir);
  const exists = await fileExists(templatesDir);

  if (!exists) {
    console.log(
      chalk.yellow(
        `Templates directory not found: ${templatesDir}`,
      ),
    );
    console.log(
      chalk.gray(
        'Create a "templates/" directory with template folders inside it.',
      ),
    );
    return;
  }

  let entries: string[];
  try {
    const dirEntries = await readdir(templatesDir, {
      withFileTypes: true,
    });
    entries = dirEntries
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    console.log(
      chalk.yellow(`Could not read templates directory: ${templatesDir}`),
    );
    return;
  }

  if (entries.length === 0) {
    console.log(chalk.yellow('No templates found.'));
    console.log(
      chalk.gray(
        'Each template should be a folder with manifest.json and template.hbs inside templates/',
      ),
    );
    return;
  }

  console.log(chalk.bold(`Available templates (${entries.length}):\n`));

  const table = new Table({
    head: [
      chalk.white('Name'),
      chalk.white('Path'),
    ],
    style: { head: [], border: [] },
  });

  for (const name of entries) {
    const manifestPath = resolve(templatesDir, name, 'manifest.json');
    const hasManifest = await fileExists(manifestPath);

    let displayName = name;
    if (hasManifest) {
      try {
        const { readFile } = await import('node:fs/promises');
        const raw = await readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(raw);
        if (manifest.name) {
          displayName = `${manifest.name} ${chalk.gray(`(${manifest.description || ''})`)}`;
        }
      } catch {
        // Use folder name as fallback
      }
    } else {
      displayName = `${name} ${chalk.yellow('(no manifest.json)')}`;
    }

    table.push([displayName, chalk.gray(`templates/${name}`)]);
  }

  console.log(table.toString());
}

async function listBrands(): Promise<void> {
  const brandsDir = resolve(DEFAULTS.brandKitDir);
  const exists = await fileExists(brandsDir);

  if (!exists) {
    console.log(
      chalk.yellow(
        `Brand kits directory not found: ${brandsDir}`,
      ),
    );
    console.log(
      chalk.gray(
        'Create a "brand-kits/" directory or run "brand-imaging init --name \'My Brand\'" to get started.',
      ),
    );
    return;
  }

  let entries: string[];
  try {
    const dirEntries = await readdir(brandsDir, {
      withFileTypes: true,
    });
    entries = dirEntries
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    console.log(
      chalk.yellow(`Could not read brand kits directory: ${brandsDir}`),
    );
    return;
  }

  if (entries.length === 0) {
    console.log(chalk.yellow('No brand kits found.'));
    console.log(
      chalk.gray(
        'Run "brand-imaging init --name \'My Brand\'" to create one.',
      ),
    );
    return;
  }

  console.log(chalk.bold(`Available brand kits (${entries.length}):\n`));

  const table = new Table({
    head: [
      chalk.white('Name'),
      chalk.white('Path'),
      chalk.white('Status'),
    ],
    style: { head: [], border: [] },
  });

  for (const name of entries) {
    const ymlPath = resolve(brandsDir, name, 'brand.yml');
    const hasYml = await fileExists(ymlPath);

    let status: string;
    let displayName = name;

    if (hasYml) {
      try {
        const { readFile } = await import('node:fs/promises');
        const YAML = await import('yaml');
        const raw = await readFile(ymlPath, 'utf-8');
        const parsed = YAML.parse(raw);
        if (parsed?.name) {
          displayName = parsed.name;
        }
        status = chalk.green('valid');
      } catch {
        status = chalk.yellow('parse error');
      }
    } else {
      status = chalk.red('missing brand.yml');
    }

    table.push([
      displayName,
      chalk.gray(`brand-kits/${name}`),
      status,
    ]);
  }

  console.log(table.toString());
}

export const listCommand: CommandModule<object, ListArgs> = {
  command: 'list',
  describe: 'List available templates, formats, or brand kits',
  builder: (yargs) =>
    yargs
      .option('formats', {
        type: 'boolean',
        description: 'List all available image formats',
      })
      .option('templates', {
        type: 'boolean',
        description: 'List available templates',
      })
      .option('brands', {
        type: 'boolean',
        description: 'List available brand kits',
      })
      .option('platform', {
        alias: 'p',
        type: 'string',
        description:
          'Filter formats by platform (e.g. instagram, twitter)',
      }),
  handler: async (argv) => {
    try {
      if (argv.templates) {
        await listTemplates();
      } else if (argv.brands) {
        await listBrands();
      } else {
        // Default to formats
        await listFormats(argv.platform);
      }
    } catch (err) {
      console.error(
        chalk.red(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
      process.exit(1);
    }
  },
};
