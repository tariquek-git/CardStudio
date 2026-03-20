import { apiFetch } from './client';
import type { CardConfig } from '../types';

export interface ApiDesign {
  id: string;
  name: string;
  config: CardConfig;
  thumbnailUrl: string | null;
  userId: string;
  programId: string | null;
  isTemplate: boolean;
  isPublic: boolean;
  complianceScore: number | null;
  createdAt: string;
  updatedAt: string;
}

export async function listDesigns(params?: {
  cursor?: string;
  limit?: number;
  search?: string;
  network?: string;
  programId?: string;
}): Promise<{ designs: ApiDesign[]; nextCursor: string | null }> {
  const query = new URLSearchParams();
  if (params?.cursor) query.set('cursor', params.cursor);
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.search) query.set('search', params.search);
  if (params?.network) query.set('network', params.network);
  if (params?.programId) query.set('programId', params.programId);
  const qs = query.toString();
  return apiFetch(`/designs${qs ? `?${qs}` : ''}`);
}

export async function getDesign(id: string): Promise<ApiDesign> {
  return apiFetch(`/designs/${id}`);
}

export async function createDesign(name: string, config: CardConfig, programId?: string): Promise<ApiDesign> {
  return apiFetch('/designs', {
    method: 'POST',
    body: JSON.stringify({ name, config, programId }),
  });
}

export async function updateDesign(id: string, updates: {
  name?: string;
  config?: Partial<CardConfig>;
  thumbnailUrl?: string | null;
  complianceScore?: number;
}): Promise<ApiDesign> {
  return apiFetch(`/designs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteDesign(id: string): Promise<void> {
  return apiFetch(`/designs/${id}`, { method: 'DELETE' });
}

export async function duplicateDesign(id: string): Promise<ApiDesign> {
  return apiFetch(`/designs/${id}/duplicate`, { method: 'POST' });
}

export async function uploadThumbnail(id: string, file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch(`/designs/${id}/thumbnail`, {
    method: 'PUT',
    body: formData,
  });
}
