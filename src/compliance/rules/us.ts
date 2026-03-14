import type { CardConfig } from '../../types';
import type { ComplianceRuleFn } from '../types';

export const usRules: ComplianceRuleFn[] = [
  // FDIC notice required for bank-issued debit/prepaid
  (config: CardConfig) => {
    if (config.issuingCountry !== 'US') return null;
    if (config.issuerType !== 'bank') return null;
    if (!['debit', 'prepaid'].includes(config.cardType)) return null;
    if (config.fdicInsured) return null;
    return {
      id: 'us-fdic-required',
      jurisdiction: 'US',
      category: 'regulatory',
      severity: 'error',
      title: 'FDIC Notice Required',
      message: 'Bank-issued debit/prepaid cards must display "Member FDIC" notice',
      explanation: 'The FDIC (Federal Deposit Insurance Corporation) requires member banks to display deposit insurance notices on debit and prepaid cards. This assures cardholders their deposits are insured up to $250,000. Failure to display this notice violates 12 CFR Part 328.',
      regulationRef: '12 CFR Part 328 — FDIC Official Signs and Advertising',
      field: 'fdicInsured',
      suggestedFix: 'Enable "Member FDIC" notice',
      autoFixable: true,
      autoFix: { fdicInsured: true },
    };
  },

  // NCUA notice for credit unions
  (config: CardConfig) => {
    if (config.issuingCountry !== 'US') return null;
    if (config.issuerType !== 'credit_union') return null;
    if (!['debit', 'prepaid'].includes(config.cardType)) return null;
    if (config.ncuaInsured) return null;
    return {
      id: 'us-ncua-required',
      jurisdiction: 'US',
      category: 'regulatory',
      severity: 'error',
      title: 'NCUA Notice Required',
      message: 'Credit union-issued cards must display "Federally Insured by NCUA" notice',
      explanation: 'Federally insured credit unions must display the NCUA insurance notice. The National Credit Union Administration insures deposits up to $250,000 at member credit unions.',
      regulationRef: '12 CFR Part 740 — NCUA Accuracy of Advertising',
      field: 'ncuaInsured',
      suggestedFix: 'Enable NCUA insurance notice',
      autoFixable: true,
      autoFix: { ncuaInsured: true },
    };
  },

  // Durbin Amendment — dual network for debit
  (config: CardConfig) => {
    if (config.issuingCountry !== 'US') return null;
    if (config.cardType !== 'debit') return null;
    if (config.secondaryNetwork) return null;
    return {
      id: 'us-durbin-dual-network',
      jurisdiction: 'US',
      category: 'regulatory',
      severity: 'error',
      title: 'Durbin Amendment: Dual Network Required',
      message: 'US debit cards must support at least 2 unaffiliated payment networks',
      explanation: 'The Durbin Amendment (Dodd-Frank Act Section 1075) requires US debit cards to enable routing over at least two unaffiliated networks. This gives merchants a choice of routing and promotes competition. The primary network (e.g., Visa/Mastercard) must be paired with an unaffiliated PIN debit network (e.g., STAR, Pulse, NYCE).',
      regulationRef: 'Dodd-Frank Act Section 1075 (Durbin Amendment)',
      field: 'secondaryNetwork',
      suggestedFix: 'Select a secondary PIN debit network (STAR, Pulse, NYCE, etc.)',
    };
  },

  // Reg E disclosures for prepaid
  (config: CardConfig) => {
    if (config.issuingCountry !== 'US') return null;
    if (config.cardType !== 'prepaid') return null;
    return {
      id: 'us-reg-e-prepaid',
      jurisdiction: 'US',
      category: 'regulatory',
      severity: 'info',
      title: 'Regulation E: Prepaid Disclosures',
      message: 'Prepaid cards require fee disclosures and error resolution rights per Reg E',
      explanation: 'The 2016 Prepaid Rule (amendments to Regulation E / 12 CFR 1005) requires prepaid card issuers to provide short-form and long-form fee disclosures, error resolution rights, and access to account information. These disclosures must be provided before acquisition.',
      regulationRef: '12 CFR 1005 (Regulation E) — Prepaid Account Rule',
      field: 'cardType',
      suggestedFix: 'Ensure fee disclosures are included in card packaging',
    };
  },

  // FDIC on credit card is wrong
  (config: CardConfig) => {
    if (config.issuingCountry !== 'US') return null;
    if (config.cardType === 'debit' || config.cardType === 'prepaid') return null;
    if (!config.fdicInsured) return null;
    return {
      id: 'us-fdic-credit-invalid',
      jurisdiction: 'US',
      category: 'regulatory',
      severity: 'error',
      title: 'FDIC Notice Invalid on Credit Cards',
      message: 'FDIC deposit insurance does not apply to credit card accounts',
      explanation: 'FDIC insurance covers deposit accounts (checking, savings). Credit card balances are not deposits and displaying "Member FDIC" on a credit card is misleading and violates FDIC advertising regulations.',
      regulationRef: '12 CFR Part 328',
      field: 'fdicInsured',
      suggestedFix: 'Remove FDIC notice from credit card',
      autoFixable: true,
      autoFix: { fdicInsured: false },
    };
  },

  // Support phone required
  (config: CardConfig) => {
    if (config.issuingCountry !== 'US') return null;
    const phone = config.backSupportPhone?.trim();
    if (phone && phone !== '1-800-XXX-XXXX') return null;
    return {
      id: 'us-support-phone',
      jurisdiction: 'US',
      category: 'regulatory',
      severity: 'warning',
      title: 'Customer Service Number Required',
      message: 'Cards must display a customer service phone number on the back',
      explanation: 'US regulations and network rules require a toll-free customer service number on the card back for dispute resolution and fraud reporting. Reg E requires access to error resolution.',
      regulationRef: 'Reg E / Network Operating Regulations',
      field: 'backSupportPhone',
    };
  },
];
