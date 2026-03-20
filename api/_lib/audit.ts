import { prisma } from './prisma';

export async function logAudit(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, any>,
  ipAddress?: string | null,
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        metadata: metadata ?? undefined,
        ipAddress: ipAddress ?? undefined,
      },
    });
  } catch (e) {
    // Audit logging should never break the main request
    console.error('Failed to write audit log:', e);
  }
}

export function getIp(req: Request): string | null {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || null;
}
