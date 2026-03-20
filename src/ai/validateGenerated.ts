import type { CardConfig } from '../types';

const ENUMS: Record<string, readonly string[]> = {
  network: ['visa', 'mastercard', 'amex', 'discover', 'interac', 'unionpay', 'jcb', 'maestro'],
  cardType: ['credit', 'debit', 'prepaid', 'commercial', 'virtual'],
  chipStyle: ['gold', 'silver', 'black', 'none'],
  material: ['matte', 'glossy', 'metal', 'brushedMetal', 'clear', 'holographic', 'recycledPlastic', 'wood'],
  orientation: ['horizontal', 'vertical'],
  colorMode: ['solid', 'preset', 'gradient'],
  presetColor: ['matteBlack', 'deepNavy', 'slateGray', 'charcoal', 'midnight', 'emerald', 'burgundy', 'roseGold', 'arctic', 'sunset', 'oceanGradient', 'aurora', 'neonPulse', 'lavenderMist'],
  numberPosition: ['standard', 'back-only', 'lower-center', 'compact-right'],
  cardArtBlend: ['normal', 'multiply', 'screen', 'overlay', 'soft-light'],
  cardArtFit: ['cover', 'contain', 'fill'],
};

const KNOWN_FIELDS = new Set<string>([
  ...Object.keys(ENUMS),
  'tier', 'solidColor', 'textColorOverride', 'contactless', 'numberless',
  'cardArtOpacity', 'gradientConfig', 'issuerName', 'cardholderName',
  'programName', 'backShowMagStripe', 'backShowSignatureStrip', 'backShowHologram',
]);

function isHexColor(v: unknown): v is string {
  return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function validateGenerated(
  raw: Partial<CardConfig>,
): { valid: Partial<CardConfig>; warnings: string[] } {
  const valid: Record<string, unknown> = {};
  const warnings: string[] = [];

  for (const [key, value] of Object.entries(raw)) {
    // Strip unknown fields
    if (!KNOWN_FIELDS.has(key)) {
      warnings.push(`Unknown field "${key}" removed`);
      continue;
    }

    // Validate enum fields
    if (key in ENUMS) {
      const allowed = ENUMS[key];
      if (typeof value === 'string' && allowed.includes(value)) {
        valid[key] = value;
      } else {
        warnings.push(`Invalid value "${String(value)}" for ${key}, removed`);
      }
      continue;
    }

    // Validate specific fields
    switch (key) {
      case 'cardArtOpacity':
        if (typeof value === 'number') {
          valid[key] = clamp(Math.round(value), 0, 100);
        }
        break;

      case 'solidColor':
        if (isHexColor(value)) {
          valid[key] = value;
        } else {
          warnings.push(`Invalid solidColor "${String(value)}", removed`);
        }
        break;

      case 'textColorOverride':
        if (value === null) {
          valid[key] = null;
        } else if (isHexColor(value)) {
          valid[key] = value;
        } else {
          warnings.push(`Invalid textColorOverride "${String(value)}", removed`);
        }
        break;

      case 'gradientConfig':
        if (typeof value === 'object' && value !== null) {
          const gc = value as Record<string, unknown>;
          const stops = Array.isArray(gc.stops) ? gc.stops : [];
          const angle = typeof gc.angle === 'number' ? clamp(Math.round(gc.angle), 0, 360) : 135;

          const validStops = stops
            .filter((s): s is { color: string; position: number } =>
              typeof s === 'object' && s !== null &&
              isHexColor((s as Record<string, unknown>).color) &&
              typeof (s as Record<string, unknown>).position === 'number',
            )
            .map(s => ({
              color: s.color,
              position: clamp(Math.round(s.position), 0, 100),
            }));

          if (validStops.length >= 2) {
            valid[key] = { stops: validStops, angle };
          } else {
            warnings.push('Gradient needs at least 2 valid stops, removed');
          }
        }
        break;

      case 'contactless':
      case 'numberless':
      case 'backShowMagStripe':
      case 'backShowSignatureStrip':
      case 'backShowHologram':
        if (typeof value === 'boolean') {
          valid[key] = value;
        }
        break;

      case 'tier':
      case 'issuerName':
      case 'cardholderName':
      case 'programName':
        if (typeof value === 'string' && value.length <= 100) {
          valid[key] = value;
        }
        break;

      default:
        break;
    }
  }

  return { valid: valid as Partial<CardConfig>, warnings };
}
