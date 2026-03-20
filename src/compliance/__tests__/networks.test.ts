import { networkRules } from '../rules/networks';
import { defaultConfig } from '../../types';
import type { CardConfig } from '../../types';

function runRules(config: Partial<CardConfig>) {
  const full = { ...defaultConfig, ...config };
  return networkRules.map(fn => fn(full)).filter(Boolean);
}

function findRule(config: Partial<CardConfig>, ruleId: string) {
  return runRules(config).find(r => r!.id === ruleId) ?? null;
}

describe('Visa rules', () => {
  it('visa-bin-prefix triggers for non-4 BIN', () => {
    const rule = findRule({ network: 'visa', binRange: '512345' }, 'visa-bin-prefix');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('error');
  });

  it('visa-bin-prefix does not trigger for BIN starting with 4', () => {
    expect(findRule({ network: 'visa', binRange: '411111' }, 'visa-bin-prefix')).toBeNull();
  });

  it('visa-bin-prefix does not trigger when BIN is empty', () => {
    expect(findRule({ network: 'visa', binRange: '' }, 'visa-bin-prefix')).toBeNull();
  });

  it('visa-contactless-mandate triggers when contactless is off', () => {
    const rule = findRule({ network: 'visa', contactless: false, cardType: 'credit' }, 'visa-contactless-mandate');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('warning');
  });

  it('visa-contactless-mandate does not trigger for virtual cards', () => {
    expect(findRule({ network: 'visa', contactless: false, cardType: 'virtual' }, 'visa-contactless-mandate')).toBeNull();
  });

  it('visa-tier-naming triggers info for non-standard tier', () => {
    const rule = findRule({ network: 'visa', tier: 'custom-tier' }, 'visa-tier-naming');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('info');
  });

  it('visa-tier-naming does not trigger for standard tier', () => {
    expect(findRule({ network: 'visa', tier: 'platinum' }, 'visa-tier-naming')).toBeNull();
  });
});

describe('Mastercard rules', () => {
  it('mc-bin-prefix triggers for invalid BIN', () => {
    const rule = findRule({ network: 'mastercard', binRange: '411111' }, 'mc-bin-prefix');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('error');
  });

  it('mc-bin-prefix does not trigger for valid 51 BIN', () => {
    expect(findRule({ network: 'mastercard', binRange: '512345' }, 'mc-bin-prefix')).toBeNull();
  });

  it('mc-bin-prefix does not trigger for valid 2-series BIN', () => {
    expect(findRule({ network: 'mastercard', binRange: '2221' }, 'mc-bin-prefix')).toBeNull();
  });

  it('mc-bin-prefix does not trigger when BIN is too short', () => {
    expect(findRule({ network: 'mastercard', binRange: '5' }, 'mc-bin-prefix')).toBeNull();
  });

  it('mc-contactless-mandate triggers when contactless off', () => {
    const rule = findRule({ network: 'mastercard', contactless: false, cardType: 'debit' }, 'mc-contactless-mandate');
    expect(rule).not.toBeNull();
  });

  it('mc-tier-naming triggers for non-standard tier', () => {
    const rule = findRule({ network: 'mastercard', tier: 'exclusive' }, 'mc-tier-naming');
    expect(rule).not.toBeNull();
  });

  it('mc-tier-naming does not trigger for world_elite', () => {
    expect(findRule({ network: 'mastercard', tier: 'world_elite' }, 'mc-tier-naming')).toBeNull();
  });
});

describe('Amex rules', () => {
  it('amex-pan-15 triggers for non-15-digit PAN', () => {
    const rule = findRule({ network: 'amex', customCardNumber: '3782822463100050' }, 'amex-pan-15');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('error');
  });

  it('amex-pan-15 does not trigger for 15-digit PAN', () => {
    expect(findRule({ network: 'amex', customCardNumber: '378282246310005' }, 'amex-pan-15')).toBeNull();
  });

  it('amex-pan-15 does not trigger when no custom number', () => {
    expect(findRule({ network: 'amex', customCardNumber: '' }, 'amex-pan-15')).toBeNull();
  });

  it('amex-bin-prefix triggers for invalid BIN', () => {
    const rule = findRule({ network: 'amex', binRange: '411111' }, 'amex-bin-prefix');
    expect(rule).not.toBeNull();
  });

  it('amex-bin-prefix does not trigger for 34 BIN', () => {
    expect(findRule({ network: 'amex', binRange: '341234' }, 'amex-bin-prefix')).toBeNull();
  });

  it('amex-bin-prefix does not trigger for 37 BIN', () => {
    expect(findRule({ network: 'amex', binRange: '371234' }, 'amex-bin-prefix')).toBeNull();
  });

  it('amex-no-fdic triggers when FDIC on for Amex credit', () => {
    const rule = findRule({ network: 'amex', cardType: 'credit', fdicInsured: true }, 'amex-no-fdic');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('warning');
  });

  it('amex-no-fdic does not trigger when FDIC is off', () => {
    expect(findRule({ network: 'amex', cardType: 'credit', fdicInsured: false }, 'amex-no-fdic')).toBeNull();
  });
});

describe('Discover rules', () => {
  it('discover-bin-prefix triggers for invalid BIN', () => {
    const rule = findRule({ network: 'discover', binRange: '411111' }, 'discover-bin-prefix');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('error');
  });

  it('discover-bin-prefix does not trigger for 6011 BIN', () => {
    expect(findRule({ network: 'discover', binRange: '601100' }, 'discover-bin-prefix')).toBeNull();
  });

  it('discover-bin-prefix does not trigger for 65 BIN', () => {
    expect(findRule({ network: 'discover', binRange: '650000' }, 'discover-bin-prefix')).toBeNull();
  });

  it('discover-bin-prefix does not trigger for 644 BIN', () => {
    expect(findRule({ network: 'discover', binRange: '644000' }, 'discover-bin-prefix')).toBeNull();
  });

  it('discover-pulse-debit triggers for US Discover debit without Pulse', () => {
    const rule = findRule({
      network: 'discover', issuingCountry: 'US', cardType: 'debit', secondaryNetwork: 'star',
    }, 'discover-pulse-debit');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('info');
  });

  it('discover-pulse-debit does not trigger when Pulse is set', () => {
    expect(findRule({
      network: 'discover', issuingCountry: 'US', cardType: 'debit', secondaryNetwork: 'pulse',
    }, 'discover-pulse-debit')).toBeNull();
  });
});

describe('Interac rules', () => {
  it('interac-canada-only triggers for non-CA Interac', () => {
    const rule = findRule({ network: 'interac', issuingCountry: 'US' }, 'interac-canada-only');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('error');
  });

  it('interac-canada-only does not trigger for CA', () => {
    expect(findRule({ network: 'interac', issuingCountry: 'CA' }, 'interac-canada-only')).toBeNull();
  });

  it('interac-debit-only triggers for credit on Interac', () => {
    const rule = findRule({ network: 'interac', issuingCountry: 'CA', cardType: 'credit' }, 'interac-debit-only');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('error');
  });

  it('interac-debit-only does not trigger for debit', () => {
    expect(findRule({ network: 'interac', issuingCountry: 'CA', cardType: 'debit' }, 'interac-debit-only')).toBeNull();
  });

  it('interac-debit-only does not trigger for prepaid', () => {
    expect(findRule({ network: 'interac', issuingCountry: 'CA', cardType: 'prepaid' }, 'interac-debit-only')).toBeNull();
  });
});
