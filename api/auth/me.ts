import { prisma } from '../_lib/prisma';
import { requireAuth } from '../_lib/auth';
import { json, methodNotAllowed, notFound, withErrorHandler } from '../_lib/errors';

export default withErrorHandler(async function handler(req: Request) {
  if (req.method !== 'GET') return methodNotAllowed(['GET']);

  const auth = requireAuth(req);

  const user = await prisma.user.findUnique({
    where: { id: auth.id },
  });

  if (!user) {
    return notFound('User not found');
  }

  return json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      orgId: user.orgId,
      onboarded: user.onboarded,
      createdAt: user.createdAt,
    },
  });
});
