import styled from '@emotion/styled';

const Wrap = styled.div`
  display: grid;
  place-items: center;
  min-height: 100vh;
  color: ${({ theme }) => theme.textMuted};
  font-size: 14px;
`;

export function LoadingScreen({ label = '…' }: { label?: string }) {
  return <Wrap>{label}</Wrap>;
}
