import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, type ReactNode } from 'react';
import { type CardConfig, type SavedDesign, defaultConfig } from './types';
import { networkTierConfig } from './data';

const STORAGE_KEY = 'cardstudio-config';
const DESIGNS_KEY = 'cardstudio-designs';
const ACTIVE_DESIGN_KEY = 'cardstudio-active-design';
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
  }), [
    state.config, updateConfig, resetConfig, undo, redo,
    canUndo, canRedo, designs, activeDesignId,
    saveDesign, loadDesign, deleteDesign, duplicateDesign,
    renameDesign, updateDesignThumbnail, storageWarning, clearStorageWarning,
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
