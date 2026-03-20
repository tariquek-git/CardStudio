import { prisma } from '../_lib/prisma';
import {
  signAccessToken,
  signRefreshToken,
  hashPassword,
  setRefreshCookie,
} from '../_lib/auth';
import { json, methodNotAllowed, error, withErrorHandler } from '../_lib/errors';
import { registerSchema, parseBody } from '../_lib/validate';
import { logAudit, getIp } from '../_lib/audit';

export default withErrorHandler(async function handler(req: Request) {
  if (req.method !== 'POST') return methodNotAllowed(['POST']);

  const body = await parseBody(req, registerSchema);

  const existing = await prisma.user.findUnique({
    where: { email: body.email },
  });

  if (existing) {
    return error(409, 'A user with this email already exists');
  }

  const passwordHash = await hashPassword(body.password);

  const user = await prisma.user.create({
    data: {
      email: body.email,
      name: body.name,
      passwordHash,
    },
  });

  const token = signAccessToken({ id: user.id, email: user.email, role: user.role });
  const refreshToken = signRefreshToken({ id: user.id });

  await logAudit({
    userId: user.id,
    action: 'register',
    ip: getIp(req),
  });

  const res = json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    token,
  });

  setRefreshCookie(res, refreshToken);

  return res;
});
