import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/** Comment row enriched with the author's per-team nickname (resolved
 *  client-side from the post → team_members chain, mirroring how posts do
 *  author resolution). Falls back to null when the author has no
 *  membership in the post's team. */
export interface CommentRow {
  id: string;
  post_id: string;
  parent_id: string | null;
  author_id: string;
  content: string;
  is_edited: boolean;
  likes_count: number;
  created_at: string;
  updated_at: string;
  /** Resolved client-side. Null when no nickname is available. */
  author_nickname: string | null;
}

/** Top-level comment + its (already attached) replies. */
export interface ThreadedComment extends CommentRow {
  replies: CommentRow[];
}

/**
 * Fetch all comments for a post, attach per-team nicknames, and group
 * top-level comments with their replies. Replies are sorted oldest-first
 * within a thread; top-level comments are sorted newest-first so the
 * latest discussion sits at the top of the panel.
 */
export function usePostComments(postId: string | undefined) {
  return useQuery({
    queryKey: ['post-comments', postId],
    enabled: !!postId,
    queryFn: async (): Promise<ThreadedComment[]> => {
      if (!postId) return [];

      const { data: rows, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const raw = (rows ?? []) as Omit<CommentRow, 'author_nickname'>[];
      if (raw.length === 0) return [];

      // Resolve nicknames via team_members keyed on (post.team_id, author_id).
      const { data: postRow } = await supabase
        .from('posts')
        .select('team_id')
        .eq('id', postId)
        .maybeSingle();
      const teamId = (postRow as { team_id?: string } | null)?.team_id;

      const authorIds = Array.from(new Set(raw.map((r) => r.author_id)));
      const nicknameMap = new Map<string, string>();
      if (teamId && authorIds.length > 0) {
        const { data: members } = await supabase
          .from('team_members')
          .select('user_id, nickname')
          .eq('team_id', teamId)
          .in('user_id', authorIds);
        for (const m of members ?? []) {
          const row = m as { user_id: string; nickname: string };
          nicknameMap.set(row.user_id, row.nickname);
        }
      }
      const enriched: CommentRow[] = raw.map((r) => ({
        ...r,
        author_nickname: nicknameMap.get(r.author_id) ?? null,
      }));

      const repliesByParent = new Map<string, CommentRow[]>();
      const tops: CommentRow[] = [];
      for (const c of enriched) {
        if (c.parent_id) {
          const arr = repliesByParent.get(c.parent_id);
          if (arr) arr.push(c);
          else repliesByParent.set(c.parent_id, [c]);
        } else {
          tops.push(c);
        }
      }
      // Newest top-level first; replies stay oldest-first within a thread.
      tops.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      return tops.map((t) => ({
        ...t,
        replies: repliesByParent.get(t.id) ?? [],
      }));
    },
  });
}

export interface CreateCommentInput {
  postId: string;
  content: string;
  parentId?: string | null;
}

export function useCreateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCommentInput): Promise<CommentRow> => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) throw new Error('로그인이 필요해요');
      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: input.postId,
          parent_id: input.parentId ?? null,
          author_id: userId,
          content: input.content.trim(),
        })
        .select('*')
        .single();
      if (error) throw error;
      return { ...(data as Omit<CommentRow, 'author_nickname'>), author_nickname: null };
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ['post-comments', row.post_id] });
    },
  });
}

/** Set of comment ids the current user has liked, scoped to one post. */
export function useMyLikedCommentIds(postId: string | undefined) {
  return useQuery({
    queryKey: ['my-liked-comments', postId],
    enabled: !!postId,
    queryFn: async (): Promise<Set<string>> => {
      if (!postId) return new Set();
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess.session?.user.id;
      if (!userId) return new Set();
      // Select via inner-joined post_comments to scope to this post.
      const { data, error } = await supabase
        .from('comment_likes')
        .select('comment_id, post_comments!inner(post_id)')
        .eq('user_id', userId)
        .eq('post_comments.post_id', postId);
      if (error) throw error;
      return new Set(
        (data ?? []).map((r) => (r as { comment_id: string }).comment_id),
      );
    },
  });
}

/**
 * Toggle the like on a comment. Returns the new (liked, count) state.
 * Optimistically updates both the comment list cache (for the count
 * shown next to the heart) and the my-liked-comments set (for the
 * filled-vs-outline glyph).
 */
export function useToggleCommentLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { commentId: string; postId: string }) => {
      const { data, error } = await supabase.rpc('toggle_comment_like', {
        p_comment_id: input.commentId,
      });
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as {
        liked: boolean;
        likes_count: number;
      };
      return { ...input, ...row };
    },
    onSuccess: ({ commentId, postId, liked, likes_count }) => {
      // Patch the count on the cached comment list so the heart label
      // updates immediately without a re-fetch.
      qc.setQueryData<ThreadedComment[]>(['post-comments', postId], (prev) => {
        if (!prev) return prev;
        const apply = (c: CommentRow): CommentRow =>
          c.id === commentId ? { ...c, likes_count } : c;
        return prev.map((t) => ({
          ...apply(t),
          replies: t.replies.map(apply),
        }));
      });
      // Toggle membership in my-liked set.
      qc.setQueryData<Set<string>>(['my-liked-comments', postId], (prev) => {
        const next = new Set(prev ?? []);
        if (liked) next.add(commentId);
        else next.delete(commentId);
        return next;
      });
    },
  });
}

export interface UpdateCommentInput {
  commentId: string;
  postId: string;
  content: string;
}

export function useUpdateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateCommentInput): Promise<CommentRow> => {
      const { data, error } = await supabase
        .from('post_comments')
        .update({ content: input.content.trim() })
        .eq('id', input.commentId)
        .select('*')
        .single();
      if (error) throw error;
      return { ...(data as Omit<CommentRow, 'author_nickname'>), author_nickname: null };
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ['post-comments', input.postId] });
    },
  });
}

export interface DeleteCommentInput {
  commentId: string;
  postId: string;
  /** Whether the caller is acting as admin. When true, we route through the
   *  SECURITY DEFINER RPC that accepts an admin code. Otherwise a direct
   *  delete falls under the RLS DELETE-by-author policy. */
  asAdmin: boolean;
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DeleteCommentInput) => {
      if (input.asAdmin) {
        const code = localStorage.getItem('plc-admin-code');
        if (!code) throw new Error('관리자 코드가 필요해요');
        const { error } = await supabase.rpc('delete_comment_admin', {
          p_comment_id: input.commentId,
          p_admin_code: code,
        });
        if (error) throw error;
        return input.commentId;
      }
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', input.commentId);
      if (error) throw error;
      return input.commentId;
    },
    onSuccess: (_id, input) => {
      qc.invalidateQueries({ queryKey: ['post-comments', input.postId] });
    },
  });
}
