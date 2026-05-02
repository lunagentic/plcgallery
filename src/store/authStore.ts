import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { Team, TeamMember } from '@/types/database';

interface AuthState {
  session: Session | null;
  team: Team | null;
  membership: TeamMember | null;
  hydrated: boolean;
  teamHydrated: boolean;
  setSession: (session: Session | null) => void;
  setTeamContext: (team: Team | null, membership: TeamMember | null) => void;
  setHydrated: (h: boolean) => void;
  setTeamHydrated: (h: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  team: null,
  membership: null,
  hydrated: false,
  teamHydrated: false,
  setSession: (session) => set({ session }),
  setTeamContext: (team, membership) => set({ team, membership }),
  setHydrated: (hydrated) => set({ hydrated }),
  setTeamHydrated: (teamHydrated) => set({ teamHydrated }),
  reset: () => set({ session: null, team: null, membership: null, teamHydrated: false }),
}));
