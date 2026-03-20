import { SignJWT, jwtVerify } from 'jose';
import { hash, compare } from 'bcryptjs';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me');
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '30d';

export interface AuthUser {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
}

export async function signAccessToken(user: AuthUser): Promise<string> {
  return new SignJWT({ sub: user.id, email: user.email, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(JWT_SECRET);
}

export async function signRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_TTL)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<any> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return payload;
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function comparePassword(password: string, hashed: string): Promise<boolean> {
  return compare(password, hashed);
}

/** Extract and verify Bearer token from request. Returns AuthUser or null. */
export async function authenticate(req: Request): Promise<AuthUser | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const payload = await verifyToken(token);
    if (!payload.sub || !payload.email || !payload.role) return null;
    return { id: payload.sub, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

/** Require authentication. Returns AuthUser or throws a Response. */
export async function requireAuth(req: Request): Promise<AuthUser> {
  const user = await authenticate(req);
  if (!user) throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
  return user;
}

/** Require admin role. Returns AuthUser or throws a Response. */
export async function requireAdmin(req: Request): Promise<AuthUser> {
  const user = await requireAuth(req);
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    throw new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return user;
}

/** Set refresh token as httpOnly cookie */
export function setRefreshCookie(token: string): string {
  const maxAge = 30 * 24 * 60 * 60; // 30 days
  return `refresh_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=${maxAge}`;
}

/** Extract refresh token from cookie header */
export function getRefreshCookie(req: Request): string | null {
  const cookies = req.headers.get('Cookie') || '';
  const match = cookies.match(/refresh_token=([^;]+)/);
  return match ? match[1] : null;
}
