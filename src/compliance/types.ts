import type { CardConfig } from '../types';

export type ComplianceSeverity = 'error' | 'warning' | 'info';

export type ComplianceJurisdiction = 'US' | 'EU' | 'CA' | 'GLOBAL';

export type ComplianceCategory = 'regulatory' | 'network' | 'best_practice';

export interface ComplianceRule {
  id: string;
  jurisdiction: ComplianceJurisdiction;
  category: ComplianceCategory;
  severity: ComplianceSeverity;
  title: string;
  message: string;
  explanation: string;
  regulationRef?: string;
  field: string;
  suggestedFix?: string;
  autoFixable?: boolean;
  autoFix?: Partial<CardConfig>;
}

export interface ComplianceResult {
  rules: ComplianceRule[];
  errors: ComplianceRule[];
  warnings: ComplianceRule[];
  infos: ComplianceRule[];
  score: number; // 0-100
  passesNetworkCert: boolean;
}

export type ComplianceRuleFn = (config: CardConfig) => ComplianceRule | null;
