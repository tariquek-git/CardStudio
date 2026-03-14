import type { CardConfig } from '../../types';
import type { ComplianceRuleFn } from '../types';

export const euRules: ComplianceRuleFn[] = [
  // IFR — debit vs credit identification
  (config: CardConfig) => {
    if (!config.dualInterfaceBadge) {
      return {
        id: 'eu-ifr-card-type-badge',
        jurisdiction: 'EU',
        category: 'regulatory',
        severity: 'warning',
        title: 'Card Type Identification Recommended',
        message: 'EU Interchange Fee Regulation requires clear debit/credit identification',
        explanation: 'The EU Interchange Fee Regulation (IFR, Regulation 2015/751) caps interchange fees differently for debit (0.2%) and credit (0.3%) cards. To ensure correct fee application, cards should clearly indicate whether they are debit or credit. Many issuers display a "DEBIT" or "CREDIT" badge on the card face.',
        regulationRef: 'EU Regulation 2015/751 (IFR) Article 17',
        field: 'dualInterfaceBadge',
        suggestedFix: 'Enable the DEBIT/CREDIT badge on the card face',
        autoFixable: true,
        autoFix: { dualInterfaceBadge: true },
      };
    }
    return null;
  },

  // PSD2/SCA indicator
  (config: CardConfig) => {
    if (config.contactless) return null;
    return {
      id: 'eu-psd2-contactless',
      jurisdiction: 'EU',
      category: 'regulatory',
      severity: 'warning',
      title: 'PSD2: Contactless Required',
      message: 'EU-issued cards should support contactless for SCA-compliant tap payments',
      explanation: 'Under PSD2 (Payment Services Directive 2) and Strong Customer Authentication (SCA) requirements, contactless payments under €50 can be exempted from SCA. Cards without contactless lose this exemption and create friction. All EU card programs issued since 2021 are expected to support contactless.',
      regulationRef: 'PSD2 (EU Directive 2015/2366) / SCA RTS',
      field: 'contactless',
      suggestedFix: 'Enable contactless',
      autoFixable: true,
      autoFix: { contactless: true },
    };
  },

  // SEPA compliance for EU debit
  (config: CardConfig) => {
    if (config.cardType !== 'debit') return null;
    if (config.network === 'maestro' || config.network === 'visa') return null;
    return {
      id: 'eu-sepa-debit-network',
      jurisdiction: 'EU',
      category: 'best_practice',
      severity: 'info',
      title: 'SEPA Debit Card Compatibility',
      message: 'EU debit cards typically use Visa Debit or Maestro for SEPA acceptance',
      explanation: 'The Single Euro Payments Area (SEPA) relies on Visa Debit and Maestro/Mastercard Debit as the primary debit card schemes. Using other networks may limit acceptance across SEPA countries.',
      regulationRef: 'SEPA Card Framework',
      field: 'network',
    };
  },

  // IBAN on card back recommended for EU
  (config: CardConfig) => {
    if (config.cardType !== 'debit') return null;
    // This is a best practice, not hard requirement
    return {
      id: 'eu-iban-recommended',
      jurisdiction: 'EU',
      category: 'best_practice',
      severity: 'info',
      title: 'IBAN Reference on Card',
      message: 'EU debit cards often display the linked IBAN on the card back for convenience',
      explanation: 'Many EU banks print the IBAN (International Bank Account Number) on the back of debit cards so cardholders have it available for SEPA transfers. This is a convenience feature, not a regulatory requirement.',
      field: 'backLegalText',
    };
  },

  // Currency mismatch warning
  (config: CardConfig) => {
    if (config.currency === 'EUR') return null;
    // Check if this is a eurozone country
    const eurozone = new Set(['DE', 'FR', 'IT', 'ES', 'PT', 'NL', 'BE', 'LU', 'AT', 'FI', 'IE', 'GR', 'EE', 'LV', 'LT', 'SK', 'SI', 'CY', 'MT', 'HR']);
    if (!eurozone.has(config.issuingCountry)) return null;
    return {
      id: 'eu-eurozone-currency',
      jurisdiction: 'EU',
      category: 'best_practice',
      severity: 'warning',
      title: 'Eurozone Currency Mismatch',
      message: `Card is issued in a eurozone country but currency is ${config.currency}, not EUR`,
      explanation: 'Cards issued in eurozone countries are typically denominated in EUR. A non-EUR currency may indicate a multi-currency or travel card, which is valid but less common.',
      field: 'currency',
      suggestedFix: 'Set currency to EUR for eurozone issuance',
      autoFixable: true,
      autoFix: { currency: 'EUR' },
    };
  },
];
