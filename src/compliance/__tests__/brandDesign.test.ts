import { describe, it, expect } from 'vitest';
import { defaultConfig } from '../../types';
import type { CardConfig } from '../../types';
import { brandDesignRules } from '../rules/brandDesign';

function runRules(overrides: Partial<CardConfig>) {
  const config = { ...defaultConfig, ...overrides };
  return brandDesignRules.map(fn => fn(config)).filter(Boolean);
}

function findRule(overrides: Partial<CardConfig>, ruleId: string) {
  return runRules(overrides).find(r => r!.id === ruleId) ?? null;
}

// ─── Visa Brand Rules ────────────────────────────────────────
describe('Visa brand design rules', () => {
  it('flags vertical card for Visa logo placement', () => {
    const r = findRule({ network: 'visa', orientation: 'vertical' }, 'visa-brand-vertical-logo');
    expect(r).not.toBeNull();
    expect(r!.severity).toBe('info');
  });

  it('does not flag horizontal Visa cards', () => {
    const r = findRule({ network: 'visa', orientation: 'horizontal' }, 'visa-brand-vertical-logo');
    expect(r).toBeNull();
  });

  it('flags non-metal Visa Infinite', () => {
    const r = findRule({ network: 'visa', tier: 'infinite', material: 'glossy' }, 'visa-infinite-material');
    expect(r).not.toBeNull();
    expect(r!.severity).toBe('warning');
    expect(r!.autoFixable).toBe(true);
    expect(r!.autoFix).toEqual({ material: 'metal' });
  });

  it('passes metal Visa Infinite', () => {
    const r = findRule({ network: 'visa', tier: 'infinite', material: 'metal' }, 'visa-infinite-material');
    expect(r).toBeNull();
  });

  it('flags brushedMetal Visa Infinite as passing', () => {
    const r = findRule({ network: 'visa', tier: 'infinite', material: 'brushedMetal' }, 'visa-infinite-material');
    expect(r).toBeNull();
  });

  it('flags recycled plastic Visa Signature', () => {
    const r = findRule({ network: 'visa', tier: 'signature', material: 'recycledPlastic' }, 'visa-signature-material');
    expect(r).not.toBeNull();
    expect(r!.severity).toBe('info');
  });

  it('flags black chip on dark background for Visa', () => {
    const r = findRule({
      network: 'visa',
      chipStyle: 'black',
      colorMode: 'solid',
      solidColor: '#0F172A',
    }, 'visa-chip-contrast');
    expect(r).not.toBeNull();
    expect(r!.severity).toBe('warning');
    expect(r!.autoFix).toEqual({ chipStyle: 'gold' });
  });

  it('passes gold chip on dark background for Visa', () => {
    const r = findRule({
      network: 'visa',
      chipStyle: 'gold',
      colorMode: 'solid',
      solidColor: '#0F172A',
    }, 'visa-chip-contrast');
    expect(r).toBeNull();
  });

  it('flags missing expiry for Visa physical card', () => {
    const r = findRule({ network: 'visa', expiryDate: '', cardType: 'credit' }, 'visa-expiry-required');
    expect(r).not.toBeNull();
    expect(r!.severity).toBe('warning');
  });

  it('does not flag expiry for Visa virtual card', () => {
    const r = findRule({ network: 'visa', expiryDate: '', cardType: 'virtual' }, 'visa-expiry-required');
    expect(r).toBeNull();
  });

  it('flags missing cardholder name on Visa credit', () => {
    const r = findRule({ network: 'visa', cardholderName: '', cardType: 'credit' }, 'visa-cardholder-name');
    expect(r).not.toBeNull();
  });

  it('does not flag missing name on Visa prepaid', () => {
    const r = findRule({ network: 'visa', cardholderName: '', cardType: 'prepaid' }, 'visa-cardholder-name');
    expect(r).toBeNull();
  });

  it('flags missing mag stripe for Visa physical card', () => {
    const r = findRule({ network: 'visa', backShowMagStripe: false, cardType: 'debit' }, 'visa-mag-stripe');
    expect(r).not.toBeNull();
    expect(r!.severity).toBe('warning');
    expect(r!.autoFixable).toBe(true);
  });

  it('does not flag mag stripe for Visa virtual card', () => {
    const r = findRule({ network: 'visa', backShowMagStripe: false, cardType: 'virtual' }, 'visa-mag-stripe');
    expect(r).toBeNull();
  });
});

