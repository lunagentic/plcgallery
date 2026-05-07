import styled from '@emotion/styled';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useUIStore } from '@/store/uiStore';

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
`;

const Logo = styled(Link)`
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 16px;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.text};
  em {
    color: ${({ theme }) => theme.brand};
    font-style: normal;
  }
`;

const Nav = styled.nav`
  display: flex;
  gap: 8px;
  justify-content: center;
`;

const NavItem = styled(NavLink)`
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.textMuted};
  transition: all 0.15s ease;
  &:hover {
    color: ${({ theme }) => theme.text};
    background: ${({ theme }) => theme.surface};
  }
  &.active {
    color: ${({ theme }) => theme.text};
    background: ${({ theme }) => theme.surface2};
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
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
  &:hover {
    background: ${({ theme }) => theme.ctaHover};
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

  /** Guest mode: no team context. Hide team-only nav, show join CTA. */
  const guest = !team;
  const homeTo = guest ? '/browse' : '/';

  const promptAdmin = async () => {
    // If already admin, double-click to clear
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
            onClick={promptAdmin}
            title={adminOn ? '관리자 모드 ON (클릭으로 해제)' : '관리자 코드 입력'}
            style={adminOn ? { borderColor: 'var(--ink, #1a1714)', color: 'var(--ink, #1a1714)' } : undefined}
          >
            {adminOn ? '🛡' : '🔒'}
          </IconBtn>
          <IconBtn onClick={switchLang}>{i18n.language.startsWith('ko') ? 'KO' : 'EN'}</IconBtn>
          {guest ? (
            <JoinCta to="/welcome">팀에 들어가기 →</JoinCta>
          ) : (
            <Avatar
              bg={dot}
              title={
                membership
                  ? `${membership.nickname}${membership.personal_code ? ` · ${membership.personal_code}` : ''} · ${team?.invite_code ?? ''}\n클릭하면 로그아웃`
                  : ''
              }
              onClick={signOut}
            >
              {initial}
            </Avatar>
          )}
        </Actions>
      </Inner>
    </Bar>
  );
}
