import { z } from 'zod';

// ─── Auth ──────────────────────────────────────────

export const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ─── Design ────────────────────────────────────────

export const createDesignSchema = z.object({
  name: z.string().min(1).max(100),
  config: z.record(z.any()),
  thumbnailUrl: z.string().url().optional(),
  programId: z.string().optional(),
});

export const updateDesignSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  config: z.record(z.any()).optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  complianceScore: z.number().int().min(0).max(100).optional(),
});

// ─── Program ───────────────────────────────────────

export const createProgramSchema = z.object({
  name: z.string().min(1).max(100),
  issuerName: z.string().max(100).optional(),
  network: z.string().max(50).optional(),
  railId: z.string().max(50).optional(),
  issuingCountry: z.string().max(10).optional(),
  issuerType: z.string().max(50).optional(),
  currency: z.string().max(10).optional(),
  brandColor: z.string().max(20).optional(),
  brandAccent: z.string().max(20).optional(),
  fromDesignId: z.string().optional(), // create first tier from existing design
});

export const updateProgramSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  issuerName: z.string().max(100).optional(),
  network: z.string().max(50).optional(),
  railId: z.string().max(50).optional(),
  issuingCountry: z.string().max(10).optional(),
  issuerType: z.string().max(50).optional(),
  currency: z.string().max(10).optional(),
  brandColor: z.string().max(20).optional(),
  brandAccent: z.string().max(20).optional(),
  issuerLogoUrl: z.string().url().nullable().optional(),
  coBrandPartner: z.string().max(100).optional(),
  coBrandLogoUrl: z.string().url().nullable().optional(),
});

// ─── Tier ──────────────────────────────────────────

export const addTierSchema = z.object({
  name: z.string().min(1).max(50),
  tier: z.string().min(1).max(50),
  material: z.string().max(50).optional(),
  chipStyle: z.string().max(50).optional(),
});

export const reorderTiersSchema = z.object({
  tierIds: z.array(z.string()),
});

export const updateTierSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  tier: z.string().max(50).optional(),
  material: z.string().max(50).optional(),
  chipStyle: z.string().max(50).optional(),
});

// ─── Admin ─────────────────────────────────────────

export const updateUserSchema = z.object({
  role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']).optional(),
  disabled: z.boolean().optional(),
  name: z.string().max(100).optional(),
});

// ─── Helpers ───────────────────────────────────────

export async function parseBody<T>(req: Request, schema: z.ZodSchema<T>): Promise<T> {
  const body = await req.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new Response(
      JSON.stringify({ error: 'Validation failed', details: result.error.flatten() }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }
  return result.data;
}
