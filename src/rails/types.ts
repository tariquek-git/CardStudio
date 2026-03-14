export type RailCategory =
  | 'card_network'
  | 'domestic_debit'
  | 'realtime_payment'
  | 'wire_rtgs'
  | 'ach_batch'
  | 'mobile_money'
  | 'bnpl'
  | 'crypto'
  | 'open_banking';

export type RailRegion =
  | 'global'
  | 'north_america'
  | 'europe'
  | 'asia_pacific'
  | 'latin_america'
  | 'africa'
  | 'middle_east';

export type PaymentRailId = string;

export type RailFieldFormat =
  | 'card_number'
  | 'iban'
  | 'routing_number'
  | 'swift_bic'
  | 'upi_id'
  | 'phone'
  | 'email'
  | 'wallet_address'
  | 'sort_code'
  | 'freeform';

export type CardFormFactor =
  | 'standard_card'
  | 'virtual_only'
  | 'mobile_first'
  | 'document';

export interface RailFieldDef {
  id: string;
  label: string;
  placeholder: string;
  format?: RailFieldFormat;
  position: 'front' | 'back' | 'both';
  required: boolean;
  maxLength?: number;
}

export interface RailTierInfo {
  id: string;
  label: string;
  fullLabel: string;
}

export interface PaymentRail {
  id: PaymentRailId;
  name: string;
  shortName?: string;
  category: RailCategory;
  region: RailRegion;
  country?: string;
  countries?: string[];
  logoFile: string;
  logoFileLight?: string;
  popularity: number;
  tiers?: RailTierInfo[];
  fields: RailFieldDef[];
  hasChip: boolean;
  hasContactless: boolean;
  hasQrCode: boolean;
  cardFormFactor: CardFormFactor;
  defaultColors?: { primary: string; secondary?: string };
  expiryLabel?: string;
  cvvLength?: number;
}
