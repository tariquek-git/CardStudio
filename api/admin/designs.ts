import { requireAdmin } from '../_lib/auth';
import { prisma } from '../_lib/prisma';
import { json, methodNotAllowed, withErrorHandler } from '../_lib/errors';

export default withErrorHandler(async function handler(req: Request) {
  if (req.method !== 'GET') return methodNotAllowed(['GET']);
  await requireAdmin(req);

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '24')));
  const search = url.searchParams.get('search') || '';
  const isTemplate = url.searchParams.get('isTemplate');

  const where: any = {};
  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }
  if (isTemplate === 'true') where.isTemplate = true;
  if (isTemplate === 'false') where.isTemplate = false;

  const [designs, total] = await Promise.all([
    prisma.design.findMany({
      where,
      select: {
        id: true,
        name: true,
        thumbnailUrl: true,
        complianceScore: true,
        isTemplate: true,
        isPublic: true,
        programId: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.design.count({ where }),
  ]);

  return json({ designs, total, page, totalPages: Math.ceil(total / limit) });
});
