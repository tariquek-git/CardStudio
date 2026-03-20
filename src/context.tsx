import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, type ReactNode } from 'react';
import { type CardConfig, type SavedDesign, type CardProgram, type ProgramTier, defaultConfig, PROGRAM_SHARED_FIELDS } from './types';
import { networkTierConfig } from './data';
import { track } from './analytics';

const STORAGE_KEY = 'cardstudio-config';
const DESIGNS_KEY = 'cardstudio-designs';
const ACTIVE_DESIGN_KEY = 'cardstudio-active-design';
const PROGRAMS_KEY = 'cardstudio-programs';
const ACTIVE_PROGRAM_KEY = 'cardstudio-active-program';
const MAX_HISTORY = 50;

function migrateTier(config: Partial<CardConfig>): Partial<CardConfig> {
  if (!config.tier || !config.network) return config;
  const tiers = networkTierConfig[config.network];
  if (!tiers) return { ...config, tier: '' };
  if (tiers.find(t => t.id === config.tier)) return config;
  const match = tiers.find(t =>
    t.label.toLowerCase() === config.tier!.toLowerCase() ||
    t.fullLabel.toLowerCase() === config.tier!.toLowerCase()
  );
  return { ...config, tier: match ? match.id : tiers[0].id };
}

// Migrate old configs without railId to use the new payment rails system
function migrateRailId(config: Partial<CardConfig>): Partial<CardConfig> {
  if (config.railId) return config;
  // Old configs have network but no railId — railId matches the legacy network id
  return { ...config, railId: config.network || 'visa', railFields: config.railFields || {} };
}

interface HistoryState {
  config: CardConfig;
  past: CardConfig[];
  future: CardConfig[];
}

interface CardConfigContextType {
  config: CardConfig;
  updateConfig: (updates: Partial<CardConfig>) => void;
  resetConfig: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  // Design gallery
  designs: SavedDesign[];
  activeDesignId: string | null;
  saveDesign: (name?: string) => SavedDesign;
  loadDesign: (id: string) => void;
  deleteDesign: (id: string) => void;
  duplicateDesign: (id: string) => void;
  renameDesign: (id: string, name: string) => void;
  updateDesignThumbnail: (id: string, thumbnail: string) => void;
  // Storage
  storageWarning: string | null;
  clearStorageWarning: () => void;
  // Card Programs
  programs: CardProgram[];
  activeProgramId: string | null;
  activeProgram: CardProgram | null;
  lockedFields: Set<string>;
  createProgram: (name: string, fromDesignId?: string) => CardProgram;
  loadProgram: (id: string) => void;
  deleteProgram: (id: string) => void;
  duplicateProgram: (id: string) => void;
  renameProgram: (id: string, name: string) => void;
  updateProgram: (id: string, updates: Partial<CardProgram>) => void;
  addTier: (programId: string, tierName: string, networkTier: string, material?: string, chipStyle?: string) => ProgramTier | null;
  removeTier: (programId: string, tierId: string) => void;
  reorderTiers: (programId: string, tierIds: string[]) => void;
  exitProgram: () => void;
  editTierDesign: (programId: string, tierId: string) => void;
}

const CardConfigContext = createContext<CardConfigContextType | null>(null);

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function loadInitialConfig(): CardConfig {
  try {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('config');
    if (encoded) {
      const decoded = JSON.parse(atob(encoded));
      if (isPlainObject(decoded)) {
        return { ...defaultConfig, ...migrateRailId(migrateTier({ ...defaultConfig, ...decoded })) };
      }
    }
  } catch { /* ignore */ }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (isPlainObject(parsed)) {
        return { ...defaultConfig, ...migrateRailId(migrateTier({ ...defaultConfig, ...parsed })) };
      }
    }
  } catch { /* ignore */ }
  return defaultConfig;
}

function loadDesigns(): SavedDesign[] {
  try {
    const stored = localStorage.getItem(DESIGNS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

function loadActiveDesignId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_DESIGN_KEY);
  } catch { /* ignore */ }
  return null;
}

