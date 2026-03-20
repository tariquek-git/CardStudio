import { prisma } from '../../_lib/prisma';
import { requireAuth } from '../../_lib/auth';
import { json, notFound, error, methodNotAllowed, withErrorHandler } from '../../_lib/errors';
import { addTierSchema, reorderTiersSchema, parseBody } from '../../_lib/validate';
import { logAudit, getIp } from '../../_lib/audit';

const SHARED_FIELDS = ['issuerName', 'network', 'railId', 'issuingCountry', 'issuerType', 'currency'] as const;

function extractProgramId(req: Request): string {
  const segments = new URL(req.url).pathname.split('/').filter(Boolean);
  // Expected: ["api", "programs", "<id>", "tiers"]
  return segments[2];
}

async function handler(req: Request): Promise<Response> {
  const user = await requireAuth(req);
  const programId = extractProgramId(req);

  // Verify program ownership
  const program = await prisma.cardProgram.findUnique({ where: { id: programId } });
  if (!program || program.userId !== user.id) return notFound('Program');

  if (req.method === 'POST') {
    const body = await parseBody(req, addTierSchema);

    // Build shared config from program fields
    const sharedConfig: Record<string, any> = {};
    for (const field of SHARED_FIELDS) {
      const value = (program as any)[field];
      if (value !== null && value !== undefined) {
        sharedConfig[field] = value;
      }
    }

    // Determine next order value
    const maxOrder = await prisma.programTier.aggregate({
      where: { programId },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const tier = await prisma.$transaction(async (tx) => {
      const design = await tx.design.create({
        data: {
          name: `${program.name} - ${body.name}`,
          config: sharedConfig,
          userId: user.id,
          programId,
        },
      });

      const created = await tx.programTier.create({
        data: {
          name: body.name,
          tier: body.tier,
          material: body.material,
          chipStyle: body.chipStyle,
          order: nextOrder,
          programId,
          designId: design.id,
        },
        include: { design: true },
      });

      return created;
    });

    await logAudit(user.id, 'CREATE', 'ProgramTier', tier.id, { programId, name: body.name }, getIp(req));
    return json(tier, 201);
  }

  if (req.method === 'PATCH') {
    const body = await parseBody(req, reorderTiersSchema);
    const { tierIds } = body;

    // Verify all tierIds belong to this program
    const existing = await prisma.programTier.findMany({
      where: { programId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((t) => t.id));
    for (const tid of tierIds) {
      if (!existingIds.has(tid)) return error(`Tier ${tid} not found in this program`, 400);
    }

    // Update order for each tier
    await prisma.$transaction(
      tierIds.map((tid, index) =>
        prisma.programTier.update({
          where: { id: tid },
          data: { order: index },
        })
      )
    );

    const tiers = await prisma.programTier.findMany({
      where: { programId },
      orderBy: { order: 'asc' },
      include: { design: true },
    });

    await logAudit(user.id, 'REORDER', 'ProgramTier', programId, { tierIds }, getIp(req));
    return json(tiers);
  }

  return methodNotAllowed(['POST', 'PATCH']);
}

export default withErrorHandler(handler);
