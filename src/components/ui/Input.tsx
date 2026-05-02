import styled from '@emotion/styled';

export const Input = styled.input`
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.surface};
  color: ${({ theme }) => theme.text};
  font-size: 14px;
  transition: border-color 0.15s ease;

  &::placeholder {
    color: ${({ theme }) => theme.textSoft};
  }
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.brand};
  }
`;

export const Label = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.textMuted};
  margin-bottom: 6px;
`;

export const Field = styled.div`
  margin-bottom: 16px;
`;

export const FieldHint = styled.p`
  font-size: 11px;
  color: ${({ theme }) => theme.textSoft};
  margin-top: 6px;
  b {
    color: ${({ theme }) => theme.text};
  }
`;
