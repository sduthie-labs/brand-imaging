import { resolve, basename } from 'node:path';
import { readFile } from 'node:fs/promises';
import chalk from 'chalk';
import ora from 'ora';
import type { CommandModule } from 'yargs';
import { Renderer } from '../../core/renderer.js';
import { EmailRenderer } from '../../core/email-renderer.js';
import { TemplateEngine } from '../../core/template-engine.js';
import { formatRegistry } from '../../core/format-registry.js';
import { loadBrandKit } from '../../config/brand-kit.js';
import { generateOutputPath, prepareOutputDir } from '../../pipeline/output-writer.js';
import { DEFAULTS } from '../../config/defaults.js';
import { resolveTemplatePath } from '../../utils/fs.js';
import type { ImageFormat, TemplateData, OutputType } from '../../types/index.js';
import type { BrandKit } from '../../types/brand.js';

interface GenerateArgs {
  template: string;
  format: string;
  data?: string;
  'brand-kit'?: string;
  output?: string;
  quality?: number;
  'scale-factor'?: number;
  'output-type'?: OutputType;
}

async function parseData(dataArg: string | undefined): Promise<TemplateData> {
  if (!dataArg) return {};

  // If it looks like a file path, read it
  if (
    dataArg.startsWith('./') ||
    dataArg.startsWith('/') ||
    dataArg.endsWith('.json') ||
    dataArg.endsWith('.yml') ||
    dataArg.endsWith('.yaml')
  ) {
    const absPath = resolve(dataArg);
    const content = await readFile(absPath, 'utf-8');
    if (absPath.endsWith('.yml') || absPath.endsWith('.yaml')) {
      const YAML = await import('yaml');
      return YAML.parse(content) as TemplateData;
    }
    return JSON.parse(content) as TemplateData;
  }

  // Otherwise treat as inline JSON
  return JSON.parse(dataArg) as TemplateData;
}

