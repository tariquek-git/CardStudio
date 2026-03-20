import { requireAuth } from '../_lib/auth';
import { prisma } from '../_lib/prisma';
import { json, error, methodNotAllowed, withErrorHandler } from '../_lib/errors';
import { uploadBase64 } from '../_lib/upload';
import { logAudit, getIp } from '../_lib/audit';

export default withErrorHandler(async function handler(req: Request) {
  if (req.method !== 'POST') return methodNotAllowed(['POST']);

  const user = await requireAuth(req);
  const body = await req.json();

  const { designs = [], programs = [], activeConfig } = body;

  if (!Array.isArray(designs) || !Array.isArray(programs)) {
    return error('Invalid migration payload');
  }

  const designIdMap: Record<string, string> = {};
  const programIdMap: Record<string, string> = {};

  // Migrate designs
  for (const d of designs) {
    if (!d.id || !d.name || !d.config) continue;

    let thumbnailUrl: string | null = null;
    if (d.thumbnail && typeof d.thumbnail === 'string' && d.thumbnail.startsWith('data:')) {
      try {
        thumbnailUrl = await uploadBase64(d.thumbnail, `thumbnails/${d.id}.webp`);
      } catch {
        // Skip thumbnail on upload failure
      }
    }

    // Upload issuerLogo if it's a data URL
    const config = { ...d.config };
    if (config.issuerLogo && typeof config.issuerLogo === 'string' && config.issuerLogo.startsWith('data:')) {
      try {
        config.issuerLogo = await uploadBase64(config.issuerLogo, `logos/issuer-${d.id}.png`);
      } catch {
        // Keep data URL on failure
      }
    }
    if (config.coBrandLogo && typeof config.coBrandLogo === 'string' && config.coBrandLogo.startsWith('data:')) {
      try {
        config.coBrandLogo = await uploadBase64(config.coBrandLogo, `logos/cobrand-${d.id}.png`);
      } catch {
        // Keep data URL on failure
      }
    }

    const created = await prisma.design.create({
      data: {
        name: d.name,
        config,
        thumbnailUrl,
        userId: user.id,
        isTemplate: false,
        isPublic: false,
        createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
        updatedAt: d.updatedAt ? new Date(d.updatedAt) : new Date(),
      },
    });

    designIdMap[d.id] = created.id;
  }

  // Migrate programs
  for (const p of programs) {
    if (!p.id || !p.name) continue;

    let issuerLogoUrl: string | null = null;
    if (p.issuerLogo && typeof p.issuerLogo === 'string' && p.issuerLogo.startsWith('data:')) {
      try {
        issuerLogoUrl = await uploadBase64(p.issuerLogo, `logos/program-${p.id}.png`);
      } catch { /* skip */ }
    }

    let coBrandLogoUrl: string | null = null;
    if (p.coBrandLogo && typeof p.coBrandLogo === 'string' && p.coBrandLogo.startsWith('data:')) {
      try {
        coBrandLogoUrl = await uploadBase64(p.coBrandLogo, `logos/program-cobrand-${p.id}.png`);
      } catch { /* skip */ }
    }

    const created = await prisma.cardProgram.create({
      data: {
        name: p.name,
        issuerName: p.issuerName || '',
        network: p.network || 'visa',
        railId: p.railId || 'visa',
        issuingCountry: p.issuingCountry || 'US',
        issuerType: p.issuerType || 'bank',
        currency: p.currency || 'USD',
        brandColor: p.brandColor || '#0EA5E9',
        brandAccent: p.brandAccent || '#6366F1',
        issuerLogoUrl,
        coBrandPartner: p.coBrandPartner || '',
        coBrandLogoUrl,
        userId: user.id,
        createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
        updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      },
    });

    programIdMap[p.id] = created.id;

    // Migrate tiers
    if (Array.isArray(p.tiers)) {
      for (const t of p.tiers) {
        const newDesignId = designIdMap[t.cardConfigId];
        if (!newDesignId) continue;

        // Link the design to the program
        await prisma.design.update({
          where: { id: newDesignId },
          data: { programId: created.id },
        });

        await prisma.programTier.create({
          data: {
            name: t.name || 'Untitled',
            tier: t.tier || 'standard',
            material: t.material || 'matte',
            chipStyle: t.chipStyle || 'gold',
            order: t.order || 0,
            programId: created.id,
            designId: newDesignId,
          },
        });
      }
    }
  }

  await logAudit(user.id, 'migrate.import', 'user', user.id, {
    designs: Object.keys(designIdMap).length,
    programs: Object.keys(programIdMap).length,
  }, getIp(req));

  return json({
    designIdMap,
    programIdMap,
    migrated: {
      designs: Object.keys(designIdMap).length,
      programs: Object.keys(programIdMap).length,
    },
  });
});
