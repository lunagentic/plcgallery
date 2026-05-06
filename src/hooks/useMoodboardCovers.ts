import { useQuery } from '@tanstack/react-query';
import { supabase, getPublicImageUrl } from '@/lib/supabase';

export interface MoodboardCoverMap {
  covers: Record<string, string[]>; // moodboard_id -> N public image URLs (latest first)
  counts: Record<string, number>;
}

const COVERS_PER_BOARD = 4;

/**
 * Fetch the latest image paths for the given moodboard ids.
 * Returns public URLs + total counts per moodboard.
 * Uses a single REST call with `.in()` filter.
 */
export function useMoodboardCovers(moodboardIds: string[]) {
  const key = moodboardIds.slice().sort().join(',');
  return useQuery({
    queryKey: ['moodboard-covers', key],
    enabled: moodboardIds.length > 0,
    staleTime: 30_000,
    queryFn: async (): Promise<MoodboardCoverMap> => {
      if (moodboardIds.length === 0) return { covers: {}, counts: {} };

      // Pull latest N * ids posts in one query. Because Postgres doesn't easily
      // do "top-N per group" without window functions via PostgREST, we just
      // pull a reasonable cap and bucket client-side.
      const cap = Math.min(moodboardIds.length * COVERS_PER_BOARD * 3, 500);
      const { data, error } = await supabase
        .from('posts')
        .select('id, moodboard_id, image_path, created_at')
        .in('moodboard_id', moodboardIds)
        .not('image_path', 'is', null)
        .order('created_at', { ascending: false })
        .limit(cap);
      if (error) throw error;

      const covers: Record<string, string[]> = {};
      const counts: Record<string, number> = {};
      for (const mbId of moodboardIds) {
        covers[mbId] = [];
        counts[mbId] = 0;
      }
      for (const row of data ?? []) {
        const mbId = row.moodboard_id as string;
        counts[mbId] = (counts[mbId] ?? 0) + 1;
        const list = covers[mbId];
        const path = row.image_path as string | null;
        // Skip PDF covers in the collage — only real images make sense in the
        // grid. The post itself still counts toward the board's total.
        if (
          list &&
          list.length < COVERS_PER_BOARD &&
          path &&
          !/\.pdf(?:[?#]|$)/i.test(path)
        ) {
          const url = getPublicImageUrl(path);
          if (url) list.push(url);
        }
      }
      return { covers, counts };
    },
  });
}
