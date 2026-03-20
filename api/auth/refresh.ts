import { prisma } from '../_lib/prisma';
import {
  signAccessToken,
  verifyToken,
  getRefreshCookie,
} from '../_lib/auth';
import { json, methodNotAllowed, error, withErrorHandler } from '../_lib/errors';

export default withErrorHandler(async function handler(req: Request) {
  if (req.method !== 'POST') return methodNotAllowed(['POST']);

  const refreshToken = getRefreshCookie(req);

  if (!refreshToken) {
    return error(401, 'No refresh token provided');
  }

  const payload = verifyToken(refreshToken);

  if (!payload || payload.type !== 'refresh') {
    return error(401, 'Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
  });

  if (!user || user.disabled) {
    return error(401, 'User not found or disabled');
  }

  const token = signAccessToken({ id: user.id, email: user.email, role: user.role });

  return json({ token });
});
