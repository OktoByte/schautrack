import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useSSE() {
  const queryClient = useQueryClient();
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!window.EventSource) return;

    const connect = () => {
      if (sourceRef.current) return;
      const source = new EventSource('/events/entries');
      sourceRef.current = source;

      source.addEventListener('entry-change', () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['day-entries'] });
        queryClient.invalidateQueries({ queryKey: ['overview'] });
      });

      source.addEventListener('settings-change', () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['me'] });
      });

      source.addEventListener('link-change', () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['settings'] });
      });

      source.addEventListener('link-label-change', () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      });

      source.onerror = () => {
        source.close();
        sourceRef.current = null;
        setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, [queryClient]);
}
