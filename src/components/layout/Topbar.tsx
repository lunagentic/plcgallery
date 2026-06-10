import styled from '@emotion/styled';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useUIStore } from '@/store/uiStore';
import { MyCodeModal } from '@/components/MyCodeModal';

const Bar = styled.header`
  position: sticky;
  top: 0;
  z-index: 50;
  background: ${({ theme }) => theme.bg}cc;
  border-bottom: 1px solid ${({ theme }) => theme.border};
  backdrop-filter: saturate(160%) blur(12px);
`;

const Inner = styled.div`
  max-width: 1440px;
  margin: 0 auto;
  padding: 14px 32px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 32px;
  @media (max-width: 900px) {
    padding: 12px 20px;
    gap: 16px;
  }
  /* Phones: keep the 3-track grid so the centered nav is reachable, but
   *  tighten gap + padding so everything fits in one line. The Korean
   *  vertical-stack bug is held off by the nowrap/flex-shrink rules on
   *  Nav/NavItem (see below) rather than by hiding the nav. */
  @media (max-width: 700px) {
    padding: 10px 10px;
    gap: 6px;
  }
`;

const Logo = styled(Link)`
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 16px;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.text};
  flex-shrink: 0;
  white-space: nowrap;
  em {
    color: ${({ theme }) => theme.brand};
    font-style: normal;
  }
`;

const Nav = styled.nav`
  display: flex;
  gap: 8px;
  justify-content: center;
  white-space: nowrap;
  min-width: 0;
  @media (max-width: 700px) {
    gap: 2px;
  }
`;

const NavItem = styled(NavLink)`
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.textMuted};
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s ease;
  &:hover {
    color: ${({ theme }) => theme.text};
    background: ${({ theme }) => theme.surface};
  }
  &.active {
    color: ${({ theme }) => theme.text};
    background: ${({ theme }) => theme.surface2};
  }
  @media (max-width: 700px) {
    padding: 6px 8px;
    font-size: 12px;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
`;

const IconBtn = styled.button`
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.border};
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.textMuted};
  display: inline-flex;
  align-items: center;
  gap: 6px;
  &:hover {
    color: ${({ theme }) => theme.text};
    border-color: ${({ theme }) => theme.borderStrong};
  }
  @media (max-width: 700px) {
    padding: 6px 8px;
    font-size: 11px;
  }
`;

const Avatar = styled.button<{ bg: string }>`
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: ${({ bg }) => bg};
  color: ${({ theme }) => theme.text};
  font-weight: 700;
  font-size: 12px;
  display: grid;
  place-items: center;
  border: 1px solid ${({ theme }) => theme.border};
`;

const JoinCta = styled(Link)`
  padding: 8px 14px;
  border-radius: 999px;
  background: ${({ theme }) => theme.cta};
  color: ${({ theme }) => theme.ctaText};
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
  &:hover {
    background: ${({ theme }) => theme.ctaHover};
  }
  @media (max-width: 700px) {
    padding: 6px 10px;
    font-size: 11px;
  }
`;

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(20, 17, 13, 0.5);
  backdrop-filter: blur(2px);
  display: grid;
  place-items: center;
  padding: 24px;
`;

const Modal = styled.form`
  width: 100%;
  max-width: 360px;
  background: ${({ theme }) => theme.bg};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
  h3 {
    margin: 0 0 6px;
    font-size: 16px;
    font-weight: 800;
    color: ${({ theme }) => theme.text};
  }
  p {
    margin: 0 0 16px;
    font-size: 13px;
    color: ${({ theme }) => theme.textMuted};
    line-height: 1.5;
  }
`;

const CodeInput = styled.input`
  width: 100%;
  padding: 11px 14px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.surface};
  color: ${({ theme }) => theme.text};
  font-size: 14px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  letter-spacing: 0.02em;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.borderStrong};
  }
`;

const ModalActions = styled.div`
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

