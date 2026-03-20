import { useAuth } from '../auth/AuthProvider';
import * as designsApi from '../api/designs';
import * as programsApi from '../api/programs';
import type { SavedDesign, CardProgram, CardConfig } from '../types';

export interface DataProvider {
  mode: 'local' | 'api';
  getDesigns(): Promise<SavedDesign[]>;
  saveDesign(name: string, config: CardConfig, thumbnail?: string): Promise<SavedDesign>;
  updateDesign(id: string, updates: Partial<SavedDesign>): Promise<void>;
  deleteDesign(id: string): Promise<void>;
  duplicateDesign(id: string): Promise<SavedDesign>;

  getPrograms(): Promise<CardProgram[]>;
  saveProgram(program: CardProgram): Promise<CardProgram>;
  updateProgram(id: string, updates: Partial<CardProgram>): Promise<void>;
  deleteProgram(id: string): Promise<void>;
  duplicateProgram(id: string): Promise<CardProgram>;
}

/** Convert API design to frontend SavedDesign */
function toSavedDesign(d: designsApi.ApiDesign): SavedDesign {
  return {
    id: d.id,
    name: d.name,
    config: d.config,
    thumbnail: d.thumbnailUrl || '',
    createdAt: new Date(d.createdAt).getTime(),
    updatedAt: new Date(d.updatedAt).getTime(),
    programId: d.programId || undefined,
  };
}

/** Convert API program to frontend CardProgram */
function toCardProgram(p: programsApi.ApiProgram): CardProgram {
  return {
    id: p.id,
    name: p.name,
    issuerName: p.issuerName,
    network: p.network as any,
    railId: p.railId,
    issuingCountry: p.issuingCountry,
    issuerType: p.issuerType as any,
    currency: p.currency,
    brandColor: p.brandColor,
    brandAccent: p.brandAccent,
    issuerLogo: p.issuerLogoUrl,
    coBrandPartner: p.coBrandPartner,
    coBrandLogo: p.coBrandLogoUrl,
    tiers: p.tiers.map(t => ({
      id: t.id,
      name: t.name,
      tier: t.tier,
      cardConfigId: t.designId,
      material: t.material as any,
      chipStyle: t.chipStyle as any,
      order: t.order,
    })),
    createdAt: new Date(p.createdAt).getTime(),
    updatedAt: new Date(p.updatedAt).getTime(),
  };
}

class ApiDataProvider implements DataProvider {
  mode = 'api' as const;

  async getDesigns(): Promise<SavedDesign[]> {
    const { designs } = await designsApi.listDesigns({ limit: 100 });
    return designs.map(toSavedDesign);
  }

  async saveDesign(name: string, config: CardConfig, _thumbnail?: string): Promise<SavedDesign> {
    const d = await designsApi.createDesign(name, config);
    return toSavedDesign(d);
  }

  async updateDesign(id: string, updates: Partial<SavedDesign>): Promise<void> {
    await designsApi.updateDesign(id, {
      name: updates.name,
      config: updates.config as any,
    });
  }

  async deleteDesign(id: string): Promise<void> {
    await designsApi.deleteDesign(id);
  }

  async duplicateDesign(id: string): Promise<SavedDesign> {
    const d = await designsApi.duplicateDesign(id);
    return toSavedDesign(d);
  }

  async getPrograms(): Promise<CardProgram[]> {
    const { programs } = await programsApi.listPrograms();
    return programs.map(toCardProgram);
  }

  async saveProgram(program: CardProgram): Promise<CardProgram> {
    const p = await programsApi.createProgram({
      name: program.name,
      issuerName: program.issuerName,
      network: program.network,
    });
    return toCardProgram(p);
  }

  async updateProgram(id: string, updates: Partial<CardProgram>): Promise<void> {
    await programsApi.updateProgram(id, updates);
  }

  async deleteProgram(id: string): Promise<void> {
    await programsApi.deleteProgram(id);
  }

  async duplicateProgram(id: string): Promise<CardProgram> {
    const p = await programsApi.duplicateProgram(id);
    return toCardProgram(p);
  }
}

const apiProvider = new ApiDataProvider();

export function useDataProvider(): DataProvider | null {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return null;
  return apiProvider;
}
