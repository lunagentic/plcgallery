import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase env vars. Check .env.local contains VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export const STORAGE_BUCKET = 'post-images';

export function getPublicImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  // Pass through absolute URLs (useful for seeded demo data)
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Resolve a path to a *renderable* image URL. For PDF posts the upload
 * pipeline writes a sibling JPEG at `${pdfPath}.thumb.jpg` — this helper
 * returns that URL so PostTile / collage / thumb strip can render the
 * first-page preview as a regular <img>. For images it just returns the
 * normal public URL.
 *
 * Callers should still keep an `onError` fallback for legacy PDFs that
 * predate the thumbnail pipeline.
 */
export function getDisplayImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/\.pdf(?:[?#]|$)/i.test(path)) {
    return getPublicImageUrl(`${path}.thumb.jpg`);
  }
  return getPublicImageUrl(path);
}
