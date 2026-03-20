import { prisma } from '../_lib/prisma';
import { requireAuth } from '../_lib/auth';
import { json, methodNotAllowed, withErrorHandler } from '../_lib/errors';
import { createProgramSchema, parseBody } from '../_lib/validate';
import { logAudit, getIp } from '../_lib/audit';

const SHARED_FIELDS = ['issuerName', 'network', 'railId', 'issuingCountry', 'issuerType', 'currency'] as const;

async function handler(req: Request): Promise<Response> {
  const user = await requireAuth(req);

  if (req.method === 'GET') {
    const programs = await prisma.cardProgram.findMany({
      where: { userId: user.id },
      include: { tiers: { orderBy: { order: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    });
    return json(programs);
  }

  if (req.method === 'POST') {
    const body = await parseBody(req, createProgramSchema);
    const { fromDesignId, ...programData } = body;

    const program = await prisma.$transaction(async (tx) => {
      const created = await tx.cardProgram.create({
        data: {
          ...programData,
          userId: user.id,
        },
      });

      // Build shared config fields for the tier design
      const sharedConfig: Record<string, any> = {};
      for (const field of SHARED_FIELDS) {
        if (programData[field] !== undefined) {
          sharedConfig[field] = programData[field];
        }
      }

      let design;
      if (fromDesignId) {
        // Duplicate the source design and attach to this program
        const source = await tx.design.findUnique({ where: { id: fromDesignId } });
        if (!source) throw new Response(
          JSON.stringify({ error: 'Source design not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } },
        );
        const sourceConfig = (source.config as Record<string, any>) ?? {};
        design = await tx.design.create({
          data: {
            name: source.name,
            config: { ...sourceConfig, ...sharedConfig },
            thumbnailUrl: source.thumbnailUrl,
            userId: user.id,
            programId: created.id,
          },
        });
      } else {
        // Create a blank design for the first tier
        design = await tx.design.create({
          data: {
            name: `${created.name} - Default`,
            config: sharedConfig,
            userId: user.id,
            programId: created.id,
          },
        });
      }

      // Create the first tier
      await tx.programTier.create({
        data: {
          name: 'Default',
          tier: 'standard',
          order: 0,
          programId: created.id,
          designId: design.id,
        },
      });

      return tx.cardProgram.findUnique({
        where: { id: created.id },
        include: { tiers: { orderBy: { order: 'asc' }, include: { design: true } } },
      });
    });

    await logAudit(user.id, 'CREATE', 'CardProgram', program!.id, { name: program!.name }, getIp(req));
    return json(program, 201);
  }

  return methodNotAllowed(['GET', 'POST']);
}

export default withErrorHandler(handler);
