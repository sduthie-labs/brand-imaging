#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Import commands
import { generateCommand } from './cli/commands/generate.js';
import { listCommand } from './cli/commands/list.js';
import { batchCommand } from './cli/commands/batch.js';
import { previewCommand } from './cli/commands/preview.js';
import { initCommand } from './cli/commands/init.js';

yargs(hideBin(process.argv))
  .scriptName('brand-imaging')
  .usage('$0 <command> [options]')
  .command(generateCommand)
  .command(batchCommand)
  .command(listCommand)
  .command(previewCommand)
  .command(initCommand)
  .demandCommand(1, 'You need to specify a command')
  .strict()
  .help()
  .alias('h', 'help')
  .version()
  .alias('v', 'version')
  .parse();
