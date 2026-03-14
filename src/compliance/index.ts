import type { CardConfig } from '../types';
import type { ComplianceResult, ComplianceRuleFn } from './types';
import { getJurisdictions } from './utils';
import { generalRules } from './rules/general';
import { usRules } from './rules/us';
import { euRules } from './rules/eu';
import { canadaRules } from './rules/canada';
import { networkRules } from './rules/networks';

interface RuleModule {
  jurisdiction: 'US' | 'EU' | 'CA' | 'GLOBAL';
  rules: ComplianceRuleFn[];
}

const modules: RuleModule[] = [
  { jurisdiction: 'GLOBAL', rules: generalRules },
  { jurisdiction: 'GLOBAL', rules: networkRules },
  { jurisdiction: 'US', rules: usRules },
  { jurisdiction: 'EU', rules: euRules },
  { jurisdiction: 'CA', rules: canadaRules },
];

export function validateCompliance(config: CardConfig): ComplianceResult {
  const applicableJurisdictions = getJurisdictions(config.issuingCountry);

  const triggered = modules
    .filter(m => m.jurisdiction === 'GLOBAL' || applicableJurisdictions.includes(m.jurisdiction))
    .flatMap(m => m.rules.map(fn => fn(config)).filter(Boolean)) as ComplianceResult['rules'];

  const errors = triggered.filter(r => r.severity === 'error');
  const warnings = triggered.filter(r => r.severity === 'warning');
  const infos = triggered.filter(r => r.severity === 'info');

  // Score: start at 100, deduct for issues
  const score = Math.max(0, 100 - errors.length * 15 - warnings.length * 5);

  return {
    rules: triggered,
    errors,
    warnings,
    infos,
    score,
    passesNetworkCert: errors.length === 0,
  };
}
