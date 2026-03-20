import { usRules } from '../rules/us';
import { defaultConfig } from '../../types';
import type { CardConfig } from '../../types';

function runRules(config: Partial<CardConfig>) {
  const full = { ...defaultConfig, ...config };
  return usRules.map(fn => fn(full)).filter(Boolean);
}

function findRule(config: Partial<CardConfig>, ruleId: string) {
  return runRules(config).find(r => r!.id === ruleId) ?? null;
}

describe('us-fdic-required', () => {
  it('triggers for US bank debit without FDIC', () => {
    const rule = findRule({
      issuingCountry: 'US', issuerType: 'bank', cardType: 'debit', fdicInsured: false,
    }, 'us-fdic-required');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('error');
  });

  it('triggers for US bank prepaid without FDIC', () => {
    const rule = findRule({
      issuingCountry: 'US', issuerType: 'bank', cardType: 'prepaid', fdicInsured: false,
    }, 'us-fdic-required');
    expect(rule).not.toBeNull();
  });

  it('does not trigger when FDIC is enabled', () => {
    expect(findRule({
      issuingCountry: 'US', issuerType: 'bank', cardType: 'debit', fdicInsured: true,
    }, 'us-fdic-required')).toBeNull();
  });

  it('does not trigger for non-US', () => {
    expect(findRule({
      issuingCountry: 'CA', issuerType: 'bank', cardType: 'debit', fdicInsured: false,
    }, 'us-fdic-required')).toBeNull();
  });

  it('does not trigger for credit cards', () => {
    expect(findRule({
      issuingCountry: 'US', issuerType: 'bank', cardType: 'credit', fdicInsured: false,
    }, 'us-fdic-required')).toBeNull();
  });

  it('does not trigger for non-bank issuers', () => {
    expect(findRule({
      issuingCountry: 'US', issuerType: 'fintech', cardType: 'debit', fdicInsured: false,
    }, 'us-fdic-required')).toBeNull();
  });
});

describe('us-ncua-required', () => {
  it('triggers for US credit union debit without NCUA', () => {
    const rule = findRule({
      issuingCountry: 'US', issuerType: 'credit_union', cardType: 'debit', ncuaInsured: false,
    }, 'us-ncua-required');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('error');
  });

  it('does not trigger when NCUA is enabled', () => {
    expect(findRule({
      issuingCountry: 'US', issuerType: 'credit_union', cardType: 'debit', ncuaInsured: true,
    }, 'us-ncua-required')).toBeNull();
  });

  it('does not trigger for bank issuer type', () => {
    expect(findRule({
      issuingCountry: 'US', issuerType: 'bank', cardType: 'debit', ncuaInsured: false,
    }, 'us-ncua-required')).toBeNull();
  });
});

describe('us-durbin-dual-network', () => {
  it('triggers for US debit without secondary network', () => {
    const rule = findRule({
      issuingCountry: 'US', cardType: 'debit', secondaryNetwork: '',
    }, 'us-durbin-dual-network');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('error');
  });

  it('does not trigger when secondary network is set', () => {
    expect(findRule({
      issuingCountry: 'US', cardType: 'debit', secondaryNetwork: 'star',
    }, 'us-durbin-dual-network')).toBeNull();
  });

  it('does not trigger for credit cards', () => {
    expect(findRule({
      issuingCountry: 'US', cardType: 'credit', secondaryNetwork: '',
    }, 'us-durbin-dual-network')).toBeNull();
  });
});

describe('us-reg-e-prepaid', () => {
  it('triggers info for US prepaid cards', () => {
    const rule = findRule({
      issuingCountry: 'US', cardType: 'prepaid',
    }, 'us-reg-e-prepaid');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('info');
  });

  it('does not trigger for non-prepaid', () => {
    expect(findRule({
      issuingCountry: 'US', cardType: 'credit',
    }, 'us-reg-e-prepaid')).toBeNull();
  });
});

describe('us-fdic-credit-invalid', () => {
  it('triggers error when FDIC is on for credit card', () => {
    const rule = findRule({
      issuingCountry: 'US', cardType: 'credit', fdicInsured: true,
    }, 'us-fdic-credit-invalid');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('error');
  });

  it('does not trigger for debit card with FDIC', () => {
    expect(findRule({
      issuingCountry: 'US', cardType: 'debit', fdicInsured: true,
    }, 'us-fdic-credit-invalid')).toBeNull();
  });

  it('does not trigger when FDIC is off', () => {
    expect(findRule({
      issuingCountry: 'US', cardType: 'credit', fdicInsured: false,
    }, 'us-fdic-credit-invalid')).toBeNull();
  });
});

describe('us-support-phone', () => {
  it('triggers warning when phone is placeholder', () => {
    const rule = findRule({
      issuingCountry: 'US', backSupportPhone: '1-800-XXX-XXXX',
    }, 'us-support-phone');
    expect(rule).not.toBeNull();
    expect(rule!.severity).toBe('warning');
  });

  it('triggers warning when phone is empty', () => {
    expect(findRule({
      issuingCountry: 'US', backSupportPhone: '',
    }, 'us-support-phone')).not.toBeNull();
  });

  it('does not trigger when a real phone is set', () => {
    expect(findRule({
      issuingCountry: 'US', backSupportPhone: '1-800-555-1234',
    }, 'us-support-phone')).toBeNull();
  });

  it('does not trigger for non-US', () => {
    expect(findRule({
      issuingCountry: 'DE', backSupportPhone: '',
    }, 'us-support-phone')).toBeNull();
  });
});
