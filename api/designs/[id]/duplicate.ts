import { prisma } from '../../_lib/prisma';
import { requireAuth } from '../../_lib/auth';
import { json, notFound, methodNotAllowed, withErrorHandler } from '../../_lib/errors';
import { logAudit, getIp } from '../../_lib/audit';

function extractDesignId(req: Request): string {
  const segments = new URL(req.url).pathname.split('/').filter(Boolean);
  const designsIdx = segments.indexOf('designs');
  const id = segments[designsIdx + 1];
  if (!id) throw new Response(JSON.stringify({ error: 'Missing design id' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
  return id;
}

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return methodNotAllowed(['POST']);

  const user = await requireAuth(req);
  const id = extractDesignId(req);

  const original = await prisma.design.findUnique({ where: { id } });
  if (!original) return notFound('Design');

  if (original.userId !== user.id && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return notFound('Design');
  }

  const copy = await prisma.design.create({
    data: {
      name: `Copy of ${original.name}`,
      config: original.config as any,
      thumbnailUrl: original.thumbnailUrl,
      userId: user.id,
      orgId: original.orgId,
      programId: original.programId,
      isTemplate: false,
      isPublic: false,
      complianceScore: original.complianceScore,
    },
  });

  await logAudit(user.id, 'DUPLICATE', 'Design', copy.id, { sourceId: id }, getIp(req));

  return json(copy, 201);
}

export default withErrorHandler(handler);
