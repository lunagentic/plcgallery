import styled from '@emotion/styled';
import { useTranslation } from 'react-i18next';

export type FilterKey = 'all' | 'activities' | 'environment' | 'play' | 'inquiry' | 'parents' | 'annual';

const FILTERS: FilterKey[] = ['all', 'activities', 'environment', 'play', 'inquiry', 'parents', 'annual'];

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const Group = styled.div`
  display: flex;
  gap: 4px;
  padding: 4px;
  background: ${({ theme }) => theme.surface};
  border-radius: 999px;
`;

const Chip = styled.button<{ active: boolean }>`
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 999px;
  background: ${({ active, theme }) => (active ? theme.text : 'transparent')};
  color: ${({ active, theme }) => (active ? theme.bg : theme.textMuted)};
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    color: ${({ active, theme }) => (active ? theme.bg : theme.text)};
  }
`;

const MetaWrap = styled.div`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.textSoft};
  font-variant-numeric: tabular-nums;
`;

const AddBtn = styled.button`
  width: 26px;
  height: 26px;
  border-radius: 999px;
  border: 1px dashed ${({ theme }) => theme.border};
  background: transparent;
  color: ${({ theme }) => theme.textMuted};
  font-size: 16px;
  line-height: 1;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.15s ease;
  &:hover {
    color: ${({ theme }) => theme.brand};
    border-color: ${({ theme }) => theme.brand};
    background: ${({ theme }) => theme.brandSoft};
  }
`;

interface Props {
  value: FilterKey;
  onChange: (v: FilterKey) => void;
  metaText?: string;
  onAdd?: () => void;
  addLabel?: string;
}

export function FilterChips({ value, onChange, metaText, onAdd, addLabel }: Props) {
  const { t } = useTranslation();
  return (
    <Row>
      <Group>
        {FILTERS.map((k) => (
          <Chip key={k} active={value === k} onClick={() => onChange(k)}>
            {t(`filter.${k}`)}
          </Chip>
        ))}
      </Group>
      {(metaText || onAdd) && (
        <MetaWrap>
          {metaText && <span>{metaText}</span>}
          {onAdd && (
            <AddBtn type="button" onClick={onAdd} title={addLabel ?? '새 무드보드'} aria-label={addLabel ?? '새 무드보드'}>
              +
            </AddBtn>
          )}
        </MetaWrap>
      )}
    </Row>
  );
}
