import styled from '@emotion/styled';
import { useUIStore } from '@/store/uiStore';

const Host = styled.div`
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
`;

const Item = styled.div<{ variant: 'success' | 'error' | 'info' }>`
  pointer-events: auto;
  padding: 10px 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  box-shadow: ${({ theme }) => theme.shadowMd};
  color: ${({ variant, theme }) =>
    variant === 'error' ? '#fff' : variant === 'info' ? theme.text : '#fff'};
  background: ${({ variant, theme }) =>
    variant === 'error' ? '#E03131' : variant === 'info' ? theme.surface : theme.brand};
  border: 1px solid
    ${({ variant, theme }) => (variant === 'info' ? theme.border : 'transparent')};
  animation: toastIn 200ms ease;
  @keyframes toastIn {
    from {
      transform: translateY(-8px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

export function ToastHost() {
  const toasts = useUIStore((s) => s.toasts);
  return (
    <Host>
      {toasts.map((t) => (
        <Item key={t.id} variant={t.variant}>
          {t.message}
        </Item>
      ))}
    </Host>
  );
}
