import type { CardNetwork } from './types';

export interface NetworkTierInfo {
  id: string;
  label: string;
  fullLabel: string;
}

export const networkTierConfig: Record<CardNetwork, NetworkTierInfo[] | null> = {
  visa: [
    { id: 'classic', label: 'CLASSIC', fullLabel: 'Visa Classic' },
    { id: 'gold', label: 'GOLD', fullLabel: 'Visa Gold' },
    { id: 'platinum', label: 'PLATINUM', fullLabel: 'Visa Platinum' },
    { id: 'signature', label: 'SIGNATURE', fullLabel: 'Visa Signature' },
    { id: 'infinite', label: 'INFINITE', fullLabel: 'Visa Infinite' },
    { id: 'business', label: 'BUSINESS', fullLabel: 'Visa Business' },
  ],
  mastercard: [
    { id: 'standard', label: 'STANDARD', fullLabel: 'Mastercard Standard' },
    { id: 'gold', label: 'GOLD', fullLabel: 'Mastercard Gold' },
    { id: 'platinum', label: 'PLATINUM', fullLabel: 'Mastercard Platinum' },
    { id: 'world', label: 'WORLD', fullLabel: 'Mastercard World' },
    { id: 'world_elite', label: 'WORLD ELITE', fullLabel: 'World Elite' },
    { id: 'business', label: 'BUSINESS', fullLabel: 'Mastercard Business' },
  ],
  amex: [
    { id: 'green', label: 'GREEN', fullLabel: 'Amex Green' },
    { id: 'gold', label: 'GOLD', fullLabel: 'Amex Gold' },
    { id: 'platinum', label: 'PLATINUM', fullLabel: 'Amex Platinum' },
    { id: 'centurion', label: 'CENTURION', fullLabel: 'Amex Centurion' },
    { id: 'corporate', label: 'CORPORATE', fullLabel: 'Amex Corporate' },
  ],
  discover: [
    { id: 'it', label: 'IT', fullLabel: 'Discover it' },
    { id: 'miles', label: 'MILES', fullLabel: 'Discover Miles' },
    { id: 'cashback', label: 'CASHBACK', fullLabel: 'Discover Cashback' },
    { id: 'business', label: 'BUSINESS', fullLabel: 'Discover Business' },
  ],
  jcb: [
    { id: 'standard', label: 'STANDARD', fullLabel: 'JCB Standard' },
    { id: 'gold', label: 'GOLD', fullLabel: 'JCB Gold' },
    { id: 'the_class', label: 'THE CLASS', fullLabel: 'JCB The Class' },
  ],
  unionpay: [
    { id: 'standard', label: 'STANDARD', fullLabel: 'UnionPay Standard' },
    { id: 'premium', label: 'PREMIUM', fullLabel: 'UnionPay Premium' },
  ],
  interac: null,
  maestro: null,
};

export const networkNames: Record<CardNetwork, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  interac: 'Interac',
  unionpay: 'UnionPay',
  jcb: 'JCB',
  maestro: 'Maestro',
};

export const networkTestNumbers: Record<CardNetwork, string> = {
  visa: '4242 4242 4242 4242',
  mastercard: '5555 5555 5555 4444',
  amex: '3782 822463 10005',
  discover: '6011 1111 1111 1117',
  interac: '6360 3050 0000 0007',
  unionpay: '6200 0000 0000 0005',
  jcb: '3566 0020 2036 0505',
  maestro: '6759 6498 2643 8453',
};

export const networkLast4: Record<CardNetwork, string> = {
  visa: '4242',
  mastercard: '4444',
  amex: '0005',
  discover: '1117',
  interac: '0007',
  unionpay: '0005',
  jcb: '0505',
  maestro: '8453',
};

export const networkTiers: Record<CardNetwork, string[]> = Object.fromEntries(
  Object.entries(networkTierConfig).map(([k, v]) => [k, v ? v.map(t => t.label) : []])
) as Record<CardNetwork, string[]>;

export const cardTypeLabels: Record<string, string> = {
  credit: 'CREDIT',
  debit: 'DEBIT',
  prepaid: 'PREPAID',
  commercial: 'COMMERCIAL',
  virtual: 'VIRTUAL',
};

