import { describe, it, expect } from 'vitest';
import {
  hexToRgb,
  rgbToHex,
  getContrastColor,
  adjustBrightness,
} from '../../src/utils/color.js';

describe('color utilities', () => {
  // ---------------------------------------------------------------------------
  // hexToRgb
  // ---------------------------------------------------------------------------

  describe('hexToRgb', () => {
    it('converts #ffffff to { r: 255, g: 255, b: 255 }', () => {
      expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('converts #000000 to { r: 0, g: 0, b: 0 }', () => {
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('converts #ff0000 to { r: 255, g: 0, b: 0 }', () => {
      expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('converts #00ff00 to { r: 0, g: 255, b: 0 }', () => {
      expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
    });

    it('converts #0000ff to { r: 0, g: 0, b: 255 }', () => {
      expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
    });
  });

  // ---------------------------------------------------------------------------
  // rgbToHex
  // ---------------------------------------------------------------------------

  describe('rgbToHex', () => {
    it('converts (255, 0, 0) to #ff0000', () => {
      expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
    });

    it('converts (0, 255, 0) to #00ff00', () => {
      expect(rgbToHex(0, 255, 0)).toBe('#00ff00');
    });

    it('converts (0, 0, 255) to #0000ff', () => {
      expect(rgbToHex(0, 0, 255)).toBe('#0000ff');
    });

    it('converts (255, 255, 255) to #ffffff', () => {
      expect(rgbToHex(255, 255, 255)).toBe('#ffffff');
    });

    it('converts (0, 0, 0) to #000000', () => {
      expect(rgbToHex(0, 0, 0)).toBe('#000000');
    });
  });

  // ---------------------------------------------------------------------------
  // getContrastColor
  // ---------------------------------------------------------------------------

  describe('getContrastColor', () => {
    it('returns #000000 for white background', () => {
      expect(getContrastColor('#ffffff')).toBe('#000000');
    });

    it('returns #ffffff for black background', () => {
      expect(getContrastColor('#000000')).toBe('#ffffff');
    });

    it('returns #ffffff for a dark color', () => {
      expect(getContrastColor('#1a1a2e')).toBe('#ffffff');
    });

    it('returns #000000 for a light color', () => {
      expect(getContrastColor('#f0f0f0')).toBe('#000000');
    });
  });

  // ---------------------------------------------------------------------------
  // adjustBrightness
  // ---------------------------------------------------------------------------

  describe('adjustBrightness', () => {
    it('increases brightness correctly', () => {
      const brighter = adjustBrightness('#808080', 50);
      const { r, g, b } = hexToRgb(brighter);
      // 128 + (128 * 50/100) = 128 + 64 = 192
      expect(r).toBe(192);
      expect(g).toBe(192);
      expect(b).toBe(192);
    });

    it('decreases brightness correctly', () => {
      const darker = adjustBrightness('#808080', -50);
      const { r, g, b } = hexToRgb(darker);
      // 128 - (128 * 50/100) = 128 - 64 = 64
      expect(r).toBe(64);
      expect(g).toBe(64);
      expect(b).toBe(64);
    });

    it('clamps values to 255 maximum', () => {
      const result = adjustBrightness('#ffffff', 100);
      const { r, g, b } = hexToRgb(result);
      expect(r).toBeLessThanOrEqual(255);
      expect(g).toBeLessThanOrEqual(255);
      expect(b).toBeLessThanOrEqual(255);
    });

    it('clamps values to 0 minimum', () => {
      const result = adjustBrightness('#000000', -100);
      const { r, g, b } = hexToRgb(result);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(g).toBeGreaterThanOrEqual(0);
      expect(b).toBeGreaterThanOrEqual(0);
    });
  });
});
