// ============================================================================
// File: src/routes/__root.tsx
// ============================================================================
import { createRootRoute, Outlet, redirect } from '@tanstack/react-router';
import { useAuthStore } from '../store/authStore';
import { AppLayout } from '../components/layout/AppLayout';
import { SyncEngine } from '../components/data/SyncEngine';

export const Route = createRootRoute({
  // The Auth Guard: Enforces deterministic security access across the pipeline
  beforeLoad: ({ location }) => {
    const session = useAuthStore.getState().session;
    
    // If no session exists, redirect to login unless already there
    if (!session && location.pathname !== '/login') {
      throw redirect({
        to: '/login' as any,
      });
    }
  },
  component: () => (
    <>
      {/* Global Sync Engine: Drives the 14-day failover & background hydration loops */}
      <SyncEngine />
      <AppLayout>
        <Outlet />
      </AppLayout>
    </>
  ),
});