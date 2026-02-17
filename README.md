# brand-imaging

Automated brand image generation from templates. Brand-imaging takes HTML/CSS templates, injects dynamic content via Handlebars, renders them with a pooled Puppeteer fleet, and exports production-ready images through Sharp. It is built for teams that need consistent, on-brand visuals at scale without opening a design tool every time.

The system is organized around two concepts: **brand kits** (colors, fonts, logos, tokens) and **templates** (HTML layouts that consume those tokens). You define your brand once, create or customize templates for each format, and then generate hundreds of correctly sized, optimized images with a single command. A live preview server with hot reload makes template development fast.

Brand-imaging supports 22 image formats out of the box, covering social media platforms, advertising networks, email headers, and print-ready exports. Every format is defined declaratively, so adding custom sizes is trivial.

## Features

- **Template-driven rendering** -- Handlebars templates with full access to brand tokens, content variables, and helper functions.
- **22 built-in formats** -- Social posts, stories, ads, OG images, email banners, and more.
- **Brand kit system** -- Centralized brand definitions (colors, typography, logos) shared across all templates.
- **Pooled browser rendering** -- Puppeteer instance pooling via generic-pool for fast concurrent generation.
- **Image optimization** -- Sharp pipeline with format conversion, compression, and resize controls.
- **Live preview server** -- Express + WebSocket server with hot reload for rapid template iteration.
- **Batch processing** -- Generate all formats for a template in parallel with progress reporting.
- **CLI-first design** -- Full-featured CLI with generate, batch, list, preview, and init commands.
- **Schema validation** -- Zod schemas validate brand kits, templates, and configuration at load time.
- **Visual regression testing** -- Pixelmatch-based snapshot comparison for CI pipelines.

## Quick Start

```bash
# Install dependencies
npm install

# Initialize a new brand kit
npx brand-imaging init --brand my-brand

# Preview a template with live reload
npx brand-imaging preview --template social-post --brand my-brand

# Generate a single image
npx brand-imaging generate --template social-post --format instagram-square --brand my-brand

# Batch generate all formats
npx brand-imaging batch --template social-post --brand my-brand --output ./output
```

### Development

```bash
npm run dev          # Watch mode with tsx
npm run build        # Compile TypeScript
npm run test         # Run test suite
npm run test:watch   # Watch mode tests
npm run lint         # Lint source files
npm run format       # Format with Prettier
```

## CLI Commands

### `generate`

Render a single template to a specific format.

```
brand-imaging generate --template <name> --format <format> --brand <brand> [--output <dir>] [--data <json>]
```

| Flag | Description | Default |
|------|-------------|---------|
| `--template`, `-t` | Template name | required |
| `--format`, `-f` | Output format (see table below) | required |
| `--brand`, `-b` | Brand kit to use | required |
| `--output`, `-o` | Output directory | `./output` |
| `--data`, `-d` | JSON string or file path for template variables | `{}` |
| `--quality`, `-q` | Image quality (1-100) | `90` |

### `batch`

Generate all (or selected) formats for a template.

```
brand-imaging batch --template <name> --brand <brand> [--formats <list>] [--concurrency <n>]
```

| Flag | Description | Default |
|------|-------------|---------|
| `--template`, `-t` | Template name | required |
| `--brand`, `-b` | Brand kit to use | required |
| `--formats` | Comma-separated format list | all formats |
| `--concurrency`, `-c` | Parallel renders | `4` |
| `--output`, `-o` | Output directory | `./output` |

### `list`

List available templates, formats, or brand kits.

```
brand-imaging list [templates|formats|brands]
```

### `preview`

Start a live preview server with hot reload.

```
brand-imaging preview --template <name> --brand <brand> [--port <n>]
```

| Flag | Description | Default |
|------|-------------|---------|
| `--template`, `-t` | Template to preview | required |
| `--brand`, `-b` | Brand kit to use | required |
| `--port`, `-p` | Server port | `3200` |
| `--format`, `-f` | Preview format | `og-image` |

### `init`

Scaffold a new brand kit or template.

```
brand-imaging init --brand <name>
brand-imaging init --template <name>
```

## Supported Formats

| Format | Dimensions | Category |
|--------|-----------|----------|
| `instagram-square` | 1080 x 1080 | Social |
| `instagram-portrait` | 1080 x 1350 | Social |
| `instagram-story` | 1080 x 1920 | Social |
| `facebook-post` | 1200 x 630 | Social |
| `facebook-cover` | 1640 x 924 | Social |
| `facebook-story` | 1080 x 1920 | Social |
| `twitter-post` | 1600 x 900 | Social |
| `twitter-header` | 1500 x 500 | Social |
| `linkedin-post` | 1200 x 627 | Social |
| `linkedin-cover` | 1584 x 396 | Social |
| `pinterest-pin` | 1000 x 1500 | Social |
| `youtube-thumbnail` | 1280 x 720 | Video |
| `youtube-banner` | 2560 x 1440 | Video |
| `og-image` | 1200 x 630 | Web |
| `email-header` | 600 x 200 | Email |
| `email-banner` | 600 x 400 | Email |
| `google-display-leaderboard` | 728 x 90 | Ads |
| `google-display-medium-rect` | 300 x 250 | Ads |
| `google-display-wide-sky` | 160 x 600 | Ads |
| `google-display-large-rect` | 336 x 280 | Ads |
| `print-a4` | 2480 x 3508 | Print |
| `print-letter` | 2550 x 3300 | Print |

## Template System

Templates live in the `templates/` directory. Each template is a folder containing:

```
templates/
  social-post/
    template.html      # Handlebars HTML template
    styles.css         # Template-specific styles
    config.yaml        # Template metadata and default variables
```

The `template.html` file has access to all brand kit tokens and any variables passed via `--data` or defined in `config.yaml`. Handlebars helpers are available for common operations like color manipulation, date formatting, and text truncation.

```handlebars
<div class="card" style="background: {{brand.colors.primary}}">
  <img src="{{brand.logo}}" alt="{{brand.name}}" />
  <h1 style="font-family: {{brand.fonts.heading}}">{{title}}</h1>
  <p>{{description}}</p>
</div>
```

## Brand Kit

Brand kits live in the `brand-kits/` directory. Each brand kit contains a `brand.yaml` definition and associated assets:

```
brand-kits/
  my-brand/
    brand.yaml         # Brand definition (colors, fonts, metadata)
    logos/
      primary.svg
      icon.svg
    fonts/
      heading.woff2
      body.woff2
```

The `brand.yaml` file defines all brand tokens consumed by templates:

```yaml
name: My Brand
colors:
  primary: "#6366F1"
  secondary: "#EC4899"
  background: "#0F172A"
  surface: "#1E293B"
  text: "#F8FAFC"
  accent: "#22D3EE"
fonts:
  heading: Inter
  body: Inter
  mono: JetBrains Mono
logo:
  primary: logos/primary.svg
  icon: logos/icon.svg
```

All token values are validated against Zod schemas at load time, so configuration errors surface immediately with clear messages.
