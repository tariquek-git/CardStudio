import { generalRules } from '../rules/general';
import { defaultConfig } from '../../types';
import type { CardConfig } from '../../types';

function runRules(config: Partial<CardConfig>) {
  const full = { ...defaultConfig, ...config };
  return generalRules.map(fn => fn(full)).filter(Boolean);
}

function findRule(config: Partial<CardConfig>, ruleId: string) {
  return runRules(config).find(r => r!.id === ruleId) ?? null;
}

describe('general-luhn-fail', () => {
  it('triggers for invalid card number', () => {
    const rule = findRule({ customCardNumber: '1234567890123456' }, 'general-luhn-fail');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('error');
  });

  it('does not trigger for valid card number', () => {
    expect(findRule({ customCardNumber: '4242424242424242' }, 'general-luhn-fail')).toBeNull();
  });

  it('does not trigger for empty/short card number', () => {
    expect(findRule({ customCardNumber: '' }, 'general-luhn-fail')).toBeNull();
    expect(findRule({ customCardNumber: '1234' }, 'general-luhn-fail')).toBeNull();
  });
});

describe('general-pan-length', () => {
  it('triggers when PAN length does not match network', () => {
    // Amex requires 15 digits but we give 16
    const rule = findRule({ network: 'amex', customCardNumber: '3782822463100050' }, 'general-pan-length');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('error');
  });

  it('does not trigger for correct length', () => {
    expect(findRule({ network: 'visa', customCardNumber: '4242424242424242' }, 'general-pan-length')).toBeNull();
  });
});

describe('general-bin-mismatch', () => {
  it('triggers when BIN does not match network', () => {
    const rule = findRule({ network: 'visa', binRange: '51234567' }, 'general-bin-mismatch');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('error');
  });

  it('does not trigger when BIN matches', () => {
    expect(findRule({ network: 'visa', binRange: '411111' }, 'general-bin-mismatch')).toBeNull();
  });

  it('does not trigger when BIN is empty', () => {
    expect(findRule({ network: 'visa', binRange: '' }, 'general-bin-mismatch')).toBeNull();
  });
});

describe('general-chip-required', () => {
  it('triggers warning when chip is none on physical card', () => {
    const rule = findRule({ chipStyle: 'none', cardType: 'credit' }, 'general-chip-required');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('warning');
  });

  it('does not trigger for virtual cards', () => {
    expect(findRule({ chipStyle: 'none', cardType: 'virtual' }, 'general-chip-required')).toBeNull();
  });

  it('does not trigger when chip is present', () => {
    expect(findRule({ chipStyle: 'gold', cardType: 'credit' }, 'general-chip-required')).toBeNull();
  });
});

describe('general-contactless-recommended', () => {
  it('triggers info when contactless is off on physical card', () => {
    const rule = findRule({ contactless: false, cardType: 'credit' }, 'general-contactless-recommended');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('info');
  });

  it('does not trigger for virtual cards', () => {
    expect(findRule({ contactless: false, cardType: 'virtual' }, 'general-contactless-recommended')).toBeNull();
  });

  it('does not trigger when contactless is on', () => {
    expect(findRule({ contactless: true }, 'general-contactless-recommended')).toBeNull();
  });
});

describe('general-issuer-name', () => {
  it('triggers warning when issuer name is empty', () => {
    const rule = findRule({ issuerName: '' }, 'general-issuer-name');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('warning');
  });

  it('triggers warning when issuer name is whitespace', () => {
    expect(findRule({ issuerName: '   ' }, 'general-issuer-name')).not.toBeNull();
  });

  it('does not trigger when issuer name is set', () => {
    expect(findRule({ issuerName: 'Test Bank' }, 'general-issuer-name')).toBeNull();
  });
});
