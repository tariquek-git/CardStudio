import { prisma } from '../_lib/prisma';
import { requireAuth } from '../_lib/auth';
import { json, notFound, methodNotAllowed, withErrorHandler } from '../_lib/errors';
import { updateProgramSchema, parseBody } from '../_lib/validate';
import { logAudit, getIp } from '../_lib/audit';

const SHARED_FIELDS = ['issuerName', 'network', 'railId', 'issuingCountry', 'issuerType', 'currency'] as const;

function extractId(req: Request): string {
  const segments = new URL(req.url).pathname.split('/').filter(Boolean);
  // Expected: ["api", "programs", "<id>"]
  return segments[2];
}

async function handler(req: Request): Promise<Response> {
  const user = await requireAuth(req);
  const id = extractId(req);

  if (req.method === 'GET') {
    const program = await prisma.cardProgram.findUnique({
      where: { id },
      include: {
        tiers: {
          orderBy: { order: 'asc' },
          include: { design: true },
        },
      },
    });
    if (!program || program.userId !== user.id) return notFound('Program');
    return json(program);
  }

  if (req.method === 'PATCH') {
    const existing = await prisma.cardProgram.findUnique({
      where: { id },
      include: { tiers: { include: { design: true } } },
    });
    if (!existing || existing.userId !== user.id) return notFound('Program');

    const body = await parseBody(req, updateProgramSchema);

    // Determine which shared fields changed
    const changedShared: Record<string, any> = {};
    for (const field of SHARED_FIELDS) {
      if (body[field] !== undefined && body[field] !== (existing as any)[field]) {
        changedShared[field] = body[field];
      }
    }

    const hasSharedChanges = Object.keys(changedShared).length > 0;

    const updated = await prisma.$transaction(async (tx) => {
      const prog = await tx.cardProgram.update({
        where: { id },
        data: body,
      });

      // Cascade shared field changes to all tier designs' config
      if (hasSharedChanges) {
        for (const tier of existing.tiers) {
          if (!tier.design) continue;
          const currentConfig = (tier.design.config as Record<string, any>) ?? {};
          await tx.design.update({
            where: { id: tier.design.id },
            data: {
              config: { ...currentConfig, ...changedShared },
            },
          });
        }
      }

      return tx.cardProgram.findUnique({
        where: { id },
        include: {
          tiers: {
            orderBy: { order: 'asc' },
            include: { design: true },
          },
        },
      });
    });

    await logAudit(user.id, 'UPDATE', 'CardProgram', id, { changes: Object.keys(body) }, getIp(req));
    return json(updated);
  }

  if (req.method === 'DELETE') {
    const existing = await prisma.cardProgram.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) return notFound('Program');

    await prisma.cardProgram.delete({ where: { id } });

    await logAudit(user.id, 'DELETE', 'CardProgram', id, { name: existing.name }, getIp(req));
    return new Response(null, { status: 204 });
  }

  return methodNotAllowed(['GET', 'PATCH', 'DELETE']);
}

export default withErrorHandler(handler);
