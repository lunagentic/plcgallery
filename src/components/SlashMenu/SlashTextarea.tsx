import styled from '@emotion/styled';
import { type TextareaHTMLAttributes, forwardRef, useRef } from 'react';
import { SLASH_GROUPS } from './commands';
import { SlashMenu } from './SlashMenu';
import { useSlashController } from './useSlashController';
import type { SlashGroup } from './types';

const Wrap = styled.div`
  position: relative;
`;

const TA = styled.textarea`
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.surface};
  color: ${({ theme }) => theme.text};
  font-size: 14px;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  &::placeholder {
    color: ${({ theme }) => theme.textSoft};
  }
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.brand};
  }
`;

interface Props extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  value: string;
  onChange: (next: string) => void;
  groups?: SlashGroup[];
}

export const SlashTextarea = forwardRef<HTMLTextAreaElement, Props>(function SlashTextarea(
  { value, onChange, groups = SLASH_GROUPS, ...rest },
  externalRef,
) {
  const localRef = useRef<HTMLTextAreaElement | null>(null);
  const setRefs = (node: HTMLTextAreaElement | null) => {
    localRef.current = node;
    if (typeof externalRef === 'function') {
      externalRef(node);
    } else if (externalRef) {
      (externalRef as unknown as { current: HTMLTextAreaElement | null }).current = node;
    }
  };

  const ctrl = useSlashController({ value, onChange, groups, inputRef: localRef });

  return (
    <Wrap>
      <TA
        ref={setRefs}
        value={value}
        onChange={ctrl.handleChange}
        onKeyDown={ctrl.handleKeyDown}
        onClick={ctrl.trackCaret}
        onKeyUp={ctrl.trackCaret}
        onSelect={ctrl.trackCaret}
        {...rest}
      />
      {ctrl.isOpen && (
        <SlashMenu
          groups={ctrl.filteredGroups}
          activeIndex={ctrl.activeIdx}
          onHover={ctrl.setActiveIdx}
          onSelect={ctrl.insertItem}
          top="100%"
          left={0}
        />
      )}
    </Wrap>
  );
});
