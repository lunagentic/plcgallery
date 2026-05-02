import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { Team, TeamMember } from '@/types/database';

export function useMyTeam() {
  const session = useAuthStore((s) => s.session);
  const setTeamContext = useAuthStore((s) => s.setTeamContext);
  const setTeamHydrated = useAuthStore((s) => s.setTeamHydrated);

  const userId = session?.user.id ?? null;

  const query = useQuery({
    queryKey: ['my-team', userId ?? 'none'],
    queryFn: async (): Promise<{ team: Team; membership: TeamMember } | null> => {
      if (!userId) return null;
      const { data: memberships, error } = await supabase
        .from('team_members')
        .select('*, teams:team_id(*)')
        .eq('user_id', userId)
        .order('joined_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      const row = memberships?.[0];
      if (!row) return null;
      const team = (row as unknown as { teams: Team }).teams;
      const { teams: _t, ...membership } = row as unknown as TeamMember & { teams: Team };
      return { team, membership };
    },
  });

  useEffect(() => {
    if (!userId) {
      setTeamContext(null, null);
      setTeamHydrated(true);
      return;
    }
    // Resolve hydration on success, error, or any fetched state — never leave the
    // app stuck on LoadingScreen when Supabase is paused/offline.
    if (query.isFetched || query.isSuccess || query.isError) {
      if (query.data) {
        setTeamContext(query.data.team, query.data.membership);
      } else {
        setTeamContext(null, null);
      }
      setTeamHydrated(true);
    }
  }, [
    userId,
    query.data,
    query.isFetched,
    query.isSuccess,
    query.isError,
    setTeamContext,
    setTeamHydrated,
  ]);

  return query;
}
