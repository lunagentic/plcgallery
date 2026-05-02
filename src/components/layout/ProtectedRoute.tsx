import { Navigate } from 'react-router-dom';
import { type ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const hydrated = useAuthStore((s) => s.hydrated);
  const teamHydrated = useAuthStore((s) => s.teamHydrated);
  const session = useAuthStore((s) => s.session);
  const team = useAuthStore((s) => s.team);

  if (!hydrated) return <LoadingScreen />;
  if (!session) return <Navigate to="/welcome" replace />;
  if (!teamHydrated) return <LoadingScreen />;
  if (!team) return <Navigate to="/welcome" replace />;
  return <>{children}</>;
}
