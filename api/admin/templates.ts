import { requireAdmin } from '../_lib/auth';
import { prisma } from '../_lib/prisma';
import { json, error, notFound, methodNotAllowed, withErrorHandler } from '../_lib/errors';
import { logAudit, getIp } from '../_lib/audit';

export default withErrorHandler(async function handler(req: Request) {
  const admin = await requireAdmin(req);

  if (req.method === 'GET') {
    const templates = await prisma.design.findMany({
      where: { isTemplate: true },
      select: {
        id: true,
        name: true,
        thumbnailUrl: true,
        config: true,
        complianceScore: true,
        createdAt: true,
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return json({ templates });
  }

  if (req.method === 'POST') {
    const body = await req.json();
    const { designId, remove } = body;

    if (!designId) return error('designId required');

    const design = await prisma.design.findUnique({ where: { id: designId } });
    if (!design) return notFound('Design');

    const updated = await prisma.design.update({
      where: { id: designId },
      data: { isTemplate: !remove },
    });

    await logAudit(
      admin.id,
      remove ? 'admin.template.remove' : 'admin.template.promote',
      'design',
      designId,
      { name: design.name },
      getIp(req),
    );

    return json({ design: updated });
  }

  return methodNotAllowed(['GET', 'POST']);
});