export const presetColors: Record<string, { name: string; value: string; gradient?: [string, string] }> = {
  deepNavy: { name: 'Deep Navy', value: '#0F172A' },
  matteBlack: { name: 'Matte Black', value: '#1a1a1a' },
  arcticWhite: { name: 'Arctic White', value: '#F1F5F9' },
  roseGold: { name: 'Rose Gold', value: '#B76E79' },
  emerald: { name: 'Emerald', value: '#065F46' },
  slateGray: { name: 'Slate Gray', value: '#475569' },
  sunsetGradient: { name: 'Sunset', value: '#F97316', gradient: ['#F97316', '#DC2626'] },
  oceanGradient: { name: 'Ocean', value: '#0EA5E9', gradient: ['#0EA5E9', '#6366F1'] },
  neonMint: { name: 'Neon Mint', value: '#34D399' },
  carbonFiber: { name: 'Carbon Fiber', value: '#27272A' },
};


export function getCardNumber(
  network: CardNetwork,
  display: 'full' | 'last4' | 'hidden',
  customNumber?: string,
): string {
  if (display === 'hidden') return '';

  const digits = customNumber?.replace(/\D/g, '') || '';
  if (digits.length >= 8) {
    // Custom number provided
    if (display === 'last4') {
      const last4 = digits.slice(-4);
      if (network === 'amex') return `•••• •••••• •${last4}`;
      return `•••• •••• •••• ${last4}`;
    }
    // Format full number
    if (network === 'amex') {
      return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)]
        .filter(Boolean)
        .join(' ');
    }
    return (digits.match(/.{1,4}/g) || []).join(' ');
  }

  // Fall back to test numbers
  if (display === 'last4') {
    if (network === 'amex') return `•••• •••••• •${networkLast4[network]}`;
    return `•••• •••• •••• ${networkLast4[network]}`;
  }
  return networkTestNumbers[network];
}

export function getFormattedNumber(network: CardNetwork): string {
  if (network === 'amex') return '•••• •••••• •••••';
  return '•••• •••• •••• ••••';
}

export function getCvvLength(network: CardNetwork): number {
  return network === 'amex' ? 4 : 3;
}

export function getCvvDisplay(network: CardNetwork): string {
  return network === 'amex' ? '****' : '***';
}

export function getExpiryLabel(network: CardNetwork): string {
  return network === 'amex' ? 'MEMBER SINCE' : 'VALID THRU';
}

// ─── Stock Card Art ─────────────────────────────────────────
export interface StockArt {
  id: string;
  label: string;
  category: 'geometric' | 'abstract' | 'texture' | 'minimal';
  src: string;
}

export const stockCardArt: StockArt[] = [
  { id: 'geo-circles',    label: 'Concentric',    category: 'geometric', src: '/cardart/geo-circles.svg' },
  { id: 'geo-hexgrid',    label: 'Hex Grid',      category: 'geometric', src: '/cardart/geo-hexgrid.svg' },
  { id: 'abs-waves',      label: 'Waves',         category: 'abstract',  src: '/cardart/abs-waves.svg' },
  { id: 'abs-topo',       label: 'Topographic',   category: 'abstract',  src: '/cardart/abs-topo.svg' },
  { id: 'abs-noise',      label: 'Noise Mesh',    category: 'abstract',  src: '/cardart/abs-noise.svg' },
  { id: 'tex-circuit',    label: 'Circuit Board',  category: 'texture',   src: '/cardart/tex-circuit.svg' },
  { id: 'tex-crosshatch', label: 'Crosshatch',    category: 'texture',   src: '/cardart/tex-crosshatch.svg' },
  { id: 'min-diagonal',   label: 'Diagonal',      category: 'minimal',   src: '/cardart/min-diagonal.svg' },
  { id: 'min-dots',       label: 'Dot Matrix',    category: 'minimal',   src: '/cardart/min-dots.svg' },
  { id: 'geo-voronoi',    label: 'Voronoi',       category: 'geometric', src: '/cardart/geo-voronoi.svg' },
];
