import { createPool, type Pool } from 'generic-pool';
import puppeteer, { type Browser } from 'puppeteer';

export interface BrowserPoolOptions {
  /** Minimum number of browser instances to keep alive. Default: 1 */
  min?: number;
  /** Maximum number of browser instances in the pool. Default: 4 */
  max?: number;
  /** Time in milliseconds before an idle browser is destroyed. Default: 30000 */
  idleTimeoutMs?: number;
}

export class BrowserPool {
  private pool: Pool<Browser>;

  constructor(options?: BrowserPoolOptions) {
    const { min = 1, max = 4, idleTimeoutMs = 30_000 } = options ?? {};

    this.pool = createPool<Browser>(
      {
        create: async () => {
          return puppeteer.launch({
            headless: true,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-gpu',
            ],
          });
        },
        destroy: async (browser: Browser) => {
          await browser.close();
        },
      },
      {
        min,
        max,
        idleTimeoutMillis: idleTimeoutMs,
      },
    );
  }

  async acquire(): Promise<Browser> {
    return this.pool.acquire();
  }

  async release(browser: Browser): Promise<void> {
    await this.pool.release(browser);
  }

  async drain(): Promise<void> {
    await this.pool.drain();
    await this.pool.clear();
  }

  get size(): number {
    return this.pool.size;
  }

  get available(): number {
    return this.pool.available;
  }
}
