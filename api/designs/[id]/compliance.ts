import { prisma } from '../../_lib/prisma';
import { requireAuth } from '../../_lib/auth';
import { json, notFound, methodNotAllowed, withErrorHandler } from '../../_lib/errors';

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
  if (req.method !== 'GET') return methodNotAllowed(['GET']);

  const user = await requireAuth(req);
  const id = extractDesignId(req);

  const design = await prisma.design.findUnique({ where: { id } });
  if (!design) return notFound('Design');

  if (design.userId !== user.id && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return notFound('Design');
  }

  return json({ designId: design.id, config: design.config });
}

export default withErrorHandler(handler);
