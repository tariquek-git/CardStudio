import { apiFetch } from './client';

export interface ApiProgramTier {
  id: string;
  name: string;
  tier: string;
  material: string;
  chipStyle: string;
  order: number;
  designId: string;
  design?: { id: string; name: string; thumbnailUrl: string | null; config: any };
}

export interface ApiProgram {
  id: string;
  name: string;
  issuerName: string;
  network: string;
  railId: string;
  issuingCountry: string;
  issuerType: string;
  currency: string;
  brandColor: string;
  brandAccent: string;
  issuerLogoUrl: string | null;
  coBrandPartner: string;
  coBrandLogoUrl: string | null;
  tiers: ApiProgramTier[];
  createdAt: string;
  updatedAt: string;
}

export async function listPrograms(): Promise<{ programs: ApiProgram[] }> {
  return apiFetch('/programs');
}

export async function getProgram(id: string): Promise<ApiProgram> {
  return apiFetch(`/programs/${id}`);
}

export async function createProgram(data: {
  name: string;
  issuerName?: string;
  network?: string;
  fromDesignId?: string;
}): Promise<ApiProgram> {
  return apiFetch('/programs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProgram(id: string, updates: Record<string, any>): Promise<ApiProgram> {
  return apiFetch(`/programs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteProgram(id: string): Promise<void> {
  return apiFetch(`/programs/${id}`, { method: 'DELETE' });
}

export async function duplicateProgram(id: string): Promise<ApiProgram> {
  return apiFetch(`/programs/${id}/duplicate`, { method: 'POST' });
}

export async function addTier(programId: string, data: {
  name: string;
  tier: string;
  material?: string;
  chipStyle?: string;
}): Promise<ApiProgramTier> {
  return apiFetch(`/programs/${programId}/tiers`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function reorderTiers(programId: string, tierIds: string[]): Promise<ApiProgramTier[]> {
  return apiFetch(`/programs/${programId}/tiers`, {
    method: 'PATCH',
    body: JSON.stringify({ tierIds }),
  });
}

export async function updateTier(programId: string, tierId: string, updates: Record<string, any>): Promise<ApiProgramTier> {
  return apiFetch(`/programs/${programId}/tiers/${tierId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteTier(programId: string, tierId: string): Promise<void> {
  return apiFetch(`/programs/${programId}/tiers/${tierId}`, { method: 'DELETE' });
}