const ModalBtn = styled.button<{ primary?: boolean; danger?: boolean }>`
  padding: 9px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid
    ${({ primary, danger, theme }) =>
      danger ? 'rgba(220,38,38,0.4)' : primary ? 'transparent' : theme.border};
  background: ${({ primary, danger, theme }) =>
    danger ? 'rgba(220,38,38,0.12)' : primary ? theme.ink : 'transparent'};
  color: ${({ primary, danger, theme }) =>
    danger ? '#b91c1c' : primary ? theme.bg : theme.textMuted};
  &:hover {
    border-color: ${({ theme }) => theme.borderStrong};
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

export function Topbar() {
  const { t, i18n } = useTranslation();
  const team = useAuthStore((s) => s.team);
  const membership = useAuthStore((s) => s.membership);
  const reset = useAuthStore((s) => s.reset);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const initial = (membership?.nickname ?? '?').charAt(0).toUpperCase();
  const dot = team?.color ?? '#F2EFE9';

  const switchLang = () => {
    const next = i18n.language.startsWith('ko') ? 'en' : 'ko';
    void i18n.changeLanguage(next);
    localStorage.setItem('plc-lang', next);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('plc-saved-invite-code');
    localStorage.removeItem('plc-saved-nickname');
    reset();
    qc.clear();
    navigate('/welcome', { replace: true });
  };

  const showToast = useUIStore((s) => s.showToast);
  const [adminOn, setAdminOn] = useState<boolean>(
    typeof window !== 'undefined' && !!localStorage.getItem('plc-admin-code'),
  );
  // Avatar click used to fire `signOut` directly — easy to mis-tap, and
  // gave the user no path to see their own combined code. Now we open
  // MyCodeModal instead; the modal contains the sign-out button so the
  // destructive action moves behind one extra deliberate click.
  const [showCodeModal, setShowCodeModal] = useState(false);
  // In-app admin dialog — replaces the native window.prompt/confirm, which
  // browsers can silently suppress ("이 페이지가 추가 대화상자를 표시하지
  // 못하게 차단") and which can't be styled.
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [verifying, setVerifying] = useState(false);

  /** Guest mode: no team context. Hide team-only nav, show join CTA. */
  const guest = !team;
  const homeTo = guest ? '/browse' : '/';

  const openAdminDialog = () => {
    setCodeInput('');
    setAdminDialogOpen(true);
  };

  // A reload lets every screen re-read the admin flag from localStorage so the
  // per-post "메인 노출" toggles appear / disappear without extra plumbing.
  const turnOffAdmin = () => {
    localStorage.removeItem('plc-admin-code');
    setAdminOn(false);
    window.location.reload();
  };

  const submitAdminCode = async (e: FormEvent) => {
    e.preventDefault();
    const code = codeInput.trim();
    if (!code || verifying) return;
    setVerifying(true);
    try {
      const { data, error } = await supabase.rpc('verify_admin_code', { p_code: code });
      if (error) {
        showToast(error.message, 'error');
        return;
      }
      if (data === true) {
        localStorage.setItem('plc-admin-code', code);
        setAdminOn(true);
        window.location.reload();
      } else {
        showToast('잘못된 관리자 코드', 'error');
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Bar>
      <Inner>
        <Logo to={homeTo}>
          <span>
            KinderBoard <em>PLC</em>
          </span>
        </Logo>
        <Nav>
          <NavItem to={homeTo} end>
            {t('nav.discover')}
          </NavItem>
          {!guest && <NavItem to="/teamboard">{t('nav.team')}</NavItem>}
          {!guest && <NavItem to="/myboard">{t('nav.myMoodboards')}</NavItem>}
        </Nav>
        <Actions>
          <IconBtn
            onClick={openAdminDialog}
            title={adminOn ? '관리자 모드 ON (클릭하면 관리)' : '관리자 코드 입력'}
            style={adminOn ? { borderColor: 'var(--ink, #1a1714)', color: 'var(--ink, #1a1714)' } : undefined}
          >
            {adminOn ? '🛡' : '🔒'}
          </IconBtn>
          <IconBtn onClick={switchLang}>{i18n.language.startsWith('ko') ? 'KO' : 'EN'}</IconBtn>
          {guest ? (
            <JoinCta to="/welcome">입장하기</JoinCta>
          ) : (
            <Avatar
              bg={dot}
              title={
                membership
                  ? `${membership.nickname} · ${team?.name ?? ''}\n클릭하면 내 입장 코드 보기 / 로그아웃`
                  : '내 입장 코드 보기'
              }
              onClick={() => setShowCodeModal(true)}
            >
              {initial}
            </Avatar>
          )}
        </Actions>
      </Inner>
      {showCodeModal && (
        <MyCodeModal
          onClose={() => setShowCodeModal(false)}
          onSignOut={signOut}
        />
      )}

      {adminDialogOpen && (
        <Backdrop
          onClick={(e) => e.target === e.currentTarget && setAdminDialogOpen(false)}
        >
          <Modal onSubmit={submitAdminCode}>
            {adminOn ? (
              <>
                <h3>관리자 모드</h3>
                <p>관리자 모드가 켜져 있어요. 끄면 각 게시물의 ‘메인 노출’ 버튼이 사라집니다.</p>
                <ModalActions>
                  <ModalBtn type="button" onClick={() => setAdminDialogOpen(false)}>
                    닫기
                  </ModalBtn>
                  <ModalBtn type="button" danger onClick={turnOffAdmin}>
                    관리자 모드 끄기
                  </ModalBtn>
                </ModalActions>
              </>
            ) : (
              <>
                <h3>관리자 코드 입력</h3>
                <p>관리자 코드를 입력하면 메인 노출을 관리할 수 있어요.</p>
                <CodeInput
                  autoFocus
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="PLC-ADM-..."
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                />
                <ModalActions>
                  <ModalBtn type="button" onClick={() => setAdminDialogOpen(false)}>
                    취소
                  </ModalBtn>
                  <ModalBtn type="submit" primary disabled={!codeInput.trim() || verifying}>
                    {verifying ? '확인 중…' : '확인'}
                  </ModalBtn>
                </ModalActions>
              </>
            )}
          </Modal>
        </Backdrop>
      )}
    </Bar>
  );
}