function persistDesigns(designs: SavedDesign[], onQuotaError?: (msg: string) => void) {
  try {
    localStorage.setItem(DESIGNS_KEY, JSON.stringify(designs));
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      onQuotaError?.('Storage full — design not saved. Delete unused designs to free space.');
    }
  }
}

function persistActiveDesignId(id: string | null) {
  try {
    if (id) localStorage.setItem(ACTIVE_DESIGN_KEY, id);
    else localStorage.removeItem(ACTIVE_DESIGN_KEY);
  } catch { /* ignore */ }
}

function loadPrograms(): CardProgram[] {
  try {
    const stored = localStorage.getItem(PROGRAMS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

function persistPrograms(programs: CardProgram[], onQuotaError?: (msg: string) => void) {
  try {
    localStorage.setItem(PROGRAMS_KEY, JSON.stringify(programs));
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      onQuotaError?.('Storage full — program not saved. Delete unused designs to free space.');
    }
  }
}

function loadActiveProgramId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_PROGRAM_KEY);
  } catch { /* ignore */ }
  return null;
}

function persistActiveProgramId(id: string | null) {
  try {
    if (id) localStorage.setItem(ACTIVE_PROGRAM_KEY, id);
    else localStorage.removeItem(ACTIVE_PROGRAM_KEY);
  } catch { /* ignore */ }
}

