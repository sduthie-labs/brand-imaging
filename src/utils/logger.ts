import chalk from 'chalk';

export const logger = {
  info: (msg: string, ...args: unknown[]): void => {
    console.log(chalk.blue('info'), msg, ...args);
  },

  success: (msg: string, ...args: unknown[]): void => {
    console.log(chalk.green('\u2713'), msg, ...args);
  },

  warn: (msg: string, ...args: unknown[]): void => {
    console.log(chalk.yellow('warn'), msg, ...args);
  },

  error: (msg: string, ...args: unknown[]): void => {
    console.error(chalk.red('error'), msg, ...args);
  },

  debug: (msg: string, ...args: unknown[]): void => {
    if (process.env.DEBUG) {
      console.log(chalk.gray('debug'), msg, ...args);
    }
  },
};
