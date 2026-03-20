import { luhnCheck, validateBinForNetwork, panLengthsForNetwork, getJurisdictions } from '../utils';

describe('luhnCheck', () => {
  it('returns true for a valid Visa test number', () => {
    expect(luhnCheck('4242424242424242')).toBe(true);
  });

  it('returns false for an invalid number', () => {
    expect(luhnCheck('1234567890123456')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(luhnCheck('')).toBe(false);
  });

  it('returns false for a short number', () => {
    expect(luhnCheck('1234')).toBe(false);
  });

  it('returns true for valid Amex test number', () => {
    expect(luhnCheck('378282246310005')).toBe(true);
  });

  it('returns true for valid Mastercard test number', () => {
    expect(luhnCheck('5555555555554444')).toBe(true);
  });
});

describe('validateBinForNetwork', () => {
  it('returns true for Visa BIN starting with 4', () => {
    expect(validateBinForNetwork('4', 'visa')).toBe(true);
  });

  it('returns true for Mastercard BIN starting with 51', () => {
    expect(validateBinForNetwork('51', 'mastercard')).toBe(true);
  });

  it('returns false for Visa BIN on Mastercard network', () => {
    expect(validateBinForNetwork('4', 'mastercard')).toBe(false);
  });

  it('returns true for empty BIN (not checked)', () => {
    expect(validateBinForNetwork('', 'visa')).toBe(true);
  });

  it('returns true for Amex BIN starting with 34', () => {
    expect(validateBinForNetwork('34', 'amex')).toBe(true);
  });

  it('returns true for Amex BIN starting with 37', () => {
    expect(validateBinForNetwork('37', 'amex')).toBe(true);
  });

  it('returns false for Amex BIN starting with 40', () => {
    expect(validateBinForNetwork('40', 'amex')).toBe(false);
  });

  it('returns true for Discover BIN starting with 6011', () => {
    expect(validateBinForNetwork('6011', 'discover')).toBe(true);
  });

  it('returns true for Discover BIN starting with 65', () => {
    expect(validateBinForNetwork('65', 'discover')).toBe(true);
  });

  it('returns true for Mastercard 2-series BIN', () => {
    expect(validateBinForNetwork('2221', 'mastercard')).toBe(true);
    expect(validateBinForNetwork('2720', 'mastercard')).toBe(true);
  });

  it('returns true for JCB BIN in range 3528-3589', () => {
    expect(validateBinForNetwork('3528', 'jcb')).toBe(true);
    expect(validateBinForNetwork('3589', 'jcb')).toBe(true);
  });

  it('returns true for UnionPay BIN starting with 62', () => {
    expect(validateBinForNetwork('62', 'unionpay')).toBe(true);
  });

  it('returns true for Interac BIN starting with 636', () => {
    expect(validateBinForNetwork('636', 'interac')).toBe(true);
  });
});

describe('panLengthsForNetwork', () => {
  it('returns [16] for visa', () => {
    expect(panLengthsForNetwork('visa')).toEqual([16]);
  });

  it('includes 15 for amex', () => {
    expect(panLengthsForNetwork('amex')).toContain(15);
  });

  it('returns [16] for mastercard', () => {
    expect(panLengthsForNetwork('mastercard')).toEqual([16]);
  });

  it('includes 16-19 for discover', () => {
    const lengths = panLengthsForNetwork('discover');
    expect(lengths).toContain(16);
    expect(lengths).toContain(19);
  });

  it('includes wide range for maestro', () => {
    const lengths = panLengthsForNetwork('maestro');
    expect(lengths).toContain(12);
    expect(lengths).toContain(19);
  });
});

describe('getJurisdictions', () => {
  it('returns GLOBAL and US for US', () => {
    const j = getJurisdictions('US');
    expect(j).toContain('GLOBAL');
    expect(j).toContain('US');
  });

  it('returns GLOBAL and CA for CA', () => {
    const j = getJurisdictions('CA');
    expect(j).toContain('GLOBAL');
    expect(j).toContain('CA');
  });

  it('returns GLOBAL and EU for DE (EU country)', () => {
    const j = getJurisdictions('DE');
    expect(j).toContain('GLOBAL');
    expect(j).toContain('EU');
  });

  it('returns GLOBAL and EU for GB', () => {
    const j = getJurisdictions('GB');
    expect(j).toContain('GLOBAL');
    expect(j).toContain('EU');
  });

  it('returns GLOBAL and EU for NO (EEA)', () => {
    const j = getJurisdictions('NO');
    expect(j).toContain('GLOBAL');
    expect(j).toContain('EU');
  });

  it('returns only GLOBAL for JP', () => {
    const j = getJurisdictions('JP');
    expect(j).toEqual(['GLOBAL']);
  });
});
