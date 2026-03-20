import { apiFetch } from './client';

export async function uploadFile(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch('/upload', {
    method: 'POST',
    body: formData,
  });
}
