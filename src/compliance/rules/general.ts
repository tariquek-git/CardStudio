import type { CardConfig } from '../../types';
import type { ComplianceRuleFn } from '../types';
import { luhnCheck, panLengthsForNetwork, validateBinForNetwork } from '../utils';

export const generalRules: ComplianceRuleFn[] = [
  // Luhn check on custom card number
  (config: CardConfig) => {
    const digits = config.customCardNumber?.replace(/\D/g, '');
    if (!digits || digits.length < 8) return null;
    if (luhnCheck(digits)) return null;
    return {
      id: 'general-luhn-fail',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'error',
      title: 'Card Number Fails Luhn Check',
      message: 'The card number does not pass the Luhn (mod-10) algorithm',
      explanation: 'All payment card numbers must satisfy the Luhn algorithm (ISO/IEC 7812-1). This checksum prevents accidental transcription errors and is validated at every point in the payment chain.',
      regulationRef: 'ISO/IEC 7812-1',
      field: 'customCardNumber',
      suggestedFix: 'Enter a valid card number or clear the field to use a test number',
    };
  },

  // PAN length validation
  (config: CardConfig) => {
    const digits = config.customCardNumber?.replace(/\D/g, '');
    if (!digits || digits.length < 8) return null;
    const validLengths = panLengthsForNetwork(config.network);
    if (validLengths.includes(digits.length)) return null;
    return {
      id: 'general-pan-length',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'error',
      title: 'Invalid Card Number Length',
      message: `${config.network.toUpperCase()} requires ${validLengths.join(' or ')} digits, got ${digits.length}`,
      explanation: 'Each payment network specifies valid PAN (Primary Account Number) lengths. Using an incorrect length will cause the card to be rejected at the processor level.',
      regulationRef: 'ISO/IEC 7812-1',
      field: 'customCardNumber',
    };
  },

  // BIN/IIN prefix mismatch
  (config: CardConfig) => {
    if (!config.binRange || config.binRange.length < 1) return null;
    if (validateBinForNetwork(config.binRange, config.network)) return null;
    return {
      id: 'general-bin-mismatch',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'error',
      title: 'BIN Does Not Match Network',
      message: `BIN "${config.binRange}" is not in the valid range for ${config.network.toUpperCase()}`,
      explanation: 'The Bank Identification Number (BIN/IIN) prefix must match the selected payment network. Networks are assigned specific BIN ranges by ISO and the card will not route correctly if the BIN doesn\'t match.',
      regulationRef: 'ISO/IEC 7812-1',
      field: 'binRange',
      suggestedFix: `Check the correct BIN range for your ${config.network.toUpperCase()} program`,
    };
  },

  // Physical card needs chip
  (config: CardConfig) => {
    if (config.chipStyle !== 'none' || config.cardType === 'virtual') return null;
    return {
      id: 'general-chip-required',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'warning',
      title: 'EMV Chip Required',
      message: 'Physical cards require an EMV chip for network certification',
      explanation: 'Since the EMV liability shift (2015 in US, earlier in EU/CA), all physical cards must have an EMV chip. Cards without chips face higher fraud liability and may not pass network certification.',
      regulationRef: 'EMVCo Specifications',
      field: 'chipStyle',
      suggestedFix: 'Select a chip style (Gold, Silver, or Black)',
      autoFixable: true,
      autoFix: { chipStyle: 'gold' },
    };
  },

  // Contactless recommended for new programs
  (config: CardConfig) => {
    if (config.contactless || config.cardType === 'virtual') return null;
    return {
      id: 'general-contactless-recommended',
      jurisdiction: 'GLOBAL',
      category: 'best_practice',
      severity: 'info',
      title: 'Contactless Recommended',
      message: 'All major networks now require contactless capability for new card programs',
      explanation: 'Visa, Mastercard, and Amex mandate contactless (NFC) for all new card programs issued after 2023. Existing programs have grace periods but contactless is effectively required.',
      field: 'contactless',
      suggestedFix: 'Enable contactless',
      autoFixable: true,
      autoFix: { contactless: true },
    };
  },

  // Missing issuer name
  (config: CardConfig) => {
    if (config.issuerName.trim()) return null;
    return {
      id: 'general-issuer-name',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'warning',
      title: 'Issuer Name Required',
      message: 'Card must display the issuing institution name',
      explanation: 'Network certification requires the issuer name to be visible on the card face. This identifies the financial institution responsible for the card program.',
      field: 'issuerName',
    };
  },
];
