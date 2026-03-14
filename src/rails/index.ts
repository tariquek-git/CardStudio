export type {
  RailCategory,
  RailRegion,
  PaymentRailId,
  RailFieldFormat,
  CardFormFactor,
  RailFieldDef,
  RailTierInfo,
  PaymentRail,
} from './types';

export { railCategories, railRegions, sortedCategories } from './categories';
export type { CategoryMeta, RegionMeta } from './categories';

export { paymentRails, railsById } from './registry';

import type { RailCategory, RailRegion, PaymentRailId, PaymentRail } from './types';
import { paymentRails, railsById } from './registry';

export function getRail(id: PaymentRailId): PaymentRail | undefined {
  return railsById.get(id);
}

export function getRailsByCategory(category: RailCategory): PaymentRail[] {
  return paymentRails
    .filter(r => r.category === category)
    .sort((a, b) => b.popularity - a.popularity);
}

export function getRailsByRegion(region: RailRegion): PaymentRail[] {
  return paymentRails
    .filter(r => r.region === region)
    .sort((a, b) => b.popularity - a.popularity);
}

export interface RailFilter {
  category?: RailCategory;
  region?: RailRegion;
  country?: string;
  search?: string;
}

export function filterRails(filter: RailFilter): PaymentRail[] {
  let results = paymentRails;

  if (filter.category) {
    results = results.filter(r => r.category === filter.category);
  }

  if (filter.region) {
    results = results.filter(r => r.region === filter.region);
  }

  if (filter.country) {
    const country = filter.country.toUpperCase();
    results = results.filter(r =>
      r.country === country || r.countries?.includes(country)
    );
  }

  if (filter.search) {
    const q = filter.search.toLowerCase();
    results = results.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.shortName?.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q) ||
      r.country?.toLowerCase().includes(q)
    );
  }

  return results.sort((a, b) => b.popularity - a.popularity);
}

// Get display name for a rail (prefers shortName if available)
export function getRailDisplayName(id: PaymentRailId): string {
  const rail = railsById.get(id);
  return rail?.shortName || rail?.name || id;
}

// Get logo path for a rail, with optional light variant for dark backgrounds
export function getRailLogo(id: PaymentRailId, light = false): string {
  const rail = railsById.get(id);
  if (!rail) return '';
  if (light && rail.logoFileLight) return rail.logoFileLight;
  return rail.logoFile;
}

// Check if a rail ID maps to a legacy CardNetwork (backward compat)
const legacyCardNetworks = new Set([
  'visa', 'mastercard', 'amex', 'discover', 'interac', 'unionpay', 'jcb', 'maestro',
]);

export function isLegacyCardNetwork(id: string): boolean {
  return legacyCardNetworks.has(id);
}
