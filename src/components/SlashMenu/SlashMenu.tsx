import styled from '@emotion/styled';
import { useEffect, useRef } from 'react';
import type { SlashGroup, SlashItem } from './types';

const Panel = styled.div`
  position: absolute;
  z-index: 90;
  margin-top: 6px;
  width: 320px;
  max-height: 360px;
  overflow-y: auto;
  background: ${({ theme }) => theme.bg};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  box-shadow: ${({ theme }) => theme.shadowLg};
  padding: 6px;
  font-size: 13px;
`;

const GroupLabel = styled.div`
  padding: 8px 10px 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: ${({ theme }) => theme.textSoft};
  text-transform: uppercase;
`;

const Item = styled.button<{ active: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: ${({ active, theme }) => (active ? theme.surface : 'transparent')};
  color: ${({ theme }) => theme.text};
  text-align: left;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.surface};
  }
`;

const Icon = styled.span`
  width: 24px;
  text-align: center;
  font-size: 16px;
  flex-shrink: 0;
`;

const Body = styled.div`
  flex: 1;
  min-width: 0;
  .lbl {
    font-size: 13px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .desc {
    font-size: 11px;
    color: ${({ theme }) => theme.textMuted};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Empty = styled.div`
  padding: 24px 12px;
  text-align: center;
  font-size: 12px;
  color: ${({ theme }) => theme.textMuted};
`;

const Hint = styled.div`
  padding: 6px 10px;
  font-size: 10px;
  color: ${({ theme }) => theme.textSoft};
  border-top: 1px solid ${({ theme }) => theme.border};
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
`;

interface Props {
  groups: SlashGroup[];
  activeIndex: number;
  onHover: (index: number) => void;
  onSelect: (item: SlashItem) => void;
  /** position offset (top/left) relative to the parent container */
  top?: number | string;
  left?: number | string;
}

export function SlashMenu({ groups, activeIndex, onHover, onSelect, top, left }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const flat = groups.flatMap((g) => g.items);

  // Scroll active item into view when navigating with keyboard
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current.querySelector(`[data-idx="${activeIndex}"]`);
    if (el && 'scrollIntoView' in el) {
      (el as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  return (
    <Panel ref={ref} style={{ top, left }} role="listbox">
      {flat.length === 0 ? (
        <Empty>일치하는 항목이 없어요</Empty>
      ) : (
        groups.map((g) => (
          <div key={g.id}>
            <GroupLabel>{g.label}</GroupLabel>
            {g.items.map((item) => {
              const flatIdx = flat.findIndex((x) => x.id === item.id);
              const active = flatIdx === activeIndex;
              return (
                <Item
                  key={item.id}
                  data-idx={flatIdx}
                  active={active}
                  onMouseEnter={() => onHover(flatIdx)}
                  onMouseDown={(e) => {
                    // prevent input blur before click handler runs
                    e.preventDefault();
                  }}
                  onClick={() => onSelect(item)}
                  role="option"
                  aria-selected={active}
                >
                  <Icon>{item.icon ?? '·'}</Icon>
                  <Body>
                    <div className="lbl">{item.label}</div>
                    {item.description && <div className="desc">{item.description}</div>}
                  </Body>
                </Item>
              );
            })}
          </div>
        ))
      )}
      <Hint>
        <span>↑↓ 이동 · ⏎ 선택</span>
        <span>Esc 닫기</span>
      </Hint>
    </Panel>
  );
}