// ─── Mastercard Brand Rules ──────────────────────────────────
describe('Mastercard brand design rules', () => {
  it('flags vertical Mastercard design', () => {
    const r = findRule({ network: 'mastercard', orientation: 'vertical' }, 'mc-brand-vertical');
    expect(r).not.toBeNull();
    expect(r!.severity).toBe('info');
  });

  it('flags non-metal World Elite', () => {
    const r = findRule({ network: 'mastercard', tier: 'world_elite', material: 'matte' }, 'mc-world-elite-material');
    expect(r).not.toBeNull();
    expect(r!.severity).toBe('warning');
    expect(r!.autoFix).toEqual({ material: 'metal' });
  });

  it('passes metal World Elite', () => {
    const r = findRule({ network: 'mastercard', tier: 'world_elite', material: 'metal' }, 'mc-world-elite-material');
    expect(r).toBeNull();
  });

  it('passes holographic World Elite', () => {
    const r = findRule({ network: 'mastercard', tier: 'world_elite', material: 'holographic' }, 'mc-world-elite-material');
    expect(r).toBeNull();
  });

  it('flags missing hologram for MC physical card', () => {
    const r = findRule({ network: 'mastercard', backShowHologram: false, cardType: 'credit' }, 'mc-hologram-required');
    expect(r).not.toBeNull();
    expect(r!.severity).toBe('info');
  });

  it('flags missing signature strip for MC', () => {
    const r = findRule({ network: 'mastercard', backShowSignatureStrip: false, cardType: 'credit' }, 'mc-signature-strip');
    expect(r).not.toBeNull();
    expect(r!.severity).toBe('warning');
    expect(r!.autoFixable).toBe(true);
  });

  it('flags missing mag stripe for MC', () => {
    const r = findRule({ network: 'mastercard', backShowMagStripe: false, cardType: 'debit' }, 'mc-mag-stripe');
    expect(r).not.toBeNull();
    expect(r!.autoFix).toEqual({ backShowMagStripe: true });
  });

  it('flags near-black background for MC brand visibility', () => {
    const r = findRule({
      network: 'mastercard',
      colorMode: 'solid',
      solidColor: '#010101',
    }, 'mc-brand-visibility-dark');
    expect(r).not.toBeNull();
    expect(r!.severity).toBe('info');
  });

  it('does not flag moderately dark background for MC', () => {
    const r = findRule({
      network: 'mastercard',
      colorMode: 'solid',
      solidColor: '#1E293B',
    }, 'mc-brand-visibility-dark');
    expect(r).toBeNull();
  });
});

// ─── Amex Brand Rules ────────────────────────────────────────
describe('Amex brand design rules', () => {
  it('flags vertical Amex for centurion placement', () => {
    const r = findRule({ network: 'amex', orientation: 'vertical' }, 'amex-centurion-vertical');
    expect(r).not.toBeNull();
    expect(r!.severity).toBe('info');
  });

  it('flags non-metal Amex Platinum', () => {
    const r = findRule({ network: 'amex', tier: 'platinum', material: 'glossy' }, 'amex-platinum-metal');
    expect(r).not.toBeNull();
    expect(r!.severity).toBe('error');
    expect(r!.autoFix).toEqual({ material: 'metal' });
  });

  it('passes metal Amex Platinum', () => {
    const r = findRule({ network: 'amex', tier: 'platinum', material: 'metal' }, 'amex-platinum-metal');
    expect(r).toBeNull();
  });

  it('flags non-metal Amex Centurion', () => {
    const r = findRule({ network: 'amex', tier: 'centurion', material: 'matte' }, 'amex-centurion-material');
    expect(r).not.toBeNull();
    expect(r!.severity).toBe('error');
  });

  it('flags light-colored Amex Centurion', () => {
    const r = findRule({
      network: 'amex',
      tier: 'centurion',
      material: 'metal',
      colorMode: 'solid',
      solidColor: '#F1F5F9',
    }, 'amex-centurion-color');
    expect(r).not.toBeNull();
    expect(r!.severity).toBe('warning');
  });

  it('passes dark metal Amex Centurion', () => {
    const r = findRule({
      network: 'amex',
      tier: 'centurion',
      material: 'metal',
      colorMode: 'solid',
      solidColor: '#1a1a1a',
    }, 'amex-centurion-color');
    expect(r).toBeNull();
  });

  it('flags non-metal Amex Gold', () => {
    const r = findRule({ network: 'amex', tier: 'gold', material: 'matte' }, 'amex-gold-material');
    expect(r).not.toBeNull();
    expect(r!.severity).toBe('info');
  });

  it('flags signature panel present on Amex', () => {
    const r = findRule({ network: 'amex', backShowSignatureStrip: true, cardType: 'credit' }, 'amex-no-signature-panel');
    expect(r).not.toBeNull();
    expect(r!.severity).toBe('info');
  });
});

