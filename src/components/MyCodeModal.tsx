import styled from '@emotion/styled';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { copyToClipboard } from '@/lib/clipboard';

/**
 * "내 입장 코드" modal.
 *
 * The app uses `KB-XXXX-YYYY` (team invite_code + per-user personal_code)
 * as the only credential. The combined code is stored in localStorage on
 * the device the user first joined from, so switching devices used to
 * leave members stuck on `/welcome` with no way to log back in — they had
 * to remember and retype a code they were never explicitly shown.
 *
 * This modal solves that by surfacing the code anywhere the avatar is
 * visible: tap the avatar → see your code, copy it, copy a `?code=...`
 * share link, or sign out from one place. The code is masked by default
 * (shoulder-surfing guard) and reveals on the eye button.
 */

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(20, 17, 13, 0.55);
  backdrop-filter: blur(8px);
  display: grid;
  place-items: center;
  padding: 24px;
  animation: backdropIn 0.18s ease;
  @keyframes backdropIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const Sheet = styled.div`
  width: 100%;
  max-width: 460px;
  padding: 24px 26px 22px;
  border-radius: 20px;
  background: ${({ theme }) => theme.paper};
  border: 1px solid ${({ theme }) => theme.border};
  box-shadow: ${({ theme }) => theme.shadowLg};
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  animation: sheetIn 0.22s cubic-bezier(0.2, 0.85, 0.25, 1);
  @keyframes sheetIn {
    from { transform: translateY(8px) scale(0.98); opacity: 0; }
    to   { transform: translateY(0) scale(1); opacity: 1; }
  }
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  h3 {
    margin: 0;
    font-family: 'Fraunces', serif;
    font-style: italic;
    font-size: 22px;
    font-weight: 500;
    color: ${({ theme }) => theme.ink};
  }
  .sub {
    margin: 4px 0 0;
    font-size: 12px;
    color: ${({ theme }) => theme.textMuted};
    line-height: 1.5;
  }
`;

const CloseBtn = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: transparent;
  border: 0;
  color: ${({ theme }) => theme.textMuted};
  font-size: 16px;
  cursor: pointer;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  &:hover {
    background: ${({ theme }) => theme.surface};
    color: ${({ theme }) => theme.text};
  }
`;

const CodeBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 12px;
  background: ${({ theme }) => theme.surface};
  border: 1px solid ${({ theme }) => theme.border};
  font-family: 'SF Mono', 'Menlo', monospace;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.ink};
  letter-spacing: 0.05em;
  font-variant-numeric: tabular-nums;
  word-break: break-all;
  .value { flex: 1; min-width: 0; }
`;

const EyeBtn = styled.button`
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: transparent;
  border: 0;
  color: ${({ theme }) => theme.textMuted};
  font-size: 14px;
  cursor: pointer;
  display: grid;
  place-items: center;
  &:hover {
    background: ${({ theme }) => theme.surface2};
    color: ${({ theme }) => theme.text};
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  button {
    flex: 1;
    min-width: 130px;
    padding: 10px 14px;
    border-radius: 999px;
    border: 1px solid ${({ theme }) => theme.border};
    background: ${({ theme }) => theme.surface};
    color: ${({ theme }) => theme.text};
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    &:hover {
      background: ${({ theme }) => theme.surface2};
      border-color: ${({ theme }) => theme.borderStrong};
    }
    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  }
  button.primary {
    background: ${({ theme }) => theme.brand};
    color: ${({ theme }) => theme.ctaText};
    border-color: ${({ theme }) => theme.brand};
    &:hover {
      background: ${({ theme }) => theme.ctaHover};
      border-color: ${({ theme }) => theme.ctaHover};
    }
  }
`;

const Notice = styled.div`
  font-size: 12px;
  line-height: 1.55;
  color: ${({ theme }) => theme.textMuted};
  background: ${({ theme }) => theme.surface};
  border-left: 3px solid ${({ theme }) => theme.brand};
  padding: 10px 12px;
  border-radius: 0 8px 8px 0;
  strong { color: ${({ theme }) => theme.text}; font-weight: 700; }
`;

const Divider = styled.hr`
  border: 0;
  border-top: 1px solid ${({ theme }) => theme.border};
  margin: 4px 0 0;
`;

const SignOutBtn = styled.button`
  align-self: flex-end;
  padding: 8px 14px;
  border-radius: 999px;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.border};
  color: ${({ theme }) => theme.textMuted};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    background: rgba(220, 38, 38, 0.08);
    border-color: rgba(220, 38, 38, 0.4);
    color: #b91c1c;
  }
`;

