import type { CardConfig } from '../types';
import type { PaymentRail } from './types';
import { getRail } from './index';

// Canvas constants (must match cardCanvas.ts)
const H_WIDTH = 1024;
const H_HEIGHT = 645;
const V_WIDTH = 645;
const V_HEIGHT = 1024;
const CORNER_RADIUS = 38;
const CARD_SANS = 'Inter, Arial, sans-serif';
const CARD_MONO = '"IBM Plex Mono", "JetBrains Mono", "Courier New", monospace';

function getSize(orientation: 'horizontal' | 'vertical') {
  return orientation === 'horizontal'
    ? { w: H_WIDTH, h: H_HEIGHT }
    : { w: V_WIDTH, h: V_HEIGHT };
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

/** Returns true if this rail needs a custom layout (non-standard-card) */
export function needsCustomLayout(config: CardConfig): boolean {
  const rail = getRail(config.railId);
  return !!rail && rail.cardFormFactor !== 'standard_card';
}

/** Draw custom layout for non-card-network rails */
export function drawCustomLayout(
  canvas: HTMLCanvasElement,
  config: CardConfig,
): boolean {
  const rail = getRail(config.railId);
  if (!rail || rail.cardFormFactor === 'standard_card') return false;

  const { w, h } = getSize(config.orientation);
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;

  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  ctx.clearRect(0, 0, w, h);
  ctx.save();
  roundedRect(ctx, 0, 0, w, h, CORNER_RADIUS);
  ctx.clip();

  switch (rail.cardFormFactor) {
    case 'document':
      drawDocumentLayout(ctx, w, h, config, rail);
      break;
    case 'mobile_first':
      drawMobileLayout(ctx, w, h, config, rail);
      break;
    case 'virtual_only':
      drawVirtualLayout(ctx, w, h, config, rail);
      break;
  }

  ctx.restore();
  return true;
}

// ─── DOCUMENT LAYOUT ──────────────────────────────────────────
// For Wire/RTGS, ACH, SEPA, Open Banking
// Looks like a formal payment instruction card

function drawDocumentLayout(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  config: CardConfig,
  rail: PaymentRail,
) {
  const bg = rail.defaultColors?.primary || '#1B365D';

  // Background: dark header strip + white body
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // White body area
  const headerH = h * 0.28;
  ctx.fillStyle = '#FFFFFF';
  roundedRect(ctx, 0, headerH, w, h - headerH, 0);
  ctx.fill();

  // Bottom rounded corners
  roundedRect(ctx, 0, 0, w, h, CORNER_RADIUS);
  ctx.clip();
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, headerH);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, headerH, w, h - headerH);

  // Rail name in header
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${w * 0.026}px ${CARD_SANS}`;
  ctx.textBaseline = 'top';
  ctx.fillText(rail.shortName || rail.name, w * 0.05, headerH * 0.2);

  // Issuer name below rail name
  ctx.font = `500 ${w * 0.02}px ${CARD_SANS}`;
  ctx.globalAlpha = 0.7;
  ctx.fillText(config.issuerName || '', w * 0.05, headerH * 0.2 + w * 0.04);
  ctx.globalAlpha = 1;

  // Category badge
  ctx.font = `600 ${w * 0.012}px ${CARD_SANS}`;
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.textAlign = 'right';
  ctx.fillText(rail.category.replace(/_/g, ' ').toUpperCase(), w * 0.95, headerH * 0.25);
  ctx.textAlign = 'left';

  // Fields in white area
  const fields = rail.fields.filter(f => f.position === 'front' || f.position === 'both');
  const startY = headerH + h * 0.06;
  const lineH = h * 0.1;
  const leftCol = w * 0.05;
  const rightCol = w * 0.52;

  fields.slice(0, 6).forEach((field, i) => {
    const col = i % 2 === 0 ? leftCol : rightCol;
    const row = Math.floor(i / 2);
    const y = startY + row * lineH;

    // Label
    ctx.fillStyle = '#6B7280';
    ctx.font = `600 ${w * 0.012}px ${CARD_SANS}`;
    ctx.fillText(field.label.toUpperCase(), col, y);

    // Value
    const value = config.railFields[field.id] || field.placeholder;
    ctx.fillStyle = '#111827';
    ctx.font = `500 ${w * 0.018}px ${CARD_MONO}`;
    ctx.fillText(value, col, y + w * 0.02);
  });

  // Bottom divider line
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w * 0.05, h * 0.88);
  ctx.lineTo(w * 0.95, h * 0.88);
  ctx.stroke();

  // Bottom fine print
  ctx.fillStyle = '#9CA3AF';
  ctx.font = `400 ${w * 0.011}px ${CARD_SANS}`;
  ctx.fillText(`${rail.name} Payment Instruction`, w * 0.05, h * 0.93);
}

// ─── MOBILE-FIRST LAYOUT ──────────────────────────────────────
// For UPI, PIX, M-Pesa, Zelle, etc.
// QR code prominent, clean modern design

function drawMobileLayout(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  config: CardConfig,
  rail: PaymentRail,
) {
  const primary = rail.defaultColors?.primary || '#4CAF50';
  const secondary = rail.defaultColors?.secondary || darkenColor(primary, 0.3);

  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, primary);
  grad.addColorStop(1, secondary);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle pattern overlay
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < w; i += 40) {
    ctx.beginPath();
    ctx.arc(i, h * 0.5, w * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Rail name (large)
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${w * 0.04}px ${CARD_SANS}`;
  ctx.textBaseline = 'top';
  ctx.fillText(rail.shortName || rail.name, w * 0.06, h * 0.08);

  // Issuer name
  ctx.font = `500 ${w * 0.02}px ${CARD_SANS}`;
  ctx.globalAlpha = 0.8;
  ctx.fillText(config.issuerName || '', w * 0.06, h * 0.08 + w * 0.055);
  ctx.globalAlpha = 1;

  // QR code placeholder (if rail supports it)
  if (rail.hasQrCode) {
    const qrSize = Math.min(w, h) * 0.28;
    const qrX = w * 0.06;
    const qrY = h * 0.35;

    // White rounded square
    ctx.fillStyle = '#FFFFFF';
    roundedRect(ctx, qrX, qrY, qrSize, qrSize, 8);
    ctx.fill();

    // QR pattern placeholder
    ctx.fillStyle = '#111827';
    const cellSize = qrSize / 12;
    const margin = cellSize;
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        // Create a deterministic pseudo-random pattern
        const hash = (row * 13 + col * 7 + rail.id.length) % 3;
        if (hash > 0) {
          ctx.fillRect(
            qrX + margin + col * cellSize,
            qrY + margin + row * cellSize,
            cellSize * 0.85,
            cellSize * 0.85,
          );
        }
      }
    }

    // Corner markers
    const corners = [
      [qrX + margin, qrY + margin],
      [qrX + qrSize - margin - cellSize * 3, qrY + margin],
      [qrX + margin, qrY + qrSize - margin - cellSize * 3],
    ];
    corners.forEach(([cx, cy]) => {
      ctx.fillStyle = '#111827';
      ctx.fillRect(cx, cy, cellSize * 3, cellSize * 3);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cx + cellSize * 0.5, cy + cellSize * 0.5, cellSize * 2, cellSize * 2);
      ctx.fillStyle = '#111827';
      ctx.fillRect(cx + cellSize, cy + cellSize, cellSize, cellSize);
    });
  }

  // Primary field (e.g., UPI ID, PIX key, phone number)
  const fields = rail.fields.filter(f => f.position === 'front' || f.position === 'both');
  const primaryField = fields[0];
  if (primaryField) {
    const fieldX = rail.hasQrCode ? w * 0.45 : w * 0.06;
    const fieldY = h * 0.4;

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = `600 ${w * 0.013}px ${CARD_SANS}`;
    ctx.fillText(primaryField.label.toUpperCase(), fieldX, fieldY);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `600 ${w * 0.022}px ${CARD_MONO}`;
    const val = config.railFields[primaryField.id] || primaryField.placeholder;
    ctx.fillText(val, fieldX, fieldY + w * 0.025);
  }

  // Secondary fields
  fields.slice(1, 4).forEach((field, i) => {
    const fieldX = rail.hasQrCode ? w * 0.45 : w * 0.06;
    const fieldY = h * 0.55 + i * h * 0.12;

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `600 ${w * 0.011}px ${CARD_SANS}`;
    ctx.fillText(field.label.toUpperCase(), fieldX, fieldY);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `500 ${w * 0.017}px ${CARD_SANS}`;
    const val = config.railFields[field.id] || field.placeholder;
    ctx.fillText(val, fieldX, fieldY + w * 0.02);
  });

  // Bottom bar with region/country
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(0, h * 0.9, w, h * 0.1);

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `500 ${w * 0.013}px ${CARD_SANS}`;
  ctx.fillText(rail.name, w * 0.06, h * 0.945);

  if (rail.country) {
    ctx.textAlign = 'right';
    ctx.fillText(rail.country, w * 0.94, h * 0.945);
    ctx.textAlign = 'left';
  }
}

