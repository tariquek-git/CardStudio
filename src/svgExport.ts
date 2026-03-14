import type { CardConfig, CardNetwork } from './types';
import { getCardNumber, presetColors, networkTierConfig } from './data';

// ─── DIMENSIONS (match cardCanvas.ts) ────────────────────────
const H_WIDTH = 1024;
const H_HEIGHT = 645;
const V_WIDTH = 645;
const V_HEIGHT = 1024;
const CORNER_RADIUS = 38;

const CARD_MONO = "'IBM Plex Mono', 'JetBrains Mono', 'Courier New', monospace";
const CARD_SANS = "Inter, Arial, sans-serif";

const NS = 'http://www.w3.org/2000/svg';

function getCanvasSize(orientation: 'horizontal' | 'vertical') {
  return orientation === 'horizontal'
    ? { w: H_WIDTH, h: H_HEIGHT }
    : { w: V_WIDTH, h: V_HEIGHT };
}

// ─── HELPERS ──────────────────────────────────────────────────

function el(tag: string, attrs: Record<string, string | number> = {}): SVGElement {
  const elem = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    elem.setAttribute(k, String(v));
  }
  return elem;
}

function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  return `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y} Z`;
}

function hexLuminance(hex: string): number {
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

function getNetworkLogoRect(
  network: CardNetwork,
  orientation: 'horizontal' | 'vertical',
  w: number,
  h: number,
): { x: number; y: number; width: number; height: number } {
  const isH = orientation === 'horizontal';
  const pad = isH ? 40 : 30;
  switch (network) {
    case 'visa':
      return { x: w - 140 - pad, y: pad - 5, width: 140, height: 46 };
    case 'amex':
      return { x: w - 100 - pad, y: pad - 5, width: 100, height: 62 };
    case 'discover':
      return { x: w - 150 - pad, y: h - 50 - pad, width: 150, height: 50 };
    case 'mastercard':
    case 'maestro':
      return { x: w - 120 - pad, y: h - 80 - pad, width: 120, height: 80 };
    case 'interac':
      return { x: w - 120 - pad, y: h - 50 - pad, width: 120, height: 50 };
    default:
      return { x: w - 120 - pad, y: h - 80 - pad, width: 120, height: 80 };
  }
}

// ─── BACKGROUND FILL ──────────────────────────────────────────

function buildBackground(
  config: CardConfig,
  w: number,
  h: number,
  defs: SVGElement,
): { fill: string } {
  if (config.colorMode === 'gradient') {
    const { stops, angle } = config.gradientConfig;
    const gradId = 'card-gradient';
    const rad = ((angle - 90) * Math.PI) / 180;
    const cx = 0.5, cy = 0.5;
    const len = 0.5 * Math.sqrt((w * w + h * h) / Math.max(w * w, h * h));
    const x1 = cx - Math.cos(rad) * len;
    const y1 = cy - Math.sin(rad) * len;
    const x2 = cx + Math.cos(rad) * len;
    const y2 = cy + Math.sin(rad) * len;

    const grad = el('linearGradient', {
      id: gradId,
      x1: x1.toFixed(4),
      y1: y1.toFixed(4),
      x2: x2.toFixed(4),
      y2: y2.toFixed(4),
    });
    const sorted = [...stops].sort((a, b) => a.position - b.position);
    for (const s of sorted) {
      grad.appendChild(el('stop', { offset: `${s.position}%`, 'stop-color': s.color }));
    }
    defs.appendChild(grad);
    return { fill: `url(#${gradId})` };
  }

  if (config.colorMode === 'preset') {
    const preset = presetColors[config.presetColor];
    if (preset?.gradient) {
      const gradId = 'card-gradient';
      const grad = el('linearGradient', { id: gradId, x1: '0', y1: '0', x2: '1', y2: '1' });
      grad.appendChild(el('stop', { offset: '0%', 'stop-color': preset.gradient[0] }));
      grad.appendChild(el('stop', { offset: '100%', 'stop-color': preset.gradient[1] }));
      defs.appendChild(grad);
      return { fill: `url(#${gradId})` };
    }
    return { fill: preset?.value || '#0F172A' };
  }

  return { fill: config.solidColor };
}

// ─── CHIP ─────────────────────────────────────────────────────

function buildChip(x: number, y: number, style: string): SVGElement {
  const g = el('g', { id: 'chip' });
  if (style === 'none') return g;

  const w = 120, h = 105, r = 12;
  const colors: Record<string, { bg: string; line: string; hi: string }> = {
    gold: { bg: '#D4A847', line: '#B8922D', hi: '#E8C56A' },
    silver: { bg: '#C0C0C0', line: '#999999', hi: '#E0E0E0' },
    black: { bg: '#2a2a2a', line: '#1a1a1a', hi: '#444444' },
  };
  const c = colors[style] || colors.gold;

  // Chip body
  g.appendChild(el('rect', {
    x, y, width: w, height: h, rx: r, ry: r,
    fill: c.bg, stroke: c.hi, 'stroke-width': 1.5,
  }));

  // Contact pad lines
  const p = 6;
  const lCol = x + w * 0.30;
  const rCol = x + w * 0.70;
  const lines = [
    [lCol, y + p, lCol, y + h - p],
    [rCol, y + p, rCol, y + h - p],
    [x + p, y + h * 0.5, x + w - p, y + h * 0.5],
    [x + p, y + h * 0.25, lCol, y + h * 0.25],
    [x + p, y + h * 0.75, lCol, y + h * 0.75],
    [rCol, y + h * 0.25, x + w - p, y + h * 0.25],
    [rCol, y + h * 0.75, x + w - p, y + h * 0.75],
  ];
  for (const [x1, y1, x2, y2] of lines) {
    g.appendChild(el('line', {
      x1, y1, x2, y2,
      stroke: c.line, 'stroke-width': 3, 'stroke-linecap': 'round',
    }));
  }

  // Central pad
  g.appendChild(el('rect', {
    x: lCol + 3,
    y: y + h * 0.35,
    width: rCol - lCol - 6,
    height: h * 0.30,
    rx: 3, ry: 3,
    fill: 'none', stroke: c.line, 'stroke-width': 2,
  }));

  return g;
}

// ─── CONTACTLESS ──────────────────────────────────────────────

function buildContactless(x: number, y: number, color: string): SVGElement {
  const g = el('g', { id: 'contactless-indicator', opacity: '0.7' });
  const arcs = [16, 26, 36];
  for (const r of arcs) {
    const startAngle = -Math.PI * 0.35;
    const endAngle = Math.PI * 0.35;
    const x1 = x + r * Math.cos(startAngle);
    const y1 = y + r * Math.sin(startAngle);
    const x2 = x + r * Math.cos(endAngle);
    const y2 = y + r * Math.sin(endAngle);
    g.appendChild(el('path', {
      d: `M${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2}`,
      fill: 'none', stroke: color, 'stroke-width': 3.5, 'stroke-linecap': 'round',
    }));
  }
  return g;
}

// ─── TEXT ELEMENT ─────────────────────────────────────────────

function textEl(
  text: string,
  x: number,
  y: number,
  opts: {
    fill?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: number;
    letterSpacing?: string;
    textAnchor?: string;
    opacity?: number;
  } = {},
): SVGElement {
  return el('text', {
    x,
    y,
    fill: opts.fill || '#ffffff',
    'font-size': opts.fontSize || 16,
    'font-family': opts.fontFamily || CARD_SANS,
    'font-weight': opts.fontWeight || 400,
    ...(opts.letterSpacing ? { 'letter-spacing': opts.letterSpacing } : {}),
    ...(opts.textAnchor ? { 'text-anchor': opts.textAnchor } : {}),
    ...(opts.opacity !== undefined ? { opacity: String(opts.opacity) } : {}),
    'dominant-baseline': 'hanging',
  });
}

// ─── BUILD CARD SVG (FRONT FACE) ─────────────────────────────

export function buildCardSVG(config: CardConfig): string {
  const { w, h } = getCanvasSize(config.orientation);
  const isH = config.orientation === 'horizontal';

  const svg = el('svg', {
    xmlns: NS,
    viewBox: `0 0 ${w} ${h}`,
    width: '85.6mm',
    height: '53.98mm',
  }) as SVGSVGElement;

  // Style block with font imports
  const style = document.createElementNS(NS, 'style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap');
  `;
  svg.appendChild(style);

  const defs = el('defs');
  svg.appendChild(defs);

  // Clip path for rounded card
  const clipId = 'card-clip';
  const clipPath = el('clipPath', { id: clipId });
  clipPath.appendChild(el('path', { d: roundedRectPath(0, 0, w, h, CORNER_RADIUS) }));
  defs.appendChild(clipPath);

  const cardGroup = el('g', { 'clip-path': `url(#${clipId})` });
  svg.appendChild(cardGroup);

  // ── Background ──
  const bgGroup = el('g', { id: 'card-background' });
  const { fill } = buildBackground(config, w, h, defs);
  bgGroup.appendChild(el('rect', { x: 0, y: 0, width: w, height: h, fill }));
  cardGroup.appendChild(bgGroup);

  // ── Card art ──
  if (config.cardArt) {
    const artGroup = el('g', { id: 'card-art' });
    const opacity = (config.cardArtOpacity ?? 90) / 100;
    artGroup.setAttribute('opacity', String(opacity));
    // Card art as image reference
    const artImg = el('image', {
      href: config.cardArt,
      x: 0, y: 0, width: w, height: h,
      preserveAspectRatio: config.cardArtFit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice',
    });
    artGroup.appendChild(artImg);
    cardGroup.appendChild(artGroup);
  }

  const textColor = getTextColor(config);
  const subTextColor = getSubTextColor(config);

  const pad = Math.round(isH ? w * 0.045 : w * 0.05);
  const padV = Math.round(isH ? h * 0.06 : h * 0.04);

  // ── Issuer branding ──
  const issuerGroup = el('g', { id: 'issuer-branding' });
  if (config.issuerLogo) {
    issuerGroup.appendChild(el('image', {
      href: config.issuerLogo,
      x: pad, y: padV, width: 150, height: 40,
    }));
  } else {
    const issuerText = textEl(config.issuerName, pad, padV, {
      fill: textColor,
      fontSize: isH ? 28 : 22,
      fontFamily: CARD_SANS,
      fontWeight: 600,
    });
    issuerText.textContent = config.issuerName;
    issuerGroup.appendChild(issuerText);
  }
  cardGroup.appendChild(issuerGroup);

  // ── Program name ──
  if (config.programName) {
    const progGroup = el('g', { id: 'program-name' });
    const progText = textEl(config.programName.toUpperCase(), pad, padV + (isH ? 34 : 26), {
      fill: subTextColor,
      fontSize: isH ? 13 : 10,
      fontFamily: CARD_SANS,
      fontWeight: 700,
      letterSpacing: '2px',
    });
    progText.textContent = config.programName.toUpperCase();
    progGroup.appendChild(progText);
    cardGroup.appendChild(progGroup);
  }

  // ── Network logo ──
  const netGroup = el('g', { id: 'network-logo' });
  const logoRect = getNetworkLogoRect(config.network, config.orientation, w, h);
  const isLightText = textColor === '#ffffff';
  const logoSrc = config.network === 'visa' && isLightText
    ? '/logos/visa-white.svg'
    : `/logos/${config.network}.svg`;
  netGroup.appendChild(el('image', {
    href: logoSrc,
    x: logoRect.x,
    y: logoRect.y,
    width: logoRect.width,
    height: logoRect.height,
  }));
  cardGroup.appendChild(netGroup);

  // ── Tier text ──
  if (config.tier && networkTierConfig[config.network]) {
    const tierInfo = networkTierConfig[config.network]?.find(t => t.id === config.tier);
    if (tierInfo) {
      const tierGroup = el('g', { id: 'tier-badge' });
      const tierText = textEl(tierInfo.label, logoRect.x + logoRect.width, logoRect.y + logoRect.height + (isH ? 8 : 6), {
        fill: subTextColor,
        fontSize: isH ? 11 : 9,
        fontFamily: CARD_SANS,
        fontWeight: 700,
        letterSpacing: '1.5px',
        textAnchor: 'end',
      });
      tierText.textContent = tierInfo.label;
      tierGroup.appendChild(tierText);
      cardGroup.appendChild(tierGroup);
    }
  }

  // ── Chip ──
  const chipW = 120, chipH = 105;
  const chipX = pad;
  const chipY = isH ? Math.round(h * 0.28) : Math.round(h * 0.22);
  if (config.chipStyle !== 'none') {
    cardGroup.appendChild(buildChip(chipX, chipY, config.chipStyle));

    if (config.contactless) {
      cardGroup.appendChild(buildContactless(chipX + chipW + 22, chipY + chipH / 2, textColor));
    }
  }

  // ── Card number ──
  const numPos = config.numberPosition ?? 'standard';
  if (!config.numberless && numPos !== 'back-only') {
    const number = getCardNumber(config.network, config.cardNumberDisplay, config.customCardNumber);
    const numGroup = el('g', { id: 'card-number' });

    if (numPos === 'standard') {
      const numY = isH ? Math.round(h * 0.56) : Math.round(h * 0.42);
      if (number) {
        const numText = textEl(number, pad, numY, {
          fill: textColor,
          fontSize: isH ? 48 : 38,
          fontFamily: CARD_MONO,
          fontWeight: 600,
          letterSpacing: '4px',
        });
        numText.textContent = number;
        numGroup.appendChild(numText);
      }
      cardGroup.appendChild(numGroup);

      // Name
      const bottomY = isH ? Math.round(h * 0.78) : Math.round(h * 0.60);
      const nameGroup = el('g', { id: 'cardholder-name' });
      const nameText = textEl(config.cardholderName, pad, bottomY, {
        fill: textColor,
        fontSize: isH ? 22 : 17,
        fontFamily: CARD_MONO,
        fontWeight: 500,
        letterSpacing: '1.5px',
      });
      nameText.textContent = config.cardholderName;
      nameGroup.appendChild(nameText);
      cardGroup.appendChild(nameGroup);

      // Expiry
      const expiryGroup = el('g', { id: 'expiry' });
      const expiryBlockRight = isH ? w - pad - 140 : w - pad - 100;

      const validLabel = textEl('VALID', expiryBlockRight, bottomY - 1, {
        fill: subTextColor,
        fontSize: isH ? 10 : 9,
        fontFamily: CARD_SANS,
        fontWeight: 500,
      });
      validLabel.textContent = 'VALID';
      expiryGroup.appendChild(validLabel);

      const thruLabel = textEl('THRU', expiryBlockRight, bottomY + (isH ? 12 : 10), {
        fill: subTextColor,
        fontSize: isH ? 10 : 9,
        fontFamily: CARD_SANS,
        fontWeight: 500,
      });
      thruLabel.textContent = 'THRU';
      expiryGroup.appendChild(thruLabel);

      const labelW = isH ? 40 : 34;
      const expiryText = textEl(config.expiryDate, expiryBlockRight + labelW, bottomY, {
        fill: textColor,
        fontSize: isH ? 22 : 17,
        fontFamily: CARD_MONO,
        fontWeight: 600,
      });
      expiryText.textContent = config.expiryDate;
      expiryGroup.appendChild(expiryText);
      cardGroup.appendChild(expiryGroup);

    } else if (numPos === 'lower-center') {
      const numY = isH ? Math.round(h * 0.72) : Math.round(h * 0.58);
      if (number) {
        const numText = textEl(number, Math.round(w * 0.42), numY, {
          fill: textColor,
          fontSize: isH ? 38 : 30,
          fontFamily: CARD_MONO,
          fontWeight: 600,
          letterSpacing: '4px',
          textAnchor: 'middle',
        });
        numText.textContent = number;
        numGroup.appendChild(numText);
      }
      cardGroup.appendChild(numGroup);

      const nameY = isH ? Math.round(h * 0.86) : Math.round(h * 0.68);
      const nameGroup = el('g', { id: 'cardholder-name' });
      const nameText = textEl(config.cardholderName, Math.round(w * 0.42), nameY, {
        fill: textColor,
        fontSize: isH ? 18 : 14,
        fontFamily: CARD_MONO,
        fontWeight: 500,
        letterSpacing: '1.5px',
        textAnchor: 'middle',
      });
      nameText.textContent = config.cardholderName;
      nameGroup.appendChild(nameText);
      cardGroup.appendChild(nameGroup);

      const expiryGroup = el('g', { id: 'expiry' });
      const expiryX = isH ? Math.round(w * 0.65) : Math.round(w * 0.62);
      const validThru = textEl('VALID THRU', expiryX, nameY - 1, {
        fill: subTextColor,
        fontSize: isH ? 9 : 8,
        fontFamily: CARD_SANS,
        fontWeight: 500,
      });
      validThru.textContent = 'VALID THRU';
      expiryGroup.appendChild(validThru);
      const expiryText = textEl(config.expiryDate, expiryX, nameY + (isH ? 12 : 10), {
        fill: textColor,
        fontSize: isH ? 18 : 14,
        fontFamily: CARD_MONO,
        fontWeight: 600,
      });
      expiryText.textContent = config.expiryDate;
      expiryGroup.appendChild(expiryText);
      cardGroup.appendChild(expiryGroup);

    } else if (numPos === 'compact-right') {
      const rowY = isH ? Math.round(h * 0.82) : Math.round(h * 0.64);
      const nameGroup = el('g', { id: 'cardholder-name' });
      const nameText = textEl(config.cardholderName, pad, rowY, {
        fill: textColor,
        fontSize: isH ? 18 : 14,
        fontFamily: CARD_MONO,
        fontWeight: 500,
        letterSpacing: '1.5px',
      });
      nameText.textContent = config.cardholderName;
      nameGroup.appendChild(nameText);
      cardGroup.appendChild(nameGroup);

      if (number) {
        const numText = textEl(number, w - pad, rowY, {
          fill: textColor,
          fontSize: isH ? 22 : 17,
          fontFamily: CARD_MONO,
          fontWeight: 600,
          letterSpacing: '2px',
          textAnchor: 'end',
        });
        numText.textContent = number;
        numGroup.appendChild(numText);
      }
      cardGroup.appendChild(numGroup);

      const expiryGroup = el('g', { id: 'expiry' });
      const expiryY = rowY + (isH ? 26 : 20);
      const validThru = textEl('VALID THRU', pad, expiryY, {
        fill: subTextColor,
        fontSize: isH ? 9 : 8,
        fontFamily: CARD_SANS,
        fontWeight: 500,
      });
      validThru.textContent = 'VALID THRU';
      expiryGroup.appendChild(validThru);
      const expiryText = textEl(config.expiryDate, pad + (isH ? 58 : 48), expiryY - 2, {
        fill: textColor,
        fontSize: isH ? 16 : 13,
        fontFamily: CARD_MONO,
        fontWeight: 600,
      });
      expiryText.textContent = config.expiryDate;
      expiryGroup.appendChild(expiryText);
      cardGroup.appendChild(expiryGroup);
    }
  }

  // Serialize
  const serializer = new XMLSerializer();
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(svg);
}

export function downloadCardSVG(config: CardConfig) {
  const svgString = buildCardSVG(config);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = 'card-design.svg';
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}
