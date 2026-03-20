import type { CardConfig } from '../../types';
import type { ComplianceRuleFn } from '../types';
import { presetColors } from '../../data';

// ─── Utility: compute relative luminance from hex ───────────
function hexLuminance(hex: string): number {
  const m = hex.replace('#', '').match(/.{2}/g);
  if (!m) return 0;
  const [r, g, b] = m.map(c => {
    const v = parseInt(c, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getResolvedBgColor(config: CardConfig): string | null {
  if (config.colorMode === 'solid') return config.solidColor;
  if (config.colorMode === 'preset') {
    const p = presetColors[config.presetColor];
    return p ? p.value : null;
  }
  if (config.colorMode === 'gradient' && config.gradientConfig?.stops?.length >= 1) {
    return config.gradientConfig.stops[0].color;
  }
  return null;
}

function isDarkBackground(config: CardConfig): boolean {
  const bg = getResolvedBgColor(config);
  if (!bg) return true;
  return hexLuminance(bg) < 0.2;
}

function isLightBackground(config: CardConfig): boolean {
  const bg = getResolvedBgColor(config);
  if (!bg) return false;
  return hexLuminance(bg) > 0.6;
}

// ─────────────────────────────────────────────────────────────
// VISA BRAND DESIGN RULES
// Source: Visa Product Brand Standards (VPF), Visa Card Design Guide
// ─────────────────────────────────────────────────────────────
const visaBrandRules: ComplianceRuleFn[] = [
  // Visa logo must appear on front of card (top-right or bottom-right)
  // VPF mandates the Visa brand mark on the card front, right side
  (config: CardConfig) => {
    if (config.network !== 'visa') return null;
    // We always render the network logo, so this is informational
    // about logo placement requirements
    if (config.orientation === 'horizontal') return null; // standard placement handled
    return {
      id: 'visa-brand-vertical-logo',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'info',
      title: 'Visa: Vertical Card Logo Placement',
      message: 'On vertical cards, the Visa brand mark must appear in the top-right area',
      explanation: 'Visa Product Brand Standards require the brand mark to be displayed in the upper-right quadrant on vertical card designs. The minimum clear space around the brand mark is equal to the width of the "V" in the Visa wordmark. Visa must approve all vertical card designs prior to production.',
      regulationRef: 'Visa Product Brand Standards § Card Design',
      field: 'orientation',
    };
  },

  // Visa requires specific minimum logo size
  // VPF: Visa brand mark minimum 12mm wide on physical cards
  (config: CardConfig) => {
    if (config.network !== 'visa') return null;
    if (config.cardType === 'virtual') return null;
    // This is always informational since our rendering handles sizing
    return null; // We handle this in canvas rendering
  },

  // Visa prohibits competitor brand marks on card front
  // Exception: co-brand partner logos are allowed in designated areas
  (config: CardConfig) => {
    if (config.network !== 'visa') return null;
    if (!config.coBrandPartner) return null;
    if (config.issuerLogo && config.coBrandLogo) return null; // both present = fine
    return null; // handled by layout
  },

  // Visa Infinite: must be metal or premium material
  // VPF: Visa Infinite requires premium card construction (metal core recommended)
  (config: CardConfig) => {
    if (config.network !== 'visa') return null;
    if (config.tier !== 'infinite') return null;
    const premiumMaterials = ['metal', 'brushedMetal'];
    if (premiumMaterials.includes(config.material)) return null;
    return {
      id: 'visa-infinite-material',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'warning',
      title: 'Visa Infinite: Premium Material Expected',
      message: 'Visa Infinite cards should use a metal or premium material construction',
      explanation: 'Visa Infinite is the highest consumer tier and is positioned as an ultra-premium product. Visa strongly recommends metal card construction (stainless steel or tungsten core) to convey the tier\'s premium positioning. Non-metal Infinite cards require explicit Visa approval during the card design review process.',
      regulationRef: 'Visa Product Brand Standards — Visa Infinite Design Requirements',
      field: 'material',
      suggestedFix: 'Use Metal or Brushed Metal material',
      autoFixable: true,
      autoFix: { material: 'metal' },
    };
  },

  // Visa Signature: should not use basic materials
  (config: CardConfig) => {
    if (config.network !== 'visa') return null;
    if (config.tier !== 'signature') return null;
    if (config.material !== 'recycledPlastic') return null;
    return {
      id: 'visa-signature-material',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'info',
      title: 'Visa Signature: Consider Premium Material',
      message: 'Visa Signature cards typically use premium finishes',
      explanation: 'Visa Signature is a premium tier positioned above Platinum. While not strictly required, Visa recommends a premium card finish (metal, glossy, or holographic) to visually differentiate from lower tiers. Recycled plastic may undermine the premium positioning.',
      regulationRef: 'Visa Product Brand Standards',
      field: 'material',
    };
  },

  // Visa: chip color must contrast with card background
  (config: CardConfig) => {
    if (config.network !== 'visa') return null;
    if (config.chipStyle === 'none' || config.cardType === 'virtual') return null;
    const dark = isDarkBackground(config);
    if (config.chipStyle === 'black' && dark) {
      return {
        id: 'visa-chip-contrast',
        jurisdiction: 'GLOBAL',
        category: 'network',
        severity: 'warning',
        title: 'Visa: Chip Visibility Concern',
        message: 'Black chip on dark background may not meet Visa visibility requirements',
        explanation: 'Visa requires the EMV chip module to be clearly visible on the card face. A black chip on a dark background reduces the chip\'s visual prominence, which can cause issues during the Visa card design approval process. Visa recommends gold or silver chip modules on dark card backgrounds.',
        regulationRef: 'Visa Product Brand Standards § EMV Chip Requirements',
        field: 'chipStyle',
        suggestedFix: 'Use gold or silver chip on dark backgrounds',
        autoFixable: true,
        autoFix: { chipStyle: 'gold' },
      };
    }
    return null;
  },

  // Visa: PAN must use OCR-B or similar embossing font
  // Informational — our renderer uses the correct font
  (config: CardConfig) => {
    if (config.network !== 'visa') return null;
    if (config.numberless) return null;
    if (config.numberPosition === 'back-only') return null;
    // PAN should be on front in standard position for Visa
    return null; // handled by renderer
  },

  // Visa payWave contactless symbol placement
  // VPF: contactless indicator must appear on front, near chip
  (config: CardConfig) => {
    if (config.network !== 'visa') return null;
    if (!config.contactless) return null;
    if (config.cardType === 'virtual') return null;
    // Informational — renderer places it correctly
    return null;
  },

  // Visa: card must display valid-thru date on front
  (config: CardConfig) => {
    if (config.network !== 'visa') return null;
    if (config.cardType === 'virtual') return null;
    if (config.expiryDate && config.expiryDate.trim()) return null;
    return {
      id: 'visa-expiry-required',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'warning',
      title: 'Visa: Expiry Date Required',
      message: 'Visa requires a VALID THRU date on physical card front',
      explanation: 'Visa requires all physical cards to display the expiry date on the card front using the MM/YY format, preceded by "VALID THRU" label. This is checked during the Visa card design review and is a hard requirement for production approval.',
      regulationRef: 'Visa Core Rules § 1.5.3.6 — Card Design',
      field: 'expiryDate',
    };
  },

  // Visa: cardholder name required on front
  (config: CardConfig) => {
    if (config.network !== 'visa') return null;
    if (config.cardType === 'virtual' || config.cardType === 'prepaid') return null;
    if (config.cardholderName && config.cardholderName.trim()) return null;
    return {
      id: 'visa-cardholder-name',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'warning',
      title: 'Visa: Cardholder Name Required',
      message: 'Visa requires the cardholder name on the card front (except prepaid/virtual)',
      explanation: 'Visa requires the embossed or printed cardholder name on the front of all credit and debit cards. Prepaid and virtual cards may omit the name. The name must appear in the lower-left area of horizontal cards.',
      regulationRef: 'Visa Core Rules § 1.5.3.5',
      field: 'cardholderName',
    };
  },

  // Visa: back of card requirements
  (config: CardConfig) => {
    if (config.network !== 'visa') return null;
    if (config.cardType === 'virtual') return null;
    if (config.backShowMagStripe) return null;
    return {
      id: 'visa-mag-stripe',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'warning',
      title: 'Visa: Magnetic Stripe Required',
      message: 'Physical Visa cards must have a magnetic stripe on the back',
      explanation: 'Despite the move to EMV chip, Visa still requires a magnetic stripe on all physical cards for backward compatibility with mag-stripe-only terminals. The stripe must be in the standard ISO 7811 position (top of card back). Some markets are beginning to phase this out, but it remains a global requirement as of 2024.',
      regulationRef: 'Visa Core Rules § 1.5.3.8 — Magnetic Stripe',
      field: 'backShowMagStripe',
      autoFixable: true,
      autoFix: { backShowMagStripe: true },
    };
  },
];

// ─────────────────────────────────────────────────────────────
// MASTERCARD BRAND DESIGN RULES
// Source: Mastercard Brand Mark Guidelines, Mastercard Card Design Standard
// ─────────────────────────────────────────────────────────────
const mastercardBrandRules: ComplianceRuleFn[] = [
  // Mastercard interlocking circles brand mark — must appear on front
  // MC requires the brand mark (two interlocking circles) in upper-right or lower-right
  (config: CardConfig) => {
    if (config.network !== 'mastercard') return null;
    if (config.orientation !== 'vertical') return null;
    return {
      id: 'mc-brand-vertical',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'info',
      title: 'Mastercard: Vertical Card Design Approval',
      message: 'Vertical Mastercard designs require advance approval from Mastercard',
      explanation: 'Mastercard permits vertical card orientation but requires all vertical designs to be submitted for advance approval through the Mastercard Card Design Studio portal. The interlocking circles must appear in either the top-center or top-right of the card. Mastercard provides specific vertical design templates.',
      regulationRef: 'Mastercard Brand Mark Guidelines § Vertical Card Specifications',
      field: 'orientation',
    };
  },

  // Mastercard World Elite: premium material expectation
  (config: CardConfig) => {
    if (config.network !== 'mastercard') return null;
    if (config.tier !== 'world_elite') return null;
    const premiumMaterials = ['metal', 'brushedMetal', 'holographic'];
    if (premiumMaterials.includes(config.material)) return null;
    return {
      id: 'mc-world-elite-material',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'warning',
      title: 'World Elite: Premium Material Expected',
      message: 'Mastercard World Elite cards should use a premium material',
      explanation: 'World Elite Mastercard is the highest consumer tier. Mastercard\'s Card Design Standard specifies that World Elite cards must "convey a premium look and feel." Metal construction (stainless steel or mixed-material with metal core) is strongly recommended. Non-metal World Elite cards require a written exception from your Mastercard account representative.',
      regulationRef: 'Mastercard Card Design Standard — World Elite Requirements',
      field: 'material',
      suggestedFix: 'Use Metal, Brushed Metal, or Holographic material',
      autoFixable: true,
      autoFix: { material: 'metal' },
    };
  },

  // Mastercard: hologram placement (back of card, lower-right)
  (config: CardConfig) => {
    if (config.network !== 'mastercard') return null;
    if (config.cardType === 'virtual') return null;
    if (config.backShowHologram) return null;
    return {
      id: 'mc-hologram-required',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'info',
      title: 'Mastercard: Security Hologram',
      message: 'Mastercard cards traditionally include a hologram on the back',
      explanation: 'Mastercard has historically required a security hologram (the globe/world map design) on the back of all cards. While recent Mastercard guidelines allow issuers to opt for alternative security features (OVD embedded in the card body, micro-text, UV features), the hologram remains a strong visual authentication cue for cardholders and merchants.',
      regulationRef: 'Mastercard Card Design Standard § Security Features',
      field: 'backShowHologram',
    };
  },

  // MC: signature strip on back
  (config: CardConfig) => {
    if (config.network !== 'mastercard') return null;
    if (config.cardType === 'virtual') return null;
    if (config.backShowSignatureStrip) return null;
    return {
      id: 'mc-signature-strip',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'warning',
      title: 'Mastercard: Signature Panel Required',
      message: 'Physical Mastercard cards must include a signature panel on the back',
      explanation: 'Mastercard Card Design Standard requires a signature panel on the back of all physical cards. The panel must be white or light-colored with a tamper-evident pattern (typically "Mastercard" repeated). While some markets are moving away from signature verification, the panel remains a design requirement for card production approval.',
      regulationRef: 'Mastercard Card Design Standard § Back of Card',
      field: 'backShowSignatureStrip',
      autoFixable: true,
      autoFix: { backShowSignatureStrip: true },
    };
  },

  // MC: magnetic stripe required
  (config: CardConfig) => {
    if (config.network !== 'mastercard') return null;
    if (config.cardType === 'virtual') return null;
    if (config.backShowMagStripe) return null;
    return {
      id: 'mc-mag-stripe',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'warning',
      title: 'Mastercard: Magnetic Stripe Required',
      message: 'Physical Mastercard cards must have a magnetic stripe',
      explanation: 'Mastercard requires a magnetic stripe on all physical cards. Track 1 (IATA) and Track 2 (ABA) data must be encoded per ISO 7811. Mastercard has announced plans to phase out mag stripes starting 2024 in Europe and 2027 in the US, but it remains required for new card programs until the phase-out date in your market.',
      regulationRef: 'Mastercard Card Design Standard § Magnetic Stripe',
      field: 'backShowMagStripe',
      autoFixable: true,
      autoFix: { backShowMagStripe: true },
    };
  },

  // Mastercard: card number formatting — 4-4-4-4 groups
  (config: CardConfig) => {
    if (config.network !== 'mastercard') return null;
    if (config.numberless) return null;
    if (config.numberPosition === 'back-only') return null;
    // Ensure PAN is on front — MC prefers front-facing PAN
    return null; // informational only, renderer handles formatting
  },

  // MC: black card backgrounds — brand mark must be clearly visible
  (config: CardConfig) => {
    if (config.network !== 'mastercard') return null;
    const bg = getResolvedBgColor(config);
    if (!bg) return null;
    const lum = hexLuminance(bg);
    // Very dark backgrounds (near black)
    if (lum > 0.02) return null;
    return {
      id: 'mc-brand-visibility-dark',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'info',
      title: 'Mastercard: Brand Mark on Dark Background',
      message: 'On very dark backgrounds, use the reversed (white/light) Mastercard brand mark',
      explanation: 'When the card background is very dark (near-black), Mastercard requires the use of their reversed brand mark — the interlocking circles remain red and yellow/orange but the wordmark text appears in white. The brand mark must maintain sufficient contrast against the background at all times.',
      regulationRef: 'Mastercard Brand Mark Guidelines § Color Usage',
      field: 'solidColor',
    };
  },
];

// ─────────────────────────────────────────────────────────────
// AMEX BRAND DESIGN RULES
// Source: American Express Card Design Standards, Amex Proprietary Network Rules
// ─────────────────────────────────────────────────────────────
const amexBrandRules: ComplianceRuleFn[] = [
  // Amex: Centurion (Gladiator/Soldier) must appear on card front
  // This is the iconic Amex feature — the Roman centurion head
  (config: CardConfig) => {
    if (config.network !== 'amex') return null;
    // Amex always shows their centurion — informational about positioning
    if (config.orientation !== 'vertical') return null;
    return {
      id: 'amex-centurion-vertical',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'info',
      title: 'Amex: Centurion Placement on Vertical',
      message: 'The Amex Centurion image must appear prominently on all card designs',
      explanation: 'American Express requires the Centurion (Roman soldier head) to be displayed on the front of all cards. On vertical designs, it must appear in the upper portion of the card. Amex is very strict about this — the Centurion is their primary brand asset and cannot be obscured, cropped, or reduced below minimum size.',
      regulationRef: 'American Express Card Design Standards § Brand Mark',
      field: 'orientation',
    };
  },

  // Amex: 4-6-5 number grouping (not 4-4-4-4)
  (config: CardConfig) => {
    if (config.network !== 'amex') return null;
    if (config.numberless) return null;
    // Renderer handles this, but inform about the format
    return null;
  },

  // Amex Platinum: metal required
  (config: CardConfig) => {
    if (config.network !== 'amex') return null;
    if (config.tier !== 'platinum') return null;
    const metalMaterials = ['metal', 'brushedMetal'];
    if (metalMaterials.includes(config.material)) return null;
    return {
      id: 'amex-platinum-metal',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'error',
      title: 'Amex Platinum: Metal Card Required',
      message: 'The American Express Platinum Card must be metal',
      explanation: 'Since 2017, the Amex Platinum Card is issued exclusively as a metal card (stainless steel construction). This is a defining feature of the product — Amex Platinum is sometimes colloquially called "the metal card." Non-metal Amex Platinum cards will not be approved by Amex.',
      regulationRef: 'American Express Card Design Standards — Platinum Specifications',
      field: 'material',
      suggestedFix: 'Set material to Metal or Brushed Metal',
      autoFixable: true,
      autoFix: { material: 'metal' },
    };
  },

  // Amex Centurion (Black Card): must be titanium/metal, dark color
  (config: CardConfig) => {
    if (config.network !== 'amex') return null;
    if (config.tier !== 'centurion') return null;
    const metalMaterials = ['metal', 'brushedMetal'];
    if (!metalMaterials.includes(config.material)) {
      return {
        id: 'amex-centurion-material',
        jurisdiction: 'GLOBAL',
        category: 'network',
        severity: 'error',
        title: 'Amex Centurion: Titanium Card Required',
        message: 'The Centurion (Black Card) must be titanium/metal construction',
        explanation: 'The American Express Centurion Card (Black Card) is made from anodized titanium — this is one of the most distinctive physical features of the card. The titanium construction has been a signature element since the card\'s launch. It is heavier than standard metal cards and has a distinctive feel.',
        regulationRef: 'American Express Centurion Card Specifications',
        field: 'material',
        suggestedFix: 'Set material to Metal',
        autoFixable: true,
        autoFix: { material: 'metal' },
      };
    }
    // Must be dark colored
    if (!isDarkBackground(config)) {
      return {
        id: 'amex-centurion-color',
        jurisdiction: 'GLOBAL',
        category: 'network',
        severity: 'warning',
        title: 'Amex Centurion: Dark Color Expected',
        message: 'The Centurion (Black Card) uses a dark/black color scheme',
        explanation: 'The Amex Centurion Card is known as "The Black Card" — its dark anodized titanium appearance is a core brand element. While custom co-brand colorways exist, the standard Centurion must use a very dark (near-black) card face.',
        field: 'solidColor',
      };
    }
    return null;
  },

  // Amex Gold: gold-toned color
  (config: CardConfig) => {
    if (config.network !== 'amex') return null;
    if (config.tier !== 'gold') return null;
    // The current Amex Gold is rose-gold metal
    const metalMaterials = ['metal', 'brushedMetal'];
    if (metalMaterials.includes(config.material)) return null;
    return {
      id: 'amex-gold-material',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'info',
      title: 'Amex Gold: Metal Card Recommended',
      message: 'The current Amex Gold Card is a metal card with gold/rose-gold finish',
      explanation: 'Since 2018, the American Express Gold Card has been issued as a metal card with a distinctive gold or rose-gold colored stainless steel body. While Amex does not strictly require metal for all Gold cards globally, the US market Gold Card is metal as standard.',
      regulationRef: 'American Express Card Design Standards',
      field: 'material',
    };
  },

  // Amex: Member Since date format (not VALID THRU)
  (config: CardConfig) => {
    if (config.network !== 'amex') return null;
    // Amex uses "MEMBER SINCE YYYY" not "VALID THRU MM/YY"
    // Our renderer handles this — just informational
    return null;
  },

  // Amex: card back — no signature panel
  (config: CardConfig) => {
    if (config.network !== 'amex') return null;
    if (config.cardType === 'virtual') return null;
    if (!config.backShowSignatureStrip) return null;
    return {
      id: 'amex-no-signature-panel',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'info',
      title: 'Amex: Signature Panel Removed',
      message: 'Amex has removed the signature panel from most card products',
      explanation: 'American Express eliminated the signature requirement in 2018 and has since removed the signature panel from most card designs. The back of modern Amex cards features only the CID (4-digit security code), the magnetic stripe, and regulatory text. Keeping the signature panel is not an error but is outdated.',
      regulationRef: 'American Express Card Design Update 2018',
      field: 'backShowSignatureStrip',
    };
  },

  // Amex: CID is 4 digits (on front, above card number)
  // Unlike Visa/MC CVV which is 3 digits on back
  (config: CardConfig) => {
    if (config.network !== 'amex') return null;
    if (config.numberless) return null;
    // Informational about the unique 4-digit CID
    return null;
  },
];

// ─────────────────────────────────────────────────────────────
// DISCOVER BRAND DESIGN RULES
// Source: Discover Network Brand Standards
// ─────────────────────────────────────────────────────────────
const discoverBrandRules: ComplianceRuleFn[] = [
  // Discover: the orange "DISCOVER" wordmark must be prominent
  (config: CardConfig) => {
    if (config.network !== 'discover') return null;
    // Check if card art might obscure the logo area
    if (!config.cardArt) return null;
    if (config.cardArtOpacity <= 60) return null;
    return {
      id: 'discover-logo-obstruction',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'info',
      title: 'Discover: Ensure Brand Mark Visibility',
      message: 'High-opacity card art may obscure the Discover brand mark',
      explanation: 'Discover requires their brand mark (orange stripe with "DISCOVER" text) to be clearly visible at all times. Card art with high opacity can interfere with brand mark legibility. Consider reducing card art opacity or using a blend mode that preserves the logo area.',
      regulationRef: 'Discover Network Brand Standards',
      field: 'cardArtOpacity',
    };
  },

  // Discover: signature strip required
  (config: CardConfig) => {
    if (config.network !== 'discover') return null;
    if (config.cardType === 'virtual') return null;
    if (config.backShowSignatureStrip) return null;
    return {
      id: 'discover-signature-strip',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'warning',
      title: 'Discover: Signature Panel Required',
      message: 'Physical Discover cards must include a signature panel on the back',
      explanation: 'Discover Network Brand Standards require a signature panel on the back of all physical cards. Unlike Amex, Discover has not broadly eliminated the signature requirement.',
      regulationRef: 'Discover Network Brand Standards § Card Back',
      field: 'backShowSignatureStrip',
      autoFixable: true,
      autoFix: { backShowSignatureStrip: true },
    };
  },
];

// ─────────────────────────────────────────────────────────────
// GENERAL CARD DESIGN BEST PRACTICES
// Source: EMVCo, ISO 7810/7811/7816, industry standards
// ─────────────────────────────────────────────────────────────
const generalDesignRules: ComplianceRuleFn[] = [
  // ISO 7810: card dimensions — ID-1 format (85.6 × 53.98mm)
  // This is handled by our canvas, so just ensure orientation is considered
  // No runtime check needed — informational

  // Card art contrast: text must be readable against card background + art
  (config: CardConfig) => {
    if (!config.cardArt) return null;
    if (config.cardArtOpacity < 80) return null;
    if (config.cardArtBlend !== 'normal') return null;
    if (config.numberless) return null;
    return {
      id: 'design-card-art-text-contrast',
      jurisdiction: 'GLOBAL',
      category: 'best_practice',
      severity: 'warning',
      title: 'Card Art May Reduce Text Legibility',
      message: 'High-opacity card art with normal blend may make card text hard to read',
      explanation: 'When card art is at high opacity (80%+) with normal blend mode, embossed/printed text (card number, name, expiry) may become difficult to read. Network certification reviewers will reject designs where required text elements are not clearly legible. Consider reducing opacity, using a tint, or choosing a blend mode (overlay, soft-light) that maintains text contrast.',
      field: 'cardArtOpacity',
      suggestedFix: 'Reduce card art opacity to 60-70% or use overlay blend mode',
    };
  },

  // Light text on light background
  (config: CardConfig) => {
    if (!isLightBackground(config)) return null;
    if (config.textColorOverride) return null; // user chose text color
    if (config.numberless && !config.cardholderName?.trim()) return null;
    return {
      id: 'design-light-on-light',
      jurisdiction: 'GLOBAL',
      category: 'best_practice',
      severity: 'warning',
      title: 'Text Contrast on Light Background',
      message: 'Default white text may not be visible on your light card background',
      explanation: 'Network guidelines require all text on the card face to meet minimum contrast ratios for legibility. On very light backgrounds (white, arctic, light gray), the default light-colored text will be nearly invisible. Set a dark text color override or choose a darker background.',
      field: 'textColorOverride',
      suggestedFix: 'Set a dark text color override (e.g., #1E293B)',
    };
  },

  // Chip placement: left side, mid-card for horizontal
  // ISO 7816: chip contacts must be at specific position for reader compatibility
  (config: CardConfig) => {
    if (config.chipStyle === 'none' || config.cardType === 'virtual') return null;
    // Our renderer places chip correctly, so this is about card art obstruction
    if (!config.cardArt) return null;
    if (config.cardArtOpacity <= 40) return null;
    if (config.cardArtBlend === 'overlay' || config.cardArtBlend === 'soft-light') return null;
    // Card art could cover chip area
    return {
      id: 'design-chip-art-overlap',
      jurisdiction: 'GLOBAL',
      category: 'best_practice',
      severity: 'info',
      title: 'Card Art Over Chip Area',
      message: 'Ensure card art does not visually obscure the EMV chip area',
      explanation: 'While the physical chip module sits above the printed card art, in the design preview the chip area should appear distinct. ISO 7816-1 specifies chip contact positioning at 19.87mm from the left edge of a horizontal card. Ensure your card art design accounts for the chip module placement so the final product looks intentional.',
      regulationRef: 'ISO/IEC 7816-1 — Chip Contact Position',
      field: 'cardArt',
    };
  },

  // Mag stripe: must be on ALL physical cards (still required globally until ~2027-2033)
  (config: CardConfig) => {
    if (config.cardType === 'virtual') return null;
    if (config.backShowMagStripe) return null;
    // This is covered by per-network rules, but add a general one for networks
    // that don't have specific mag stripe rules
    if (['visa', 'mastercard'].includes(config.network)) return null; // handled by specific rules
    return {
      id: 'design-mag-stripe-general',
      jurisdiction: 'GLOBAL',
      category: 'network',
      severity: 'warning',
      title: 'Magnetic Stripe Required',
      message: 'Physical cards require a magnetic stripe for backward compatibility',
      explanation: 'The magnetic stripe (ISO 7811) remains a global requirement for physical payment cards. While chip-and-PIN and contactless have reduced reliance on mag stripe, many terminals (particularly in the US, Africa, and parts of Asia) still fall back to mag stripe. All major networks require it for new card programs until their published phase-out dates.',
      regulationRef: 'ISO 7811 — Magnetic Stripe Standard',
      field: 'backShowMagStripe',
      autoFixable: true,
      autoFix: { backShowMagStripe: true },
    };
  },

  // Support phone number on back
  (config: CardConfig) => {
    if (config.cardType === 'virtual') return null;
    if (config.backSupportPhone && config.backSupportPhone.trim() && config.backSupportPhone !== '1-800-XXX-XXXX') return null;
    return {
      id: 'design-support-phone',
      jurisdiction: 'GLOBAL',
      category: 'best_practice',
      severity: 'info',
      title: 'Customer Support Number',
      message: 'Cards should display a real customer support phone number on the back',
      explanation: 'All major networks require a customer service phone number on the card back. This is the number cardholders call to report lost/stolen cards, dispute transactions, or get account information. The placeholder "1-800-XXX-XXXX" should be replaced with your actual issuer support line before production.',
      field: 'backSupportPhone',
    };
  },

  // Numberless cards: informational
  (config: CardConfig) => {
    if (!config.numberless) return null;
    if (config.cardType === 'virtual') return null;
    return {
      id: 'design-numberless-info',
      jurisdiction: 'GLOBAL',
      category: 'best_practice',
      severity: 'info',
      title: 'Numberless Card Design',
      message: 'Card number will appear on back only or be available via mobile app',
      explanation: 'Numberless cards (no PAN on front) are approved by Visa, Mastercard, and Amex for enhanced security. The full card number must still be available — typically printed/laser-engraved on the card back or accessible via the issuer\'s mobile app. Apple Card, Brex, and many neobanks pioneered this approach. Ensure your program has a digital card number delivery mechanism.',
      field: 'numberless',
    };
  },

  // Virtual cards: no physical features needed
  (config: CardConfig) => {
    if (config.cardType !== 'virtual') return null;
    if (config.chipStyle !== 'none') {
      return {
        id: 'design-virtual-no-chip',
        jurisdiction: 'GLOBAL',
        category: 'best_practice',
        severity: 'info',
        title: 'Virtual Card: Chip Not Applicable',
        message: 'Virtual cards do not have a physical chip',
        explanation: 'Virtual cards exist only digitally (in-app or wallet). While the chip is shown in the preview for visual completeness, virtual card designs submitted for production typically omit the chip module from the artwork.',
        field: 'chipStyle',
      };
    }
    return null;
  },

  // Co-brand: logo placement rules
  (config: CardConfig) => {
    if (!config.coBrandPartner) return null;
    if (config.coBrandLogo) return null;
    return {
      id: 'design-cobrand-logo-missing',
      jurisdiction: 'GLOBAL',
      category: 'best_practice',
      severity: 'info',
      title: 'Co-Brand Partner Logo Missing',
      message: `Co-brand partner "${config.coBrandPartner}" specified but no logo uploaded`,
      explanation: 'Co-branded cards typically display the partner\'s logo on the card front. Network guidelines specify that the co-brand logo must be smaller than the network brand mark and positioned on the opposite side (usually upper-left for horizontal cards). Upload a co-brand logo for a complete design.',
      field: 'coBrandLogo',
    };
  },

  // Card back QR code: becoming common
  (config: CardConfig) => {
    if (config.cardType === 'virtual') return null;
    if (config.backQrUrl) return null;
    return null; // QR codes are optional, no rule needed
  },

  // Issuer address on back (required by most networks)
  (config: CardConfig) => {
    if (config.cardType === 'virtual') return null;
    if (config.issuerAddress && config.issuerAddress.trim()) return null;
    return {
      id: 'design-issuer-address',
      jurisdiction: 'GLOBAL',
      category: 'best_practice',
      severity: 'info',
      title: 'Issuer Address Recommended',
      message: 'Network guidelines recommend the issuer address on the card back',
      explanation: 'Most networks require or recommend that the issuing institution\'s mailing address appear on the card back. This is a regulatory requirement in many jurisdictions and helps cardholders identify the card issuer. It\'s typically placed near the customer service phone number.',
      field: 'issuerAddress',
    };
  },
];

// ─────────────────────────────────────────────────────────────
// PHYSICAL CARD PRODUCTION RULES
// Source: ISO 7810, ISO 7811, ISO 7816, card manufacturer standards
// ─────────────────────────────────────────────────────────────
const productionRules: ComplianceRuleFn[] = [
  // Material + network compatibility
  (config: CardConfig) => {
    if (config.cardType === 'virtual') return null;
    if (config.material !== 'wood') return null;
    return {
      id: 'production-wood-limitation',
      jurisdiction: 'GLOBAL',
      category: 'best_practice',
      severity: 'warning',
      title: 'Wood Material: Limited Network Support',
      message: 'Wood card construction requires special network approval',
      explanation: 'Wood-veneer cards (thin wood layer laminated to PVC core) are novel but require special approval from the payment network. The card must still meet ISO 7810 thickness (0.76mm ± 0.08mm) and flexibility requirements. Wood cards may have issues with chip module adhesion, mag stripe encoding, and contactless antenna range. Only a few card manufacturers (e.g., Fetch, Tyme) offer certified wood card production.',
      regulationRef: 'ISO 7810 — ID-1 Physical Characteristics',
      field: 'material',
    };
  },

  // Clear/transparent material considerations
  (config: CardConfig) => {
    if (config.cardType === 'virtual') return null;
    if (config.material !== 'clear') return null;
    return {
      id: 'production-clear-card',
      jurisdiction: 'GLOBAL',
      category: 'best_practice',
      severity: 'info',
      title: 'Transparent Card: Design Considerations',
      message: 'Transparent cards have specific production and security requirements',
      explanation: 'Transparent/clear cards (polycarbonate body with selective printing) are eye-catching but require careful design. The contactless antenna, chip module wiring, and mag stripe are all visible through the card body. Text and logos must be printed on opaque areas. Security features like UV printing become more important since the card body itself provides no concealment. Networks require that all mandatory elements (PAN, name, expiry) remain clearly legible against varying backgrounds when the card is placed on different surfaces.',
      field: 'material',
    };
  },

  // Holographic material + card art interaction
  (config: CardConfig) => {
    if (config.material !== 'holographic') return null;
    if (!config.cardArt || config.cardArtOpacity <= 40) return null;
    return {
      id: 'production-holo-art-conflict',
      jurisdiction: 'GLOBAL',
      category: 'best_practice',
      severity: 'info',
      title: 'Holographic + Card Art Interaction',
      message: 'Card art may reduce the holographic effect visibility',
      explanation: 'Holographic card bodies produce their iridescent effect from a micro-etched pattern under a transparent layer. Printing opaque card art over this layer will cover the holographic effect in those areas. For maximum holographic impact, use minimal card art with low opacity, or design art that complements the holographic pattern.',
      field: 'cardArt',
    };
  },

  // Recycled plastic: growing requirement in EU
  (config: CardConfig) => {
    if (config.material === 'recycledPlastic') return null;
    if (config.cardType === 'virtual') return null;
    // Only flag for EU issuers
    if (!['DE', 'FR', 'NL', 'SE', 'DK', 'FI', 'NO'].includes(config.issuingCountry)) return null;
    return {
      id: 'production-eu-sustainability',
      jurisdiction: 'EU',
      category: 'best_practice',
      severity: 'info',
      title: 'Sustainability: Recycled Material',
      message: 'Consider recycled plastic for EU-issued cards',
      explanation: 'The EU\'s Circular Economy Action Plan and Single-Use Plastics Directive are driving increased adoption of recycled-content payment cards. Mastercard, Visa, and Amex all now offer recycled PVC/PET-G card programs. Several EU issuers (Bunq, N26, Revolut) have committed to 100% recycled card stock. While not yet mandatory, it\'s becoming an industry expectation for European programs.',
      regulationRef: 'EU Circular Economy Action Plan',
      field: 'material',
    };
  },
];

// ─────────────────────────────────────────────────────────────
// ACCESSIBILITY & INCLUSIVE DESIGN
// Source: EBA Guidelines, UK FCA, Mastercard Touch Card standard
// ─────────────────────────────────────────────────────────────
const accessibilityRules: ComplianceRuleFn[] = [
  // Touch card (tactile notch) — Mastercard led initiative
  (config: CardConfig) => {
    if (config.cardType === 'virtual') return null;
    // Informational about the emerging accessibility standard
    if (config.network !== 'mastercard' && config.network !== 'visa') return null;
    return {
      id: 'a11y-touch-card',
      jurisdiction: 'GLOBAL',
      category: 'best_practice',
      severity: 'info',
      title: 'Accessibility: Touch Card Notch',
      message: 'Consider adding a tactile notch for visually impaired cardholders',
      explanation: 'Mastercard\'s Touch Card standard (2021) introduced a tactile notch on the card edge: a round notch for credit, a wide/square notch for debit, and a triangular notch for prepaid. This allows visually impaired cardholders to distinguish card types by touch. Visa has adopted a similar standard. The EBA (European Banking Authority) and UK FCA increasingly expect accessibility features on new card programs. The notch is cut into the short edge of the card and does not affect chip or mag stripe functionality.',
      regulationRef: 'Mastercard Touch Card Standard (2021), EBA Guidelines on Accessibility',
      field: 'cardType',
    };
  },
];

// ─── Export all brand design rules ──────────────────────────
export const brandDesignRules: ComplianceRuleFn[] = [
  ...visaBrandRules,
  ...mastercardBrandRules,
  ...amexBrandRules,
  ...discoverBrandRules,
  ...generalDesignRules,
  ...productionRules,
  ...accessibilityRules,
];
