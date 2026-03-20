import { prisma } from '../_lib/prisma';
import {
  signAccessToken,
  signRefreshToken,
  comparePassword,
  setRefreshCookie,
} from '../_lib/auth';
import { json, methodNotAllowed, error, withErrorHandler } from '../_lib/errors';
import { loginSchema, parseBody } from '../_lib/validate';
import { logAudit, getIp } from '../_lib/audit';

export default withErrorHandler(async function handler(req: Request) {
  if (req.method !== 'POST') return methodNotAllowed(['POST']);

  const body = await parseBody(req, loginSchema);

  const user = await prisma.user.findUnique({
    where: { email: body.email },
  });

  if (!user) {
    return error(401, 'Invalid email or password');
  }

  if (user.disabled) {
    return error(403, 'This account has been disabled');
  }

  const valid = await comparePassword(body.password, user.passwordHash);

  if (!valid) {
    return error(401, 'Invalid email or password');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = signAccessToken({ id: user.id, email: user.email, role: user.role });
  const refreshToken = signRefreshToken({ id: user.id });

  await logAudit({
    userId: user.id,
    action: 'login',
    ip: getIp(req),
  });

  const res = json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    token,
  });

  setRefreshCookie(res, refreshToken);

  return res;
});
