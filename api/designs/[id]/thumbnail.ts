import { prisma } from '../../_lib/prisma';
import { requireAuth } from '../../_lib/auth';
import { json, notFound, error, methodNotAllowed, withErrorHandler } from '../../_lib/errors';
import { uploadBlob } from '../../_lib/upload';
import { logAudit, getIp } from '../../_lib/audit';

function extractDesignId(req: Request): string {
  const segments = new URL(req.url).pathname.split('/').filter(Boolean);
  const designsIdx = segments.indexOf('designs');
  const id = segments[designsIdx + 1];
  if (!id) throw new Response(JSON.stringify({ error: 'Missing design id' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
  return id;
}

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'PUT') return methodNotAllowed(['PUT']);

  const user = await requireAuth(req);
  const id = extractDesignId(req);

  const design = await prisma.design.findUnique({ where: { id } });
  if (!design) return notFound('Design');

  if (design.userId !== user.id && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return notFound('Design');
  }

  const formData = await req.formData();
  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    return error('Missing file field', 400);
  }

  const url = await uploadBlob(file, `thumbnails/${id}`);

  await prisma.design.update({
    where: { id },
    data: { thumbnailUrl: url },
  });

  await logAudit(user.id, 'UPDATE_THUMBNAIL', 'Design', id, { url }, getIp(req));

  return json({ url });
}

export default withErrorHandler(handler);
