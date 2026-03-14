import type { CardConfig } from './types';
import { presetColors } from './data';

export type WarningSeverity = 'info' | 'warning';

export interface BrandWarning {
  id: string;
  severity: WarningSeverity;
  message: string;
  field: string;
}

// ─── Color Utilities ─────────────────────────────────────────

function hexLuminance(hex: string): number {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function getEffectiveBgColor(config: CardConfig): string {
  if (config.colorMode === 'preset') {
    const preset = presetColors[config.presetColor];
    return preset?.value || '#0F172A';
  }
  if (config.colorMode === 'gradient') {
    return config.gradientConfig.stops[0]?.color || '#0F172A';
  }
  return config.solidColor;
}

function getEffectiveTextColor(config: CardConfig): string {
  if (config.textColorOverride) return config.textColorOverride;
  const bg = getEffectiveBgColor(config);
  return hexLuminance(bg) > 0.6 ? '#1a1a1a' : '#ffffff';
}

// WCAG relative luminance (different from perceived brightness)
function srgbToLinear(c: number): number {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function wcagLuminance(hex: string): number {
  const c = hex.replace('#', '');
  const r = srgbToLinear(parseInt(c.substring(0, 2), 16) / 255);
  const g = srgbToLinear(parseInt(c.substring(2, 4), 16) / 255);
  const b = srgbToLinear(parseInt(c.substring(4, 6), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = wcagLuminance(hex1);
  const l2 = wcagLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ─── Rules ───────────────────────────────────────────────────

const PREMIUM_TIERS = ['centurion', 'infinite', 'world_elite', 'the_class'];

type BrandRule = (config: CardConfig) => BrandWarning | null;

const rules: BrandRule[] = [
  // AmEx Centurion should be dark
  (config) => {
    if (config.network !== 'amex' || config.tier !== 'centurion') return null;
    const bg = getEffectiveBgColor(config);
    if (hexLuminance(bg) <= 0.35) return null;
    return {
      id: 'amex-centurion-dark',
      severity: 'warning',
      message: 'Centurion cards traditionally use dark colors (black/charcoal)',
      field: 'colorMode',
    };
  },

  // AmEx Platinum should be silver/grey
  (config) => {
    if (config.network !== 'amex' || config.tier !== 'platinum') return null;
    const bg = getEffectiveBgColor(config);
    const hsl = hexToHSL(bg);
    if (hsl.s <= 15 && hsl.l >= 40 && hsl.l <= 80) return null;
    return {
      id: 'amex-platinum-silver',
      severity: 'info',
      message: 'Amex Platinum typically uses silver or metallic grey tones',
      field: 'colorMode',
    };
  },

  // AmEx Gold should be warm tones
  (config) => {
    if (config.network !== 'amex' || config.tier !== 'gold') return null;
    const bg = getEffectiveBgColor(config);
    const hsl = hexToHSL(bg);
    if (hsl.h >= 20 && hsl.h <= 50 && hsl.s >= 20) return null;
    return {
      id: 'amex-gold-gold',
      severity: 'info',
      message: 'Amex Gold traditionally uses gold or rose gold tones',
      field: 'colorMode',
    };
  },

  // Physical cards need a chip
  (config) => {
    if (config.chipStyle !== 'none' || config.cardType === 'virtual') return null;
    return {
      id: 'chip-missing',
      severity: 'warning',
      message: 'Physical cards require an EMV chip',
      field: 'chipStyle',
    };
  },

  // Contactless recommended
  (config) => {
    if (config.contactless || config.cardType === 'virtual') return null;
    return {
      id: 'contactless-missing',
      severity: 'info',
      message: 'Most modern cards include contactless (NFC)',
      field: 'contactless',
    };
  },

  // Numberless + credit is unusual
  (config) => {
    if (!config.numberless || config.cardType !== 'credit') return null;
    return {
      id: 'numberless-credit',
      severity: 'info',
      message: 'Numberless designs are typically debit or prepaid',
      field: 'numberless',
    };
  },

  // Premium tiers often have number on back
  (config) => {
    if (config.numberless) return null;
    if (config.numberPosition !== 'standard') return null;
    if (!PREMIUM_TIERS.includes(config.tier)) return null;
    return {
      id: 'premium-number-front',
      severity: 'info',
      message: 'Premium cards often move the number to the back',
      field: 'numberPosition',
    };
  },

  // Text contrast check
  (config) => {
    const bg = getEffectiveBgColor(config);
    const text = getEffectiveTextColor(config);
    if (contrastRatio(bg, text) >= 3.0) return null;
    return {
      id: 'text-contrast',
      severity: 'warning',
      message: 'Card text may be hard to read against this background',
      field: 'textColorOverride',
    };
  },

  // Vertical cards suit lower-center number placement
  (config) => {
    if (config.numberless) return null;
    if (config.orientation !== 'vertical') return null;
    if (config.numberPosition !== 'standard') return null;
    return {
      id: 'vertical-standard',
      severity: 'info',
      message: 'Vertical cards often use lower-center number placement',
      field: 'numberPosition',
    };
  },
];

export function validateBrandGuidelines(config: CardConfig): BrandWarning[] {
  return rules.map(rule => rule(config)).filter((w): w is BrandWarning => w !== null);
}
