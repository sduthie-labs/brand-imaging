import type { ImageFormat, FormatCategory, Platform } from '../types/format.js';

/**
 * Compute the greatest common divisor of two positive integers.
 */
function gcd(a: number, b: number): number {
  let x = a;
  let y = b;
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

/**
 * Return a reduced aspect ratio string such as '16:9'.
 */
function aspectRatio(width: number, height: number): string {
  const d = gcd(width, height);
  return `${width / d}:${height / d}`;
}

/**
 * Helper to build an ImageFormat with an auto-computed aspect ratio.
 */
function fmt(
  id: string,
  name: string,
  platform: Platform,
  category: FormatCategory,
  width: number,
  height: number,
  description?: string,
): ImageFormat {
  return {
    id,
    name,
    platform,
    category,
    width,
    height,
    aspectRatio: aspectRatio(width, height),
    description,
  };
}

// ---------------------------------------------------------------------------
// All 22 supported image formats
// ---------------------------------------------------------------------------

export const IMAGE_FORMATS: readonly ImageFormat[] = [
  // OG
  fmt('og', 'Open Graph', 'og', 'web', 1200, 630,
    'Default Open Graph image used by most social platforms'),

  // Twitter
  fmt('twitter-card', 'Twitter Card', 'twitter', 'social', 1200, 628,
    'Summary card with large image for Twitter/X'),
  fmt('twitter-header', 'Twitter Header', 'twitter', 'social', 1500, 500,
    'Profile header/banner image for Twitter/X'),
  fmt('twitter-post', 'Twitter Post', 'twitter', 'social', 1024, 512,
    'In-stream image for Twitter/X posts'),

  // Facebook
  fmt('facebook-post', 'Facebook Post', 'facebook', 'social', 1200, 630,
    'Shared link or status image for Facebook'),
  fmt('facebook-cover', 'Facebook Cover', 'facebook', 'social', 820, 312,
    'Profile or page cover photo for Facebook'),
  fmt('facebook-story', 'Facebook Story', 'facebook', 'social', 1080, 1920,
    'Full-screen vertical story for Facebook'),
  fmt('facebook-ad', 'Facebook Ad', 'facebook', 'advertising', 1200, 628,
    'Single image ad for Facebook Ads'),

  // Instagram
  fmt('instagram-post', 'Instagram Post', 'instagram', 'social', 1080, 1080,
    'Square feed post for Instagram'),
  fmt('instagram-story', 'Instagram Story', 'instagram', 'social', 1080, 1920,
    'Full-screen vertical story for Instagram'),
  fmt('instagram-landscape', 'Instagram Landscape', 'instagram', 'social', 1080, 566,
    'Landscape feed post for Instagram'),

  // LinkedIn
  fmt('linkedin-post', 'LinkedIn Post', 'linkedin', 'social', 1200, 627,
    'Shared post image for LinkedIn'),
  fmt('linkedin-cover', 'LinkedIn Cover', 'linkedin', 'social', 1128, 191,
    'Personal profile cover for LinkedIn'),
  fmt('linkedin-company', 'LinkedIn Company Cover', 'linkedin', 'social', 1128, 191,
    'Company page cover for LinkedIn'),

  // YouTube
  fmt('youtube-thumbnail', 'YouTube Thumbnail', 'youtube', 'social', 1280, 720,
    'Video thumbnail for YouTube'),
  fmt('youtube-channel-art', 'YouTube Channel Art', 'youtube', 'social', 2560, 1440,
    'Channel banner for YouTube'),

  // Pinterest
  fmt('pinterest-pin', 'Pinterest Pin', 'pinterest', 'social', 1000, 1500,
    'Standard vertical pin for Pinterest'),

  // Profile Pictures
  fmt('profile-pic', 'Profile Picture', 'og', 'social', 400, 400,
    'Square profile picture suitable for most platforms'),
  fmt('profile-pic-lg', 'Profile Picture Large', 'og', 'social', 800, 800,
    'Large square profile picture for YouTube and high-DPI displays'),

  // Email
  fmt('email-header', 'Email Header', 'email', 'email', 600, 200,
    'Header banner for HTML emails'),
  fmt('email-template', 'Email Template', 'email', 'email', 600, 800,
    'Full HTML email template (600px wide)'),

  // Ads
  fmt('ads-leaderboard', 'Leaderboard Ad', 'ads', 'advertising', 728, 90,
    'IAB leaderboard banner (728x90)'),
  fmt('ads-medium-rectangle', 'Medium Rectangle Ad', 'ads', 'advertising', 300, 250,
    'IAB medium rectangle (300x250)'),
  fmt('ads-skyscraper', 'Skyscraper Ad', 'ads', 'advertising', 160, 600,
    'IAB wide skyscraper (160x600)'),
  fmt('ads-billboard', 'Billboard Ad', 'ads', 'advertising', 970, 250,
    'IAB billboard (970x250)'),
] as const;

/**
 * Lookup map keyed by format `id` for O(1) access.
 */
export const FORMATS_MAP: Record<string, ImageFormat> = Object.fromEntries(
  IMAGE_FORMATS.map((f) => [f.id, f]),
);
