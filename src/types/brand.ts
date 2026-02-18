export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  background: string;
  /** Allow custom named colors */
  [key: string]: string;
}

export interface BrandFont {
  family: string;
  fallback: string;
  weight?: number | string;
  style?: string;
  /** Path to a local woff2 file */
  localFile?: string;
  /** URL to a web font source (e.g. Google Fonts) for email templates */
  source?: string;
}

export interface BrandTypography {
  heading: BrandFont;
  body: BrandFont;
  accent?: BrandFont;
}

export interface BrandLogos {
  /** Path to primary logo file */
  primary?: string;
  /** Logo variant for light backgrounds */
  light?: string;
  /** Logo variant for dark backgrounds */
  dark?: string;
  /** Square icon / favicon variant */
  icon?: string;
}

export interface BrandKit {
  name: string;
  version?: string;
  colors: BrandColors;
  typography: BrandTypography;
  logos: BrandLogos;
  defaults?: {
    format?: string;
    quality?: number;
    scaleFactor?: number;
  };
}
