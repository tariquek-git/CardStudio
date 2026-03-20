import { prisma } from '../../_lib/prisma';
import { requireAuth } from '../../_lib/auth';
import { json, notFound, methodNotAllowed, withErrorHandler } from '../../_lib/errors';
import { logAudit, getIp } from '../../_lib/audit';

function extractId(req: Request): string {
  const segments = new URL(req.url).pathname.split('/').filter(Boolean);
  // Expected: ["api", "programs", "<id>", "duplicate"]
  return segments[2];
}

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return methodNotAllowed(['POST']);

  const user = await requireAuth(req);
  const id = extractId(req);

  const source = await prisma.cardProgram.findUnique({
    where: { id },
    include: { tiers: { orderBy: { order: 'asc' }, include: { design: true } } },
  });
  if (!source || source.userId !== user.id) return notFound('Program');

  const newProgram = await prisma.$transaction(async (tx) => {
    // Create the new program with the same fields
    const created = await tx.cardProgram.create({
      data: {
        name: `${source.name} (Copy)`,
        issuerName: source.issuerName,
        network: source.network,
        railId: source.railId,
        issuingCountry: source.issuingCountry,
        issuerType: source.issuerType,
        currency: source.currency,
        brandColor: source.brandColor,
        brandAccent: source.brandAccent,
        issuerLogoUrl: source.issuerLogoUrl,
        coBrandPartner: source.coBrandPartner,
        coBrandLogoUrl: source.coBrandLogoUrl,
        userId: user.id,
      },
    });

    // Duplicate each tier and its design
    for (const tier of source.tiers) {
      const designConfig = tier.design
        ? (tier.design.config as Record<string, any>) ?? {}
        : {};

      const newDesign = await tx.design.create({
        data: {
          name: tier.design?.name ?? `${created.name} - ${tier.name}`,
          config: designConfig,
          thumbnailUrl: tier.design?.thumbnailUrl ?? null,
          userId: user.id,
          programId: created.id,
        },
      });

      await tx.programTier.create({
        data: {
          name: tier.name,
          tier: tier.tier,
          material: tier.material,
          chipStyle: tier.chipStyle,
          order: tier.order,
          programId: created.id,
          designId: newDesign.id,
        },
      });
    }

    return tx.cardProgram.findUnique({
      where: { id: created.id },
      include: { tiers: { orderBy: { order: 'asc' }, include: { design: true } } },
    });
  });

  await logAudit(user.id, 'DUPLICATE', 'CardProgram', newProgram!.id, { sourceId: id }, getIp(req));
  return json(newProgram, 201);
}

export default withErrorHandler(handler);
