import { useState, useRef, useCallback } from 'react';

export function useToast(initial: string | null = null) {
  const [toast, setToast] = useState<string | null>(initial);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback((msg: string) => {
    clearTimeout(timerRef.current);
    setToast(msg);
    timerRef.current = setTimeout(() => setToast(null), 2200);
  }, []);

  return { toast, show };
}
