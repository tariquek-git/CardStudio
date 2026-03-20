import { requireAdmin } from '../_lib/auth';
import { prisma } from '../_lib/prisma';
import { json, methodNotAllowed, withErrorHandler } from '../_lib/errors';

export default withErrorHandler(async function handler(req: Request) {
  if (req.method !== 'GET') return methodNotAllowed(['GET']);
  await requireAdmin(req);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalDesigns,
    totalPrograms,
    designsThisWeek,
    activeUsers7d,
    activeUsers30d,
    designs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.design.count(),
    prisma.cardProgram.count(),
    prisma.design.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { lastLoginAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { lastLoginAt: { gte: monthAgo } } }),
    prisma.design.findMany({ select: { config: true, complianceScore: true } }),
  ]);

  // Compute analytics from designs
  const networkCounts: Record<string, number> = {};
  const materialCounts: Record<string, number> = {};
  let complianceTotal = 0;
  let complianceCount = 0;

  for (const d of designs) {
    const config = d.config as any;
    if (config?.network) {
      networkCounts[config.network] = (networkCounts[config.network] || 0) + 1;
    }
    if (config?.material) {
      materialCounts[config.material] = (materialCounts[config.material] || 0) + 1;
    }
    if (d.complianceScore != null) {
      complianceTotal += d.complianceScore;
      complianceCount++;
    }
  }

  const topNetworks = Object.entries(networkCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const topMaterials = Object.entries(materialCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const avgCompliance = complianceCount > 0 ? Math.round(complianceTotal / complianceCount) : null;

  return json({
    totalUsers,
    totalDesigns,
    totalPrograms,
    designsThisWeek,
    activeUsers7d,
    activeUsers30d,
    avgCompliance,
    topNetworks,
    topMaterials,
  });
});
