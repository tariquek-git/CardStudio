import { requireAdmin } from '../_lib/auth';
import { prisma } from '../_lib/prisma';
import { json, methodNotAllowed, withErrorHandler } from '../_lib/errors';

export default withErrorHandler(async function handler(req: Request) {
  if (req.method !== 'GET') return methodNotAllowed(['GET']);
  await requireAdmin(req);

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50')));
  const userId = url.searchParams.get('userId') || '';
  const action = url.searchParams.get('action') || '';
  const entityType = url.searchParams.get('entityType') || '';

  const where: any = {};
  if (userId) where.userId = userId;
  if (action) where.action = { contains: action };
  if (entityType) where.entityType = entityType;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return json({ logs, total, page, totalPages: Math.ceil(total / limit) });
});