// ─── Discover Brand Rules ────────────────────────────────────
describe('Discover brand design rules', () => {
  it('flags high opacity card art for Discover', () => {
    const r = findRule({
      network: 'discover',
      cardArt: '/cardart/abs-waves.svg',
      cardArtOpacity: 90,
    }, 'discover-logo-obstruction');
    expect(r).not.toBeNull();
  });

  it('does not flag low opacity card art for Discover', () => {
    const r = findRule({
      network: 'discover',
      cardArt: '/cardart/abs-waves.svg',
      cardArtOpacity: 50,
    }, 'discover-logo-obstruction');
    expect(r).toBeNull();
  });

  it('flags missing signature strip for Discover', () => {
    const r = findRule({ network: 'discover', backShowSignatureStrip: false, cardType: 'credit' }, 'discover-signature-strip');
    expect(r).not.toBeNull();
    expect(r!.autoFixable).toBe(true);
  });
});

// ─── General Design Rules ────────────────────────────────────
describe('General card design rules', () => {
  it('warns about high opacity card art obscuring text', () => {
    const r = findRule({
      cardArt: '/cardart/geo-circles.svg',
      cardArtOpacity: 90,
      cardArtBlend: 'normal',
      numberless: false,
    }, 'design-card-art-text-contrast');
    expect(r).not.toBeNull();
    expect(r!.severity).toBe('warning');
  });

  it('does not warn about low opacity card art', () => {
    const r = findRule({
      cardArt: '/cardart/geo-circles.svg',
      cardArtOpacity: 50,
      cardArtBlend: 'normal',
    }, 'design-card-art-text-contrast');
    expect(r).toBeNull();
  });

  it('does not warn if card art uses overlay blend', () => {
    const r = findRule({
      cardArt: '/cardart/geo-circles.svg',
      cardArtOpacity: 95,
      cardArtBlend: 'overlay',
    }, 'design-card-art-text-contrast');
    expect(r).toBeNull();
  });

  it('warns about light text on light background', () => {
    const r = findRule({
      colorMode: 'solid',
      solidColor: '#F8FAFC',
      textColorOverride: null,
      cardholderName: 'TEST',
    }, 'design-light-on-light');
    expect(r).not.toBeNull();
    expect(r!.severity).toBe('warning');
  });

  it('does not warn if text color override is set', () => {
    const r = findRule({
      colorMode: 'solid',
      solidColor: '#F8FAFC',
      textColorOverride: '#1E293B',
    }, 'design-light-on-light');
    expect(r).toBeNull();
  });

  it('warns about placeholder support phone number', () => {
    const r = findRule({
      backSupportPhone: '1-800-XXX-XXXX',
      cardType: 'credit',
    }, 'design-support-phone');
    expect(r).not.toBeNull();
    expect(r!.severity).toBe('info');
  });

  it('does not warn about real support number', () => {
    const r = findRule({
      backSupportPhone: '1-800-555-1234',
      cardType: 'credit',
    }, 'design-support-phone');
    expect(r).toBeNull();
  });

  it('shows info about numberless physical card', () => {
    const r = findRule({ numberless: true, cardType: 'debit' }, 'design-numberless-info');
    expect(r).not.toBeNull();
    expect(r!.severity).toBe('info');
  });

  it('flags chip on virtual card', () => {
    const r = findRule({ cardType: 'virtual', chipStyle: 'gold' }, 'design-virtual-no-chip');
    expect(r).not.toBeNull();
  });

  it('does not flag chip on physical card', () => {
    const r = findRule({ cardType: 'credit', chipStyle: 'gold' }, 'design-virtual-no-chip');
    expect(r).toBeNull();
  });

  it('flags co-brand without logo', () => {
    const r = findRule({ coBrandPartner: 'Costco', coBrandLogo: null }, 'design-cobrand-logo-missing');
    expect(r).not.toBeNull();
  });

  it('flags missing issuer address', () => {
    const r = findRule({ issuerAddress: '', cardType: 'credit' }, 'design-issuer-address');
    expect(r).not.toBeNull();
  });

  it('flags missing mag stripe for non-Visa/MC networks', () => {
    const r = findRule({ network: 'jcb', backShowMagStripe: false, cardType: 'credit' }, 'design-mag-stripe-general');
    expect(r).not.toBeNull();
    expect(r!.autoFixable).toBe(true);
  });

  it('does not duplicate mag stripe rule for Visa', () => {
    const r = findRule({ network: 'visa', backShowMagStripe: false, cardType: 'credit' }, 'design-mag-stripe-general');
    expect(r).toBeNull(); // Visa has its own rule
  });
});

