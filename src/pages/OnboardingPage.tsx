import styled from '@emotion/styled';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Input, Label, Field, FieldHint } from '@/components/ui/Input';
import { TEAM_COLORS } from '@/theme/tokens';
import { useCreateTeam, useJoinTeam, useResumeSession } from '@/hooks/useTeamActions';
import { useUIStore } from '@/store/uiStore';
import { useQueryClient } from '@tanstack/react-query';
import { copyToClipboard } from '@/lib/clipboard';
import { supabase } from '@/lib/supabase';
import type { Team, TeamMember } from '@/types/database';

type Step = 'choice' | 'create' | 'join' | 'created';

const STORAGE_KEY_CODE = 'plc-saved-invite-code';
const STORAGE_KEY_NICKNAME = 'plc-saved-nickname';
const STORAGE_KEY_HISTORY = 'plc-saved-codes-history';
const HISTORY_MAX = 5;

const COMBINED_CODE_RE = /^KB-[A-Z2-9]{4,8}-[A-Z2-9]{4}$/;

function readStorage(key: string): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function writeStorage(key: string, value: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore quota / privacy errors */
  }
}

function readHistory(): string[] {
  const raw = readStorage(STORAGE_KEY_HISTORY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function pushHistory(code: string): string[] {
  const next = [code, ...readHistory().filter((c) => c !== code)].slice(0, HISTORY_MAX);
  writeStorage(STORAGE_KEY_HISTORY, JSON.stringify(next));
  return next;
}

const Screen = styled.div`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 48px 24px;
  background: ${({ theme }) => theme.bg};
  position: relative;
`;

const Controls = styled.div`
  position: absolute;
  top: 24px;
  right: 24px;
  display: flex;
  gap: 8px;
`;

const Card = styled.div`
  width: 100%;
  max-width: 480px;
  padding: 40px 36px;
  background: ${({ theme }) => theme.surface};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 24px;
  box-shadow: ${({ theme }) => theme.shadowLg};

  @media (max-width: 600px) {
    padding: 28px 20px;
    border-radius: 20px;
  }
`;

const Brand = styled.div`
  text-align: center;
  margin-bottom: 28px;
  .brand {
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  .brand .ai {
    color: ${({ theme }) => theme.brand};
    font-style: italic;
    font-family: 'Fraunces', serif;
  }
`;

const Title = styled.h1`
  font-size: 26px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.02em;
  margin-bottom: 10px;
  em {
    color: ${({ theme }) => theme.brand};
    font-style: italic;
    font-family: 'Fraunces', serif;
  }
`;

const Sub = styled.p`
  color: ${({ theme }) => theme.textMuted};
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 24px;
`;

const ChoiceGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
`;

const ChoiceBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.bg};
  text-align: left;
  transition: all 0.15s ease;
  &:hover {
    border-color: ${({ theme }) => theme.brand};
    background: ${({ theme }) => theme.brandSoft};
  }

  @media (max-width: 600px) {
    gap: 10px;
    padding: 12px 14px;
    .d {
      display: none;
    }
  }
`;

const Icon = styled.div<{ tint?: string }>`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: ${({ theme, tint }) => tint ?? theme.surface2};
  display: grid;
  place-items: center;
  font-size: 18px;
`;

const TextGrow = styled.div`
  flex: 1;
  .t {
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 2px;
  }
  .d {
    font-size: 12px;
    color: ${({ theme }) => theme.textMuted};
  }
`;

const Arrow = styled.span`
  color: ${({ theme }) => theme.textSoft};
  font-size: 16px;
`;

const ColorRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
`;

const ColorDot = styled.button<{ hex: string; selected: boolean }>`
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: ${({ hex }) => hex};
  border: 2px solid
    ${({ selected, theme }) => (selected ? theme.text : theme.border)};
  box-shadow: ${({ selected }) => (selected ? '0 0 0 2px rgba(0,0,0,0.06)' : 'none')};
  transition: transform 0.15s ease, border-color 0.15s ease;
  &:hover {
    transform: scale(1.08);
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 20px;
  button {
    flex: 1;
  }

  @media (max-width: 600px) {
    button {
      font-size: 12px;
      padding: 9px 12px;
    }
  }
`;

const BrowseLink = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin-top: 14px;
  padding: 10px 14px;
  border-radius: 999px;
  border: 1px dashed ${({ theme }) => theme.border};
  background: transparent;
  color: ${({ theme }) => theme.textMuted};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  &:hover {
    color: ${({ theme }) => theme.text};
    border-color: ${({ theme }) => theme.borderStrong};
    background: ${({ theme }) => theme.bg};
  }
  .icon {
    font-size: 14px;
    line-height: 1;
  }
  .text {
    display: inline;
  }
  @media (max-width: 600px) {
    margin-top: 10px;
    padding: 9px 12px;
    .text {
      display: none;
    }
    .icon {
      font-size: 16px;
    }
  }
`;

const InviteBox = styled.div`
  background: ${({ theme }) => theme.mint};
  border: 1px solid ${({ theme }) => theme.mintBorder};
  color: ${({ theme }) => theme.mintDeep};
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  margin-bottom: 12px;
  .label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }
  .code {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 28px;
    font-weight: 700;
    letter-spacing: 0.1em;
  }
`;

const HistoryRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  .lbl {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.textSoft};
    margin-right: 2px;
  }
`;

const HistoryChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px 4px 10px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.surface};
  color: ${({ theme }) => theme.textMuted};
  font-family: ui-monospace, monospace;
  letter-spacing: 0.05em;
  transition: all 0.15s ease;
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.text};
    border-color: ${({ theme }) => theme.borderStrong};
    background: ${({ theme }) => theme.bg};
  }
  .code {
    text-transform: uppercase;
  }
  .x {
    width: 16px;
    height: 16px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    font-size: 9px;
    color: ${({ theme }) => theme.textSoft};
    cursor: pointer;
    &:hover {
      background: ${({ theme }) => theme.surface2};
      color: ${({ theme }) => theme.text};
    }
  }
`;

const PersonalRow = styled.div`
  position: relative;
  margin: 0 0 20px 14px;
  padding: 12px 16px;
  border-left: 2px solid ${({ theme }) => theme.mintBorder};
  background: ${({ theme }) => theme.surface};
  border-radius: 0 12px 12px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  &::before {
    content: '└';
    position: absolute;
    left: -10px;
    top: -6px;
    font-size: 14px;
    color: ${({ theme }) => theme.mintBorder};
    font-family: ui-monospace, monospace;
  }
  .lbl {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.textMuted};
    margin-bottom: 2px;
  }
  .code {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-weight: 700;
    font-size: 18px;
    letter-spacing: 0.1em;
    color: ${({ theme }) => theme.text};
  }
  .copy {
    font-size: 11px;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid ${({ theme }) => theme.border};
    background: ${({ theme }) => theme.bg};
    color: ${({ theme }) => theme.textMuted};
    cursor: pointer;
    &:hover {
      color: ${({ theme }) => theme.text};
    }
  }
`;

export default function OnboardingPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [step, setStep] = useState<Step>('choice');
  const [teamName, setTeamName] = useState('');
  const [nickname, setNickname] = useState(() => readStorage(STORAGE_KEY_NICKNAME));
  const [color, setColor] = useState<string>(TEAM_COLORS[3].hex);
  // Combined `?code=KB-XXXX-YYYY` deep links populate the invite-code
  // field on first render. We seed the state from the URL when present
  // (otherwise fall back to localStorage), then strip `code` from the
  // URL via setSearchParams so the credential doesn't linger in browser
  // history / bookmarks longer than necessary. The user still has to
  // press [입장하기] to actually submit — we never auto-submit a code
  // that came from the URL.
  const [inviteCode, setInviteCode] = useState(() => {
    if (typeof window === 'undefined') return readStorage(STORAGE_KEY_CODE);
    const urlCode = new URLSearchParams(window.location.search).get('code')?.trim().toUpperCase();
    if (urlCode && /^KB-[A-Z2-9]{4,8}(-[A-Z2-9]{4,8})?$/.test(urlCode)) {
      return urlCode;
    }
    return readStorage(STORAGE_KEY_CODE);
  });
  const [history, setHistory] = useState<string[]>(() => readHistory());
  const [createdCode, setCreatedCode] = useState('');
  const [createdPersonalCode, setCreatedPersonalCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedPersonal, setCopiedPersonal] = useState(false);
  const showToast = useUIStore((s) => s.showToast);
  const queryClient = useQueryClient();

  const createTeam = useCreateTeam();
  const joinTeam = useJoinTeam();
  const resumeSession = useResumeSession();

  // Once we've captured `?code=...` into state, strip it from the URL so
  // the secret doesn't sit in the address bar / bookmarks. Also jump
  // straight to the join step so the prefilled code is immediately
  // actionable — otherwise the user lands on the choice screen and the
  // prefill is invisible.
  useEffect(() => {
    if (searchParams.get('code')) {
      setStep('join');
      const next = new URLSearchParams(searchParams);
      next.delete('code');
      setSearchParams(next, { replace: true });
    }
    // We only react to the *initial* URL; subsequent navigation handles
    // its own state. Empty dep list is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchLang = () => {
    const next = i18n.language.startsWith('ko') ? 'en' : 'ko';
    void i18n.changeLanguage(next);
    localStorage.setItem('plc-lang', next);
  };

  const [adminOn, setAdminOn] = useState<boolean>(
    typeof window !== 'undefined' && !!localStorage.getItem('plc-admin-code'),
  );

  const promptAdmin = async () => {
    if (adminOn) {
      if (confirm('관리자 모드를 끌까요?')) {
        localStorage.removeItem('plc-admin-code');
        setAdminOn(false);
        showToast('관리자 모드 해제됨');
      }
      return;
    }
    const code = window.prompt('관리자 코드 입력 (PLC-ADM-...)');
    if (!code) return;
    const { data, error } = await supabase.rpc('verify_admin_code', { p_code: code.trim() });
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    if (data === true) {
      localStorage.setItem('plc-admin-code', code.trim());
      setAdminOn(true);
      showToast('관리자 모드 활성화됨');
    } else {
      showToast('잘못된 관리자 코드', 'error');
    }
  };

  const submitCreate = async () => {
    if (!teamName.trim() || !nickname.trim()) return;
    try {
      const res = await createTeam.mutateAsync({
        teamName: teamName.trim(),
        color,
        nickname: nickname.trim(),
      });
      setCreatedCode(res.invite_code);
      setCreatedPersonalCode(res.personal_code);
      // Save combined code (KB-XXXX-YYYY) for next-visit auto-fill
      const combined = `${res.invite_code}-${res.personal_code}`.toUpperCase();
      writeStorage(STORAGE_KEY_CODE, combined);
      writeStorage(STORAGE_KEY_NICKNAME, nickname.trim());
      setHistory(pushHistory(combined));
      setStep('created');
    } catch (e) {
      showToast((e as Error).message ?? 'Error', 'error');
    }
  };

  /**
   * Pre-populate the my-team cache for the CURRENT (possibly just-anonymous-signed-in)
   * userId so ProtectedRoute sees a non-null team on its first render after navigate.
   * Without this, the query keyed on `['my-team', uuid]` is unset and the bounce-back
   * to /welcome happens before useMyTeam can fetch.
   */
  const primeMyTeamCache = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return;
    await queryClient.fetchQuery({
      queryKey: ['my-team', userId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('team_members')
          .select('*, teams:team_id(*)')
          .eq('user_id', userId)
          .order('joined_at', { ascending: false })
          .limit(1);
        if (error) throw error;
        const row = data?.[0];
        if (!row) return null;
        const team = (row as unknown as { teams: Team }).teams;
        const { teams: _t, ...membership } = row as unknown as TeamMember & { teams: Team };
        return { team, membership };
      },
    });
  };

  const trimmedInvite = inviteCode.trim().toUpperCase();
  const isCombinedCode = COMBINED_CODE_RE.test(trimmedInvite);

  const submitJoin = async () => {
    if (!trimmedInvite) return;
    // Combined code (KB-XXXX-YYYY) → resume existing membership; nickname not required.
    if (isCombinedCode) {
      try {
        await resumeSession.mutateAsync({ combinedCode: trimmedInvite });
        writeStorage(STORAGE_KEY_CODE, trimmedInvite);
        setHistory(pushHistory(trimmedInvite));
        await primeMyTeamCache();
        navigate('/', { replace: true });
      } catch (e) {
        showToast((e as Error).message ?? 'Error', 'error');
      }
      return;
    }
    if (!nickname.trim()) return;
    try {
      await joinTeam.mutateAsync({
        inviteCode: trimmedInvite,
        nickname: nickname.trim(),
      });
      writeStorage(STORAGE_KEY_CODE, trimmedInvite);
      writeStorage(STORAGE_KEY_NICKNAME, nickname.trim());
      setHistory(pushHistory(trimmedInvite));
      await primeMyTeamCache();
      navigate('/', { replace: true });
    } catch (e) {
      showToast((e as Error).message ?? 'Error', 'error');
    }
  };

  const removeHistoryItem = (code: string) => {
    const next = history.filter((c) => c !== code);
    writeStorage(STORAGE_KEY_HISTORY, JSON.stringify(next));
    setHistory(next);
  };

  const copy = async () => {
    // Combine team code + personal code into a single share-friendly string.
    // Example: "KB-XKKP-AXM9" — recipient can split on the second hyphen.
    const combined = createdPersonalCode
      ? `${createdCode}-${createdPersonalCode}`
      : createdCode;
    const ok = await copyToClipboard(combined);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } else {
      showToast(t('toast.copyFail'), 'error');
    }
  };

  return (
    <Screen>
      <Controls>
        <Button
          variant="ghost"
          size="sm"
          onClick={promptAdmin}
          title={adminOn ? '관리자 모드 ON (클릭으로 해제)' : '관리자 코드 입력'}
          style={adminOn ? { color: 'var(--ink, #1a1714)', borderColor: 'var(--ink, #1a1714)' } : undefined}
        >
          {adminOn ? '🛡' : '🔒'}
        </Button>
        <Button variant="ghost" size="sm" onClick={switchLang}>
          {i18n.language.startsWith('ko') ? 'KO' : 'EN'}
        </Button>
      </Controls>

      <Card>
        <Brand>
          <div className="brand">
            Kinderboard <span className="ai">AI</span>
          </div>
        </Brand>

        {step === 'choice' && (
          <>
            <Title>
              <Trans i18nKey="welcome.title" components={{ em: <em />, br: <br /> }} />
            </Title>
            <Sub>
              <Trans i18nKey="welcome.sub" components={{ br: <br /> }} />
            </Sub>
            <ChoiceGroup>
              <ChoiceBtn onClick={() => navigate('/browse')}>
                <Icon tint="#F6DDD3">👀</Icon>
                <TextGrow>
                  <div className="t">그냥 둘러보기</div>
                  <div className="d">팀 코드 없이 공개 보드를 둘러봐요</div>
                </TextGrow>
                <Arrow>→</Arrow>
              </ChoiceBtn>
              <ChoiceBtn onClick={() => setStep('create')}>
                <Icon tint="#FFE8D6">✨</Icon>
                <TextGrow>
                  <div className="t">{t('welcome.createTitle')}</div>
                  <div className="d">{t('welcome.createDesc')}</div>
                </TextGrow>
                <Arrow>→</Arrow>
              </ChoiceBtn>
              <ChoiceBtn onClick={() => setStep('join')}>
                <Icon tint="#D4E3D0">🔑</Icon>
                <TextGrow>
                  <div className="t">{t('welcome.joinTitle')}</div>
                  <div className="d">팀 코드 또는 결합 코드로 들어가요</div>
                </TextGrow>
                <Arrow>→</Arrow>
              </ChoiceBtn>
            </ChoiceGroup>
          </>
        )}

        {step === 'create' && (
          <>
            <Title>{t('create.title')}</Title>
            <Sub>{t('create.sub')}</Sub>
            <Field>
              <Label>{t('create.teamName')}</Label>
              <Input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder={t('create.teamNamePh')}
                maxLength={40}
              />
            </Field>
            <Field>
              <Label>{t('create.teamColor')}</Label>
              <ColorRow>
                {TEAM_COLORS.map((c) => (
                  <ColorDot
                    key={c.hex}
                    hex={c.hex}
                    selected={color === c.hex}
                    onClick={() => setColor(c.hex)}
                    title={c.name}
                    aria-label={c.name}
                  />
                ))}
              </ColorRow>
            </Field>
            <Field>
              <Label>{t('common.nickname')}</Label>
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={t('create.nicknamePh')}
                maxLength={20}
              />
              <FieldHint>{t('common.nicknameHint')}</FieldHint>
            </Field>
            <Actions>
              <Button variant="secondary" onClick={() => setStep('choice')}>
                {t('common.back')}
              </Button>
              <Button
                onClick={submitCreate}
                disabled={createTeam.isPending || !teamName.trim() || !nickname.trim()}
              >
                {t('create.submit')}
              </Button>
            </Actions>
          </>
        )}

        {step === 'join' && (
          <>
            <Title>{t('join.title')}</Title>
            <Sub>{t('join.sub')}</Sub>
            <Field>
              <Label>{t('join.code')}</Label>
              <Input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="KB-XXXX 또는 KB-XXXX-YYYY"
                maxLength={20}
                style={{ textTransform: 'uppercase', fontFamily: 'ui-monospace, monospace' }}
              />
              <FieldHint>
                팀 코드(<b>KB-XXXX</b>)는 새로 참여, 결합 코드(<b>KB-XXXX-YYYY</b>)는 같은
                사용자로 복귀해요
              </FieldHint>
              {history.length > 0 && (
                <HistoryRow>
                  <span className="lbl">최근 사용</span>
                  {history.map((c) => (
                    <HistoryChip key={c} type="button" onClick={() => setInviteCode(c)}>
                      <span className="code">{c}</span>
                      <span
                        className="x"
                        role="button"
                        aria-label="삭제"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeHistoryItem(c);
                        }}
                      >
                        ✕
                      </span>
                    </HistoryChip>
                  ))}
                </HistoryRow>
              )}
            </Field>
            {!isCombinedCode && (
              <Field>
                <Label>{t('common.nickname')}</Label>
                <Input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={t('create.nicknamePh')}
                  maxLength={20}
                />
                <FieldHint>{t('common.nicknameHint')}</FieldHint>
              </Field>
            )}
            <Actions>
              <Button variant="secondary" onClick={() => setStep('choice')}>
                {t('common.back')}
              </Button>
              <Button
                onClick={submitJoin}
                disabled={
                  (isCombinedCode ? resumeSession.isPending : joinTeam.isPending) ||
                  !inviteCode.trim() ||
                  (!isCombinedCode && !nickname.trim())
                }
              >
                {isCombinedCode
                  ? resumeSession.isPending
                    ? '확인 중...'
                    : '복귀하기 →'
                  : t('join.submit')}
              </Button>
            </Actions>
            <BrowseLink type="button" onClick={() => navigate('/browse')} aria-label={t('join.browse')}>
              <span className="icon">👀</span>
              <span className="text">{t('join.browse')}</span>
            </BrowseLink>
          </>
        )}

        {step === 'created' && (
          <>
            <Title>{t('created.title')}</Title>
            <Sub>{t('created.sub')}</Sub>
            <InviteBox>
              <div className="label">{t('created.codeLabel')}</div>
              <div className="code">{createdCode}</div>
            </InviteBox>
            <PersonalRow>
              <div>
                <div className="lbl">내 개인 코드</div>
                <div className="code">{createdPersonalCode}</div>
              </div>
              <button
                className="copy"
                type="button"
                onClick={async () => {
                  // Always combine: KB-XKKP-AXM9
                  const combined = createdPersonalCode
                    ? `${createdCode}-${createdPersonalCode}`
                    : createdCode;
                  const ok = await copyToClipboard(combined);
                  if (ok) {
                    setCopiedPersonal(true);
                    setTimeout(() => setCopiedPersonal(false), 1500);
                  } else {
                    showToast(t('toast.copyFail'), 'error');
                  }
                }}
                title="팀 + 개인 코드 결합 복사"
              >
                {copiedPersonal ? '✓ 복사됨' : '결합 복사'}
              </button>
            </PersonalRow>
            <Actions>
              <Button variant="secondary" onClick={copy}>
                {copied ? t('created.copied') : t('created.copy')}
              </Button>
              <Button
                onClick={async () => {
                  await primeMyTeamCache();
                  navigate('/', { replace: true });
                }}
              >
                {t('created.enter')}
              </Button>
            </Actions>
          </>
        )}
      </Card>
    </Screen>
  );
}