// ─── VIRTUAL-ONLY LAYOUT ─────────────────────────────────────
// For Crypto, BNPL virtual cards
// Sleek, minimal, no physical card elements

function drawVirtualLayout(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  config: CardConfig,
  rail: PaymentRail,
) {
  const primary = rail.defaultColors?.primary || '#6366F1';
  const secondary = rail.defaultColors?.secondary || darkenColor(primary, 0.2);

  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, w * 0.7, h);
  grad.addColorStop(0, secondary);
  grad.addColorStop(1, primary);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Decorative circles
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(w * 0.8, h * 0.2, w * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(w * 0.9, h * 0.7, w * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Rail name
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${w * 0.035}px ${CARD_SANS}`;
  ctx.textBaseline = 'top';
  ctx.fillText(rail.shortName || rail.name, w * 0.06, h * 0.1);

  // Issuer
  ctx.font = `400 ${w * 0.018}px ${CARD_SANS}`;
  ctx.globalAlpha = 0.7;
  ctx.fillText(config.issuerName || '', w * 0.06, h * 0.1 + w * 0.05);
  ctx.globalAlpha = 1;

  // "VIRTUAL" badge
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  roundedRect(ctx, w * 0.06, h * 0.3, w * 0.15, h * 0.06, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = `700 ${w * 0.013}px ${CARD_SANS}`;
  ctx.fillText('VIRTUAL', w * 0.075, h * 0.315);

  // Fields
  const fields = rail.fields.filter(f => f.position === 'front' || f.position === 'both');
  const startY = h * 0.45;

  fields.slice(0, 3).forEach((field, i) => {
    const y = startY + i * h * 0.14;

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `600 ${w * 0.011}px ${CARD_SANS}`;
    ctx.fillText(field.label.toUpperCase(), w * 0.06, y);

    ctx.fillStyle = '#FFFFFF';
    const isAddress = field.format === 'wallet_address';
    ctx.font = isAddress
      ? `500 ${w * 0.016}px ${CARD_MONO}`
      : `500 ${w * 0.02}px ${CARD_SANS}`;
    let val = config.railFields[field.id] || field.placeholder;
    // Truncate long wallet addresses
    if (isAddress && val.length > 20) {
      val = val.slice(0, 10) + '...' + val.slice(-8);
    }
    ctx.fillText(val, w * 0.06, y + w * 0.02);
  });

  // QR code in bottom-right for crypto
  if (rail.hasQrCode) {
    const qrSize = Math.min(w, h) * 0.2;
    const qrX = w * 0.75;
    const qrY = h * 0.65;

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    roundedRect(ctx, qrX, qrY, qrSize, qrSize, 6);
    ctx.fill();

    // Mini QR pattern
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    const cellSize = qrSize / 10;
    for (let r = 1; r < 9; r++) {
      for (let c = 1; c < 9; c++) {
        if ((r * 11 + c * 7 + rail.id.length) % 3 > 0) {
          ctx.fillRect(qrX + c * cellSize, qrY + r * cellSize, cellSize * 0.8, cellSize * 0.8);
        }
      }
    }
  }

  // Bottom: category label
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = `500 ${w * 0.012}px ${CARD_SANS}`;
  ctx.fillText(rail.category.replace(/_/g, ' ').toUpperCase(), w * 0.06, h * 0.92);
}

// ─── Helpers ──────────────────────────────────────────────────

function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((num >> 16) & 255) * (1 - amount));
  const g = Math.max(0, ((num >> 8) & 255) * (1 - amount));
  const b = Math.max(0, (num & 255) * (1 - amount));
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}
