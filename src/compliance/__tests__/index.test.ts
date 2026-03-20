import { validateCompliance } from '../index';
import { defaultConfig } from '../../types';
import type { CardConfig } from '../../types';

function validate(overrides: Partial<CardConfig> = {}) {
  return validateCompliance({ ...defaultConfig, ...overrides });
}

describe('validateCompliance integration', () => {
  it('returns a score between 0 and 100 for default Visa US config', () => {
    const result = validate();
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(typeof result.score).toBe('number');
  });

  it('returns errors when chip is none and contactless is off', () => {
    const result = validate({ chipStyle: 'none', contactless: false });
    expect(result.warnings.length).toBeGreaterThan(0);
    // chip-required is a warning, contactless-recommended is info
    const chipWarning = result.warnings.find(r => r.id === 'general-chip-required');
    expect(chipWarning).toBeDefined();
  });

  it('score drops when there are errors', () => {
    const goodResult = validate();
    const badResult = validate({
      chipStyle: 'none',
      contactless: false,
      issuerName: '',
      binRange: '999999',
    });
    expect(badResult.score).toBeLessThan(goodResult.score);
  });

  it('applies EU rules for EU country', () => {
    const result = validate({ issuingCountry: 'DE', currency: 'USD' });
    const euRule = result.rules.find(r => r.jurisdiction === 'EU');
    expect(euRule).toBeDefined();
  });

  it('applies CA rules for Canadian country', () => {
    const result = validate({ issuingCountry: 'CA' });
    const caRule = result.rules.find(r => r.jurisdiction === 'CA');
    expect(caRule).toBeDefined();
  });

  it('does not apply US rules for non-US country', () => {
    const result = validate({ issuingCountry: 'JP' });
    const usRule = result.rules.find(r => r.jurisdiction === 'US');
    expect(usRule).toBeUndefined();
  });

  it('passesNetworkCert is false when errors exist', () => {
    const result = validate({
      issuingCountry: 'US',
      issuerType: 'bank',
      cardType: 'debit',
      fdicInsured: false,
      secondaryNetwork: '',
    });
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.passesNetworkCert).toBe(false);
  });

  it('passesNetworkCert is true when no errors', () => {
    const result = validate({
      chipStyle: 'gold',
      contactless: true,
      issuerName: 'Test Bank',
      binRange: '',
      customCardNumber: '',
    });
    expect(result.passesNetworkCert).toBe(true);
  });

  it('errors, warnings, infos partition the rules array', () => {
    const result = validate({ issuingCountry: 'US', chipStyle: 'none', contactless: false });
    expect(result.rules.length).toBe(result.errors.length + result.warnings.length + result.infos.length);
  });
});
