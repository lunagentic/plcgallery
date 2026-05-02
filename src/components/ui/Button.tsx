import styled from '@emotion/styled';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export const Button = styled.button<{ variant?: ButtonVariant; size?: 'sm' | 'md' | 'lg' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 999px;
  font-weight: 600;
  transition: all 0.15s ease;
  cursor: pointer;
  white-space: nowrap;
  padding: ${({ size = 'md' }) =>
    size === 'sm' ? '8px 14px' : size === 'lg' ? '14px 28px' : '10px 20px'};
  font-size: ${({ size = 'md' }) => (size === 'sm' ? '12px' : size === 'lg' ? '15px' : '13px')};
  background: ${({ theme, variant = 'primary' }) =>
    variant === 'primary' ? theme.cta : variant === 'secondary' ? theme.surface : 'transparent'};
  color: ${({ theme, variant = 'primary' }) =>
    variant === 'primary' ? theme.ctaText : theme.text};
  border: 1px solid
    ${({ theme, variant = 'primary' }) =>
      variant === 'secondary'
        ? theme.border
        : variant === 'ghost'
          ? 'transparent'
          : 'transparent'};

  &:hover:not(:disabled) {
    background: ${({ theme, variant = 'primary' }) =>
      variant === 'primary' ? theme.ctaHover : theme.surface2};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
