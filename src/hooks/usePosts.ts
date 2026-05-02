import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, STORAGE_BUCKET } from '@/lib/supabase';
import type { Post, PostType, MoodboardCategory } from '@/types/database';
import { useAuthStore } from '@/store/authStore';

/** Post + the author's per-team nickname (resolved client-side). */
export interface PostWithAuthor extends Post {
  author_nickname: string | null;
}

/**
 * Given a list of posts, fetch the matching `(team_id, user_id) → nickname`
 * rows from `team_members` and merge them into each post as `author_nickname`.
 *
 * Why not server-side join? `posts.author_id` references `profiles`, but the
 * NICKNAME we want to display is the per-team one stored in `team_members`,
 * which uses a composite key `(team_id, user_id)`. PostgREST doesn't expose
 * a clean way to embed a relation through that composite key, so we resolve
 * with a single follow-up `.in()` query — cheap and predictable.
 */
async function withAuthorNicknames(posts: Post[]): Promise<PostWithAuthor[]> {
  if (posts.length === 0) return [];
  const teamIds = Array.from(new Set(posts.map((p) => p.team_id)));
  const userIds = Array.from(new Set(posts.map((p) => p.author_id)));
  const { data: members, error } = await supabase
    .from('team_members')
    .select('team_id, user_id, nickname')
    .in('team_id', teamIds)
    .in('user_id', userIds);
  if (error) throw error;
  const map = new Map<string, string>();
  for (const m of members ?? []) {
    map.set(
      `${(m as { team_id: string }).team_id}::${(m as { user_id: string }).user_id}`,
      (m as { nickname: string }).nickname,
    );
  }
  return posts.map((p) => ({
    ...p,
    author_nickname: map.get(`${p.team_id}::${p.author_id}`) ?? null,
  }));
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

export function useTogglePostLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { data, error } = await supabase.rpc('toggle_post_like', { p_post_id: postId });
      if (error) throw error;
      return data as boolean;
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
      const { error } = await supabase.rpc('delete_post', {
        p_post_id: postId,
        p_admin_code: adminCode ?? null,
      });
      if (error) throw error;
      return postId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts'] });
      qc.invalidateQueries({ queryKey: ['moodboard-covers'] });
    },
  });
}
