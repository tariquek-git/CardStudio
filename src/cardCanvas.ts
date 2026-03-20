import type { CardConfig, CardNetwork } from './types';
import {
  getCardNumber,
  getCvvDisplay,
  presetColors,
  networkNames,
  networkTierConfig,
} from './data';
import { needsCustomLayout, drawCustomLayout } from './rails/cardLayouts';

// ─── CR80 CARD DIMENSIONS ──────────────────────────────────
// Real credit card: 85.6mm × 53.98mm (ISO 7810 ID-1)
// Logical dimensions at ~12 px/mm; physical pixels = logical × TEX_SCALE
export const TEX_SCALE = 2;
const H_WIDTH = 1024;
const H_HEIGHT = 645;
const V_WIDTH = 645;
const V_HEIGHT = 1024;
const CORNER_RADIUS = 38;

// Card font stack
const CARD_MONO = '"IBM Plex Mono", "JetBrains Mono", "Courier New", monospace';
const CARD_SANS = 'Inter, Arial, sans-serif';

function getCanvasSize(orientation: 'horizontal' | 'vertical') {
  return orientation === 'horizontal'
    ? { w: H_WIDTH, h: H_HEIGHT }
    : { w: V_WIDTH, h: V_HEIGHT };
}

// Spatial hash noise for organic grain (replaces Math.random TV static)
function valueNoise(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
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

function roundedRect(
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

// ─── LOGO PRELOADING ────────────────────────────────────────
const logoCache: Record<string, HTMLImageElement> = {};
const logoLoadPromises: Record<string, Promise<HTMLImageElement>> = {};

function loadLogo(src: string): Promise<HTMLImageElement> {
  if (src in logoLoadPromises) return logoLoadPromises[src];
  const promise = new Promise<HTMLImageElement>((resolve) => {
    if (logoCache[src]) {
      resolve(logoCache[src]);
      return;
    }
    const img = new Image();
    img.onload = () => {
      logoCache[src] = img;
      resolve(img);
    };
    img.onerror = () => resolve(img);
    img.src = src;
  });
  logoLoadPromises[src] = promise;
  return promise;
}

const networks: CardNetwork[] = ['visa', 'mastercard', 'amex', 'discover', 'interac', 'unionpay', 'jcb', 'maestro'];
for (const n of networks) {
  loadLogo(`/logos/${n}.svg`);
}
loadLogo('/logos/visa-white.svg');

// ─── QR CODE CACHE ──────────────────────────────────────────
let qrCanvasCache: HTMLCanvasElement | null = null;
let qrCacheUrl = '';

async function generateQrCanvas(url: string): Promise<HTMLCanvasElement | null> {
  if (!url.trim()) { qrCanvasCache = null; qrCacheUrl = ''; return null; }
  if (url === qrCacheUrl && qrCanvasCache) return qrCanvasCache;
  try {
    const QRCode = (await import('qrcode')).default;
    const canvas = document.createElement('canvas');
    await QRCode.toCanvas(canvas, url, { width: 200, margin: 0, color: { dark: '#000000', light: '#ffffff' } });
    qrCanvasCache = canvas;
    qrCacheUrl = url;
    return canvas;
  } catch {
    qrCanvasCache = null;
    qrCacheUrl = '';
    return null;
  }
}

// Back-of-card ATM network logos
const backLogoIds = ['cirrus', 'plus', 'star', 'pulse'];
for (const id of backLogoIds) {
  loadLogo(`/logos/${id}.svg`);
}

function getLogoSrc(network: CardNetwork, isLightText: boolean): string {
  if (network === 'visa' && isLightText) return '/logos/visa-white.svg';
  return `/logos/${network}.svg`;
}

// ─── BACKGROUND ─────────────────────────────────────────────
function fillCardBackground(
  ctx: CanvasRenderingContext2D,
  config: CardConfig,
  w: number,
  h: number,
) {
  if (config.colorMode === 'gradient') {
    const { stops, angle } = config.gradientConfig;
    // Convert CSS-style angle (0=up, clockwise) to canvas coordinates
    const rad = ((angle - 90) * Math.PI) / 180;
    const cx = w / 2, cy = h / 2;
    const len = Math.sqrt(w * w + h * h) / 2;
    const x0 = cx - Math.cos(rad) * len;
    const y0 = cy - Math.sin(rad) * len;
    const x1 = cx + Math.cos(rad) * len;
    const y1 = cy + Math.sin(rad) * len;
    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    const sorted = [...stops].sort((a, b) => a.position - b.position);
    for (const s of sorted) {
      grad.addColorStop(s.position / 100, s.color);
    }
    ctx.fillStyle = grad;
  } else if (config.colorMode === 'preset') {
    const preset = presetColors[config.presetColor];
    if (preset?.gradient) {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, preset.gradient[0]);
      grad.addColorStop(1, preset.gradient[1]);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = preset?.value || '#0F172A';
    }
  } else {
    ctx.fillStyle = config.solidColor;
  }
  ctx.fill();
}

export function hexLuminance(hex: string): number {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function getTextColor(config: CardConfig): string {
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

function getSubTextColor(config: CardConfig): string {
  const main = getTextColor(config);
  return main === '#ffffff' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';
}

// ─── SHEEN / DEPTH EFFECTS ──────────────────────────────────
function drawCardSheen(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Subtle top-edge highlight
  const sheen = ctx.createLinearGradient(0, 0, 0, h * 0.35);
  sheen.addColorStop(0, 'rgba(255,255,255,0.08)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h * 0.35);

  // Inner edge highlight (1px)
  ctx.save();
  roundedRect(ctx, 1, 1, w - 2, h - 2, CORNER_RADIUS - 1);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

// ─── CHIP DRAWING ────────────────────────────────────────────
function drawChip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  style: 'gold' | 'silver' | 'black' | 'none',
) {
  if (style === 'none') return;

  // Chip sized to match visual references (~10mm × 8.5mm)
  const w = 120;
  const h = 105;
  const r = 12;

  const colors: Record<string, { bg: string; line: string; hi: string }> = {
    gold: { bg: '#D4A847', line: '#B8922D', hi: '#E8C56A' },
    silver: { bg: '#C0C0C0', line: '#999999', hi: '#E0E0E0' },
    black: { bg: '#2a2a2a', line: '#1a1a1a', hi: '#444444' },
  };

  const c = colors[style];
  ctx.save();

  // Drop shadow for raised chip look
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 3;

  roundedRect(ctx, x, y, w, h, r);
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, c.hi);
  grad.addColorStop(0.4, c.bg);
  grad.addColorStop(1, c.line);
  ctx.fillStyle = grad;
  ctx.fill();

  // Reset shadow before drawing details
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Inset border for raised-edge bevel
  ctx.strokeStyle = c.hi;
  ctx.lineWidth = 1.5;
  roundedRect(ctx, x + 1, y + 1, w - 2, h - 2, r - 1);
  ctx.stroke();

  // Contact pad pattern (ISO 7816)
  ctx.strokeStyle = c.line;
  ctx.lineWidth = 3;
  const p = 6;
  const lCol = x + w * 0.30;
  const rCol = x + w * 0.70;

  ctx.beginPath();
  ctx.moveTo(lCol, y + p);
  ctx.lineTo(lCol, y + h - p);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(rCol, y + p);
  ctx.lineTo(rCol, y + h - p);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + p, y + h * 0.5);
  ctx.lineTo(x + w - p, y + h * 0.5);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + p, y + h * 0.25);
  ctx.lineTo(lCol, y + h * 0.25);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + p, y + h * 0.75);
  ctx.lineTo(lCol, y + h * 0.75);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(rCol, y + h * 0.25);
  ctx.lineTo(x + w - p, y + h * 0.25);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(rCol, y + h * 0.75);
  ctx.lineTo(x + w - p, y + h * 0.75);
  ctx.stroke();

  // Central pad rectangle
  ctx.lineWidth = 2;
  roundedRect(ctx, lCol + 3, y + h * 0.35, rCol - lCol - 6, h * 0.30, 3);
  ctx.stroke();

  ctx.restore();
}