const MemberLine = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.text};
  .team {
    color: ${({ theme }) => theme.textMuted};
  }
  .dot {
    color: ${({ theme }) => theme.textSoft};
  }
`;

interface MyCodeModalProps {
  onClose: () => void;
  onSignOut: () => void;
}

function maskCode(code: string): string {
  // Mask everything after the second `-` (the personal code half).
  // Keep team invite_code visible so users can recognize their team
  // at a glance even when the personal half is hidden.
  const i = code.indexOf('-', code.indexOf('-') + 1);
  if (i < 0) return code;
  return `${code.slice(0, i + 1)}••••`;
}

export function MyCodeModal({ onClose, onSignOut }: MyCodeModalProps) {
  const team = useAuthStore((s) => s.team);
  const membership = useAuthStore((s) => s.membership);
  const showToast = useUIStore((s) => s.showToast);
  const [revealed, setRevealed] = useState(false);

  // Esc to close — modal pattern consistency with EditSheet in Viewer.tsx.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const inviteCode = team?.invite_code ?? '';
  const personalCode = membership?.personal_code ?? '';
  const combinedCode =
    inviteCode && personalCode ? `${inviteCode}-${personalCode}`.toUpperCase() : '';
  const hasCombined = !!combinedCode;
  const displayCode = combinedCode || inviteCode || '— 코드를 불러오는 중 —';
  const isMaskable = hasCombined;
  const shown = revealed || !isMaskable ? displayCode : maskCode(displayCode);

  const shareLink = hasCombined
    ? `${window.location.origin}/welcome?code=${combinedCode}`
    : '';

  const handleCopyCode = async () => {
    if (!combinedCode && !inviteCode) return;
    const ok = await copyToClipboard(combinedCode || inviteCode);
    showToast(
      ok ? '코드를 복사했어요' : '복사에 실패했어요',
      ok ? 'success' : 'error',
    );
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;
    const ok = await copyToClipboard(shareLink);
    showToast(
      ok ? '공유 링크를 복사했어요' : '복사에 실패했어요',
      ok ? 'success' : 'error',
    );
  };

  return (
    <Backdrop
      role="dialog"
      aria-modal
      aria-label="내 입장 코드"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <Sheet>
        <Header>
          <div>
            <h3>내 입장 코드</h3>
            <p className="sub">
              다른 기기에서 이 코드를 입력하면 같은 계정으로 들어올 수 있어요.
            </p>
          </div>
          <CloseBtn type="button" onClick={onClose} aria-label="닫기">
            ✕
          </CloseBtn>
        </Header>

        {(team || membership) && (
          <MemberLine>
            <strong>{membership?.nickname ?? '이름 없음'}</strong>
            <span className="dot">·</span>
            <span className="team">{team?.name ?? '팀'}</span>
          </MemberLine>
        )}

        <CodeBox>
          <span className="value">{shown}</span>
          {isMaskable && (
            <EyeBtn
              type="button"
              onClick={() => setRevealed((v) => !v)}
              aria-label={revealed ? '코드 가리기' : '코드 보이기'}
              title={revealed ? '가리기' : '보이기'}
            >
              {revealed ? '🙈' : '👁'}
            </EyeBtn>
          )}
        </CodeBox>

        <Actions>
          <button
            type="button"
            className="primary"
            onClick={handleCopyCode}
            disabled={!combinedCode && !inviteCode}
          >
            코드 복사
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            disabled={!shareLink}
            title={shareLink || '조합 코드가 있는 계정만 공유 링크를 만들 수 있어요'}
          >
            공유 링크 복사
          </button>
        </Actions>

        {hasCombined ? (
          <Notice>
            <strong>주의:</strong> 이 코드는 비밀번호와 같아요. 본인 외에는
            공유하지 마세요. 코드를 다른 사람에게 알려주면 같은 계정으로 누구나
            로그인할 수 있어요.
          </Notice>
        ) : (
          <Notice>
            아직 개인 코드(YYYY)가 발급되지 않은 계정이에요. 한 번 더 로그인하면
            자동으로 발급되고 다음부터 이 화면에서 공유할 수 있어요.
          </Notice>
        )}

        <Divider />

        <SignOutBtn
          type="button"
          onClick={() => {
            onClose();
            onSignOut();
          }}
        >
          로그아웃
        </SignOutBtn>
      </Sheet>
    </Backdrop>
  );
}
