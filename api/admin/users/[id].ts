import { requireAdmin } from '../../_lib/auth';
import { prisma } from '../../_lib/prisma';
import { json, notFound, methodNotAllowed, withErrorHandler } from '../../_lib/errors';
import { updateUserSchema, parseBody } from '../../_lib/validate';
import { logAudit, getIp } from '../../_lib/audit';

function extractId(req: Request): string {
  const segments = new URL(req.url).pathname.split('/').filter(Boolean);
  // /api/admin/users/[id]
  return segments[segments.length - 1];
}

export default withErrorHandler(async function handler(req: Request) {
  const admin = await requireAdmin(req);
  const id = extractId(req);

  if (req.method === 'GET') {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        disabled: true,
        orgId: true,
        onboarded: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { designs: true, programs: true } },
      },
    });
    if (!user) return notFound('User');
    return json({ user });
  }

  if (req.method === 'PATCH') {
    const body = await parseBody(req, updateUserSchema);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return notFound('User');

    const updated = await prisma.user.update({
      where: { id },
      data: body,
      select: { id: true, email: true, name: true, role: true, disabled: true },
    });

    await logAudit(admin.id, 'admin.user.update', 'user', id, body, getIp(req));
    return json({ user: updated });
  }

  if (req.method === 'DELETE') {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return notFound('User');

    await prisma.user.delete({ where: { id } });
    await logAudit(admin.id, 'admin.user.delete', 'user', id, { email: user.email }, getIp(req));
    return new Response(null, { status: 204 });
  }

  return methodNotAllowed(['GET', 'PATCH', 'DELETE']);
});
