import styled from '@emotion/styled';
import { type InputHTMLAttributes, forwardRef, useRef } from 'react';
import { SLASH_GROUPS } from './commands';
import { SlashMenu } from './SlashMenu';
import { useSlashController } from './useSlashController';
import type { SlashGroup } from './types';

const Wrap = styled.div`
  position: relative;
`;

const Inp = styled.input`
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.surface};
  color: ${({ theme }) => theme.text};
  font-size: 14px;
  &::placeholder {
    color: ${({ theme }) => theme.textSoft};
  }
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.brand};
  }
`;

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onChange: (next: string) => void;
  groups?: SlashGroup[];
}

export const SlashInput = forwardRef<HTMLInputElement, Props>(function SlashInput(
  { value, onChange, groups = SLASH_GROUPS, ...rest },
  externalRef,
) {
  const localRef = useRef<HTMLInputElement | null>(null);
  const setRefs = (node: HTMLInputElement | null) => {
    localRef.current = node;
    if (typeof externalRef === 'function') {
      externalRef(node);
    } else if (externalRef) {
      // RefObject is typed readonly in @types/react 19, but mutable refs share
      // the shape — escape hatch via unknown cast.
      (externalRef as unknown as { current: HTMLInputElement | null }).current = node;
    }
  };

  const ctrl = useSlashController({ value, onChange, groups, inputRef: localRef });

  return (
    <Wrap>
      <Inp
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
