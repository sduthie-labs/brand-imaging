import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import chalk from 'chalk';
import ora from 'ora';
import type { CommandModule } from 'yargs';
import { TemplateEngine } from '../../core/template-engine.js';
import { formatRegistry } from '../../core/format-registry.js';
import { loadBrandKit } from '../../config/brand-kit.js';
import { DEFAULTS } from '../../config/defaults.js';
import { resolveTemplatePath } from '../../utils/fs.js';
import type { TemplateData, CompiledTemplate, ImageFormat } from '../../types/index.js';
import type { BrandKit } from '../../types/brand.js';

interface PreviewArgs {
  template: string;
  format: string;
  data?: string;
  'brand-kit'?: string;
  port: number;
}

async function parseData(dataArg: string | undefined): Promise<TemplateData> {
  if (!dataArg) return {};

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

  return JSON.parse(dataArg) as TemplateData;
}

export const previewCommand: CommandModule<object, PreviewArgs> = {
  command: 'preview',
  describe: 'Start a live preview server with hot reload',
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
        description: 'Format ID to preview',
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
      .option('port', {
        alias: 'p',
        type: 'number',
        description: 'Server port',
        default: 3200,
      }),
  handler: async (argv) => {
    try {
      // Parse format
      const formats = formatRegistry.parseFormatList(argv.format);
      if (formats.length === 0) {
        console.error(
          chalk.red(`No valid format found for: "${argv.format}"`),
        );
        process.exit(1);
      }
      const format: ImageFormat = formats[0];

      // Parse data
      const spinner = ora('Loading preview data...').start();
      let data: TemplateData;
      try {
        data = await parseData(argv.data);
      } catch (err) {
        spinner.fail('Failed to parse data');
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
        try {
          brandKit = await loadBrandKit(argv['brand-kit']);
        } catch (err) {
          spinner.fail('Failed to load brand kit');
          console.error(
            chalk.red(
              err instanceof Error ? err.message : String(err),
            ),
          );
          process.exit(1);
        }
      }

      spinner.succeed('Preview data loaded');

      // Compile initial HTML
      const templateEngine = new TemplateEngine();
      const templateDir = await resolveTemplatePath(argv.template);

      function compileHtml(): string {
        // Clear cache so we re-read from disk
        templateEngine.clearCache();

        // We need to do this synchronously for the compile step,
        // but loadTemplate is async, so we return a promise wrapper
        return ''; // placeholder, actual compile is async
      }

      async function buildHtml(): Promise<string> {
        templateEngine.clearCache();
        const template: CompiledTemplate =
          await templateEngine.loadTemplate(templateDir);
        const html = templateEngine.compile(
          template,
          data,
          format,
          brandKit,
        );
        return injectWsClient(html, argv.port);
      }

      function injectWsClient(html: string, port: number): string {
        const wsScript = `
<script>
  (function() {
    var ws = new WebSocket('ws://localhost:${port}');
    ws.onmessage = function(event) {
      if (event.data === 'reload') {
        window.location.reload();
      }
    };
    ws.onclose = function() {
      console.log('[brand-imaging] Preview server disconnected. Attempting reconnect...');
      setTimeout(function() {
        window.location.reload();
      }, 2000);
    };
  })();
</script>`;
        return html.replace('</body>', `${wsScript}\n</body>`);
      }

      // Start Express server
      const express = await import('express');
      const { WebSocketServer } = await import('ws');
      const http = await import('node:http');

      const app = express.default();
      const server = http.createServer(app);
      const wss = new WebSocketServer({ server });

      let currentHtml = await buildHtml();

      app.get('/', (_req, res) => {
        res.type('html').send(currentHtml);
      });

      // Watch template directory for changes
      const chokidar = await import('chokidar');
      const watcher = chokidar.watch(templateDir, {
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 300,
          pollInterval: 100,
        },
      });

      // Also watch data file if one was provided as a file path
      let dataFilePath: string | undefined;
      if (
        argv.data &&
        (argv.data.startsWith('./') ||
          argv.data.startsWith('/') ||
          argv.data.endsWith('.json') ||
          argv.data.endsWith('.yml') ||
          argv.data.endsWith('.yaml'))
      ) {
        dataFilePath = resolve(argv.data);
        watcher.add(dataFilePath);
      }

      // Also watch brand kit directory
      if (argv['brand-kit']) {
        watcher.add(resolve(argv['brand-kit']));
      }

      watcher.on('all', async (event, path) => {
        console.log(
          chalk.gray(
            `[${new Date().toLocaleTimeString()}] File changed: ${path}`,
          ),
        );

        try {
          // Re-parse data if data file changed
          if (dataFilePath && path === dataFilePath) {
            data = await parseData(argv.data);
          }

          // Re-load brand kit if brand kit files changed
          if (
            argv['brand-kit'] &&
            path.startsWith(resolve(argv['brand-kit']))
          ) {
            brandKit = await loadBrandKit(argv['brand-kit']);
          }

          currentHtml = await buildHtml();

          // Notify all connected clients
          for (const client of wss.clients) {
            if (client.readyState === 1) {
              client.send('reload');
            }
          }

          console.log(chalk.green('  Reloaded'));
        } catch (err) {
          console.error(
            chalk.red(
              `  Rebuild failed: ${err instanceof Error ? err.message : String(err)}`,
            ),
          );
        }
      });

      // Start server
      server.listen(argv.port, () => {
        console.log('');
        console.log(
          chalk.bold(
            `Preview server running at ${chalk.cyan(`http://localhost:${argv.port}`)}`,
          ),
        );
        console.log(
          chalk.gray(
            `Template: ${templateDir}`,
          ),
        );
        console.log(
          chalk.gray(
            `Format:   ${format.name} (${format.width}x${format.height})`,
          ),
        );
        if (brandKit) {
          console.log(
            chalk.gray(`Brand:    ${brandKit.name}`),
          );
        }
        console.log('');
        console.log(
          chalk.gray(
            'Watching for file changes... Press Ctrl+C to stop.',
          ),
        );
      });

      // Graceful shutdown
      const shutdown = () => {
        console.log(chalk.gray('\nShutting down preview server...'));
        watcher.close();
        wss.close();
        server.close(() => {
          process.exit(0);
        });
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
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
