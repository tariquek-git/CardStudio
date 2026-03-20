import { put } from '@vercel/blob';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

export async function uploadBlob(
  file: File | Blob,
  filename: string,
): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large (max 5MB)');
  }

  if (file instanceof File && !ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}`);
  }

  const blob = await put(filename, file, {
    access: 'public',
    addRandomSuffix: true,
  });

  return blob.url;
}

/** Upload a base64 data URL to Vercel Blob and return the URL */
export async function uploadBase64(
  dataUrl: string,
  filename: string,
): Promise<string> {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid data URL');

  const mimeType = match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, 'base64');
  const blob = new Blob([buffer], { type: mimeType });

  return uploadBlob(blob, filename);
}
