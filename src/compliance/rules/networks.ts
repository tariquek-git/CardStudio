import type { CardConfig } from '../../types';
import type { ComplianceRuleFn } from '../types';

// ─── Visa Rules ─────────────────────────────────────────────
const visaRules: ComplianceRuleFn[] = [
  // BIN must start with 4
  (config: CardConfig) => {
    if (config.network !== 'visa') return null;
    if (!config.binRange) return null;
    if (config.binRange[0] === '4') return null;
    return {
      id: 'visa-bin-prefix',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'error',
      title: 'Visa BIN Must Start with 4',
      message: `BIN "${config.binRange}" does not start with 4`,
      explanation: 'Visa has been assigned the IIN/BIN range starting with 4 by ISO. All Visa card numbers must begin with 4. This is a hard requirement for Visa network certification (VPF).',
      regulationRef: 'Visa Product & Service Rules',
      field: 'binRange',
    };
  },

  // Contactless mandate
  (config: CardConfig) => {
    if (config.network !== 'visa') return null;
    if (config.contactless || config.cardType === 'virtual') return null;
    return {
      id: 'visa-contactless-mandate',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'warning',
      title: 'Visa Contactless Mandate',
      message: 'Visa requires contactless capability on all new card programs',
      explanation: 'Visa mandates that all new card programs support Visa payWave (contactless). Existing programs had until April 2023 (varies by region) to comply. Cards without contactless may not pass Visa Product Fit (VPF) review.',
      regulationRef: 'Visa Core Rules & Product & Service Rules',
      field: 'contactless',
      autoFixable: true,
      autoFix: { contactless: true },
    };
  },

  // Tier naming validation
  (config: CardConfig) => {
    if (config.network !== 'visa') return null;
    const validTiers = ['classic', 'gold', 'platinum', 'signature', 'infinite', 'business'];
    if (!config.tier || validTiers.includes(config.tier)) return null;
    return {
      id: 'visa-tier-naming',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'info',
      title: 'Non-Standard Visa Tier',
      message: `"${config.tier}" is not a standard Visa product tier`,
      explanation: 'Visa defines specific product tiers (Classic, Gold, Platinum, Signature, Infinite) with associated interchange rates and benefits. Using a non-standard tier name may require special approval from Visa.',
      field: 'tier',
    };
  },
];

// ─── Mastercard Rules ───────────────────────────────────────
const mastercardRules: ComplianceRuleFn[] = [
  // BIN range validation
  (config: CardConfig) => {
    if (config.network !== 'mastercard') return null;
    if (!config.binRange || config.binRange.length < 2) return null;
    const b = parseInt(config.binRange.slice(0, 2), 10);
    const b4 = parseInt(config.binRange.slice(0, 4), 10);
    if ((b >= 51 && b <= 55) || (b4 >= 2221 && b4 <= 2720)) return null;
    return {
      id: 'mc-bin-prefix',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'error',
      title: 'Mastercard BIN Range Invalid',
      message: `BIN "${config.binRange}" is not in Mastercard range (51-55 or 2221-2720)`,
      explanation: 'Mastercard is assigned BIN ranges 51-55 (legacy) and 2221-2720 (2-series, introduced 2017). All Mastercard-branded cards must use a BIN from these ranges.',
      regulationRef: 'Mastercard Rules & Standards',
      field: 'binRange',
    };
  },

  // Contactless mandate
  (config: CardConfig) => {
    if (config.network !== 'mastercard') return null;
    if (config.contactless || config.cardType === 'virtual') return null;
    return {
      id: 'mc-contactless-mandate',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'warning',
      title: 'Mastercard Contactless Mandate',
      message: 'Mastercard requires contactless on all new card programs globally',
      explanation: 'Mastercard mandates contactless capability on all new consumer cards. Their roadmap targets 100% contactless issuance. Cards without contactless may face certification delays.',
      regulationRef: 'Mastercard Rules Manual',
      field: 'contactless',
      autoFixable: true,
      autoFix: { contactless: true },
    };
  },

  // Tier naming
  (config: CardConfig) => {
    if (config.network !== 'mastercard') return null;
    const validTiers = ['standard', 'gold', 'platinum', 'world', 'world_elite', 'business'];
    if (!config.tier || validTiers.includes(config.tier)) return null;
    return {
      id: 'mc-tier-naming',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'info',
      title: 'Non-Standard Mastercard Tier',
      message: `"${config.tier}" is not a standard Mastercard product tier`,
      explanation: 'Mastercard defines tiers: Standard, Gold, Platinum, World, World Elite. Each has specific interchange rates, benefits requirements, and brand guidelines.',
      field: 'tier',
    };
  },
];