// ─── CONTACTLESS SYMBOL ──────────────────────────────────────
function drawContactless(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.7;

  const arcs = [16, 26, 36];
  for (const r of arcs) {
    ctx.beginPath();
    ctx.arc(x, y, r, -Math.PI * 0.35, Math.PI * 0.35);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ─── EMBOSS TEXT HELPERS ─────────────────────────────────
function drawEmbossedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  isLightText: boolean,
) {
  ctx.save();
  // Shadow (below) — simulates emboss depth
  ctx.fillStyle = isLightText ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)';
  ctx.fillText(text, x + 2.5, y + 3);
  // Highlight (above) — simulates light catch
  ctx.fillStyle = isLightText ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.45)';
  ctx.fillText(text, x - 1.2, y - 1.5);
  // Main text
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawCardNumberGroups(
  ctx: CanvasRenderingContext2D,
  number: string,
  x: number,
  y: number,
  color: string,
  isLightText: boolean,
) {
  const groups = number.split(' ');
  let currentX = x;
  const groupGap = 24;
  for (const group of groups) {
    drawEmbossedText(ctx, group, currentX, y, color, isLightText);
    currentX += ctx.measureText(group).width + groupGap;
  }
}

// ─── NETWORK LOGO POSITIONS ─────────────────────────────────
// Reference: Visa top-right, Mastercard bottom-right, Amex top-right
function getNetworkLogoRect(
  network: CardNetwork,
  orientation: 'horizontal' | 'vertical',
  w: number,
  h: number,
  position: 'front' | 'back' = 'front',
): { x: number; y: number; width: number; height: number } {
  const isH = orientation === 'horizontal';
  const pad = isH ? 40 : 30;

  if (position === 'back') {
    // Small logo bottom-right on back
    return { x: w - 70 - pad, y: h - 45 - pad, width: 70, height: 45 };
  }

  // Front face positions — based on reference card layouts
  switch (network) {
    case 'visa':
      // Top-right per Visa brand guidelines
      return { x: w - 160 - pad, y: pad - 5, width: 160, height: 60 };
    case 'amex':
      // Top-right
      return { x: w - 100 - pad, y: pad - 5, width: 100, height: 62 };
    case 'discover':
      // Bottom-right
      return { x: w - 150 - pad, y: h - 50 - pad, width: 150, height: 50 };
    case 'mastercard':
    case 'maestro':
      // Bottom-right (overlapping circles)
      return { x: w - 120 - pad, y: h - 80 - pad, width: 120, height: 80 };
    case 'interac':
      return { x: w - 120 - pad, y: h - 50 - pad, width: 120, height: 50 };
    default:
      return { x: w - 120 - pad, y: h - 80 - pad, width: 120, height: 80 };
  }
}

