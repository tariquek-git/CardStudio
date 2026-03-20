import type { CardConfig, CardNetwork, IssuerType, CardMaterial, ChipStyle } from './types';
import { defaultConfig } from './types';

export interface CardTemplate {
  id: string;
  name: string;
  description: string;
  category: 'fintech' | 'premium' | 'corporate' | 'modern';
  config: Partial<CardConfig>;
}

export const cardTemplates: CardTemplate[] = [
  {
    id: 'neobank-debit',
    name: 'Neobank Debit',
    description: 'Clean, minimal fintech debit card',
    category: 'fintech',
    config: {
      issuerName: 'Nova Finance',
      network: 'visa',
      tier: 'classic',
      cardType: 'debit',
      colorMode: 'preset',
      presetColor: 'oceanGradient',
      material: 'matte',
      chipStyle: 'silver',
      contactless: true,
      numberless: true,
      orientation: 'horizontal',
      cardholderName: 'ALEX CHEN',
      expiryDate: '09/28',
      programName: '',
      cardArt: null,
    },
  },
  {
    id: 'premium-metal',
    name: 'Premium Metal',
    description: 'Luxurious brushed metal credit card',
    category: 'premium',
    config: {
      issuerName: 'Aurum Bank',
      network: 'visa',
      tier: 'infinite',
      cardType: 'credit',
      colorMode: 'solid',
      solidColor: '#3d4463',
      material: 'brushedMetal',
      chipStyle: 'gold',
      contactless: true,
      numberless: false,
      numberPosition: 'lower-center',
      orientation: 'horizontal',
      cardholderName: 'JANE A. CARDHOLDER',
      expiryDate: '12/29',
      programName: 'PRIVATE BANKING',
      cardArt: null,
    },
  },
  {
    id: 'corporate-expense',
    name: 'Corporate Expense',
    description: 'Professional corporate card',
    category: 'corporate',
    config: {
      issuerName: 'Meridian Corp',
      network: 'mastercard',
      tier: 'business',
      cardType: 'commercial',
      colorMode: 'preset',
      presetColor: 'slateGray',
      material: 'glossy',
      chipStyle: 'gold',
      contactless: true,
      numberless: false,
      numberPosition: 'standard',
      orientation: 'horizontal',
      cardholderName: 'CORPORATE CARD',
      expiryDate: '06/27',
      programName: 'EXPENSE MANAGEMENT',
      cardArt: null,
    },
  },
  {
    id: 'eco-green',
    name: 'Eco Conscious',
    description: 'Sustainable recycled plastic card',
    category: 'modern',
    config: {
      issuerName: 'Green Bank',
      network: 'mastercard',
      tier: 'world',
      cardType: 'debit',
      colorMode: 'preset',
      presetColor: 'emerald',
      material: 'recycledPlastic',
      chipStyle: 'silver',
      contactless: true,
      numberless: true,
      orientation: 'horizontal',
      cardholderName: 'SAM RIVERS',
      expiryDate: '03/28',
      programName: 'ECO',
      cardArt: null,
    },
  },
  {
    id: 'gen-z-vertical',
    name: 'Gen Z Vertical',
    description: 'Bold vertical card for digital natives',
    category: 'modern',
    config: {
      issuerName: 'Flux',
      network: 'visa',
      tier: 'platinum',
      cardType: 'debit',
      colorMode: 'gradient',
      gradientConfig: {
        stops: [
          { color: '#7C3AED', position: 0 },
          { color: '#EC4899', position: 50 },
          { color: '#F97316', position: 100 },
        ],
        angle: 160,
      },
      material: 'glossy',
      chipStyle: 'black',
      contactless: true,
      numberless: true,
      orientation: 'vertical',
      cardholderName: 'JORDAN LEE',
      expiryDate: '11/29',
      programName: '',
      cardArt: null,
    },
  },
  {
    id: 'holographic-premium',
    name: 'Holographic Elite',
    description: 'Eye-catching holographic finish',
    category: 'premium',
    config: {
      issuerName: 'Prism Card',
      network: 'amex',
      tier: 'platinum',
      cardType: 'credit',
      colorMode: 'preset',
      presetColor: 'roseGold',
      material: 'holographic',
      chipStyle: 'silver',
      contactless: true,
      numberless: false,
      numberPosition: 'back-only',
      orientation: 'horizontal',
      cardholderName: 'MEMBER SINCE 2024',
      expiryDate: '2024',
      programName: '',
      cardArt: null,
    },
  },
  {
    id: 'virtual-instant',
    name: 'Virtual Instant',
    description: 'Digital-first virtual card',
    category: 'fintech',
    config: {
      issuerName: 'PayStream',
      network: 'mastercard',
      tier: 'standard',
      cardType: 'virtual',
      colorMode: 'preset',
      presetColor: 'oceanGradient',
      material: 'glossy',
      chipStyle: 'none',
      contactless: true,
      numberless: false,
      numberPosition: 'compact-right',
      orientation: 'horizontal',
      cardholderName: 'INSTANT CARD',
      expiryDate: '01/26',
      programName: 'VIRTUAL',
      cardArt: null,
    },
  },
  {
    id: 'clear-transparent',
    name: 'Crystal Clear',
    description: 'Transparent see-through design',
    category: 'modern',
    config: {
      issuerName: 'Clarity',
      network: 'visa',
      tier: 'signature',
      cardType: 'credit',
      colorMode: 'solid',
      solidColor: '#E2E8F0',
      material: 'clear',
      chipStyle: 'silver',
      contactless: true,
      numberless: true,
      orientation: 'horizontal',
      cardholderName: 'CARDHOLDER',
      expiryDate: '08/28',
      programName: '',
      cardArt: null,
    },
  },
];

