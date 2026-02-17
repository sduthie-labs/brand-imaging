export type Platform =
  | 'og'
  | 'twitter'
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'youtube'
  | 'pinterest'
  | 'email'
  | 'ads';

export type FormatCategory = 'social' | 'advertising' | 'email' | 'web';

export interface ImageFormat {
  /** Unique identifier, e.g. 'og', 'twitter-card', 'facebook-post' */
  id: string;
  /** Human-readable name */
  name: string;
  platform: Platform;
  category: FormatCategory;
  width: number;
  height: number;
  /** Reduced ratio string, e.g. '16:9' */
  aspectRatio: string;
  description?: string;
}
