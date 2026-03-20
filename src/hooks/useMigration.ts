import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { apiFetch } from '../api/client';

interface MigrationState {
  hasLocalData: boolean;
  localDesignCount: number;
  localProgramCount: number;
  migrating: boolean;
  migrated: boolean;
  error: string | null;
  migrate: () => Promise<void>;
  dismiss: () => void;
}

export function useMigration(): MigrationState {
  const { isAuthenticated } = useAuth();
  const [hasLocalData, setHasLocalData] = useState(false);
  const [localDesignCount, setLocalDesignCount] = useState(0);
  const [localProgramCount, setLocalProgramCount] = useState(0);
  const [migrating, setMigrating] = useState(false);
  const [migrated, setMigrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Check if there's localStorage data to migrate
    try {
      const designsRaw = localStorage.getItem('cardstudio-designs');
      const programsRaw = localStorage.getItem('cardstudio-programs');
      const alreadyMigrated = localStorage.getItem('cardstudio-migrated');

      if (alreadyMigrated) return;

      const designs = designsRaw ? JSON.parse(designsRaw) : [];
      const programs = programsRaw ? JSON.parse(programsRaw) : [];

      if (designs.length > 0 || programs.length > 0) {
        setHasLocalData(true);
        setLocalDesignCount(designs.length);
        setLocalProgramCount(programs.length);
      }
    } catch {
      // Ignore parse errors
    }
  }, [isAuthenticated]);

  const migrate = useCallback(async () => {
    setMigrating(true);
    setError(null);

    try {
      const designs = JSON.parse(localStorage.getItem('cardstudio-designs') || '[]');
      const programs = JSON.parse(localStorage.getItem('cardstudio-programs') || '[]');
      const activeConfig = JSON.parse(localStorage.getItem('cardstudio-config') || 'null');

      await apiFetch('/migrate', {
        method: 'POST',
        body: JSON.stringify({ designs, programs, activeConfig }),
      });

      // Mark as migrated and clear local data
      localStorage.setItem('cardstudio-migrated', 'true');
      localStorage.removeItem('cardstudio-designs');
      localStorage.removeItem('cardstudio-programs');
      localStorage.removeItem('cardstudio-active-design');
      localStorage.removeItem('cardstudio-active-program');

      setMigrated(true);
      setHasLocalData(false);
    } catch (e: any) {
      setError(e?.message || 'Migration failed');
    } finally {
      setMigrating(false);
    }
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem('cardstudio-migrated', 'true');
    setHasLocalData(false);
  }, []);

  return {
    hasLocalData,
    localDesignCount,
    localProgramCount,
    migrating,
    migrated,
    error,
    migrate,
    dismiss,
  };
}