export function applyTemplate(template: CardTemplate): CardConfig {
  return { ...defaultConfig, ...template.config };
}

// ── Program Templates ──────────────────────────────────────

export interface ProgramTemplateTier {
  name: string;
  tier: string;
  material: CardMaterial;
  chipStyle: ChipStyle;
  config: Partial<CardConfig>;
}

export interface ProgramTemplate {
  id: string;
  name: string;
  description: string;
  shared: {
    issuerName: string;
    network: CardNetwork;
    issuingCountry: string;
    issuerType: IssuerType;
    currency: string;
    brandColor: string;
    brandAccent: string;
  };
  tiers: ProgramTemplateTier[];
}

export const programTemplates: ProgramTemplate[] = [
  {
    id: 'neobank-standard',
    name: 'Neobank Standard',
    description: '2-tier fintech program: Classic plastic + Premium metal',
    shared: {
      issuerName: 'Nova Finance',
      network: 'visa',
      issuingCountry: 'US',
      issuerType: 'fintech',
      currency: 'USD',
      brandColor: '#0EA5E9',
      brandAccent: '#6366F1',
    },
    tiers: [
      {
        name: 'Classic',
        tier: 'classic',
        material: 'matte',
        chipStyle: 'silver',
        config: {
          colorMode: 'preset',
          presetColor: 'oceanGradient',
          contactless: true,
          numberless: true,
          cardholderName: 'CARDHOLDER NAME',
          cardType: 'debit',
        },
      },
      {
        name: 'Premium',
        tier: 'signature',
        material: 'brushedMetal',
        chipStyle: 'gold',
        config: {
          colorMode: 'solid',
          solidColor: '#1E293B',
          contactless: true,
          numberless: false,
          numberPosition: 'lower-center',
          cardholderName: 'CARDHOLDER NAME',
          cardType: 'credit',
          programName: 'PREMIUM',
        },
      },
    ],
  },
  {
    id: 'enterprise-suite',
    name: 'Enterprise Suite',
    description: '3-tier corporate program: Employee, Manager, Executive',
    shared: {
      issuerName: 'Meridian Corp',
      network: 'mastercard',
      issuingCountry: 'US',
      issuerType: 'bank',
      currency: 'USD',
      brandColor: '#334155',
      brandAccent: '#0EA5E9',
    },
    tiers: [
      {
        name: 'Employee',
        tier: 'standard',
        material: 'matte',
        chipStyle: 'silver',
        config: {
          colorMode: 'preset',
          presetColor: 'slateGray',
          cardType: 'commercial',
          contactless: true,
          cardholderName: 'EMPLOYEE NAME',
          programName: 'EXPENSE',
        },
      },
      {
        name: 'Manager',
        tier: 'business',
        material: 'glossy',
        chipStyle: 'gold',
        config: {
          colorMode: 'preset',
          presetColor: 'deepNavy',
          cardType: 'commercial',
          contactless: true,
          cardholderName: 'MANAGER NAME',
          programName: 'CORPORATE',
        },
      },
      {
        name: 'Executive',
        tier: 'world_elite',
        material: 'brushedMetal',
        chipStyle: 'gold',
        config: {
          colorMode: 'solid',
          solidColor: '#0F172A',
          cardType: 'commercial',
          contactless: true,
          cardholderName: 'EXECUTIVE NAME',
          programName: 'EXECUTIVE',
        },
      },
    ],
  },
  {
    id: 'rewards-ladder',
    name: 'Rewards Ladder',
    description: '4-tier rewards program: Basic → Gold → Platinum → Black',
    shared: {
      issuerName: 'Ascent Bank',
      network: 'visa',
      issuingCountry: 'US',
      issuerType: 'bank',
      currency: 'USD',
      brandColor: '#7C3AED',
      brandAccent: '#F59E0B',
    },
    tiers: [
      {
        name: 'Basic',
        tier: 'classic',
        material: 'matte',
        chipStyle: 'silver',
        config: {
          colorMode: 'preset',
          presetColor: 'skyBlue',
          cardType: 'credit',
          contactless: true,
          cardholderName: 'CARDHOLDER',
          programName: 'REWARDS',
        },
      },
      {
        name: 'Gold',
        tier: 'gold',
        material: 'glossy',
        chipStyle: 'gold',
        config: {
          colorMode: 'preset',
          presetColor: 'sunsetOrange',
          cardType: 'credit',
          contactless: true,
          cardholderName: 'CARDHOLDER',
          programName: 'REWARDS GOLD',
        },
      },
      {
        name: 'Platinum',
        tier: 'platinum',
        material: 'metal',
        chipStyle: 'gold',
        config: {
          colorMode: 'solid',
          solidColor: '#475569',
          cardType: 'credit',
          contactless: true,
          cardholderName: 'CARDHOLDER',
          numberPosition: 'lower-center',
          programName: 'REWARDS PLATINUM',
        },
      },
      {
        name: 'Black',
        tier: 'infinite',
        material: 'brushedMetal',
        chipStyle: 'gold',
        config: {
          colorMode: 'solid',
          solidColor: '#1E293B',
          cardType: 'credit',
          contactless: true,
          cardholderName: 'CARDHOLDER',
          numberPosition: 'lower-center',
          programName: 'REWARDS BLACK',
        },
      },
    ],
  },
];
