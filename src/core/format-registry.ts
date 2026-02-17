import type { ImageFormat, Platform, FormatCategory } from '../types/format.js';
import { IMAGE_FORMATS, FORMATS_MAP } from '../config/formats.js';

/**
 * Central registry for querying and resolving image formats.
 *
 * Provides lookup by id, platform, category, and a fuzzy search
 * as well as a format-list parser for CLI and config inputs.
 */
export class FormatRegistry {
  private readonly formats: readonly ImageFormat[];
  private readonly byId: Record<string, ImageFormat>;

  constructor(formats: readonly ImageFormat[] = IMAGE_FORMATS) {
    this.formats = formats;
    this.byId = Object.fromEntries(formats.map((f) => [f.id, f]));
  }

  // -----------------------------------------------------------------------
  // Single lookups
  // -----------------------------------------------------------------------

  /** Return a format by its exact id, or `undefined` if not found. */
  getById(id: string): ImageFormat | undefined {
    return this.byId[id];
  }

  // -----------------------------------------------------------------------
  // Filtered lists
  // -----------------------------------------------------------------------

  /** Return every format that belongs to the given platform. */
  getByPlatform(platform: Platform): ImageFormat[] {
    return this.formats.filter((f) => f.platform === platform);
  }

  /** Return every format that belongs to the given category. */
  getByCategory(category: FormatCategory): ImageFormat[] {
    return this.formats.filter((f) => f.category === category);
  }

  /** Return all registered formats. */
  getAll(): ImageFormat[] {
    return [...this.formats];
  }

  // -----------------------------------------------------------------------
  // Search
  // -----------------------------------------------------------------------

  /**
   * Case-insensitive fuzzy search across id, name, and platform fields.
   * Returns formats where any of those fields contain the query substring.
   */
  search(query: string): ImageFormat[] {
    const q = query.toLowerCase();
    return this.formats.filter(
      (f) =>
        f.id.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q) ||
        f.platform.toLowerCase().includes(q),
    );
  }

  // -----------------------------------------------------------------------
  // Format list parsing (CLI / config)
  // -----------------------------------------------------------------------

  /**
   * Parse a comma-separated string of format identifiers.
   *
   * Supported tokens:
   * - `"all"` or `"*"` -- returns every registered format
   * - A platform name (e.g. `"twitter"`) -- returns all formats for that platform
   * - A format id (e.g. `"og"`, `"twitter-card"`) -- returns that single format
   *
   * Unknown tokens are silently skipped.
   *
   * @example
   * ```ts
   * registry.parseFormatList('og, twitter, instagram-post');
   * ```
   */
  parseFormatList(formats: string): ImageFormat[] {
    const tokens = formats
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    // Fast path: return all
    if (tokens.includes('all') || tokens.includes('*')) {
      return this.getAll();
    }

    const platformNames = new Set<string>([
      'og',
      'twitter',
      'facebook',
      'instagram',
      'linkedin',
      'youtube',
      'pinterest',
      'email',
      'ads',
    ]);

    const seen = new Set<string>();
    const result: ImageFormat[] = [];

    for (const token of tokens) {
      // Check for exact id match first (even if it collides with a platform name
      // like 'og', we still prefer the id because 'og' is both a platform and
      // an id, and users expect the single format when they type 'og').
      const byId = this.byId[token];
      if (byId && !seen.has(byId.id)) {
        seen.add(byId.id);
        result.push(byId);
        continue;
      }

      // Platform expansion (skip 'og' here since it was already handled above)
      if (platformNames.has(token) && token !== 'og') {
        for (const f of this.getByPlatform(token as Platform)) {
          if (!seen.has(f.id)) {
            seen.add(f.id);
            result.push(f);
          }
        }
      }
    }

    return result;
  }
}

/**
 * Pre-built singleton using the default set of image formats.
 */
export const formatRegistry = new FormatRegistry(IMAGE_FORMATS);
