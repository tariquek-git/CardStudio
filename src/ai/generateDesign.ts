import Anthropic from '@anthropic-ai/sdk';
import type { CardConfig } from '../types';

const SYSTEM_PROMPT = `You are a payment card design assistant for Card Studio, a fintech card design tool.
Given a natural language description, generate a card configuration object.

Valid field values:

network: visa, mastercard, amex, discover, interac, unionpay, jcb, maestro
cardType: credit, debit, prepaid, commercial, virtual
chipStyle: gold, silver, black, none
material: matte, glossy, metal, brushedMetal, clear, holographic, recycledPlastic, wood
orientation: horizontal, vertical
colorMode: solid, preset, gradient
presetColor: matteBlack, deepNavy, slateGray, charcoal, midnight, emerald, burgundy, roseGold, arctic, sunset, oceanGradient, aurora, neonPulse, lavenderMist
numberPosition: standard, back-only, lower-center, compact-right
cardArtBlend: normal, multiply, screen, overlay, soft-light
cardArtFit: cover, contain, fill

Tier names per network:
- visa: classic, gold, platinum, signature, infinite
- mastercard: standard, world, world-elite
- amex: green, gold, platinum

cardArtOpacity: 0-100
gradientConfig.angle: 0-360

For solidColor and textColorOverride, use hex color strings like "#0EA5E9".
For gradientConfig, provide stops (array of {color: string, position: number}) and angle (number).

Only set fields the user mentions or implies. Do not set issuerLogo, coBrandLogo, or cardArt fields.
Be creative with colors and materials when the description is evocative.`;

const TOOL_SCHEMA: Anthropic.Tool = {
  name: 'generate_card_config',
  description: 'Generate a partial CardConfig based on the user description',
  input_schema: {
    type: 'object' as const,
    properties: {
      network: { type: 'string', enum: ['visa', 'mastercard', 'amex', 'discover', 'interac', 'unionpay', 'jcb', 'maestro'] },
      cardType: { type: 'string', enum: ['credit', 'debit', 'prepaid', 'commercial', 'virtual'] },
      tier: { type: 'string' },
      chipStyle: { type: 'string', enum: ['gold', 'silver', 'black', 'none'] },
      material: { type: 'string', enum: ['matte', 'glossy', 'metal', 'brushedMetal', 'clear', 'holographic', 'recycledPlastic', 'wood'] },
      orientation: { type: 'string', enum: ['horizontal', 'vertical'] },
      colorMode: { type: 'string', enum: ['solid', 'preset', 'gradient'] },
      solidColor: { type: 'string', description: 'Hex color e.g. #0EA5E9' },
      presetColor: { type: 'string', enum: ['matteBlack', 'deepNavy', 'slateGray', 'charcoal', 'midnight', 'emerald', 'burgundy', 'roseGold', 'arctic', 'sunset', 'oceanGradient', 'aurora', 'neonPulse', 'lavenderMist'] },
      gradientConfig: {
        type: 'object',
        properties: {
          stops: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                color: { type: 'string' },
                position: { type: 'number' },
              },
              required: ['color', 'position'],
            },
          },
          angle: { type: 'number' },
        },
      },
      textColorOverride: { type: 'string', description: 'Hex color or null', nullable: true },
      contactless: { type: 'boolean' },
      numberless: { type: 'boolean' },
      numberPosition: { type: 'string', enum: ['standard', 'back-only', 'lower-center', 'compact-right'] },
      cardArtOpacity: { type: 'number', description: '0-100' },
      cardArtBlend: { type: 'string', enum: ['normal', 'multiply', 'screen', 'overlay', 'soft-light'] },
      cardArtFit: { type: 'string', enum: ['cover', 'contain', 'fill'] },
      issuerName: { type: 'string' },
      cardholderName: { type: 'string' },
      programName: { type: 'string' },
      backShowMagStripe: { type: 'boolean' },
      backShowSignatureStrip: { type: 'boolean' },
      backShowHologram: { type: 'boolean' },
    },
    additionalProperties: false,
  },
};

// Fields that should never come from AI generation
const STRIP_FIELDS = new Set([
  'issuerLogo', 'coBrandLogo', 'cardArt', 'renderScene', 'face',
  'darkMode', 'walletDarkMode', 'railId', 'railFields',
]);

export async function generateDesign(
  apiKey: string,
  prompt: string,
): Promise<Partial<CardConfig>> {
  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [TOOL_SCHEMA],
    tool_choice: { type: 'tool', name: 'generate_card_config' },
    messages: [
      { role: 'user', content: prompt },
    ],
  });

  // Extract tool use result
  const toolBlock = response.content.find(
    (b): b is Anthropic.ContentBlock & { type: 'tool_use' } => b.type === 'tool_use',
  );

  if (!toolBlock) {
    throw new Error('No design configuration was generated. Please try again.');
  }

  const raw = toolBlock.input as Record<string, unknown>;

  // Strip image/internal fields
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!STRIP_FIELDS.has(key) && value !== undefined && value !== null) {
      result[key] = value;
    }
  }

  return result as Partial<CardConfig>;
}