// ─── Production Rules ────────────────────────────────────────
describe('Production rules', () => {
  it('flags wood material limitations', () => {
    const r = findRule({ material: 'wood', cardType: 'credit' }, 'production-wood-limitation');
    expect(r).not.toBeNull();
    expect(r!.severity).toBe('warning');
  });

  it('shows info about clear/transparent cards', () => {
    const r = findRule({ material: 'clear', cardType: 'debit' }, 'production-clear-card');
    expect(r).not.toBeNull();
    expect(r!.severity).toBe('info');
  });

  it('flags holographic + high opacity card art conflict', () => {
    const r = findRule({
      material: 'holographic',
      cardArt: '/cardart/abs-waves.svg',
      cardArtOpacity: 80,
    }, 'production-holo-art-conflict');
    expect(r).not.toBeNull();
  });

  it('does not flag holographic with low opacity art', () => {
    const r = findRule({
      material: 'holographic',
      cardArt: '/cardart/abs-waves.svg',
      cardArtOpacity: 30,
    }, 'production-holo-art-conflict');
    expect(r).toBeNull();
  });

  it('suggests recycled plastic for EU issuers', () => {
    const r = findRule({ issuingCountry: 'DE', material: 'matte', cardType: 'debit' }, 'production-eu-sustainability');
    expect(r).not.toBeNull();
    expect(r!.severity).toBe('info');
  });

  it('does not suggest recycled plastic for US issuers', () => {
    const r = findRule({ issuingCountry: 'US', material: 'matte', cardType: 'debit' }, 'production-eu-sustainability');
    expect(r).toBeNull();
  });

  it('does not flag virtual cards for production', () => {
    const r = findRule({ material: 'wood', cardType: 'virtual' }, 'production-wood-limitation');
    expect(r).toBeNull();
  });
});

// ─── Accessibility Rules ─────────────────────────────────────
describe('Accessibility rules', () => {
  it('suggests touch card notch for MC physical cards', () => {
    const r = findRule({ network: 'mastercard', cardType: 'credit' }, 'a11y-touch-card');
    expect(r).not.toBeNull();
    expect(r!.severity).toBe('info');
  });

  it('suggests touch card notch for Visa physical cards', () => {
    const r = findRule({ network: 'visa', cardType: 'debit' }, 'a11y-touch-card');
    expect(r).not.toBeNull();
  });

  it('does not flag touch card for virtual', () => {
    const r = findRule({ network: 'visa', cardType: 'virtual' }, 'a11y-touch-card');
    expect(r).toBeNull();
  });

  it('does not flag touch card for non-MC/Visa networks', () => {
    const r = findRule({ network: 'jcb', cardType: 'credit' }, 'a11y-touch-card');
    expect(r).toBeNull();
  });
});
