import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, STORAGE_BUCKET } from '@/lib/supabase';
import type { Post, PostType, MoodboardCategory } from '@/types/database';
import { useAuthStore } from '@/store/authStore';

/** Post + the author's per-team nickname and the OWNING team's name/color. */
export interface PostWithAuthor extends Post {
  author_nickname: string | null;
  team_name: string | null;
  team_color: string | null;
}

/**
 * Resolve the per-team nickname for each post and the post's OWNING team
 * name/color. The owning team is `posts.team_id` — distinct from the
 * moodboard's team, since users can attach posts to other teams' public
 * moodboards. Two follow-up `.in()` queries (team_members and teams).
 */
async function withAuthorNicknames(posts: Post[]): Promise<PostWithAuthor[]> {
  if (posts.length === 0) return [];
  const teamIds = Array.from(new Set(posts.map((p) => p.team_id)));
  const userIds = Array.from(new Set(posts.map((p) => p.author_id)));

  const [membersResult, teamsResult] = await Promise.all([
    supabase
      .from('team_members')
      .select('team_id, user_id, nickname')
      .in('team_id', teamIds)
      .in('user_id', userIds),
    supabase.from('teams').select('id, name, color').in('id', teamIds),
  ]);
  if (membersResult.error) throw membersResult.error;
  if (teamsResult.error) throw teamsResult.error;

  const nicknameMap = new Map<string, string>();
  for (const m of membersResult.data ?? []) {
    nicknameMap.set(
      `${(m as { team_id: string }).team_id}::${(m as { user_id: string }).user_id}`,
      (m as { nickname: string }).nickname,
    );
  }
  const teamMap = new Map<string, { name: string; color: string }>();
  for (const t of teamsResult.data ?? []) {
    const row = t as { id: string; name: string; color: string };
    teamMap.set(row.id, { name: row.name, color: row.color });
  }

  return posts.map((p) => {
    const team = teamMap.get(p.team_id);
    return {
      ...p,
      author_nickname: nicknameMap.get(`${p.team_id}::${p.author_id}`) ?? null,
      team_name: team?.name ?? null,
      team_color: team?.color ?? null,
    };
  });
}

