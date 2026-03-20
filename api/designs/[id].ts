import { prisma } from '../_lib/prisma';
import { requireAuth } from '../_lib/auth';
import { json, notFound, methodNotAllowed, error, withErrorHandler } from '../_lib/errors';
import { updateDesignSchema, parseBody } from '../_lib/validate';
import { logAudit, getIp } from '../_lib/audit';

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
  if (req.method === 'GET') return handleGet(req);
  if (req.method === 'PATCH') return handleUpdate(req);
  if (req.method === 'DELETE') return handleDelete(req);
  return methodNotAllowed(['GET', 'PATCH', 'DELETE']);
}

async function handleGet(req: Request): Promise<Response> {
  const user = await requireAuth(req);
  const id = extractDesignId(req);

  const design = await prisma.design.findUnique({ where: { id } });
  if (!design) return notFound('Design');

  if (design.userId !== user.id && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return notFound('Design');
  }

  return json(design);
}

async function handleUpdate(req: Request): Promise<Response> {
  const user = await requireAuth(req);
  const id = extractDesignId(req);

  const existing = await prisma.design.findUnique({ where: { id } });
  if (!existing) return notFound('Design');

  if (existing.userId !== user.id && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return notFound('Design');
  }

  const data = await parseBody(req, updateDesignSchema);
  const design = await prisma.design.update({ where: { id }, data });

  await logAudit(user.id, 'UPDATE', 'Design', id, data, getIp(req));

  return json(design);
}

async function handleDelete(req: Request): Promise<Response> {
  const user = await requireAuth(req);
  const id = extractDesignId(req);

  const existing = await prisma.design.findUnique({ where: { id } });
  if (!existing) return notFound('Design');

  if (existing.userId !== user.id && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return notFound('Design');
  }

  await prisma.design.delete({ where: { id } });

  await logAudit(user.id, 'DELETE', 'Design', id, { name: existing.name }, getIp(req));

  return new Response(null, { status: 204 });
}

export default withErrorHandler(handler);
