import type { CardConfig } from '../types';
import {
  getCardNumber,
  getCvvDisplay,
  networkNames,
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
  wrapText,
  getTextColor,
} from './utils';
import {
  logoCache,
  getLogoSrc,
  getNetworkLogoRect,
  getQrCanvasCache,
  drawCarbonFiber,
} from './elements';
import { fillCardBackground } from './drawFront';

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
  const qrCanvasCache = getQrCanvasCache();
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