// ─── Amex Rules ─────────────────────────────────────────────
const amexRules: ComplianceRuleFn[] = [
  // 15-digit PAN
  (config: CardConfig) => {
    if (config.network !== 'amex') return null;
    const digits = config.customCardNumber?.replace(/\D/g, '');
    if (!digits || digits.length === 0) return null;
    if (digits.length === 15) return null;
    return {
      id: 'amex-pan-15',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'error',
      title: 'Amex Requires 15-Digit PAN',
      message: `American Express uses 15-digit card numbers (got ${digits.length})`,
      explanation: 'Unlike Visa/Mastercard (16 digits), American Express uses a 15-digit PAN format: 4-6-5 grouping. This is a fundamental Amex standard.',
      field: 'customCardNumber',
    };
  },

  // BIN 34/37
  (config: CardConfig) => {
    if (config.network !== 'amex') return null;
    if (!config.binRange || config.binRange.length < 2) return null;
    const b = parseInt(config.binRange.slice(0, 2), 10);
    if (b === 34 || b === 37) return null;
    return {
      id: 'amex-bin-prefix',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'error',
      title: 'Amex BIN Must Start with 34 or 37',
      message: `BIN "${config.binRange}" is not in Amex range (34 or 37)`,
      explanation: 'American Express cards are identified by BINs starting with 34 or 37. This is assigned by ISO and is a hard requirement.',
      regulationRef: 'Amex Network Rules',
      field: 'binRange',
    };
  },

  // Amex is own issuer (no FDIC)
  (config: CardConfig) => {
    if (config.network !== 'amex') return null;
    if (config.cardType !== 'credit') return null;
    if (!config.fdicInsured && !config.ncuaInsured) return null;
    return {
      id: 'amex-no-fdic',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'warning',
      title: 'FDIC/NCUA Not Applicable to Amex Credit',
      message: 'American Express credit cards are not deposit products',
      explanation: 'Amex operates as both network and issuer for most products. Their credit cards are not deposit accounts and FDIC/NCUA insurance does not apply.',
      field: 'fdicInsured',
    };
  },
];

// ─── Discover Rules ─────────────────────────────────────────
const discoverRules: ComplianceRuleFn[] = [
  // BIN validation
  (config: CardConfig) => {
    if (config.network !== 'discover') return null;
    if (!config.binRange || config.binRange.length < 4) return null;
    const valid = config.binRange.startsWith('6011') ||
      (parseInt(config.binRange.slice(0, 3), 10) >= 644 && parseInt(config.binRange.slice(0, 3), 10) <= 649) ||
      config.binRange.startsWith('65');
    if (valid) return null;
    return {
      id: 'discover-bin-prefix',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'error',
      title: 'Discover BIN Range Invalid',
      message: `BIN "${config.binRange}" is not in Discover range (6011, 644-649, 65)`,
      explanation: 'Discover cards use BINs starting with 6011, 644-649, or 65. These ranges also cover Discover\'s alliance networks (Diners Club, JCB in some regions).',
      regulationRef: 'Discover Network Rules',
      field: 'binRange',
    };
  },

  // Pulse affiliation for US debit
  (config: CardConfig) => {
    if (config.network !== 'discover') return null;
    if (config.issuingCountry !== 'US') return null;
    if (config.cardType !== 'debit') return null;
    if (config.secondaryNetwork === 'pulse') return null;
    return {
      id: 'discover-pulse-debit',
      jurisdiction: 'US',
      category: 'best_practice',
      severity: 'info',
      title: 'Pulse Network for Discover Debit',
      message: 'Discover-branded debit cards typically use Pulse as the PIN debit network',
      explanation: 'Pulse (owned by Discover) is the natural PIN debit network for Discover-branded debit cards. Using Pulse simplifies routing and may offer preferential interchange rates.',
      field: 'secondaryNetwork',
      suggestedFix: 'Select Pulse as secondary network',
      autoFixable: true,
      autoFix: { secondaryNetwork: 'pulse' },
    };
  },
];

