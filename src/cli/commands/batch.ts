import { resolve, dirname, basename } from 'node:path';
import { readFile } from 'node:fs/promises';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import YAML from 'yaml';
import type { CommandModule } from 'yargs';
import { batchConfigSchema } from '../../config/schema.js';
import { formatRegistry } from '../../core/format-registry.js';
import { BatchProcessor } from '../../pipeline/batch-processor.js';
import { generateOutputPath, prepareOutputDir } from '../../pipeline/output-writer.js';
import { createRenderJob } from '../../pipeline/job.js';
import { resolveTemplatePath } from '../../utils/fs.js';
import type { RenderJob, ImageFormat } from '../../types/index.js';

interface BatchArgs {
  config: string;
  concurrency?: number;
}

export const batchCommand: CommandModule<object, BatchArgs> = {
  command: 'batch',
  describe: 'Generate multiple images from a batch config file',
  builder: (yargs) =>
    yargs
      .option('config', {
        alias: 'c',
        type: 'string',
        description: 'Path to batch config YAML file',
        demandOption: true,
      })
      .option('concurrency', {
        type: 'number',
        description: 'Maximum concurrent render jobs',
      }),
  handler: async (argv) => {
    const startTime = performance.now();

    try {
      // Read and parse config
      const configSpinner = ora('Reading batch config...').start();
      const configPath = resolve(argv.config);
      let rawConfig: string;

      try {
        rawConfig = await readFile(configPath, 'utf-8');
      } catch (err) {
        configSpinner.fail('Failed to read batch config');
        console.error(
          chalk.red(
            `Could not read file: ${configPath}\n${err instanceof Error ? err.message : String(err)}`,
          ),
        );
        process.exit(1);
      }

      let parsedConfig: unknown;
      try {
        parsedConfig = YAML.parse(rawConfig);
      } catch (err) {
        configSpinner.fail('Failed to parse YAML');
        console.error(
          chalk.red(
            `Invalid YAML: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
        process.exit(1);
      }

      // Validate with Zod
      const validationResult = batchConfigSchema.safeParse(parsedConfig);
      if (!validationResult.success) {
        configSpinner.fail('Batch config validation failed');
        const issues = validationResult.error.issues
          .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
          .join('\n');
        console.error(chalk.red(`Validation errors:\n${issues}`));
        process.exit(1);
      }

      const config = validationResult.data;
      const configDir = dirname(configPath);

      // Resolve brandKit and outputDir relative to the config file's directory
      if (config.brandKit) {
        config.brandKit = resolve(configDir, config.brandKit);
      }
      config.outputDir = resolve(configDir, config.outputDir);

      const concurrency = argv.concurrency ?? config.concurrency ?? 4;
      configSpinner.succeed(
        `Batch config loaded: ${chalk.cyan(config.jobs.length)} jobs, concurrency ${chalk.cyan(String(concurrency))}`,
      );

      // Build render jobs
      const jobSpinner = ora('Building render jobs...').start();
      const renderJobs: RenderJob[] = [];
      const skipped: string[] = [];

      for (const job of config.jobs) {
        const formatList = job.formats.join(',');
        const formats = formatRegistry.parseFormatList(formatList);

        if (formats.length === 0) {
          skipped.push(
            `${job.template}: no valid formats (${formatList})`,
          );
          continue;
        }

        const resolvedTemplate = await resolveTemplatePath(job.template);
        const templateName = basename(resolvedTemplate);
        const jobOutputDir = job.outputDir
          ? resolve(configDir, job.outputDir)
          : config.outputDir;

        for (const format of formats) {
          const outputPath = generateOutputPath({
            outputDir: jobOutputDir,
            template: templateName,
            format,
            pattern: job.filePattern,
          });

          const renderJob = createRenderJob({
            template: resolvedTemplate,
            format,
            data: job.data,
            brandKit: config.brandKit,
            outputPath,
            quality: config.defaults?.quality,
            scaleFactor: config.defaults?.scaleFactor,
          });

          renderJobs.push(renderJob);
        }
      }

      if (skipped.length > 0) {
        for (const msg of skipped) {
          console.log(chalk.yellow(`  Skipped: ${msg}`));
        }
      }

      if (renderJobs.length === 0) {
        jobSpinner.fail('No render jobs to process');
        process.exit(1);
      }

      jobSpinner.succeed(
        `${chalk.cyan(String(renderJobs.length))} render jobs queued`,
      );

      // Prepare output directories
      const outputDirs = new Set(
        renderJobs.map((j) => {
          const parts = j.outputPath!.split('/');
          parts.pop();
          return parts.join('/');
        }),
      );
      for (const dir of outputDirs) {
        await prepareOutputDir(dir);
      }

      // Process batch
      const processor = new BatchProcessor();
      const renderSpinner = ora('Rendering images...').start();
      let completed = 0;

      const result = await processor.process(renderJobs, {
        concurrency,
        onProgress: (done, total) => {
          completed = done;
          renderSpinner.text = `Rendering images... ${done}/${total}`;
        },
        onJobComplete: (job, res) => {
          // Silently track
        },
        onJobError: (job, err) => {
          // Will be reported in summary
        },
      });

      renderSpinner.succeed(
        `Rendering complete: ${chalk.green(String(result.successful))} succeeded, ${result.failed > 0 ? chalk.red(String(result.failed)) : chalk.gray('0')} failed`,
      );

      // Summary table
      console.log('');
      const summaryTable = new Table({
        head: [
          chalk.white('Template'),
          chalk.white('Format'),
          chalk.white('Size'),
          chalk.white('Status'),
          chalk.white('Time'),
          chalk.white('Output'),
        ],
        style: { head: [], border: [] },
      });

      for (const item of result.results) {
        const templateName = basename(resolve(item.job.template));
        if (item.result) {
          summaryTable.push([
            templateName,
            item.job.format.id,
            `${item.job.format.width}x${item.job.format.height}`,
            chalk.green('OK'),
            `${item.result.durationMs.toFixed(0)}ms`,
            chalk.gray(item.result.outputPath ?? '-'),
          ]);
        } else {
          summaryTable.push([
            templateName,
            item.job.format.id,
            `${item.job.format.width}x${item.job.format.height}`,
            chalk.red('FAIL'),
            '-',
            chalk.red(
              item.error?.message?.slice(0, 60) ?? 'Unknown error',
            ),
          ]);
        }
      }

      console.log(summaryTable.toString());

      // Final summary
      const totalMs = performance.now() - startTime;
      console.log('');
      console.log(
        chalk.bold(
          `Batch complete: ${result.successful}/${result.total} images in ${(totalMs / 1000).toFixed(2)}s (${(result.durationMs / 1000).toFixed(2)}s render time)`,
        ),
      );
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
