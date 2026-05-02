import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook that hydrates the auth store from Supabase session and subscribes to changes.
 * Mount once at app root.
 */
export function useAuthSession(): void {
  const setSession = useAuthStore((s) => s.setSession);
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const reset = useAuthStore((s) => s.reset);
  const qc = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setHydrated(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'SIGNED_OUT') {
        reset();
        qc.clear();
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        qc.invalidateQueries();
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [setSession, setHydrated, reset, qc]);
}