// ─── FRONT FACE ─────────────────────────────────────────────
export function drawCardFront(canvas: HTMLCanvasElement, config: CardConfig) {
  // Dispatch to custom layout for non-standard-card rails (document, mobile, virtual)
  if (needsCustomLayout(config)) {
    drawCustomLayout(canvas, config);
    return;
  }

  const { w, h } = getCanvasSize(config.orientation);
  const pw = w * TEX_SCALE, ph = h * TEX_SCALE;
  // Only reset dimensions when they actually change to avoid
  // clearing the canvas buffer and breaking WebGL texture binding
  if (canvas.width !== pw) canvas.width = pw;
  if (canvas.height !== ph) canvas.height = ph;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, pw, ph);

  ctx.save();
  ctx.scale(TEX_SCALE, TEX_SCALE);
  roundedRect(ctx, 0, 0, w, h, CORNER_RADIUS);
  ctx.clip();

  // Background
  roundedRect(ctx, 0, 0, w, h, CORNER_RADIUS);
  fillCardBackground(ctx, config, w, h);

  // Carbon fiber pattern
  if (config.colorMode === 'preset' && config.presetColor === 'carbonFiber') {
    drawCarbonFiber(ctx, w, h);
  }

  // Card art overlay
  if (config.cardArt) {
    const artImg = logoCache[config.cardArt];
    if (artImg?.complete && artImg.naturalWidth > 0) {
      const imgW = artImg.naturalWidth;
      const imgH = artImg.naturalHeight;
      ctx.save();
      ctx.globalAlpha = (config.cardArtOpacity ?? 90) / 100;

      // Blend mode
      const blend = config.cardArtBlend ?? 'normal';
      if (blend !== 'normal') {
        ctx.globalCompositeOperation = blend;
      }

      // Blur
      if ((config.cardArtBlur ?? 0) > 0) {
        ctx.filter = `blur(${config.cardArtBlur}px)`;
      }

      // Fit calculation
      let drawX: number, drawY: number, drawW: number, drawH: number;
      const fit = config.cardArtFit ?? 'cover';
      if (fit === 'fill') {
        drawX = 0; drawY = 0; drawW = w; drawH = h;
      } else {
        const scaleFn = fit === 'contain' ? Math.min : Math.max;
        const scale = scaleFn(w / imgW, h / imgH);
        drawW = imgW * scale;
        drawH = imgH * scale;
        drawX = (w - drawW) / 2;
        drawY = (h - drawH) / 2;
      }

      // Position offset (% of card dimensions)
      drawX += ((config.cardArtOffsetX ?? 0) / 100) * w;
      drawY += ((config.cardArtOffsetY ?? 0) / 100) * h;

      ctx.drawImage(artImg, drawX, drawY, drawW, drawH);
      ctx.restore();

      // Tint overlay
      if (config.cardArtTint) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = config.cardArtTint;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
    }
  }

  // Sheen overlay
  drawCardSheen(ctx, w, h);

  const textColor = getTextColor(config);
  const subTextColor = getSubTextColor(config);
  const isLightText = textColor === '#ffffff';
  const isH = config.orientation === 'horizontal';

  // ── Layout based on reference card images ──
  // Tight padding: ~4-5% of card dimensions
  const pad = Math.round(isH ? w * 0.045 : w * 0.05);   // ~46px horizontal
  const padV = Math.round(isH ? h * 0.06 : h * 0.04);    // ~39px vertical

  ctx.textBaseline = 'top';

  // ── Row 1: Issuer Name/Logo (top-left) + Network Logo (top-right for Visa/Amex) ──
  ctx.font = `600 ${isH ? 28 : 22}px ${CARD_SANS}`;
  ctx.fillStyle = textColor;
  if (config.issuerLogo) {
    const issuerImg = logoCache[config.issuerLogo];
    if (issuerImg?.complete && issuerImg.naturalWidth > 0) {
      ctx.drawImage(issuerImg, pad, padV, 150, 40);
    } else {
      ctx.fillText(config.issuerName, pad, padV);
    }
  } else {
    ctx.fillText(config.issuerName, pad, padV);
  }

  // Program name below issuer name
  if (config.programName) {
    ctx.font = `700 ${isH ? 13 : 10}px ${CARD_SANS}`;
    ctx.fillStyle = subTextColor;
    ctx.letterSpacing = '2px';
    ctx.fillText(config.programName.toUpperCase(), pad, padV + (isH ? 34 : 26));
    ctx.letterSpacing = '0px';
  }

  // Network Logo
  const logoSrc = getLogoSrc(config.network, isLightText);
  const logoImg = logoCache[logoSrc];
  const logoRect = getNetworkLogoRect(config.network, config.orientation, w, h, 'front');
  if (logoImg?.complete && logoImg.naturalWidth > 0) {
    ctx.drawImage(logoImg, logoRect.x, logoRect.y, logoRect.width, logoRect.height);
  }

  // Tier text near network logo
  if (config.tier && networkTierConfig[config.network]) {
    const tierInfo = networkTierConfig[config.network]?.find(t => t.id === config.tier);
    if (tierInfo) {
      ctx.font = `700 ${isH ? 11 : 9}px ${CARD_SANS}`;
      ctx.fillStyle = subTextColor;
      ctx.letterSpacing = '1.5px';
      ctx.textAlign = 'right';
      ctx.fillText(tierInfo.label, logoRect.x + logoRect.width, logoRect.y + logoRect.height + (isH ? 8 : 6));
      ctx.textAlign = 'left';
      ctx.letterSpacing = '0px';
    }
  }

  // ── Card Level Badge (below tier, near network logo) ──
  if (config.cardLevelBadge) {
    const tierInfo = networkTierConfig[config.network]?.find(t => t.id === config.tier);
    const badgeY = logoRect.y + logoRect.height + (tierInfo ? (isH ? 22 : 18) : (isH ? 8 : 6));
    ctx.font = `700 ${isH ? 10 : 8}px ${CARD_SANS}`;
    ctx.fillStyle = subTextColor;
    ctx.letterSpacing = '1.5px';
    ctx.textAlign = 'right';
    ctx.fillText(config.cardLevelBadge.toUpperCase(), logoRect.x + logoRect.width, badgeY);
    ctx.textAlign = 'left';
    ctx.letterSpacing = '0px';
  }

  // ── Dual Interface Badge (DEBIT/CREDIT near top-right area) ──
  if (config.dualInterfaceBadge) {
    const badgeText = config.cardType.toUpperCase();
    ctx.font = `700 ${isH ? 11 : 9}px ${CARD_SANS}`;
    ctx.letterSpacing = '2px';
    ctx.fillStyle = textColor;
    ctx.globalAlpha = 0.6;
    const badgeX = isH ? w - pad - ctx.measureText(badgeText).width : w - pad - ctx.measureText(badgeText).width;
    const badgeY = isH ? h - pad - 10 : h - pad - 8;
    ctx.fillText(badgeText, badgeX, badgeY);
    ctx.globalAlpha = 1;
    ctx.letterSpacing = '0px';
  }

  // ── Co-Brand Logo (bottom-left on front) ──
  if (config.coBrandLogo) {
    const cbImg = logoCache[config.coBrandLogo];
    if (cbImg?.complete && cbImg.naturalWidth > 0) {
      const cbH = isH ? 36 : 28;
      const cbW = (cbImg.naturalWidth / cbImg.naturalHeight) * cbH;
      ctx.drawImage(cbImg, pad, h - pad - cbH, cbW, cbH);
    }
  } else if (config.coBrandPartner) {
    ctx.font = `600 ${isH ? 12 : 10}px ${CARD_SANS}`;
    ctx.fillStyle = subTextColor;
    ctx.letterSpacing = '1px';
    ctx.fillText(config.coBrandPartner.toUpperCase(), pad, h - pad - (isH ? 8 : 6));
    ctx.letterSpacing = '0px';
  }

  // ── Row 2: EMV Chip + Contactless (vertically centered upper zone) ──
  const chipW = 120;
  const chipH = 105;
  const chipX = pad;
  const chipY = isH ? Math.round(h * 0.28) : Math.round(h * 0.22);
  if (config.chipStyle !== 'none') {
    drawChip(ctx, chipX, chipY, config.chipStyle);

    if (config.contactless) {
      drawContactless(ctx, chipX + chipW + 22, chipY + chipH / 2, textColor);
    }
  }

  const numPos = config.numberPosition ?? 'standard';
  if (!config.numberless && numPos !== 'back-only') {
    const number = getCardNumber(config.network, config.cardNumberDisplay, config.customCardNumber);

    if (numPos === 'standard') {
      // ── Standard: Number center-left, name + expiry bottom row ──
      const numY = isH ? Math.round(h * 0.56) : Math.round(h * 0.42);
      if (number) {
        ctx.font = `600 ${isH ? 48 : 38}px ${CARD_MONO}`;
        ctx.letterSpacing = '4px';
        drawCardNumberGroups(ctx, number, pad, numY, textColor, isLightText);
        ctx.letterSpacing = '0px';
      }
      const bottomY = isH ? Math.round(h * 0.78) : Math.round(h * 0.60);
      ctx.font = `500 ${isH ? 22 : 17}px ${CARD_MONO}`;
      ctx.letterSpacing = '1.5px';
      drawEmbossedText(ctx, config.cardholderName, pad, bottomY, textColor, isLightText);
      ctx.letterSpacing = '0px';
      const expiryBlockRight = isH ? w - pad - 140 : w - pad - 100;
      ctx.font = `500 ${isH ? 10 : 9}px ${CARD_SANS}`;
      ctx.fillStyle = subTextColor;
      if (config.bilingualRequired) {
        ctx.fillText('VALIDE', expiryBlockRight, bottomY - 1);
        ctx.fillText('JUSQU\u2019AU', expiryBlockRight, bottomY + (isH ? 12 : 10));
      } else {
        ctx.fillText('VALID', expiryBlockRight, bottomY - 1);
        ctx.fillText('THRU', expiryBlockRight, bottomY + (isH ? 12 : 10));
      }
      ctx.font = `600 ${isH ? 22 : 17}px ${CARD_MONO}`;
      const labelW = isH ? 40 : 34;
      drawEmbossedText(ctx, config.expiryDate, expiryBlockRight + labelW, bottomY, textColor, isLightText);

    } else if (numPos === 'lower-center') {
      // ── Lower Center: Number centered lower, name below ──
      const numY = isH ? Math.round(h * 0.72) : Math.round(h * 0.58);
      if (number) {
        ctx.font = `600 ${isH ? 38 : 30}px ${CARD_MONO}`;
        ctx.letterSpacing = '4px';
        ctx.textAlign = 'center';
        drawEmbossedText(ctx, number, Math.round(w * 0.42), numY, textColor, isLightText);
        ctx.textAlign = 'left';
        ctx.letterSpacing = '0px';
      }
      const nameY = isH ? Math.round(h * 0.86) : Math.round(h * 0.68);
      ctx.font = `500 ${isH ? 18 : 14}px ${CARD_MONO}`;
      ctx.letterSpacing = '1.5px';
      ctx.textAlign = 'center';
      drawEmbossedText(ctx, config.cardholderName, Math.round(w * 0.42), nameY, textColor, isLightText);
      ctx.textAlign = 'left';
      ctx.letterSpacing = '0px';
      // Expiry right of center
      const expiryX = isH ? Math.round(w * 0.65) : Math.round(w * 0.62);
      ctx.font = `500 ${isH ? 9 : 8}px ${CARD_SANS}`;
      ctx.fillStyle = subTextColor;
      ctx.fillText('VALID THRU', expiryX, nameY - 1);
      ctx.font = `600 ${isH ? 18 : 14}px ${CARD_MONO}`;
      drawEmbossedText(ctx, config.expiryDate, expiryX, nameY + (isH ? 12 : 10), textColor, isLightText);

    } else if (numPos === 'compact-right') {
      // ── Compact Right: Small number right-aligned, name left, same bottom row ──
      const rowY = isH ? Math.round(h * 0.82) : Math.round(h * 0.64);
      ctx.font = `500 ${isH ? 18 : 14}px ${CARD_MONO}`;
      ctx.letterSpacing = '1.5px';
      drawEmbossedText(ctx, config.cardholderName, pad, rowY, textColor, isLightText);
      ctx.letterSpacing = '0px';
      if (number) {
        ctx.font = `600 ${isH ? 22 : 17}px ${CARD_MONO}`;
        ctx.letterSpacing = '2px';
        ctx.textAlign = 'right';
        drawEmbossedText(ctx, number, w - pad, rowY, textColor, isLightText);
        ctx.textAlign = 'left';
        ctx.letterSpacing = '0px';
      }
      // Expiry below name
      const expiryY = rowY + (isH ? 26 : 20);
      ctx.font = `500 ${isH ? 9 : 8}px ${CARD_SANS}`;
      ctx.fillStyle = subTextColor;
      ctx.fillText('VALID THRU', pad, expiryY);
      ctx.font = `600 ${isH ? 16 : 13}px ${CARD_MONO}`;
      drawEmbossedText(ctx, config.expiryDate, pad + (isH ? 58 : 48), expiryY - 2, textColor, isLightText);
    }
  }

  // Subtle grain for matte/recycled materials (uses physical pixel coords)
  if (config.material === 'matte' || config.material === 'recycledPlastic') {
    ctx.restore(); // remove scale transform before pixel manipulation
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imageData.data;
    const pixW = canvas.width;
    for (let i = 0; i < d.length; i += 4) {
      const px = (i / 4) % pixW;
      const py = Math.floor((i / 4) / pixW);
      const n = valueNoise(px * 0.5, py * 0.5) * 8;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    ctx.putImageData(imageData, 0, 0);
    return; // already restored
  }

  ctx.restore();
}

