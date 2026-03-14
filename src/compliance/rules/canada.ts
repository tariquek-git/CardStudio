import type { CardConfig } from '../../types';
import type { ComplianceRuleFn } from '../types';

export const canadaRules: ComplianceRuleFn[] = [
  // Interac requirement for Canadian debit
  (config: CardConfig) => {
    if (config.cardType !== 'debit') return null;
    if (config.network === 'interac') return null;
    return {
      id: 'ca-interac-debit',
      jurisdiction: 'CA',
      category: 'regulatory',
      severity: 'warning',
      title: 'Interac Required for Canadian Debit',
      message: 'Canadian debit cards must support Interac for domestic transactions',
      explanation: 'In Canada, Interac is the mandatory domestic debit network. All Canadian debit cards must support Interac for point-of-sale and ABM transactions. International networks (Visa Debit, Mastercard Debit) can be added as co-badges for international acceptance, but Interac is required domestically per the Code of Conduct for the Credit and Debit Card Industry.',
      regulationRef: 'Code of Conduct for the Credit and Debit Card Industry in Canada',
      field: 'network',
      suggestedFix: 'Select Interac as the primary network or add it as secondary',
    };
  },

  // Bilingual requirement for federally regulated institutions
  (config: CardConfig) => {
    if (config.bilingualRequired) return null;
    return {
      id: 'ca-bilingual',
      jurisdiction: 'CA',
      category: 'regulatory',
      severity: 'warning',
      title: 'Bilingual Requirement',
      message: 'Federally regulated institutions must offer French/English card text',
      explanation: 'Under the Official Languages Act and FCAC (Financial Consumer Agency of Canada) guidelines, federally regulated financial institutions must provide services in both official languages (English and French). Card text like "VALID THRU", "DEBIT", and fine print should be available in both languages.',
      regulationRef: 'Official Languages Act / FCAC Guidelines',
      field: 'bilingualRequired',
      suggestedFix: 'Enable bilingual card text',
      autoFixable: true,
      autoFix: { bilingualRequired: true },
    };
  },

  // CAD currency expected
  (config: CardConfig) => {
    if (config.currency === 'CAD' || config.currency === 'USD') return null;
    return {
      id: 'ca-currency',
      jurisdiction: 'CA',
      category: 'best_practice',
      severity: 'info',
      title: 'Currency Selection',
      message: `Canadian card using ${config.currency} — most Canadian cards are denominated in CAD`,
      explanation: 'Canadian-issued cards are typically denominated in CAD. USD-denominated cards are also common for cross-border use. Other currencies may indicate a specialty product.',
      field: 'currency',
      suggestedFix: 'Set currency to CAD',
      autoFixable: true,
      autoFix: { currency: 'CAD' },
    };
  },

  // Code of Conduct — merchant surcharging notice
  (config: CardConfig) => {
    if (config.cardType !== 'credit') return null;
    return {
      id: 'ca-code-of-conduct',
      jurisdiction: 'CA',
      category: 'best_practice',
      severity: 'info',
      title: 'Code of Conduct Compliance',
      message: 'Canadian credit cards are subject to the voluntary Code of Conduct',
      explanation: 'The Code of Conduct for the Credit and Debit Card Industry in Canada sets standards for transparency, merchant rights, and card acceptance. Since October 2022, Canadian merchants can surcharge credit cards up to the cost of acceptance. This affects card program economics.',
      regulationRef: 'Code of Conduct for the Credit and Debit Card Industry in Canada',
      field: 'cardType',
    };
  },

  // FCAC complaint handling
  (config: CardConfig) => {
    const phone = config.backSupportPhone?.trim();
    if (phone && phone !== '1-800-XXX-XXXX') return null;
    return {
      id: 'ca-fcac-support',
      jurisdiction: 'CA',
      category: 'regulatory',
      severity: 'warning',
      title: 'FCAC: Support Contact Required',
      message: 'Canadian cards must display a customer support number',
      explanation: 'FCAC regulations require financial institutions to provide accessible complaint handling mechanisms. The card back must include a toll-free customer service number that cardholders can use to report issues, disputes, or fraud.',
      regulationRef: 'Bank Act / FCAC Guidelines',
      field: 'backSupportPhone',
    };
  },
];
