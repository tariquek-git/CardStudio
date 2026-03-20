import { prisma } from '../../../_lib/prisma';
import { requireAuth } from '../../../_lib/auth';
import { json, notFound, error, methodNotAllowed, withErrorHandler } from '../../../_lib/errors';
import { updateTierSchema, parseBody } from '../../../_lib/validate';
import { logAudit, getIp } from '../../../_lib/audit';

function extractIds(req: Request): { programId: string; tierId: string } {
  const segments = new URL(req.url).pathname.split('/').filter(Boolean);
  // Expected: ["api", "programs", "<programId>", "tiers", "<tierId>"]
  return { programId: segments[2], tierId: segments[4] };
}

async function handler(req: Request): Promise<Response> {
  const user = await requireAuth(req);
  const { programId, tierId } = extractIds(req);

  // Verify program ownership
  const program = await prisma.cardProgram.findUnique({ where: { id: programId } });
  if (!program || program.userId !== user.id) return notFound('Program');

  // Verify tier belongs to program
  const tier = await prisma.programTier.findUnique({
    where: { id: tierId },
    include: { design: true },
  });
  if (!tier || tier.programId !== programId) return notFound('Tier');

  if (req.method === 'PATCH') {
    const body = await parseBody(req, updateTierSchema);

    const updated = await prisma.programTier.update({
      where: { id: tierId },
      data: body,
      include: { design: true },
    });

    await logAudit(user.id, 'UPDATE', 'ProgramTier', tierId, { changes: Object.keys(body) }, getIp(req));
    return json(updated);
  }

  if (req.method === 'DELETE') {
    // Must have at least 1 tier remaining
    const tierCount = await prisma.programTier.count({ where: { programId } });
    if (tierCount <= 1) {
      return error('Cannot delete the last tier. A program must have at least one tier.', 400);
    }

    await prisma.$transaction(async (tx) => {
      // Delete the tier first (it references the design)
      await tx.programTier.delete({ where: { id: tierId } });
      // Delete the associated design
      if (tier.designId) {
        await tx.design.delete({ where: { id: tier.designId } });
      }
    });

    await logAudit(user.id, 'DELETE', 'ProgramTier', tierId, { programId }, getIp(req));
    return new Response(null, { status: 204 });
  }

  return methodNotAllowed(['PATCH', 'DELETE']);
}

export default withErrorHandler(handler);
