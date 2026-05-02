import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * Ensure an auth session exists. If not, sign in anonymously.
 * Requires: Dashboard → Auth → Providers → Anonymous Sign-Ins = enabled.
 */
async function ensureSession(): Promise<void> {
  const { data: current } = await supabase.auth.getSession();
  if (current.session) return;
  const { error } = await supabase.auth.signInAnonymously();
  if (error) {
    throw new Error(
      `익명 로그인 실패: ${error.message}. ` +
        'Supabase Dashboard → Authentication → Providers → Anonymous Sign-Ins을 활성화해주세요.',
    );
  }
}

/**
 * Build a deterministic synthetic email + password for an anonymous user
 * so they can later "log back in" by entering their combined code on a
 * different browser/device.
 *
 * The combined code itself is the recovery secret. Anyone who knows it
 * can sign in as that user — appropriate for an MVP team tool, upgrade
 * to magic-link/OAuth later if more security is needed.
 */
// Use a real, parked TLD so Supabase's email validator accepts it.
// `.app` is a real ICANN TLD and Supabase will treat it as valid format.
// We never actually deliver email to this address — it's purely an identifier.
const RESUME_EMAIL_DOMAIN = 'plcgallery-team.app';

function buildResumeCredentials(inviteCode: string, personalCode: string) {
  const combined = `${inviteCode}-${personalCode}`.toUpperCase();
  // Local-part: lowercase, alphanumerics + hyphen. Valid per RFC 5321.
  const local = combined.toLowerCase().replace(/[^a-z0-9-]/g, '');
  return {
    email: `${local}@${RESUME_EMAIL_DOMAIN}`,
    password: `plc-${combined}`,
    combined,
  };
}

/**
 * Attach a deterministic email+password to the current (anonymous) user
 * so they can sign in later from any browser using the combined code.
 *
 * Calls a SECURITY DEFINER RPC that updates auth.users directly, which
 * bypasses Supabase's email-confirmation flow (the email is a synthetic
 * identifier, never delivered). This is safe because the RPC enforces
 * `auth.uid() = id` so a user can only set their own credentials.
 *
 * Errors are logged but not thrown — the team is already created/joined,
 * we just lose the cross-device-resume capability.
 */
async function attachResumeCredentials(inviteCode: string, personalCode: string): Promise<void> {
  const { email, password } = buildResumeCredentials(inviteCode, personalCode);
  try {
    const { error } = await supabase.rpc('set_resume_credentials', {
      p_email: email,
      p_password: password,
    });
    if (error) {
      console.warn('[plc] attachResumeCredentials:', error.message);
    }
  } catch (e) {
    console.warn('[plc] attachResumeCredentials threw:', e);
  }
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { teamName: string; color: string; nickname: string }) => {
      await ensureSession();
      const { data, error } = await supabase.rpc('create_team_with_leader', {
        p_team_name: input.teamName,
        p_team_color: input.color,
        p_nickname: input.nickname,
      });
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as {
        team_id: string;
        invite_code: string;
        personal_code: string;
      };
      // Link recovery credentials to the anonymous user.
      await attachResumeCredentials(row.invite_code, row.personal_code);
      return row;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-team'] });
    },
  });
}

export function useJoinTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { inviteCode: string; nickname: string }) => {
      await ensureSession();
      const { data, error } = await supabase.rpc('join_team_by_code', {
        p_invite_code: input.inviteCode,
        p_nickname: input.nickname,
      });
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as {
        team_id: string;
        team_name: string;
        personal_code: string;
      };
      // We need the team's invite_code (not the user's input which may be
      // a combined code). Fetch the team row by id to get the canonical code.
      const { data: team } = await supabase
        .from('teams')
        .select('invite_code')
        .eq('id', row.team_id)
        .maybeSingle();
      if (team?.invite_code) {
        await attachResumeCredentials(team.invite_code, row.personal_code);
      }
      return row;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-team'] });
    },
  });
}

/**
 * Sign in to an existing membership using the combined code (KB-XXXX-YYYY).
 *  1. Server-side RPC `lookup_resume_email` validates the code and returns
 *     the synthetic email we previously stored on the auth user.
 *  2. Client signs in with that email + the deterministic password derived
 *     from the same combined code.
 */
export function useResumeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { combinedCode: string }) => {
      const cleaned = input.combinedCode.trim().toUpperCase();
      // Quick client-side guard so we don't even hit the RPC for nonsense
      if (!/^KB-[A-Z2-9]{4,8}-[A-Z2-9]{4}$/.test(cleaned)) {
        throw new Error('결합 코드 형식이 올바르지 않아요 (예: KB-XXXX-YYYY).');
      }
      const { data, error } = await supabase.rpc('lookup_resume_email', {
        p_combined: cleaned,
      });
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as
        | { email: string | null; found: boolean }
        | null;
      if (!row?.found || !row.email) {
        throw new Error('해당 결합 코드를 찾을 수 없어요. 코드를 다시 확인해주세요.');
      }
      // Derive the password the same way it was stored
      const password = `plc-${cleaned}`;
      // If a session already exists, sign out first so we end up as the new user
      await supabase.auth.signOut().catch(() => {});
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: row.email,
        password,
      });
      if (signInErr) {
        throw new Error(
          `로그인 실패: ${signInErr.message}. (이 결합 코드가 만들어지기 전 사용자라면 이전 브라우저에서 한 번만 다시 들어가서 갱신이 필요해요.)`,
        );
      }
      return { email: row.email };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-team'] });
    },
  });
}
