import { useEffect, useRef, useCallback, useState } from 'react';
import { useToastStore } from '@/stores/toastStore';

/**
 * Auto-save hook. Calls `saveFn` after `delay`ms of no changes.
 * Returns `status`: 'idle' | 'saving' | 'saved' | 'error'.
 */
export function useAutosave<T>(
  data: T,
  saveFn: (data: T) => Promise<void>,
  opts: { delay?: number; enabled?: boolean } = {}
) {
  const { delay = 800, enabled = true } = opts;
  const addToast = useToastStore((s) => s.addToast);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialRef = useRef(true);
  const savingRef = useRef(false);
  const latestDataRef = useRef(data);
  latestDataRef.current = data;
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const save = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setStatus('saving');
    try {
      await saveFn(latestDataRef.current);
      setStatus('saved');
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setStatus('error');
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

  return { saveNow, status };
}