// ─── Interac Rules ──────────────────────────────────────────
const interacRules: ComplianceRuleFn[] = [
  // Interac is Canadian only
  (config: CardConfig) => {
    if (config.network !== 'interac') return null;
    if (config.issuingCountry === 'CA') return null;
    return {
      id: 'interac-canada-only',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'error',
      title: 'Interac: Canadian Market Only',
      message: 'Interac is exclusively for Canadian-issued cards',
      explanation: 'Interac is Canada\'s domestic debit network. It is not available for card programs outside of Canada. For non-Canadian debit, use Visa Debit, Mastercard Debit, or a local network.',
      regulationRef: 'Interac Operating Regulations',
      field: 'issuingCountry',
      suggestedFix: 'Set issuing country to Canada or choose a different network',
    };
  },

  // Interac must be debit
  (config: CardConfig) => {
    if (config.network !== 'interac') return null;
    if (config.cardType === 'debit' || config.cardType === 'prepaid') return null;
    return {
      id: 'interac-debit-only',
      jurisdiction: 'CA',
      category: 'network',
      severity: 'error',
      title: 'Interac: Debit/Prepaid Only',
      message: 'Interac network only supports debit and prepaid card types',
      explanation: 'Interac is a debit network — it does not support credit card products. Canadian credit cards use Visa, Mastercard, or Amex.',
      field: 'cardType',
      suggestedFix: 'Change card type to Debit or Prepaid',
    };
  },
];

// ─── JCB Rules ──────────────────────────────────────────────
const jcbRules: ComplianceRuleFn[] = [
  (config: CardConfig) => {
    if (config.network !== 'jcb') return null;
    if (!config.binRange || config.binRange.length < 4) return null;
    const b4 = parseInt(config.binRange.slice(0, 4), 10);
    if (b4 >= 3528 && b4 <= 3589) return null;
    return {
      id: 'jcb-bin-prefix',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'error',
      title: 'JCB BIN Range Invalid',
      message: `BIN "${config.binRange}" is not in JCB range (3528-3589)`,
      explanation: 'JCB is assigned BINs in the range 3528-3589. This is the standard IIN range for JCB-branded cards globally.',
      regulationRef: 'JCB Operating Rules',
      field: 'binRange',
    };
  },
];

// ─── UnionPay Rules ─────────────────────────────────────────
const unionpayRules: ComplianceRuleFn[] = [
  (config: CardConfig) => {
    if (config.network !== 'unionpay') return null;
    if (!config.binRange || config.binRange.length < 2) return null;
    if (config.binRange.startsWith('62')) return null;
    return {
      id: 'unionpay-bin-prefix',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'error',
      title: 'UnionPay BIN Must Start with 62',
      message: `BIN "${config.binRange}" does not start with 62`,
      explanation: 'China UnionPay is assigned BINs starting with 62. All UnionPay-branded cards must use this prefix.',
      regulationRef: 'UnionPay International Operating Rules',
      field: 'binRange',
    };
  },
];

export const networkRules: ComplianceRuleFn[] = [
  ...visaRules,
  ...mastercardRules,
  ...amexRules,
  ...discoverRules,
  ...interacRules,
  ...jcbRules,
  ...unionpayRules,
];
