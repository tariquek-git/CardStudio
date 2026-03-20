import type { CardNetwork } from '../types';
import { roundedRect, CORNER_RADIUS } from './utils';

// ─── LOGO PRELOADING ────────────────────────────────────────
export const logoCache: Record<string, HTMLImageElement> = {};
const logoLoadPromises: Record<string, Promise<HTMLImageElement>> = {};

export function loadLogo(src: string): Promise<HTMLImageElement> {
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

export async function generateQrCanvas(url: string): Promise<HTMLCanvasElement | null> {
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

export function getQrCanvasCache(): HTMLCanvasElement | null {
  return qrCanvasCache;
}

// Back-of-card ATM network logos
const backLogoIds = ['cirrus', 'plus', 'star', 'pulse'];
for (const id of backLogoIds) {
  loadLogo(`/logos/${id}.svg`);
}

export function getLogoSrc(network: CardNetwork, isLightText: boolean): string {
  if (network === 'visa' && isLightText) return '/logos/visa-white.svg';
  return `/logos/${network}.svg`;
}

// ─── SHEEN / DEPTH EFFECTS ──────────────────────────────────
export function drawCardSheen(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Top-edge highlight — studio softbox reflection
  const sheen = ctx.createLinearGradient(0, 0, w * 0.3, h * 0.4);
  sheen.addColorStop(0, 'rgba(255,255,255,0.12)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0.04)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h * 0.4);

  // Subtle bottom vignette for depth
  const vignette = ctx.createLinearGradient(0, h * 0.7, 0, h);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.06)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, h * 0.7, w, h * 0.3);

  // Inner edge highlight (1px) — card bevel
  ctx.save();
  roundedRect(ctx, 1, 1, w - 2, h - 2, CORNER_RADIUS - 1);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

// ─── CHIP DRAWING ────────────────────────────────────────────
export function drawChip(
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
export function drawContactless(
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
export function drawEmbossedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  isLightText: boolean,
) {
  ctx.save();
  // Shadow (below) — simulates emboss depth
  ctx.fillStyle = isLightText ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)';
  ctx.fillText(text, x + 1.5, y + 2);
  // Highlight (above) — simulates light catch on raised edge
  ctx.fillStyle = isLightText ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.4)';
  ctx.fillText(text, x - 0.8, y - 1);
  // Main text
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function drawCardNumberGroups(
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
export function getNetworkLogoRect(
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

export function drawCarbonFiber(ctx: CanvasRenderingContext2D, w: number, h: number) {
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
