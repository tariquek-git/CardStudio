import { euRules } from '../rules/eu';
import { defaultConfig } from '../../types';
import type { CardConfig } from '../../types';

function runRules(config: Partial<CardConfig>) {
  const full = { ...defaultConfig, ...config };
  return euRules.map(fn => fn(full)).filter(Boolean);
}

function findRule(config: Partial<CardConfig>, ruleId: string) {
  return runRules(config).find(r => r!.id === ruleId) ?? null;
}

describe('eu-ifr-card-type-badge', () => {
  it('triggers warning when dual interface badge is off', () => {
    const rule = findRule({ dualInterfaceBadge: false }, 'eu-ifr-card-type-badge');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('warning');
  });

  it('does not trigger when badge is enabled', () => {
    expect(findRule({ dualInterfaceBadge: true }, 'eu-ifr-card-type-badge')).toBeNull();
  });
});

describe('eu-psd2-contactless', () => {
  it('triggers warning when contactless is off', () => {
    const rule = findRule({ contactless: false }, 'eu-psd2-contactless');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('warning');
  });

  it('does not trigger when contactless is on', () => {
    expect(findRule({ contactless: true }, 'eu-psd2-contactless')).toBeNull();
  });
});

describe('eu-sepa-debit-network', () => {
  it('triggers info for debit cards on non-Visa/Maestro network', () => {
    const rule = findRule({ cardType: 'debit', network: 'mastercard' }, 'eu-sepa-debit-network');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('info');
  });

  it('does not trigger for Visa debit', () => {
    expect(findRule({ cardType: 'debit', network: 'visa' }, 'eu-sepa-debit-network')).toBeNull();
  });

  it('does not trigger for Maestro debit', () => {
    expect(findRule({ cardType: 'debit', network: 'maestro' }, 'eu-sepa-debit-network')).toBeNull();
  });

  it('does not trigger for credit cards', () => {
    expect(findRule({ cardType: 'credit', network: 'mastercard' }, 'eu-sepa-debit-network')).toBeNull();
  });
});

describe('eu-iban-recommended', () => {
  it('triggers info for EU debit cards', () => {
    const rule = findRule({ cardType: 'debit' }, 'eu-iban-recommended');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('info');
  });

  it('does not trigger for credit cards', () => {
    expect(findRule({ cardType: 'credit' }, 'eu-iban-recommended')).toBeNull();
  });
});

describe('eu-eurozone-currency', () => {
  it('triggers warning for eurozone country with non-EUR currency', () => {
    const rule = findRule({ issuingCountry: 'DE', currency: 'USD' }, 'eu-eurozone-currency');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('warning');
  });

  it('does not trigger when currency is EUR', () => {
    expect(findRule({ issuingCountry: 'DE', currency: 'EUR' }, 'eu-eurozone-currency')).toBeNull();
  });

  it('does not trigger for non-eurozone EU country', () => {
    // SE (Sweden) is EU but not eurozone
    expect(findRule({ issuingCountry: 'SE', currency: 'SEK' }, 'eu-eurozone-currency')).toBeNull();
  });

  it('triggers for FR with GBP', () => {
    const rule = findRule({ issuingCountry: 'FR', currency: 'GBP' }, 'eu-eurozone-currency');
    expect(rule).not.toBeNull();
  });
});