export const generateCommand: CommandModule<object, GenerateArgs> = {
  command: 'generate',
  describe: 'Generate brand images from a template',
  builder: (yargs) =>
    yargs
      .option('template', {
        alias: 't',
        type: 'string',
        description: 'Path to the template directory',
        demandOption: true,
      })
      .option('format', {
        alias: 'f',
        type: 'string',
        description:
          'Comma-separated format IDs (e.g. og,twitter-card) or platform name',
        default: DEFAULTS.format,
      })
      .option('data', {
        alias: 'd',
        type: 'string',
        description:
          'Template data as JSON string or path to .json/.yml file',
      })
      .option('brand-kit', {
        alias: 'b',
        type: 'string',
        description: 'Path to the brand kit directory',
      })
      .option('output', {
        alias: 'o',
        type: 'string',
        description: 'Output directory',
        default: DEFAULTS.outputDir,
      })
      .option('quality', {
        alias: 'q',
        type: 'number',
        description: 'Image quality (1-100)',
        default: DEFAULTS.quality,
      })
      .option('scale-factor', {
        alias: 's',
        type: 'number',
        description: 'Device scale factor for rendering',
        default: DEFAULTS.scaleFactor,
      })
      .option('output-type', {
        type: 'string',
        description: 'Output type: png (screenshot) or html (email template)',
        choices: ['png', 'html'] as const,
        default: 'png' as OutputType,
      }),
  handler: async (argv) => {
    const startTime = performance.now();

    try {
      // Parse formats
      const formats = formatRegistry.parseFormatList(argv.format);
      if (formats.length === 0) {
        console.error(
          chalk.red(`No valid formats found for: "${argv.format}"`),
        );
        console.error(
          chalk.gray(
            'Run "brand-imaging list --formats" to see available formats.',
          ),
        );
        process.exit(1);
      }

      // Parse data
      const spinner = ora('Parsing template data...').start();
      let data: TemplateData;
      try {
        data = await parseData(argv.data);
        spinner.succeed('Template data loaded');
      } catch (err) {
        spinner.fail('Failed to parse template data');
        console.error(
          chalk.red(
            err instanceof Error ? err.message : String(err),
          ),
        );
        process.exit(1);
      }

      // Load brand kit
      let brandKit: BrandKit | undefined;
      if (argv['brand-kit']) {
        const brandSpinner = ora('Loading brand kit...').start();
        try {
          brandKit = await loadBrandKit(argv['brand-kit']);
          brandSpinner.succeed(
            `Brand kit loaded: ${chalk.cyan(brandKit.name)}`,
          );
        } catch (err) {
          brandSpinner.fail('Failed to load brand kit');
          console.error(
            chalk.red(
              err instanceof Error ? err.message : String(err),
            ),
          );
          process.exit(1);
        }
      }

      // Load template
      const templateSpinner = ora('Loading template...').start();
      const templateEngine = new TemplateEngine();
      let template;
      try {
        const templatePath = await resolveTemplatePath(argv.template);
        template = await templateEngine.loadTemplate(templatePath);
        templateSpinner.succeed(
          `Template loaded: ${chalk.cyan(template.manifest.name)}`,
        );
      } catch (err) {
        templateSpinner.fail('Failed to load template');
        console.error(
          chalk.red(
            err instanceof Error ? err.message : String(err),
          ),
        );
        process.exit(1);
      }

      // Prepare output directory
      const outputDir = resolve(argv.output ?? DEFAULTS.outputDir);
      await prepareOutputDir(outputDir);

      const outputType = argv['output-type'] ?? 'png';
      const isHtml = outputType === 'html';

      // Initialize renderer
      let renderer: Renderer | undefined;
      let emailRenderer: EmailRenderer | undefined;
      if (isHtml) {
        emailRenderer = new EmailRenderer();
        const renderSpinner = ora('Email renderer ready').start();
        renderSpinner.succeed('Email renderer ready');
      } else {
        const renderSpinner = ora('Initializing renderer...').start();
        renderer = new Renderer();
        await renderer.initialize();
        renderSpinner.succeed('Renderer initialized');
      }

      // Derive template name for output filenames
      const templateName = basename(resolve(argv.template));

      // Render each format
      const results: Array<{
        format: ImageFormat;
        outputPath: string;
        durationMs: number;
      }> = [];

      for (const format of formats) {
        const formatSpinner = ora(
          `Rendering ${chalk.cyan(format.name)} (${format.width}x${format.height})...`,
        ).start();

        try {
          const outputPath = generateOutputPath({
            outputDir,
            template: templateName,
            format,
            outputType,
          });

          let result;
          if (isHtml) {
            const html = templateEngine.compileEmail(
              template,
              data,
              format,
              brandKit,
            );
            result = await emailRenderer!.renderToFile(html, format, outputPath);
          } else {
            const html = templateEngine.compile(
              template,
              data,
              format,
              brandKit,
            );
            result = await renderer!.renderToFile(
              html,
              format,
              outputPath,
              {
                quality: argv.quality,
                scaleFactor: argv['scale-factor'],
              },
            );
          }

          results.push({
            format,
            outputPath: result.outputPath!,
            durationMs: result.durationMs,
          });

          formatSpinner.succeed(
            `${chalk.green(format.name)} saved to ${chalk.gray(result.outputPath!)}`,
          );
        } catch (err) {
          formatSpinner.fail(
            `Failed to render ${format.name}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      // Cleanup
      if (renderer) {
        await renderer.close();
      }

      // Summary
      const totalMs = performance.now() - startTime;
      const outputLabel = isHtml ? 'email templates' : 'images';
      console.log('');
      console.log(
        chalk.green.bold(
          `Generated ${results.length}/${formats.length} ${outputLabel} in ${(totalMs / 1000).toFixed(2)}s`,
        ),
      );

      if (results.length > 0) {
        console.log(chalk.gray(`Output directory: ${outputDir}`));
      }
    } catch (err) {
      console.error(
        chalk.red(
          `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
      process.exit(1);
    }
  },
};
