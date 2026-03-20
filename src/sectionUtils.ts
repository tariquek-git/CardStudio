import type { CardConfig } from './types';
import { defaultConfig } from './types';
import type { ComplianceRule } from './compliance/types';
import type { ReactNode } from 'react';

// ─── Section Metadata ───────────────────────────────────────

export interface SectionMeta {
  id: string;
  label: string;
  fields: (keyof CardConfig)[];
}

export const SECTIONS: SectionMeta[] = [
  {
    id: 'card-program',
    label: 'Card Program',
    fields: ['cardType', 'orientation', 'issuingCountry', 'issuerType', 'currency', 'binRange', 'fdicInsured', 'ncuaInsured', 'secondaryNetwork', 'coBrandPartner', 'coBrandLogo', 'dualInterfaceBadge', 'cardLevelBadge', 'issuerAddress', 'bilingualRequired'],
  },
  {
    id: 'brand-identity',
    label: 'Brand',
    fields: ['issuerName', 'issuerLogo', 'programName', 'railId', 'tier', 'network'],
  },
  {
    id: 'visual-design',
    label: 'Design',
    fields: ['colorMode', 'solidColor', 'presetColor', 'gradientConfig', 'cardArt', 'cardArtOpacity', 'cardArtFit', 'cardArtBlend', 'material', 'textColorOverride'],
  },
  {
    id: 'card-details',
    label: 'Details',
    fields: ['numberless', 'numberPosition', 'cardholderName', 'customCardNumber', 'cardNumberDisplay', 'expiryDate'],
  },
  {
    id: 'card-features',
    label: 'Features',
    fields: ['chipStyle', 'contactless', 'backLogos'],
  },
  {
    id: 'card-back',
    label: 'Back',
    fields: ['backShowMagStripe', 'backShowSignatureStrip', 'backShowHologram', 'backSupportPhone', 'backSupportUrl', 'backQrUrl', 'backLegalText'],
  },
  {
    id: 'compliance',
    label: 'Compliance',
    fields: [],
  },
];

// ─── Modification Detection ─────────────────────────────────

export function getSectionModStatus(config: CardConfig): Record<string, number> {
  const result: Record<string, number> = {};
  for (const section of SECTIONS) {
    let count = 0;
    for (const field of section.fields) {
      const current = config[field];
      const def = defaultConfig[field];
      if (typeof current === 'object' && current !== null) {
        if (JSON.stringify(current) !== JSON.stringify(def)) count++;
      } else if (current !== def) {
        count++;
      }
    }
    result[section.id] = count;
  }
  return result;
}

export function isDefaultConfig(config: CardConfig): boolean {
  const status = getSectionModStatus(config);
  return Object.values(status).every(count => count === 0);
}

// ─── Compliance → Section Mapping ───────────────────────────

const COMPLIANCE_FIELD_TO_SECTION: Record<string, string> = {
  // General rules
  chipStyle: 'card-features',
  contactless: 'card-features',
  issuerName: 'brand-identity',
  // US rules
  fdicInsured: 'card-program',
  ncuaInsured: 'card-program',
  secondaryNetwork: 'card-program',
  backSupportPhone: 'card-back',
  // EU rules
  dualInterfaceBadge: 'card-program',
  currency: 'card-program',
  // Canada rules
  bilingualRequired: 'card-program',
  issuingCountry: 'card-program',
  // Network rules
  binRange: 'card-program',
  cardType: 'card-program',
  network: 'brand-identity',
};

export function getComplianceErrorSections(rules: ComplianceRule[]): string[] {
  const sections = new Set<string>();
  for (const rule of rules) {
    if (rule.severity === 'error') {
      // Try to map rule category to section
      const sectionId = COMPLIANCE_FIELD_TO_SECTION[rule.category] || 'card-program';
      sections.add(sectionId);
    }
  }
  return Array.from(sections);
}
