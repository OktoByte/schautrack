import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSSE } from '@/hooks/useSSE';
import Toaster from '@/components/ui/Toaster';
import AppRouter from './router';

export default function App() {
  const { fetchUser, isInitialized, user } = useAuthStore();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Only connect SSE when authenticated
  return (
    <>
      {user && <SSEProvider />}
      <Toaster />
      {isInitialized ? <AppRouter /> : <LoadingScreen />}
    </>
  );
}

function SSEProvider() {
  useSSE();
  return null;
}

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <div className="text-2xl font-semibold">Schautrack</div>
        <div className="mt-2 text-muted-foreground">Loading...</div>
      </div>
    </div>
  );
}
