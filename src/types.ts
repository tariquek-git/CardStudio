export type CardOrientation = 'horizontal' | 'vertical';

export type CardNetwork =
  | 'visa'
  | 'mastercard'
  | 'amex'
  | 'discover'
  | 'interac'
  | 'unionpay'
  | 'jcb'
  | 'maestro';

export type CardType = 'credit' | 'debit' | 'prepaid' | 'commercial' | 'virtual';

export type ChipStyle = 'gold' | 'silver' | 'black' | 'none';

export type CardNumberDisplay = 'full' | 'last4' | 'hidden';

export type CardFace = 'front' | 'back';

export type CardMaterial = 'matte' | 'glossy' | 'metal' | 'brushedMetal' | 'clear' | 'holographic' | 'recycledPlastic' | 'wood';

export type RenderScene = '3d' | 'wallet-apple' | 'wallet-google' | 'terminal';

export type BackLogo = 'cirrus' | 'plus' | 'star' | 'pulse';

export type CardArtFit = 'cover' | 'contain' | 'fill';

export type NumberPosition = 'standard' | 'back-only' | 'lower-center' | 'compact-right';

export type CardArtBlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light';

export interface GradientStop {
  color: string;
  position: number; // 0-100
}

export interface GradientConfig {
  stops: GradientStop[];
  angle: number; // 0-360 degrees
}

export interface CardConfig {
  // Payment rail (new system — backward compat: railId defaults to network value)
  railId: string;
  railFields: Record<string, string>;
  orientation: CardOrientation;
  network: CardNetwork;
  cardType: CardType;
  tier: string;
  chipStyle: ChipStyle;
  contactless: boolean;
  issuerName: string;
  issuerLogo: string | null;
  cardholderName: string;
  cardNumberDisplay: CardNumberDisplay;
  expiryDate: string;
  colorMode: 'solid' | 'preset' | 'gradient';
  solidColor: string;
  presetColor: string;
  gradientConfig: GradientConfig;
  textColorOverride: string | null;
  customCardNumber: string;
  face: CardFace;
  material: CardMaterial;
  walletDarkMode: boolean;
  cardArt: string | null;
  cardArtOpacity: number;
  cardArtFit: CardArtFit;
  cardArtBlend: CardArtBlendMode;
  cardArtOffsetX: number;
  cardArtOffsetY: number;
  cardArtTint: string | null;
  cardArtBlur: number;
  numberless: boolean;
  numberPosition: NumberPosition;
  programName: string;
  renderScene: RenderScene;
  backLogos: BackLogo[];
  darkMode: boolean;
}

export interface SavedDesign {
  id: string;
  name: string;
  config: CardConfig;
  thumbnail: string; // small PNG data URL
  createdAt: number;
  updatedAt: number;
}

export const defaultConfig: CardConfig = {
  railId: 'visa',
  railFields: {},
  orientation: 'horizontal',
  network: 'visa',
  cardType: 'credit',
  tier: 'platinum',
  chipStyle: 'gold',
  contactless: true,
  issuerName: 'Maple Financial',
  issuerLogo: null,
  cardholderName: 'JANE A. CARDHOLDER',
  cardNumberDisplay: 'full',
  expiryDate: '12/28',
  colorMode: 'preset',
  solidColor: '#0EA5E9',
  presetColor: 'oceanGradient',
  gradientConfig: {
    stops: [
      { color: '#0EA5E9', position: 0 },
      { color: '#6366F1', position: 100 },
    ],
    angle: 135,
  },
  textColorOverride: null,
  customCardNumber: '',
  face: 'front',
  material: 'matte',
  walletDarkMode: true,
  cardArt: null,
  cardArtOpacity: 90,
  cardArtFit: 'cover' as CardArtFit,
  cardArtBlend: 'normal',
  cardArtOffsetX: 0,
  cardArtOffsetY: 0,
  cardArtTint: null,
  cardArtBlur: 0,
  numberless: false,
  numberPosition: 'standard',
  programName: '',
  renderScene: '3d',
  backLogos: [],
  darkMode: true,
};
