import { prisma } from '../_lib/prisma';
import { requireAuth } from '../_lib/auth';
import { json, methodNotAllowed, withErrorHandler } from '../_lib/errors';
import { createDesignSchema, parseBody } from '../_lib/validate';
import { logAudit, getIp } from '../_lib/audit';

async function handler(req: Request): Promise<Response> {
  if (req.method === 'GET') return handleList(req);
  if (req.method === 'POST') return handleCreate(req);
  return methodNotAllowed(['GET', 'POST']);
}

async function handleList(req: Request): Promise<Response> {
  const user = await requireAuth(req);
  const url = new URL(req.url);
  const cursor = url.searchParams.get('cursor') || undefined;
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 1), 100);
  const search = url.searchParams.get('search') || undefined;
  const network = url.searchParams.get('network') || undefined;
  const programId = url.searchParams.get('programId') || undefined;

  const where: any = { userId: user.id };

  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }
  if (network) {
    where.config = { path: ['network'], equals: network };
  }
  if (programId) {
    where.programId = programId;
  }

  const designs = await prisma.design.findMany({
    where,
    include: { tier: true },
    orderBy: { updatedAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = designs.length > limit;
  const items = hasMore ? designs.slice(0, limit) : designs;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return json({ items, nextCursor, hasMore });
}

async function handleCreate(req: Request): Promise<Response> {
  const user = await requireAuth(req);
  const data = await parseBody(req, createDesignSchema);

  const design = await prisma.design.create({
    data: {
      ...data,
      userId: user.id,
    },
  });

  await logAudit(user.id, 'CREATE', 'Design', design.id, { name: design.name }, getIp(req));

  return json(design, 201);
}

export default withErrorHandler(handler);
