import type { CardConfig } from '../types';
import {
  getCardNumber,
  presetColors,
  networkTierConfig,
} from '../data';
import { needsCustomLayout, drawCustomLayout } from '../rails/cardLayouts';
import {
  TEX_SCALE,
  CORNER_RADIUS,
  CARD_MONO,
  CARD_SANS,
  getCanvasSize,
  roundedRect,
  valueNoise,
  getTextColor,
  getSubTextColor,
} from './utils';
import {
  logoCache,
  getLogoSrc,
  getNetworkLogoRect,
  drawCardSheen,
  drawChip,
  drawContactless,
  drawEmbossedText,
  drawCardNumberGroups,
  drawCarbonFiber,
} from './elements';

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

// Re-export fillCardBackground for drawBack to use
export { fillCardBackground };

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
