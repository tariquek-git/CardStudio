import { requireAdmin } from '../_lib/auth';
import { prisma } from '../_lib/prisma';
import { json, methodNotAllowed, withErrorHandler } from '../_lib/errors';

export default withErrorHandler(async function handler(req: Request) {
  if (req.method !== 'GET') return methodNotAllowed(['GET']);
  await requireAdmin(req);

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
  const search = url.searchParams.get('search') || '';
  const role = url.searchParams.get('role') || '';

  const where: any = {};
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (role) {
    where.role = role;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        disabled: true,
        lastLoginAt: true,
        createdAt: true,
        _count: { select: { designs: true, programs: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return json({
    users: users.map(u => ({
      ...u,
      designCount: u._count.designs,
      programCount: u._count.programs,
      _count: undefined,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});
