import styled from '@emotion/styled';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useMoodboards } from '@/hooks/useMoodboards';
import { MOODBOARD_CATEGORIES, type MoodboardCategory } from '@/types/database';

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(20, 17, 13, 0.42);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  padding: 32px 16px;
  animation: fadeIn 180ms ease;
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const Sheet = styled.div`
  width: 100%;
  max-width: 460px;
  max-height: calc(100vh - 64px);
  overflow-y: auto;
  background: ${({ theme }) => theme.paper};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 20px;
  padding: 28px 26px 22px;
  box-shadow: ${({ theme }) => theme.shadowLg};
  animation: rise 220ms cubic-bezier(0.2, 0.85, 0.25, 1);
  @keyframes rise {
    from { transform: translateY(8px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`;

const Title = styled.h2`
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 28px;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.ink};
  margin-bottom: 6px;
`;

const Sub = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.ink2};
  margin-bottom: 20px;
  line-height: 1.55;
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 22px;
  button {
    flex: 1;
  }
`;

const ListSection = styled.div`
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid ${({ theme }) => theme.border};
`;

const ListHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
  .t {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: ${({ theme }) => theme.ink2};
    text-transform: uppercase;
  }
  .c {
    font-size: 11px;
    color: ${({ theme }) => theme.ink3};
    font-family: 'JetBrains Mono', ui-monospace, monospace;
  }
`;

const List = styled.div`
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.surface};
`;

const ListItem = styled.button`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  width: 100%;
  text-align: left;
  padding: 10px 14px;
  background: transparent;
  border: 0;
  border-bottom: 1px solid ${({ theme }) => theme.border};
  cursor: pointer;
  transition: background 0.12s ease;
  &:last-child {
    border-bottom: 0;
  }
  &:hover {
    background: ${({ theme }) => theme.surface2};
  }
  .title {
    font-size: 13px;
    font-weight: 700;
    color: ${({ theme }) => theme.ink};
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .meta {
    font-size: 11px;
    color: ${({ theme }) => theme.ink3};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .badge {
    align-self: center;
    font-size: 10px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 999px;
    background: ${({ theme }) => theme.brandSoft};
    color: ${({ theme }) => theme.ink};
    white-space: nowrap;
  }
`;


interface Props {
  onClose: () => void;
  /** Kept for API compatibility — currently never invoked since creation is disabled. */
  onCreated?: (moodboardId: string) => void;
}

const ComingSoon = styled.div`
  padding: 28px 22px;
  border-radius: 16px;
  border: 1px dashed ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.surface};
  text-align: center;
  margin-bottom: 8px;
  .badge {
    display: inline-block;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.brand};
    padding: 4px 10px;
    border-radius: 999px;
    background: ${({ theme }) => theme.brandSoft};
    margin-bottom: 12px;
  }
  .t {
    font-size: 15px;
    font-weight: 700;
    color: ${({ theme }) => theme.ink};
    margin-bottom: 6px;
  }
  .d {
    font-size: 12px;
    color: ${({ theme }) => theme.ink2};
    line-height: 1.6;
  }
`;

const ComingBadge = styled.span`
  align-self: center;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.brandSoft};
  color: ${({ theme }) => theme.brand};
  letter-spacing: 0.08em;
  white-space: nowrap;
`;

const DisabledItem = styled(ListItem)`
  cursor: not-allowed;
  opacity: 0.6;
  &:hover {
    background: transparent;
  }
`;

export function CreateMoodboardModal({ onClose }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: allMoodboards = [] } = useMoodboards();

  // Pick the canonical (first) moodboard per category as the navigation target
  // when a user taps a category row in the list.
  const firstMoodboardByCategory = useMemo(() => {
    const map = {} as Partial<Record<MoodboardCategory, string>>;
    for (const mb of allMoodboards) {
      const cat = (mb.category ?? 'inquiry') as MoodboardCategory;
      if (!map[cat]) map[cat] = mb.id;
    }
    return map;
  }, [allMoodboards]);

  return (
    <Backdrop onClick={(e) => e.target === e.currentTarget && onClose()}>
      <Sheet>
        <Title>{t('mb_modal.title')}</Title>
        <Sub>{t('mb_modal.sub')}</Sub>

        <ComingSoon>
          <span className="badge">Coming Soon</span>
          <div className="t">{t('mb_modal.coming_title')}</div>
          <div className="d">{t('mb_modal.coming_desc')}</div>
        </ComingSoon>

        <Actions>
          <Button variant="secondary" onClick={onClose}>
            {t('mb_modal.cancel')}
          </Button>
        </Actions>

        <ListSection>
          <ListHeader>
            <span className="t">{t('mb_modal.list_header')}</span>
            <span className="c">{MOODBOARD_CATEGORIES.length}</span>
          </ListHeader>
          <List>
            {MOODBOARD_CATEGORIES.map((cat) => {
              const targetId = firstMoodboardByCategory[cat];
              return (
                <ListItem
                  key={cat}
                  type="button"
                  onClick={() => {
                    if (!targetId) return;
                    onClose();
                    navigate(`/moodboards/${targetId}`);
                  }}
                >
                  <div className="title">{t(`filter.${cat}`)}</div>
                </ListItem>
              );
            })}
            <DisabledItem
              type="button"
              disabled
              title="서비스 준비중"
              onClick={(e) => e.preventDefault()}
            >
              <div className="title">+ 직접 생성</div>
              <ComingBadge>준비중</ComingBadge>
            </DisabledItem>
          </List>
        </ListSection>
      </Sheet>
    </Backdrop>
  );
}
