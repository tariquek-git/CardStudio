import type { RailCategory, RailRegion } from './types';

export interface CategoryMeta {
  name: string;
  shortName: string;
  description: string;
  sortOrder: number;
}

export const railCategories: Record<RailCategory, CategoryMeta> = {
  card_network: {
    name: 'Card Networks',
    shortName: 'Cards',
    description: 'Visa, Mastercard, and other card payment schemes',
    sortOrder: 1,
  },
  domestic_debit: {
    name: 'Domestic Debit',
    shortName: 'Debit',
    description: 'Country-specific debit card and payment switches',
    sortOrder: 2,
  },
  realtime_payment: {
    name: 'Real-Time Payments',
    shortName: 'RTP',
    description: 'Instant payment systems and faster payment schemes',
    sortOrder: 3,
  },
  wire_rtgs: {
    name: 'Wire / RTGS',
    shortName: 'Wire',
    description: 'High-value gross settlement and wire transfer systems',
    sortOrder: 4,
  },
  ach_batch: {
    name: 'ACH / Batch',
    shortName: 'ACH',
    description: 'Automated clearing house and batch payment networks',
    sortOrder: 5,
  },
  mobile_money: {
    name: 'Mobile Money',
    shortName: 'Mobile',
    description: 'Mobile-native payment platforms',
    sortOrder: 6,
  },
  bnpl: {
    name: 'Buy Now Pay Later',
    shortName: 'BNPL',
    description: 'Installment payment and BNPL rails',
    sortOrder: 7,
  },
  crypto: {
    name: 'Crypto / Digital Assets',
    shortName: 'Crypto',
    description: 'Blockchain-based payment and settlement networks',
    sortOrder: 8,
  },
  open_banking: {
    name: 'Open Banking / A2A',
    shortName: 'A2A',
    description: 'Account-to-account payments via open banking APIs',
    sortOrder: 9,
  },
};

export interface RegionMeta {
  name: string;
  shortName: string;
  flag?: string;
}

export const railRegions: Record<RailRegion, RegionMeta> = {
  global: { name: 'Global', shortName: 'Global' },
  north_america: { name: 'North America', shortName: 'Americas' },
  europe: { name: 'Europe', shortName: 'Europe' },
  asia_pacific: { name: 'Asia Pacific', shortName: 'APAC' },
  latin_america: { name: 'Latin America', shortName: 'LatAm' },
  africa: { name: 'Africa', shortName: 'Africa' },
  middle_east: { name: 'Middle East', shortName: 'MENA' },
};

export const sortedCategories = Object.entries(railCategories)
  .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
  .map(([id]) => id as RailCategory);
