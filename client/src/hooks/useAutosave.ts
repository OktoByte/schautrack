import { useEffect, useRef, useCallback } from 'react';
import { useToastStore } from '@/stores/toastStore';

/**
 * Auto-save hook. Calls `saveFn` after `delay`ms of no changes.
 * Shows a subtle toast on save or error.
 */
export function useAutosave<T>(
  data: T,
  saveFn: (data: T) => Promise<void>,
  opts: { delay?: number; enabled?: boolean } = {}
) {
  const { delay = 800, enabled = true } = opts;
  const addToast = useToastStore((s) => s.addToast);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialRef = useRef(true);
  const savingRef = useRef(false);
  const latestDataRef = useRef(data);
  latestDataRef.current = data;

  const save = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      await saveFn(latestDataRef.current);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to save');
    }
    savingRef.current = false;
  }, [saveFn, addToast]);

  useEffect(() => {
    // Skip the initial render (don't save on mount)
    if (initialRef.current) {
      initialRef.current = false;
      return;
    }
    if (!enabled) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(save, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data, delay, enabled, save]);

  // Save immediately (for blur events etc)
  const saveNow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    save();
  }, [save]);

  return { saveNow };
}
