import type { CardConfig } from '../types';
import { presetColors } from '../data';

// ─── CR80 CARD DIMENSIONS ──────────────────────────────────
// Real credit card: 85.6mm × 53.98mm (ISO 7810 ID-1)
// Logical dimensions at ~12 px/mm; physical pixels = logical × TEX_SCALE
export const TEX_SCALE = 2;
export const H_WIDTH = 1024;
export const H_HEIGHT = 645;
export const V_WIDTH = 645;
export const V_HEIGHT = 1024;
export const CORNER_RADIUS = 38;

// Card font stack
export const CARD_MONO = '"IBM Plex Mono", "JetBrains Mono", "Courier New", monospace';
export const CARD_SANS = 'Inter, Arial, sans-serif';

export function getCanvasSize(orientation: 'horizontal' | 'vertical') {
  return orientation === 'horizontal'
    ? { w: H_WIDTH, h: H_HEIGHT }
    : { w: V_WIDTH, h: V_HEIGHT };
}

// Spatial hash noise for organic grain (replaces Math.random TV static)
export function valueNoise(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function hexLuminance(hex: string): number {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function getTextColor(config: CardConfig): string {
  if (config.textColorOverride) return config.textColorOverride;

  let bgColor = config.solidColor;
  if (config.colorMode === 'preset') {
    const preset = presetColors[config.presetColor];
    if (preset) bgColor = preset.value;
  } else if (config.colorMode === 'gradient') {
    bgColor = config.gradientConfig.stops[0]?.color || '#0F172A';
  }
  return hexLuminance(bgColor) > 0.6 ? '#1a1a1a' : '#ffffff';
}

export function getSubTextColor(config: CardConfig): string {
  const main = getTextColor(config);
  return main === '#ffffff' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';
}
