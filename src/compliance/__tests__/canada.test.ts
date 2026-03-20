import { canadaRules } from '../rules/canada';
import { defaultConfig } from '../../types';
import type { CardConfig } from '../../types';

function runRules(config: Partial<CardConfig>) {
  const full = { ...defaultConfig, ...config };
  return canadaRules.map(fn => fn(full)).filter(Boolean);
}

function findRule(config: Partial<CardConfig>, ruleId: string) {
  return runRules(config).find(r => r!.id === ruleId) ?? null;
}

describe('ca-interac-debit', () => {
  it('triggers warning for Canadian debit not on Interac', () => {
    const rule = findRule({ cardType: 'debit', network: 'visa' }, 'ca-interac-debit');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('warning');
  });

  it('does not trigger when network is Interac', () => {
    expect(findRule({ cardType: 'debit', network: 'interac' }, 'ca-interac-debit')).toBeNull();
  });

  it('does not trigger for credit cards', () => {
    expect(findRule({ cardType: 'credit', network: 'visa' }, 'ca-interac-debit')).toBeNull();
  });
});

describe('ca-bilingual', () => {
  it('triggers warning when bilingual is off', () => {
    const rule = findRule({ bilingualRequired: false }, 'ca-bilingual');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('warning');
  });

  it('does not trigger when bilingual is on', () => {
    expect(findRule({ bilingualRequired: true }, 'ca-bilingual')).toBeNull();
  });
});

describe('ca-currency', () => {
  it('triggers info for non-CAD/non-USD currency', () => {
    const rule = findRule({ currency: 'EUR' }, 'ca-currency');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('info');
  });

  it('does not trigger for CAD', () => {
    expect(findRule({ currency: 'CAD' }, 'ca-currency')).toBeNull();
  });

  it('does not trigger for USD', () => {
    expect(findRule({ currency: 'USD' }, 'ca-currency')).toBeNull();
  });
});

describe('ca-code-of-conduct', () => {
  it('triggers info for credit cards', () => {
    const rule = findRule({ cardType: 'credit' }, 'ca-code-of-conduct');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('info');
  });

  it('does not trigger for debit cards', () => {
    expect(findRule({ cardType: 'debit' }, 'ca-code-of-conduct')).toBeNull();
  });
});

describe('ca-fcac-support', () => {
  it('triggers warning when phone is placeholder', () => {
    const rule = findRule({ backSupportPhone: '1-800-XXX-XXXX' }, 'ca-fcac-support');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('warning');
  });

  it('triggers warning when phone is empty', () => {
    expect(findRule({ backSupportPhone: '' }, 'ca-fcac-support')).not.toBeNull();
  });

  it('does not trigger when a real phone is set', () => {
    expect(findRule({ backSupportPhone: '1-888-555-1234' }, 'ca-fcac-support')).toBeNull();
  });
});
