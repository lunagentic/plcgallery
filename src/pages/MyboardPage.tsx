import styled from '@emotion/styled';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

const Container = styled.div`
  max-width: 560px;
  margin: 0 auto;
  padding: 80px 24px;
  text-align: center;
`;

const Badge = styled.span`
  display: inline-block;
  padding: 6px 14px;
  border-radius: 999px;
  background: ${({ theme }) => theme.mint};
  color: ${({ theme }) => theme.mintDeep};
  border: 1px solid ${({ theme }) => theme.mintBorder};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.15em;
  margin-bottom: 20px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 16px;
`;

const Desc = styled.p`
  color: ${({ theme }) => theme.textMuted};
  font-size: 14px;
  line-height: 1.7;
  margin-bottom: 24px;
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: center;
`;

export default function MyboardPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  return (
    <Container>
      <Badge>{t('myboard.badge')}</Badge>
      <Title>{t('myboard.title')}</Title>
      <Desc>{t('myboard.desc')}</Desc>
      <Actions>
        <Button variant="secondary" onClick={() => nav('/')}>
          {t('myboard.goHome')}
        </Button>
        <Button onClick={() => nav('/teamboard')}>{t('myboard.goTeamboard')}</Button>
      </Actions>
    </Container>
  );
}