// ─── BACK FACE ──────────────────────────────────────────────
export function drawCardBack(canvas: HTMLCanvasElement, config: CardConfig) {
  // Non-standard-card rails: reuse front layout for back (no mag stripe/CVV)
  if (needsCustomLayout(config)) {
    drawCustomLayout(canvas, config);
    return;
  }

  const { w, h } = getCanvasSize(config.orientation);
  const pw = w * TEX_SCALE, ph = h * TEX_SCALE;
  if (canvas.width !== pw) canvas.width = pw;
  if (canvas.height !== ph) canvas.height = ph;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, pw, ph);

  ctx.save();
  ctx.scale(TEX_SCALE, TEX_SCALE);
  roundedRect(ctx, 0, 0, w, h, CORNER_RADIUS);
  ctx.clip();

  // Background
  roundedRect(ctx, 0, 0, w, h, CORNER_RADIUS);
  fillCardBackground(ctx, config, w, h);

  if (config.colorMode === 'preset' && config.presetColor === 'carbonFiber') {
    drawCarbonFiber(ctx, w, h);
  }

  const isH = config.orientation === 'horizontal';
  const textColor = getTextColor(config);
  const showMagStripe = config.backShowMagStripe !== false;
  const showSigStrip = config.backShowSignatureStrip !== false;

  // Track vertical cursor for flexible layout
  let cursorY = Math.round(h * 0.10);

  // Magnetic Stripe (thick, prominent — per references)
  if (showMagStripe) {
    const stripeH = Math.round(h * 0.18);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, cursorY, w, stripeH);
    cursorY += stripeH + Math.round(h * 0.08);
  } else {
    cursorY += Math.round(h * 0.08);
  }

  const sigX = Math.round(w * 0.06);

  // Signature Strip + CVV
  if (showSigStrip) {
    const sigW = Math.round(w * 0.60);
    const sigH = Math.round(h * 0.14);
    ctx.fillStyle = '#f0ece0';
    ctx.fillRect(sigX, cursorY, sigW, sigH);

    // Signature strip hatching
    ctx.strokeStyle = '#ddd8cc';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < sigW; i += 6) {
      ctx.beginPath();
      ctx.moveTo(sigX + i, cursorY);
      ctx.lineTo(sigX + i + 20, cursorY + sigH);
      ctx.stroke();
    }

    // CVV white box (right of signature strip)
    const cvvGap = Math.round(w * 0.02);
    const cvvX = sigX + sigW + cvvGap;
    const cvvW = Math.round(w * 0.12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cvvX, cursorY, cvvW, sigH);
    ctx.font = `bold ${isH ? 24 : 18}px ${CARD_SANS}`;
    ctx.fillStyle = '#333333';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(getCvvDisplay(config.network), cvvX + cvvW / 2, cursorY + sigH / 2);
    ctx.textAlign = 'start';
    ctx.textBaseline = 'top';
    cursorY += sigH + Math.round(h * 0.06);
  } else {
    cursorY += Math.round(h * 0.04);
  }

  // Fine Print
  const fpX = sigX;
  let fpY = cursorY;
  ctx.font = `300 11px ${CARD_SANS}`;
  ctx.fillStyle = textColor;
  ctx.globalAlpha = 0.6;

  // Custom legal text or default
  const legalText = config.backLegalText?.trim();
  if (legalText) {
    // Word-wrap custom legal text
    const maxW = w - sigX * 2;
    const lines = wrapText(ctx, legalText, maxW);
    for (const line of lines) {
      ctx.fillText(line, fpX, fpY);
      fpY += 14;
    }
  } else {
    ctx.fillText(`This card is property of ${config.issuerName}.`, fpX, fpY);
    ctx.fillText(`Issued pursuant to license by ${networkNames[config.network]}.`, fpX, fpY + 16);
    ctx.fillText('Unauthorized use is prohibited.', fpX, fpY + 32);
    fpY += 48;
  }

  // Support phone
  const supportPhone = config.backSupportPhone?.trim() || '1-800-XXX-XXXX';
  ctx.font = `400 12px ${CARD_SANS}`;
  ctx.fillText(`Customer Service: ${supportPhone}`, fpX, fpY + 8);
  fpY += 24;

  // Support URL
  if (config.backSupportUrl?.trim()) {
    ctx.fillText(config.backSupportUrl.trim(), fpX, fpY + 8);
    fpY += 16;
  }

  // Issuer address
  if (config.issuerAddress?.trim()) {
    ctx.font = `300 10px ${CARD_SANS}`;
    ctx.fillText(config.issuerAddress.trim(), fpX, fpY + 8);
    fpY += 14;
  }

  // FDIC / NCUA notice
  if (config.fdicInsured) {
    ctx.font = `600 10px ${CARD_SANS}`;
    ctx.fillText('Member FDIC', fpX, fpY + 10);
    fpY += 16;
  }
  if (config.ncuaInsured) {
    ctx.font = `600 10px ${CARD_SANS}`;
    ctx.fillText('Federally Insured by NCUA', fpX, fpY + 10);
    fpY += 16;
  }

  // Bilingual labels (Canadian requirement)
  if (config.bilingualRequired) {
    ctx.font = `300 9px ${CARD_SANS}`;
    ctx.fillText('SERVICE \u00C0 LA CLIENT\u00C8LE / CUSTOMER SERVICE', fpX, fpY + 10);
    fpY += 14;
  }

  ctx.globalAlpha = 1;

  // Program name (if set)
  if (config.programName) {
    ctx.font = `600 14px ${CARD_SANS}`;
    ctx.fillStyle = textColor;
    ctx.globalAlpha = 0.8;
    ctx.fillText(config.programName.toUpperCase(), fpX, fpY + 12);
    ctx.globalAlpha = 1;
  }

  // Back-only number: render card number, name & expiry below fine print
  if (!config.numberless && (config.numberPosition ?? 'standard') === 'back-only') {
    const number = getCardNumber(config.network, config.cardNumberDisplay, config.customCardNumber);
    const backNumY = fpY + (config.programName ? 28 : 12);
    ctx.globalAlpha = 0.7;
    if (number) {
      ctx.font = `500 ${isH ? 18 : 14}px ${CARD_MONO}`;
      ctx.fillStyle = textColor;
      ctx.letterSpacing = '2px';
      ctx.fillText(number, fpX, backNumY);
      ctx.letterSpacing = '0px';
    }
    ctx.font = `400 ${isH ? 13 : 11}px ${CARD_MONO}`;
    ctx.fillStyle = textColor;
    ctx.fillText(config.cardholderName, fpX, backNumY + (isH ? 24 : 18));
    ctx.font = `400 ${isH ? 13 : 11}px ${CARD_MONO}`;
    ctx.fillText(config.expiryDate, fpX, backNumY + (isH ? 42 : 32));
    ctx.globalAlpha = 1;
  }

  // QR code (rendered from pre-generated canvas)
  if (config.backQrUrl?.trim() && qrCanvasCache) {
    const qrSize = isH ? 70 : 55;
    const qrX = w - qrSize - (isH ? 50 : 40);
    const qrY = cursorY - (showSigStrip ? 10 : 0);
    // White background for QR readability
    ctx.fillStyle = '#ffffff';
    roundedRect(ctx, qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 4);
    ctx.fill();
    ctx.drawImage(qrCanvasCache, qrX, qrY, qrSize, qrSize);
  }

  // Security hologram sticker
  if (config.backShowHologram !== false) {
    const holoX = isH ? w - 100 : w - 80;
    const holoY = isH ? h - 80 : h - 70;
    const holoSize = isH ? 40 : 32;
    const holoGrad = ctx.createLinearGradient(holoX, holoY, holoX + holoSize, holoY + holoSize);
    holoGrad.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
    holoGrad.addColorStop(0.5, 'rgba(59, 130, 246, 0.4)');
    holoGrad.addColorStop(1, 'rgba(16, 185, 129, 0.4)');
    ctx.fillStyle = holoGrad;
    roundedRect(ctx, holoX, holoY, holoSize, holoSize, 4);
    ctx.fill();
  }

  // Back-of-card ATM network logos (Cirrus, Plus, STAR, Pulse)
  if (config.backLogos && config.backLogos.length > 0) {
    const blLogoW = isH ? 50 : 40;
    const blLogoH = isH ? 30 : 24;
    const blSpacing = 6;
    const blStartX = fpX;
    const blStartY = isH ? h - 55 : h - 48;
    for (let i = 0; i < config.backLogos.length; i++) {
      const blSrc = `/logos/${config.backLogos[i]}.svg`;
      const blImg = logoCache[blSrc];
      if (blImg?.complete && blImg.naturalWidth > 0) {
        ctx.drawImage(blImg, blStartX + i * (blLogoW + blSpacing), blStartY, blLogoW, blLogoH);
      }
    }
  }

  // Network Logo (small, bottom-right)
  const isLightText = textColor === '#ffffff';
  const logoSrc = getLogoSrc(config.network, isLightText);
  const logoImg = logoCache[logoSrc];
  if (logoImg?.complete && logoImg.naturalWidth > 0) {
    const rect = getNetworkLogoRect(config.network, config.orientation, w, h, 'back');
    ctx.drawImage(logoImg, rect.x, rect.y, rect.width, rect.height);
  }

  // Subtle grain for matte/recycled materials (uses physical pixel coords)
  if (config.material === 'matte' || config.material === 'recycledPlastic') {
    ctx.restore(); // remove scale transform before pixel manipulation
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imageData.data;
    const pixW = canvas.width;
    for (let i = 0; i < d.length; i += 4) {
      const px = (i / 4) % pixW;
      const py = Math.floor((i / 4) / pixW);
      const n = valueNoise(px * 0.5, py * 0.5) * 8;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    ctx.putImageData(imageData, 0, 0);
    return; // already restored
  }

  ctx.restore();
}

// Ensure logos are loaded before first draw
export async function ensureLogosLoaded(issuerLogo?: string | null, cardArt?: string | null, coBrandLogo?: string | null, qrUrl?: string): Promise<void> {
  const promises: Promise<unknown>[] = networks.map(n => loadLogo(`/logos/${n}.svg`));
  promises.push(loadLogo('/logos/visa-white.svg'));
  for (const id of backLogoIds) promises.push(loadLogo(`/logos/${id}.svg`));
  if (issuerLogo) promises.push(loadLogo(issuerLogo));
  if (cardArt) promises.push(loadLogo(cardArt));
  if (coBrandLogo) promises.push(loadLogo(coBrandLogo));
  if (qrUrl) promises.push(generateQrCanvas(qrUrl));
  await Promise.all(promises);
}

function drawCarbonFiber(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 0.5;
  for (let y = 0; y < h; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  for (let x = 0; x < w; x += 4) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
