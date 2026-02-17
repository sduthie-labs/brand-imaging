import Handlebars from 'handlebars';

/**
 * Register additional Handlebars helpers for use in templates.
 */
export function registerTemplateHelpers(
  instance: typeof Handlebars,
): void {
  /**
   * Format a date string or timestamp.
   * Usage: {{dateFormat "2024-01-15" "short"}}
   * Styles: "short" (Jan 15, 2024), "long" (January 15, 2024), "iso" (2024-01-15)
   */
  instance.registerHelper(
    'dateFormat',
    function (value: unknown, style: unknown): string {
      if (!value) return '';

      let date: Date;
      if (value instanceof Date) {
        date = value;
      } else if (typeof value === 'number') {
        date = new Date(value);
      } else {
        date = new Date(String(value));
      }

      if (isNaN(date.getTime())) return String(value);

      const formatStyle =
        typeof style === 'string' ? style : 'short';

      switch (formatStyle) {
        case 'long':
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        case 'iso':
          return date.toISOString().split('T')[0];
        case 'short':
        default:
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
      }
    },
  );

  /**
   * Extract initials from a string (first letter of each word).
   * Usage: {{initials "Jane Developer"}} => "JD"
   */
  instance.registerHelper(
    'initials',
    function (str: unknown): string {
      const text = String(str ?? '').trim();
      if (!text) return '';
      return text
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase())
        .join('');
    },
  );

  /**
   * Convert newline characters to <br> tags for HTML rendering.
   * Usage: {{{lineBreak description}}}
   */
  instance.registerHelper(
    'lineBreak',
    function (str: unknown): string {
      const text = String(str ?? '');
      return text.replace(/\n/g, '<br>');
    },
  );

  /**
   * Repeat a block N times.
   * Usage: {{#repeat 5}}...{{/repeat}}
   */
  instance.registerHelper(
    'repeat',
    function (this: unknown, count: unknown, options: Handlebars.HelperOptions): string {
      const n = typeof count === 'number' ? count : parseInt(String(count), 10);
      if (isNaN(n) || n <= 0) return '';
      let result = '';
      for (let i = 0; i < n; i++) {
        result += options.fn({ index: i, first: i === 0, last: i === n - 1 });
      }
      return result;
    },
  );

  /**
   * Capitalize the first letter of a string.
   * Usage: {{capitalize "hello world"}} => "Hello world"
   */
  instance.registerHelper(
    'capitalize',
    function (str: unknown): string {
      const text = String(str ?? '');
      if (!text) return '';
      return text.charAt(0).toUpperCase() + text.slice(1);
    },
  );
}
