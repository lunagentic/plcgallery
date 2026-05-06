/**
 * Database types — mirrors the SQL schema in supabase/migrations/.
 * Run `npx supabase gen types typescript --linked > src/types/database.generated.ts`
 * to auto-generate after linking CLI. This file is the hand-maintained fallback.
 */

export type PostType =
  | 'ai_assist'
  | 'coloring'
  | 'storybook'
  | 'play_plan'
  | 'play_record'
  | 'ai_sentence'
  | 'activity_idea'
  | 'custom';

export type Visibility = 'public' | 'team_only';
export type TeamRole = 'leader' | 'member';

export interface Profile {
  id: string;
  nickname: string;
  avatar_bg: string | null;
  /** External Kinderboard user id (linked later via Edge Function). */
  kinderboard_user_id: string | null;
  /** Display nickname on Kinderboard side, mirrored for convenience. */
  kinderboard_nickname: string | null;
  kinderboard_linked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  invite_code: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  team_id: string;
  user_id: string;
  role: TeamRole;
  nickname: string;
  /** 4-char code unique within the team (e.g., A3F2). null only for legacy rows. */
  personal_code: string | null;
  joined_at: string;
}

export type MoodboardCategory =
  | 'activities'
  | 'environment'
  | 'play'
  | 'inquiry'
  | 'parents'
  | 'annual';

export const MOODBOARD_CATEGORIES: MoodboardCategory[] = [
  'activities',
  'environment',
  'play',
  'inquiry',
  'parents',
  'annual',
];

export interface Moodboard {
  id: string;
  team_id: string;
  title: string;
  description: string | null;
  cover_gradient: string | null;
  team_dot: string | null;
  is_visible: boolean;
  visibility: Visibility;
  created_by: string | null;
  category: MoodboardCategory;
  topic: string | null;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  moodboard_id: string;
  team_id: string;
  author_id: string;
  title: string;
  description: string | null;
  one_liner: string | null;
  post_type: PostType;
  custom_type_label: string | null;
  tip_text: string | null;
  /** Cover / first image. Mirrored from `image_paths[0]` for backward compat. */
  image_path: string | null;
  /** All bundled images for this post; index 0 is the cover. */
  image_paths: string[];
  image_ratio: string | null;
  stage_bg: string | null;
  likes_count: number;
  views_count: number;
  download_count: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}