export function CardConfigProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HistoryState>(() => ({
    config: loadInitialConfig(),
    past: [],
    future: [],
  }));

  const [designs, setDesigns] = useState<SavedDesign[]>(loadDesigns);
  const [activeDesignId, setActiveDesignId] = useState<string | null>(loadActiveDesignId);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const clearStorageWarning = useCallback(() => setStorageWarning(null), []);
  const [programs, setPrograms] = useState<CardProgram[]>(loadPrograms);
  const [activeProgramId, setActiveProgramId] = useState<string | null>(loadActiveProgramId);

  const configRef = useRef(state.config);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Persist working config to localStorage
  useEffect(() => {
    if (configRef.current !== state.config) {
      configRef.current = state.config;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.config));
      } catch (err) {
        if (err instanceof DOMException && err.name === 'QuotaExceededError') {
          queueMicrotask(() => setStorageWarning('Storage full — changes may not be saved. Delete unused designs to free space.'));
        }
      }

      // Auto-save active design (debounced)
      if (activeDesignId) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          setDesigns(prev => {
            const updated = prev.map(d =>
              d.id === activeDesignId
                ? { ...d, config: configRef.current, updatedAt: Date.now() }
                : d
            );
            persistDesigns(updated, setStorageWarning);
            return updated;
          });
        }, 500);
      }
    }
  }, [state.config, activeDesignId]);

  const updateConfig = useCallback((updates: Partial<CardConfig>) => {
    setState(prev => ({
      config: { ...prev.config, ...updates },
      past: [...prev.past.slice(-(MAX_HISTORY - 1)), prev.config],
      future: [],
    }));
    // Track field-level changes (debounced per field in analytics module)
    for (const field of Object.keys(updates)) {
      track({ type: 'config_change', field });
    }
    if ('darkMode' in updates) {
      track({ type: 'theme_toggle', dark: !!updates.darkMode });
    }
  }, []);

  const undo = useCallback(() => {
    setState(prev => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      return {
        config: previous,
        past: prev.past.slice(0, -1),
        future: [...prev.future, prev.config],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState(prev => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[prev.future.length - 1];
      return {
        config: next,
        past: [...prev.past, prev.config],
        future: prev.future.slice(0, -1),
      };
    });
  }, []);

  const resetConfig = useCallback(() => {
    setState(prev => ({
      config: defaultConfig,
      past: [...prev.past.slice(-(MAX_HISTORY - 1)), prev.config],
      future: [],
    }));
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  // ─── Design Gallery Methods ────────────────────────────────

  const saveDesign = useCallback((name?: string) => {
    const now = Date.now();
    const autoName = name || `${state.config.issuerName} ${state.config.tier}`.trim() || 'Untitled';
    const design: SavedDesign = {
      id: crypto.randomUUID(),
      name: autoName,
      config: { ...state.config },
      thumbnail: '', // will be set by thumbnail generator
      createdAt: now,
      updatedAt: now,
    };
    setDesigns(prev => {
      const updated = [design, ...prev];
      persistDesigns(updated, setStorageWarning);
      return updated;
    });
    setActiveDesignId(design.id);
    persistActiveDesignId(design.id);
    track({ type: 'design_create', designId: design.id, name: design.name });
    return design;
  }, [state.config]);

  const loadDesign = useCallback((id: string) => {
    const design = designs.find(d => d.id === id);
    if (!design) return;
    setState(prev => ({
      config: { ...defaultConfig, ...migrateRailId(design.config) },
      past: [...prev.past.slice(-(MAX_HISTORY - 1)), prev.config],
      future: [],
    }));
    setActiveDesignId(id);
    persistActiveDesignId(id);
    track({ type: 'design_load', designId: id });
  }, [designs]);

  const deleteDesign = useCallback((id: string) => {
    setDesigns(prev => {
      const updated = prev.filter(d => d.id !== id);
      persistDesigns(updated, setStorageWarning);
      return updated;
    });
    if (activeDesignId === id) {
      setActiveDesignId(null);
      persistActiveDesignId(null);
    }
    track({ type: 'design_delete', designId: id });
  }, [activeDesignId]);

  const duplicateDesign = useCallback((id: string) => {
    const design = designs.find(d => d.id === id);
    if (!design) return;
    const now = Date.now();
    const copy: SavedDesign = {
      ...design,
      id: crypto.randomUUID(),
      name: `${design.name} (copy)`,
      createdAt: now,
      updatedAt: now,
    };
    setDesigns(prev => {
      const updated = [copy, ...prev];
      persistDesigns(updated, setStorageWarning);
      return updated;
    });
    track({ type: 'design_duplicate', designId: id });
  }, [designs]);

  const renameDesign = useCallback((id: string, name: string) => {
    setDesigns(prev => {
      const updated = prev.map(d =>
        d.id === id ? { ...d, name, updatedAt: Date.now() } : d
      );
      persistDesigns(updated, setStorageWarning);
      return updated;
    });
  }, []);

  const updateDesignThumbnail = useCallback((id: string, thumbnail: string) => {
    setDesigns(prev => {
      const updated = prev.map(d =>
        d.id === id ? { ...d, thumbnail } : d
      );
      persistDesigns(updated, setStorageWarning);
      return updated;
    });
  }, []);

  // ─── Card Program Methods ─────────────────────────────────

  const activeProgram = useMemo(() =>
    activeProgramId ? programs.find(p => p.id === activeProgramId) ?? null : null
  , [activeProgramId, programs]);

  const lockedFields = useMemo(() =>
    activeProgram ? new Set<string>(PROGRAM_SHARED_FIELDS as string[]) : new Set<string>()
  , [activeProgram]);

  /** Extract shared fields from a CardConfig */
  const extractSharedFields = useCallback((cfg: CardConfig) => ({
    issuerName: cfg.issuerName,
    network: cfg.network,
    railId: cfg.railId,
    issuingCountry: cfg.issuingCountry,
    issuerType: cfg.issuerType,
    currency: cfg.currency,
    issuerLogo: cfg.issuerLogo,
    coBrandPartner: cfg.coBrandPartner,
    coBrandLogo: cfg.coBrandLogo,
  }), []);

  /** Cascade shared fields from program to all tier designs (bypasses undo) */
  const cascadeSharedFields = useCallback((program: CardProgram) => {
    const shared: Partial<CardConfig> = {
      issuerName: program.issuerName,
      network: program.network,
      railId: program.railId,
      issuingCountry: program.issuingCountry,
      issuerType: program.issuerType,
      currency: program.currency,
      issuerLogo: program.issuerLogo,
      coBrandPartner: program.coBrandPartner,
      coBrandLogo: program.coBrandLogo,
    };
    setDesigns(prev => {
      const tierConfigIds = new Set(program.tiers.map(t => t.cardConfigId));
      const updated = prev.map(d =>
        tierConfigIds.has(d.id)
          ? { ...d, config: { ...d.config, ...shared }, updatedAt: Date.now() }
          : d
      );
      persistDesigns(updated, setStorageWarning);
      return updated;
    });
  }, []);

  const createProgram = useCallback((name: string, fromDesignId?: string) => {
    const sourceConfig = fromDesignId
      ? designs.find(d => d.id === fromDesignId)?.config ?? state.config
      : state.config;
    const shared = extractSharedFields(sourceConfig);
    const now = Date.now();

    // Create the first tier's design
    const tierDesign: SavedDesign = {
      id: crypto.randomUUID(),
      name: `${name} — ${sourceConfig.tier || 'Default'}`,
      config: { ...sourceConfig },
      thumbnail: '',
      createdAt: now,
      updatedAt: now,
    };

    const tier: ProgramTier = {
      id: crypto.randomUUID(),
      name: sourceConfig.tier || 'Default',
      tier: sourceConfig.tier,
      cardConfigId: tierDesign.id,
      material: sourceConfig.material,
      chipStyle: sourceConfig.chipStyle,
      order: 0,
    };

    const program: CardProgram = {
      id: crypto.randomUUID(),
      name,
      ...shared,
      brandColor: sourceConfig.solidColor || '#0EA5E9',
      brandAccent: sourceConfig.gradientConfig?.stops?.[1]?.color || '#6366F1',
      tiers: [tier],
      createdAt: now,
      updatedAt: now,
    };

    // Link design to program
    tierDesign.programId = program.id;

    setDesigns(prev => {
      const updated = [tierDesign, ...prev];
      persistDesigns(updated, setStorageWarning);
      return updated;
    });
    setPrograms(prev => {
      const updated = [program, ...prev];
      persistPrograms(updated, setStorageWarning);
      return updated;
    });
    setActiveProgramId(program.id);
    persistActiveProgramId(program.id);
    track({ type: 'program_create' as never, programId: program.id, name });
    return program;
  }, [designs, state.config, extractSharedFields]);

  const loadProgram = useCallback((id: string) => {
    setActiveProgramId(id);
    persistActiveProgramId(id);
  }, []);

  const exitProgram = useCallback(() => {
    setActiveProgramId(null);
    persistActiveProgramId(null);
  }, []);

  const deleteProgram = useCallback((id: string) => {
    const program = programs.find(p => p.id === id);
    if (!program) return;
    // Remove all tier designs
    const tierConfigIds = new Set(program.tiers.map(t => t.cardConfigId));
    setDesigns(prev => {
      const updated = prev.filter(d => !tierConfigIds.has(d.id));
      persistDesigns(updated, setStorageWarning);
      return updated;
    });
    setPrograms(prev => {
      const updated = prev.filter(p => p.id !== id);
      persistPrograms(updated, setStorageWarning);
      return updated;
    });
    if (activeProgramId === id) {
      setActiveProgramId(null);
      persistActiveProgramId(null);
    }
    track({ type: 'program_delete' as never, programId: id });
  }, [programs, activeProgramId]);

  const duplicateProgram = useCallback((id: string) => {
    const program = programs.find(p => p.id === id);
    if (!program) return;
    const now = Date.now();
    const newProgramId = crypto.randomUUID();

    // Deep-copy all tier designs
    const tierMap = new Map<string, string>(); // old configId → new configId
    const newDesigns: SavedDesign[] = program.tiers.map(tier => {
      const origDesign = designs.find(d => d.id === tier.cardConfigId);
      const newId = crypto.randomUUID();
      tierMap.set(tier.cardConfigId, newId);
      return {
        id: newId,
        name: origDesign ? `${origDesign.name} (copy)` : `${tier.name} (copy)`,
        config: origDesign ? { ...origDesign.config } : { ...defaultConfig },
        thumbnail: origDesign?.thumbnail ?? '',
        createdAt: now,
        updatedAt: now,
        programId: newProgramId,
      };
    });

    const newProgram: CardProgram = {
      ...program,
      id: newProgramId,
      name: `${program.name} (copy)`,
      tiers: program.tiers.map(t => ({
        ...t,
        id: crypto.randomUUID(),
        cardConfigId: tierMap.get(t.cardConfigId) ?? t.cardConfigId,
      })),
      createdAt: now,
      updatedAt: now,
    };

    setDesigns(prev => {
      const updated = [...newDesigns, ...prev];
      persistDesigns(updated, setStorageWarning);
      return updated;
    });
    setPrograms(prev => {
      const updated = [newProgram, ...prev];
      persistPrograms(updated, setStorageWarning);
      return updated;
    });
    track({ type: 'program_duplicate' as never, programId: id });
  }, [programs, designs]);

  const renameProgram = useCallback((id: string, name: string) => {
    setPrograms(prev => {
      const updated = prev.map(p =>
        p.id === id ? { ...p, name, updatedAt: Date.now() } : p
      );
      persistPrograms(updated, setStorageWarning);
      return updated;
    });
  }, []);

  const updateProgram = useCallback((id: string, updates: Partial<CardProgram>) => {
    setPrograms(prev => {
      const updated = prev.map(p => {
        if (p.id !== id) return p;
        const merged = { ...p, ...updates, updatedAt: Date.now() };
        // Cascade shared fields to tier designs
        const hasSharedFieldChange = PROGRAM_SHARED_FIELDS.some(
          f => f in updates && (updates as Record<string, unknown>)[f] !== (p as Record<string, unknown>)[f]
        );
        if (hasSharedFieldChange) {
          // Schedule cascade after state update
          queueMicrotask(() => cascadeSharedFields(merged));
        }
        return merged;
      });
      persistPrograms(updated, setStorageWarning);
      return updated;
    });
  }, [cascadeSharedFields]);

  const addTier = useCallback((programId: string, tierName: string, networkTier: string, material?: string, chipStyle?: string) => {
    const program = programs.find(p => p.id === programId);
    if (!program) return null;
    const now = Date.now();

    // Create tier design inheriting shared fields from program
    const tierDesign: SavedDesign = {
      id: crypto.randomUUID(),
      name: `${program.name} — ${tierName}`,
      config: {
        ...defaultConfig,
        issuerName: program.issuerName,
        network: program.network,
        railId: program.railId,
        issuingCountry: program.issuingCountry,
        issuerType: program.issuerType,
        currency: program.currency,
        issuerLogo: program.issuerLogo,
        coBrandPartner: program.coBrandPartner,
        coBrandLogo: program.coBrandLogo,
        tier: networkTier,
        material: (material as CardConfig['material']) || 'matte',
        chipStyle: (chipStyle as CardConfig['chipStyle']) || 'gold',
      },
      thumbnail: '',
      createdAt: now,
      updatedAt: now,
      programId,
    };

    const tier: ProgramTier = {
      id: crypto.randomUUID(),
      name: tierName,
      tier: networkTier,
      cardConfigId: tierDesign.id,
      material: tierDesign.config.material,
      chipStyle: tierDesign.config.chipStyle,
      order: program.tiers.length,
    };

    setDesigns(prev => {
      const updated = [tierDesign, ...prev];
      persistDesigns(updated, setStorageWarning);
      return updated;
    });
    setPrograms(prev => {
      const updated = prev.map(p =>
        p.id === programId
          ? { ...p, tiers: [...p.tiers, tier], updatedAt: now }
          : p
      );
      persistPrograms(updated, setStorageWarning);
      return updated;
    });
    track({ type: 'program_tier_add' as never, programId, tierId: tier.id });
    return tier;
  }, [programs]);

  const removeTier = useCallback((programId: string, tierId: string) => {
    const program = programs.find(p => p.id === programId);
    if (!program || program.tiers.length <= 1) return; // min 1 tier
    const tier = program.tiers.find(t => t.id === tierId);
    if (!tier) return;

    // Remove tier's design
    setDesigns(prev => {
      const updated = prev.filter(d => d.id !== tier.cardConfigId);
      persistDesigns(updated, setStorageWarning);
      return updated;
    });
    setPrograms(prev => {
      const updated = prev.map(p =>
        p.id === programId
          ? { ...p, tiers: p.tiers.filter(t => t.id !== tierId), updatedAt: Date.now() }
          : p
      );
      persistPrograms(updated, setStorageWarning);
      return updated;
    });
    track({ type: 'program_tier_remove' as never, programId, tierId });
  }, [programs]);

  const reorderTiers = useCallback((programId: string, tierIds: string[]) => {
    setPrograms(prev => {
      const updated = prev.map(p => {
        if (p.id !== programId) return p;
        const reordered = tierIds
          .map((id, i) => {
            const t = p.tiers.find(t => t.id === id);
            return t ? { ...t, order: i } : null;
          })
          .filter((t): t is ProgramTier => t !== null);
        return { ...p, tiers: reordered, updatedAt: Date.now() };
      });
      persistPrograms(updated, setStorageWarning);
      return updated;
    });
  }, []);

  const editTierDesign = useCallback((programId: string, tierId: string) => {
    const program = programs.find(p => p.id === programId);
    if (!program) return;
    const tier = program.tiers.find(t => t.id === tierId);
    if (!tier) return;
    const design = designs.find(d => d.id === tier.cardConfigId);
    if (!design) return;

    // Load the tier's design into the editor
    setState(prev => ({
      config: { ...defaultConfig, ...migrateRailId(design.config) },
      past: [...prev.past.slice(-(MAX_HISTORY - 1)), prev.config],
      future: [],
    }));
    setActiveDesignId(tier.cardConfigId);
    persistActiveDesignId(tier.cardConfigId);
    setActiveProgramId(programId);
    persistActiveProgramId(programId);
  }, [programs, designs]);

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const contextValue = useMemo<CardConfigContextType>(() => ({
    config: state.config,
    updateConfig,
    resetConfig,
    undo,
    redo,
    canUndo,
    canRedo,
    designs,
    activeDesignId,
    saveDesign,
    loadDesign,
    deleteDesign,
    duplicateDesign,
    renameDesign,
    updateDesignThumbnail,
    storageWarning,
    clearStorageWarning,
    programs,
    activeProgramId,
    activeProgram,
    lockedFields,
    createProgram,
    loadProgram,
    deleteProgram: deleteProgram as CardConfigContextType['deleteProgram'],
    duplicateProgram: duplicateProgram as CardConfigContextType['duplicateProgram'],
    renameProgram,
    updateProgram,
    addTier,
    removeTier,
    reorderTiers,
    exitProgram,
    editTierDesign,
  }), [
    state.config, updateConfig, resetConfig, undo, redo,
    canUndo, canRedo, designs, activeDesignId,
    saveDesign, loadDesign, deleteDesign, duplicateDesign,
    renameDesign, updateDesignThumbnail, storageWarning, clearStorageWarning,
    programs, activeProgramId, activeProgram, lockedFields,
    createProgram, loadProgram, renameProgram, updateProgram,
    addTier, removeTier, reorderTiers, exitProgram, editTierDesign,
  ]);

  return (
    <CardConfigContext.Provider value={contextValue}>
      {children}
    </CardConfigContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCardConfig() {
  const ctx = useContext(CardConfigContext);
  if (!ctx) throw new Error('useCardConfig must be used within CardConfigProvider');
  return ctx;
}
