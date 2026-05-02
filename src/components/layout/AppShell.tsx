import { Outlet } from 'react-router-dom';
import styled from '@emotion/styled';
import { Topbar } from './Topbar';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.bg};
`;

const Main = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

export function AppShell() {
  return (
    <Container>
      <Topbar />
      <Main>
        <Outlet />
      </Main>
    </Container>
  );
}
