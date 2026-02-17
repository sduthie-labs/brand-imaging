import { resolve, join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import chalk from 'chalk';
import ora from 'ora';
import type { CommandModule } from 'yargs';
import { ensureDir, fileExists } from '../../utils/fs.js';
import { DEFAULTS } from '../../config/defaults.js';

interface InitArgs {
  name: string;
  dir?: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

function generateBrandYml(name: string): string {
  return `# Brand Kit: ${name}
# Edit the values below to match your brand guidelines.

name: "${name}"
version: "1.0.0"

colors:
  primary: "#2563EB"
  secondary: "#1E40AF"
  accent: "#F59E0B"
  text: "#1F2937"
  background: "#FFFFFF"
  # Add custom colors below:
  # muted: "#6B7280"
  # success: "#10B981"
  # error: "#EF4444"

typography:
  heading:
    family: "Inter"
    fallback: "system-ui, -apple-system, sans-serif"
    weight: 700
    style: "normal"
    # localFile: "fonts/Inter-Bold.woff2"
  body:
    family: "Inter"
    fallback: "system-ui, -apple-system, sans-serif"
    weight: 400
    style: "normal"
    # localFile: "fonts/Inter-Regular.woff2"
  # accent:
  #   family: "Playfair Display"
  #   fallback: "Georgia, serif"
  #   weight: 600

logos:
  # Provide paths relative to this brand kit directory:
  # primary: "logos/logo-primary.svg"
  # light: "logos/logo-light.svg"
  # dark: "logos/logo-dark.svg"
  # icon: "logos/icon.png"

defaults:
  format: "og"
  quality: 90
  scaleFactor: 1
`;
}

export const initCommand: CommandModule<object, InitArgs> = {
  command: 'init',
  describe: 'Scaffold a new brand kit',
  builder: (yargs) =>
    yargs
      .option('name', {
        alias: 'n',
        type: 'string',
        description: 'Brand name',
        demandOption: true,
      })
      .option('dir', {
        type: 'string',
        description:
          'Parent directory for brand kits (defaults to brand-kits/)',
      }),
  handler: async (argv) => {
    const spinner = ora('Creating brand kit...').start();

    try {
      const slug = slugify(argv.name);
      if (!slug) {
        spinner.fail('Invalid brand name');
        console.error(
          chalk.red(
            'Brand name must contain at least one alphanumeric character.',
          ),
        );
        process.exit(1);
      }

      const parentDir = resolve(argv.dir ?? DEFAULTS.brandKitDir);
      const brandDir = join(parentDir, slug);

      // Check if already exists
      if (await fileExists(brandDir)) {
        spinner.fail('Brand kit already exists');
        console.error(
          chalk.red(`Directory already exists: ${brandDir}`),
        );
        console.error(
          chalk.gray(
            'Remove it first or choose a different name.',
          ),
        );
        process.exit(1);
      }

      // Create directory structure
      await ensureDir(brandDir);
      await ensureDir(join(brandDir, 'logos'));
      await ensureDir(join(brandDir, 'fonts'));

      // Write brand.yml
      const ymlContent = generateBrandYml(argv.name);
      await writeFile(join(brandDir, 'brand.yml'), ymlContent, 'utf-8');

      spinner.succeed(
        `Brand kit created: ${chalk.cyan(argv.name)}`,
      );

      // Print next steps
      console.log('');
      console.log(chalk.bold('Brand kit structure:'));
      console.log(chalk.gray(`  ${brandDir}/`));
      console.log(chalk.gray('    brand.yml'));
      console.log(chalk.gray('    logos/'));
      console.log(chalk.gray('    fonts/'));
      console.log('');
      console.log(chalk.bold('Next steps:'));
      console.log(
        `  1. Edit ${chalk.cyan(join(brandDir, 'brand.yml'))} with your brand colors and fonts`,
      );
      console.log(
        `  2. Add your logo files to ${chalk.cyan(join(brandDir, 'logos/'))}`,
      );
      console.log(
        `  3. Add any local font files to ${chalk.cyan(join(brandDir, 'fonts/'))}`,
      );
      console.log(
        `  4. Generate images: ${chalk.cyan(`brand-imaging generate -t ./templates/minimal -b ${brandDir}`)}`,
      );
    } catch (err) {
      spinner.fail('Failed to create brand kit');
      console.error(
        chalk.red(
          err instanceof Error ? err.message : String(err),
        ),
      );
      process.exit(1);
    }
  },
};
