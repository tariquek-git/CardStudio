import type { CardNetwork } from '../types';
import type { ComplianceJurisdiction } from './types';

// Luhn algorithm (mod-10 check) — validates card numbers
export function luhnCheck(pan: string): boolean {
  const digits = pan.replace(/\D/g, '');
  if (digits.length < 8) return false;
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

// Valid PAN lengths per network
export function panLengthsForNetwork(network: CardNetwork): number[] {
  switch (network) {
    case 'amex': return [15];
    case 'discover': return [16, 17, 18, 19];
    case 'maestro': return [12, 13, 14, 15, 16, 17, 18, 19];
    case 'unionpay': return [16, 17, 18, 19];
    default: return [16]; // visa, mastercard, jcb, interac
  }
}

// Check if BIN prefix matches the declared network
export function validateBinForNetwork(bin: string, network: CardNetwork): boolean {
  if (!bin || bin.length < 1) return true; // empty = not checked
  const b = parseInt(bin.slice(0, 2), 10);
  const b4 = parseInt(bin.slice(0, 4), 10);
  const b6 = parseInt(bin.slice(0, 6), 10);

  switch (network) {
    case 'visa': return bin[0] === '4';
    case 'mastercard':
      return (b >= 51 && b <= 55) || (b4 >= 2221 && b4 <= 2720);
    case 'amex': return b === 34 || b === 37;
    case 'discover':
      return bin.startsWith('6011') || (b6 >= 644000 && b6 <= 649999) || bin.startsWith('65');
    case 'jcb': return b4 >= 3528 && b4 <= 3589;
    case 'unionpay': return bin.startsWith('62');
    case 'interac': return bin.startsWith('636');
    case 'maestro':
      return bin.startsWith('5018') || bin.startsWith('5020') || bin.startsWith('5038') ||
        bin.startsWith('5893') || bin.startsWith('6304') || bin.startsWith('6759') ||
        bin.startsWith('6761') || bin.startsWith('6762') || bin.startsWith('6763');
    default: return true;
  }
}

// EU member states (ISO 3166-1 alpha-2)
const EU_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
]);

// EEA includes EU + Iceland, Liechtenstein, Norway
const EEA_EXTRAS = new Set(['IS', 'LI', 'NO']);

export function getJurisdictions(countryCode: string): ComplianceJurisdiction[] {
  const jurisdictions: ComplianceJurisdiction[] = ['GLOBAL'];
  if (countryCode === 'US') jurisdictions.push('US');
  if (countryCode === 'CA') jurisdictions.push('CA');
  if (EU_COUNTRIES.has(countryCode) || EEA_EXTRAS.has(countryCode) || countryCode === 'GB') {
    jurisdictions.push('EU');
  }
  return jurisdictions;
}

// Country data for dropdown
export const COUNTRIES = [
  { code: 'US', name: 'United States', flag: 'US' },
  { code: 'CA', name: 'Canada', flag: 'CA' },
  { code: 'GB', name: 'United Kingdom', flag: 'GB' },
  { code: 'DE', name: 'Germany', flag: 'DE' },
  { code: 'FR', name: 'France', flag: 'FR' },
  { code: 'IE', name: 'Ireland', flag: 'IE' },
  { code: 'NL', name: 'Netherlands', flag: 'NL' },
  { code: 'SE', name: 'Sweden', flag: 'SE' },
  { code: 'FI', name: 'Finland', flag: 'FI' },
  { code: 'DK', name: 'Denmark', flag: 'DK' },
  { code: 'ES', name: 'Spain', flag: 'ES' },
  { code: 'IT', name: 'Italy', flag: 'IT' },
  { code: 'PT', name: 'Portugal', flag: 'PT' },
  { code: 'AT', name: 'Austria', flag: 'AT' },
  { code: 'BE', name: 'Belgium', flag: 'BE' },
  { code: 'LU', name: 'Luxembourg', flag: 'LU' },
  { code: 'PL', name: 'Poland', flag: 'PL' },
  { code: 'CZ', name: 'Czech Republic', flag: 'CZ' },
  { code: 'HU', name: 'Hungary', flag: 'HU' },
  { code: 'RO', name: 'Romania', flag: 'RO' },
  { code: 'BG', name: 'Bulgaria', flag: 'BG' },
  { code: 'HR', name: 'Croatia', flag: 'HR' },
  { code: 'GR', name: 'Greece', flag: 'GR' },
  { code: 'EE', name: 'Estonia', flag: 'EE' },
  { code: 'LV', name: 'Latvia', flag: 'LV' },
  { code: 'LT', name: 'Lithuania', flag: 'LT' },
  { code: 'SK', name: 'Slovakia', flag: 'SK' },
  { code: 'SI', name: 'Slovenia', flag: 'SI' },
  { code: 'CY', name: 'Cyprus', flag: 'CY' },
  { code: 'MT', name: 'Malta', flag: 'MT' },
  { code: 'NO', name: 'Norway', flag: 'NO' },
  { code: 'IS', name: 'Iceland', flag: 'IS' },
  { code: 'LI', name: 'Liechtenstein', flag: 'LI' },
  { code: 'AU', name: 'Australia', flag: 'AU' },
  { code: 'NZ', name: 'New Zealand', flag: 'NZ' },
  { code: 'SG', name: 'Singapore', flag: 'SG' },
  { code: 'HK', name: 'Hong Kong', flag: 'HK' },
  { code: 'JP', name: 'Japan', flag: 'JP' },
  { code: 'BR', name: 'Brazil', flag: 'BR' },
  { code: 'MX', name: 'Mexico', flag: 'MX' },
  { code: 'IN', name: 'India', flag: 'IN' },
  { code: 'AE', name: 'UAE', flag: 'AE' },
];

// Currency data
export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '\u20AC' },
  { code: 'GBP', name: 'British Pound', symbol: '\u00A3' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '\u00A5' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
  { code: 'INR', name: 'Indian Rupee', symbol: '\u20B9' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'z\u0142' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'K\u010D' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei' },
];
