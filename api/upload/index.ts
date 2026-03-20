import { requireAuth } from '../_lib/auth';
import { json, error, methodNotAllowed, withErrorHandler } from '../_lib/errors';
import { uploadBlob } from '../_lib/upload';

export default withErrorHandler(async function handler(req: Request) {
  if (req.method !== 'POST') return methodNotAllowed(['POST']);

  await requireAuth(req);

  const formData = await req.formData();
  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    return error('No file provided');
  }

  try {
    const url = await uploadBlob(file, `uploads/${file.name}`);
    return json({ url });
  } catch (e: any) {
    return error(e.message, 400);
  }
});