export function useMoodboardPosts(moodboardId: string | undefined) {
  return useQuery({
    queryKey: ['posts', 'moodboard', moodboardId],
    enabled: !!moodboardId,
    queryFn: async (): Promise<PostWithAuthor[]> => {
      if (!moodboardId) return [];
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('moodboard_id', moodboardId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return withAuthorNicknames(data ?? []);
    },
  });
}

/**
 * Fetch all posts whose moodboard belongs to the given category.
 * Used by the home category-chip view: 수업활동 → posts of all moodboards
 * with category='activities', visible to the caller per RLS.
 */
export function usePostsByCategory(category: MoodboardCategory | undefined) {
  return useQuery({
    queryKey: ['posts', 'category', category],
    enabled: !!category,
    queryFn: async (): Promise<PostWithAuthor[]> => {
      if (!category) return [];
      const { data: mbRows, error: mbErr } = await supabase
        .from('moodboards')
        .select('id')
        .eq('category', category)
        .eq('is_visible', true);
      if (mbErr) throw mbErr;
      const ids = (mbRows ?? []).map((r) => (r as { id: string }).id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .in('moodboard_id', ids)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return withAuthorNicknames(data ?? []);
    },
  });
}

/**
 * Fetch every post the caller can see (RLS handles visibility — public posts
 * for guests, plus team-only posts for members of the owning team).
 * The home feed groups these into per-category sections client-side.
 */
export function useAllVisiblePosts() {
  return useQuery({
    queryKey: ['posts', 'all-visible'],
    queryFn: async (): Promise<PostWithAuthor[]> => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return withAuthorNicknames(data ?? []);
    },
  });
}

export function useTeamPosts(teamId: string | undefined) {
  return useQuery({
    queryKey: ['posts', 'team', teamId],
    enabled: !!teamId,
    queryFn: async (): Promise<PostWithAuthor[]> => {
      if (!teamId) return [];
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return withAuthorNicknames(data ?? []);
    },
  });
}

export interface CreatePostInput {
  moodboardId: string;
  title: string;
  description?: string;
  oneLiner?: string;
  postType: PostType;
  customTypeLabel?: string;
  tipText?: string;
  tags?: string[];
  imageFile?: File | null;
  imageRatio?: string;
  stageBg?: string;
}

export function useCreatePost() {
  const qc = useQueryClient();
  const team = useAuthStore((s) => s.team);
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: async (input: CreatePostInput): Promise<Post> => {
      if (!team?.id) throw new Error('No team context');
      if (!session?.user.id) throw new Error('Not authenticated');

      let imagePath: string | null = null;
      if (input.imageFile) {
        const ext = input.imageFile.name.split('.').pop() ?? 'jpg';
        imagePath = `${team.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(imagePath, input.imageFile, { cacheControl: '3600', upsert: false });
        if (upErr) throw upErr;
      }

      const { data, error } = await supabase
        .from('posts')
        .insert({
          moodboard_id: input.moodboardId,
          team_id: team.id,
          author_id: session.user.id,
          title: input.title,
          description: input.description ?? null,
          one_liner: input.oneLiner ?? null,
          post_type: input.postType,
          custom_type_label: input.customTypeLabel ?? null,
          tip_text: input.tipText ?? null,
          tags: input.tags ?? [],
          image_path: imagePath,
          image_ratio: input.imageRatio ?? '4:3',
          stage_bg: input.stageBg ?? null,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as Post;
    },
    onSuccess: (post) => {
      qc.invalidateQueries({ queryKey: ['posts', 'moodboard', post.moodboard_id] });
      qc.invalidateQueries({ queryKey: ['posts', 'team', post.team_id] });
    },
  });
}

export interface BundlePostInput extends Omit<CreatePostInput, 'imageFile'> {
  imageFiles: File[];
  onProgress?: (completed: number, total: number) => void;
}

/**
 * Upload N files and create ONE post that bundles them.
 * - All paths are stored in `posts.image_paths[]`
 * - `posts.image_path` is set to the FIRST uploaded file (the cover)
 */
export function useCreatePostBundle() {
  const qc = useQueryClient();
  const team = useAuthStore((s) => s.team);
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: async (input: BundlePostInput): Promise<Post> => {
      if (!team?.id) throw new Error('No team context');
      if (!session?.user.id) throw new Error('Not authenticated');
      if (input.imageFiles.length === 0) throw new Error('No files to upload');

      const teamId = team.id;
      const userId = session.user.id;
      const total = input.imageFiles.length;
      const uploaded: string[] = [];

      for (let i = 0; i < input.imageFiles.length; i++) {
        const file = input.imageFiles[i];
        const ext = file.name.split('.').pop() ?? 'jpg';
        const imagePath = `${teamId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(imagePath, file, { cacheControl: '3600', upsert: false });
        if (upErr) {
          // Best effort cleanup: delete already uploaded files in this bundle
          if (uploaded.length > 0) {
            await supabase.storage.from(STORAGE_BUCKET).remove(uploaded).catch(() => {});
          }
          throw upErr;
        }
        uploaded.push(imagePath);
        input.onProgress?.(i + 1, total);
      }

      const { data, error } = await supabase
        .from('posts')
        .insert({
          moodboard_id: input.moodboardId,
          team_id: teamId,
          author_id: userId,
          title: input.title,
          description: input.description ?? null,
          one_liner: input.oneLiner ?? null,
          post_type: input.postType,
          custom_type_label: input.customTypeLabel ?? null,
          tip_text: input.tipText ?? null,
          tags: input.tags ?? [],
          image_path: uploaded[0],
          image_paths: uploaded,
          image_ratio: input.imageRatio ?? '4:3',
          stage_bg: input.stageBg ?? null,
        })
        .select('*')
        .single();
      if (error) {
        await supabase.storage.from(STORAGE_BUCKET).remove(uploaded).catch(() => {});
        throw error;
      }
      return data as Post;
    },
    onSuccess: (post) => {
      qc.invalidateQueries({ queryKey: ['posts', 'moodboard', post.moodboard_id] });
      qc.invalidateQueries({ queryKey: ['posts', 'team', post.team_id] });
    },
  });
}

