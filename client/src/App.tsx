import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSSE } from '@/hooks/useSSE';
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#070d1a', color: '#e5e7eb' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>Schautrack</div>
        <div style={{ marginTop: '0.5rem', color: '#9ca3af' }}>Loading...</div>
      </div>
    </div>
  );
}
