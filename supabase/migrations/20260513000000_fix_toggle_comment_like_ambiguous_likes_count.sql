-- Fix the `column reference "likes_count" is ambiguous` (42702) error
-- that silently broke every comment-like click on the client.
--
-- The original RPC declared `RETURNS TABLE(liked boolean, likes_count integer)`
-- and then ran an UPDATE on `post_comments` whose `RETURNING likes_count INTO
-- v_count` collided with the OUT column also named `likes_count`. We qualify
-- every column reference inside the UPDATE with a `pc` alias so the parser
-- can no longer confuse the table column with the OUT parameter.

CREATE OR REPLACE FUNCTION public.toggle_comment_like(p_comment_id uuid)
 RETURNS TABLE(liked boolean, likes_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_existed boolean;
  v_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM post_comments c
      JOIN posts p ON p.id = c.post_id
      JOIN moodboards m ON m.id = p.moodboard_id
     WHERE c.id = p_comment_id
       AND ((m.is_visible AND m.visibility = 'public') OR is_team_member(m.team_id))
  ) THEN
    RAISE EXCEPTION 'Comment not found or not accessible' USING ERRCODE = '42501';
  END IF;

  DELETE FROM comment_likes
   WHERE comment_id = p_comment_id
     AND user_id = v_user_id
   RETURNING true INTO v_existed;

  IF v_existed THEN
    UPDATE post_comments AS pc
       SET likes_count = greatest(0, pc.likes_count - 1)
     WHERE pc.id = p_comment_id
     RETURNING pc.likes_count INTO v_count;
    RETURN QUERY SELECT false, v_count;
  ELSE
    INSERT INTO comment_likes (comment_id, user_id)
    VALUES (p_comment_id, v_user_id)
    ON CONFLICT DO NOTHING;
    UPDATE post_comments AS pc
       SET likes_count = pc.likes_count + 1
     WHERE pc.id = p_comment_id
     RETURNING pc.likes_count INTO v_count;
    RETURN QUERY SELECT true, v_count;
  END IF;
END;
$function$;
