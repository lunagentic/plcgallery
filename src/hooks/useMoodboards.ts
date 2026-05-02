import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Moodboard, MoodboardCategory, Visibility } from '@/types/database';

/**
 * A Moodboard plus the *display info* needed to render its card without
 * an extra fetch — the team name/color and the creator's nickname.
 */
export interface MoodboardWithCreator extends Moodboard {
  team_name: string | null;
  team_color: string | null;
  creator_nickname: string | null;
}

/**
 * Fetch all visible moodboards in two queries:
 *   1. The moodboards (with team info embedded)
 *   2. The matching team_members rows so we can map (team_id, created_by) →
 *      the creator's per-team nickname (NOT the profile.nickname which may
 *      have drifted).
 */
export function useMoodboards() {
  return useQuery({
    queryKey: ['moodboards'],
    queryFn: async (): Promise<MoodboardWithCreator[]> => {
      const { data: rows, error } = await supabase
        .from('moodboards')
        .select('*, teams:team_id(name, color)')
        .eq('is_visible', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const moodboards = (rows ?? []) as Array<
        Moodboard & { teams: { name: string; color: string } | null }
      >;
      if (moodboards.length === 0) return [];

      // Collect (team_id, created_by) pairs that have a creator id.
      const ids = moodboards
        .map((m) => m.created_by)
        .filter((v): v is string => !!v);
      const teamIds = moodboards.map((m) => m.team_id);

      let nickByKey = new Map<string, string>(); // `${team_id}::${user_id}` → nickname
      if (ids.length > 0) {
        const { data: members, error: mErr } = await supabase
          .from('team_members')
          .select('team_id, user_id, nickname')
          .in('user_id', ids)
          .in('team_id', teamIds);
        if (mErr) throw mErr;
        nickByKey = new Map(
          (members ?? []).map((m: { team_id: string; user_id: string; nickname: string }) => [
            `${m.team_id}::${m.user_id}`,
            m.nickname,
          ]),
        );
      }

      return moodboards.map((m) => ({
        ...m,
        team_name: m.teams?.name ?? null,
        team_color: m.teams?.color ?? null,
        creator_nickname: m.created_by
          ? (nickByKey.get(`${m.team_id}::${m.created_by}`) ?? null)
          : null,
      }));
    },
  });
}

export interface CreateMoodboardInput {
  title: string;
  description?: string;
  coverGradient?: string;
  teamDot?: string;
  visibility?: Visibility;
  category?: MoodboardCategory;
  topic?: string;
}

export function useCreateMoodboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMoodboardInput): Promise<Moodboard> => {
      const { data, error } = await supabase.rpc('create_moodboard', {
        p_title: input.title,
        p_description: input.description ?? null,
        p_cover_gradient: input.coverGradient ?? null,
        p_team_dot: input.teamDot ?? null,
        p_visibility: input.visibility ?? 'team_only',
        p_category: input.category ?? 'inquiry',
        p_topic: input.topic ?? null,
      });
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as Moodboard;
      return row;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['moodboards'] });
    },
  });
}

export function useMoodboard(id: string | undefined) {
  return useQuery({
    queryKey: ['moodboard', id],
    enabled: !!id,
    queryFn: async (): Promise<Moodboard | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('moodboards')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