/** Post ids currently mid-toggle. Lives at module scope so concurrent
 *  clicks on the same post (from any consumer of the hook) are coalesced. */
const togglePostLikePending = new Set<string>();

export function useTogglePostLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      // Reject duplicate in-flight toggles for the same post. The DB also
      // enforces uniqueness via PK(post_id, user_id), but blocking on the
      // client avoids the optimistic UI flicker from racing toggles.
      if (togglePostLikePending.has(postId)) {
        throw new Error('이미 처리 중이에요. 잠시만 기다려주세요.');
      }
      togglePostLikePending.add(postId);
      try {
        const { data, error } = await supabase.rpc('toggle_post_like', { p_post_id: postId });
        if (error) throw error;
        return { postId, nowLiked: data as boolean };
      } finally {
        togglePostLikePending.delete(postId);
      }
    },
    onMutate: async (postId: string) => {
      // Optimistic toggle on the user's-likes set so the heart fills/empties
      // immediately without waiting for the RPC round-trip.
      const session = useAuthStore.getState().session;
      const userId = session?.user.id;
      if (!userId) return;
      const key = ['my-likes', userId];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Set<string>>(key) ?? new Set<string>();
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      qc.setQueryData(key, next);
      return { prev };
    },
    onError: (_err, _postId, ctx) => {
      const session = useAuthStore.getState().session;
      const userId = session?.user.id;
      if (!userId || !ctx?.prev) return;
      qc.setQueryData(['my-likes', userId], ctx.prev);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts'] });
      // Refetch the canonical likes set in case of races.
      const userId = useAuthStore.getState().session?.user.id;
      if (userId) qc.invalidateQueries({ queryKey: ['my-likes', userId] });
    },
  });
}

/**
 * Set of post ids the current user has liked. Empty set when signed out.
 * Used to drive the filled/outline heart in the viewer.
 */
export function useMyLikedPostIds() {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['my-likes', userId],
    enabled: !!userId,
    queryFn: async (): Promise<Set<string>> => {
      if (!userId) return new Set();
      const { data, error } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', userId);
      if (error) throw error;
      return new Set((data ?? []).map((r) => (r as { post_id: string }).post_id));
    },
  });
}

/** Edit a post's title / description / tags via the `update_post` RPC.
 *  Server-side enforces: caller is the author OR a valid admin code. */
export interface UpdatePostInput {
  postId: string;
  title: string;
  description?: string | null;
  tags?: string[];
}

export function useUpdatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdatePostInput): Promise<Post> => {
      const adminCode = localStorage.getItem('plc-admin-code') || undefined;
      const { data, error } = await supabase.rpc('update_post', {
        p_post_id: input.postId,
        p_title: input.title,
        p_description: input.description ?? null,
        p_tags: input.tags ?? null,
        p_admin_code: adminCode ?? null,
      });
      if (error) throw error;
      return data as Post;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

/**
 * Delete a post via the `delete_post` RPC. Server-side enforces:
 *   - caller is the author, OR
 *   - caller is the team leader, OR
 *   - caller passes a valid admin code (read from localStorage).
 */
export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const adminCode = localStorage.getItem('plc-admin-code') || undefined;
      // RPC deletes the row and returns the image paths so we can clean up
      // storage from the client (Supabase blocks PL/pgSQL DELETE on storage).
      const { data, error } = await supabase.rpc('delete_post', {
        p_post_id: postId,
        p_admin_code: adminCode ?? null,
      });
      if (error) throw error;
      const paths = (data ?? []) as string[];
      if (paths.length > 0) {
        const { error: storageErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove(paths);
        if (storageErr) {
          // Best-effort cleanup — the post row is already gone, so we just
          // log instead of throwing back at the user.
          console.warn('[plc] post storage cleanup failed:', storageErr.message);
        }
      }
      return postId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts'] });
      qc.invalidateQueries({ queryKey: ['moodboard-covers'] });
    },
  });
}
