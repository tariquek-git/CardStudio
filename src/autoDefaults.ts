import type { CardConfig } from './types';

// ─── Network + Tier → Suggested Visuals ─────────────────────

interface NetworkTierSuggestion {
  solidColor?: string;
  colorMode?: CardConfig['colorMode'];
  presetColor?: string;
  material?: CardConfig['material'];
  label: string; // human-readable description for toast
}

const NETWORK_TIER_SUGGESTIONS: Record<string, NetworkTierSuggestion> = {
  // Amex
  'amex:centurion': { colorMode: 'solid', solidColor: '#1a1a1a', material: 'metal', label: 'Black metal for Centurion' },
  'amex:platinum': { colorMode: 'solid', solidColor: '#8c8c8c', material: 'brushedMetal', label: 'Brushed metal for Platinum' },
  'amex:gold': { colorMode: 'solid', solidColor: '#c5a04a', material: 'metal', label: 'Gold metal for Gold' },
  'amex:green': { colorMode: 'solid', solidColor: '#1a6b3c', material: 'matte', label: 'Green matte for Green' },
  // Visa
  'visa:infinite': { colorMode: 'preset', presetColor: 'deepNavy', material: 'brushedMetal', label: 'Navy brushed metal for Infinite' },
  'visa:signature': { colorMode: 'preset', presetColor: 'deepNavy', material: 'matte', label: 'Navy matte for Signature' },
  'visa:platinum': { colorMode: 'solid', solidColor: '#a0a0b0', material: 'brushedMetal', label: 'Silver brushed metal for Platinum' },
  // Mastercard
  'mastercard:world elite': { colorMode: 'solid', solidColor: '#1a1a2e', material: 'metal', label: 'Dark metal for World Elite' },
  'mastercard:world': { colorMode: 'preset', presetColor: 'deepNavy', material: 'matte', label: 'Navy matte for World' },
  'mastercard:platinum': { colorMode: 'solid', solidColor: '#9ca0a8', material: 'brushedMetal', label: 'Silver brushed for Platinum' },
  // Discover
  'discover:it': { colorMode: 'preset', presetColor: 'sunsetOrange', material: 'glossy', label: 'Sunset glossy for Discover it' },
};

export function getNetworkTierDefaults(
  railId: string,
  tier: string,
): Partial<CardConfig> | null {
  const key = `${railId}:${tier.toLowerCase()}`;
  const suggestion = NETWORK_TIER_SUGGESTIONS[key];
  if (!suggestion) return null;

  const result: Partial<CardConfig> = {};
  if (suggestion.colorMode) result.colorMode = suggestion.colorMode;
  if (suggestion.solidColor) result.solidColor = suggestion.solidColor;
  if (suggestion.presetColor) result.presetColor = suggestion.presetColor;
  if (suggestion.material) result.material = suggestion.material;
  return result;
}

export function getNetworkTierLabel(railId: string, tier: string): string | null {
  const key = `${railId}:${tier.toLowerCase()}`;
  return NETWORK_TIER_SUGGESTIONS[key]?.label ?? null;
}

// ─── Country → Currency Mapping ─────────────────────────────

const COUNTRY_CURRENCY: Record<string, string> = {
  US: 'USD', CA: 'CAD', GB: 'GBP', AU: 'AUD', NZ: 'NZD',
  JP: 'JPY', SG: 'SGD', HK: 'HKD', IN: 'INR', AE: 'AED',
  BR: 'BRL', MX: 'MXN',
  // EU/EEA → EUR
  DE: 'EUR', FR: 'EUR', IE: 'EUR', NL: 'EUR', ES: 'EUR',
  IT: 'EUR', PT: 'EUR', AT: 'EUR', BE: 'EUR', LU: 'EUR',
  FI: 'EUR', GR: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR',
  SK: 'EUR', SI: 'EUR', CY: 'EUR', MT: 'EUR', HR: 'EUR',
  // Non-EUR European
  SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', CZ: 'CZK',
  HU: 'HUF', RO: 'RON', BG: 'EUR', IS: 'EUR', LI: 'EUR',
};

export function getCurrencyForCountry(countryCode: string): string | null {
  return COUNTRY_CURRENCY[countryCode] ?? null;
}
