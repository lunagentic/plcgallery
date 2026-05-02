import {
  type ChangeEvent,
  type KeyboardEvent,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { filterGroups, flatten } from './commands';
import type { SlashGroup, SlashItem } from './types';

interface SlashTriggerInfo {
  active: boolean;
  query: string;
  triggerStart: number; // index in `value` where the leading "/" lives
  cursorEnd: number; // current selection end
}

/**
 * Find a slash trigger immediately preceding the caret.
 * A trigger is "/" preceded by whitespace or string start, with no
 * whitespace inside the captured query.
 */
function detectTrigger(value: string, cursor: number): SlashTriggerInfo {
  const before = value.slice(0, cursor);
  const m = before.match(/(?:^|[\s\n])\/([^\s\n/]*)$/);
  if (!m) return { active: false, query: '', triggerStart: -1, cursorEnd: cursor };
  const fullMatch = m[0];
  // triggerStart is the index of "/" itself (not the leading whitespace if any)
  const slashIndex = before.length - fullMatch.length + (fullMatch.startsWith('/') ? 0 : 1);
  return { active: true, query: m[1], triggerStart: slashIndex, cursorEnd: cursor };
}

interface UseSlashOptions {
  value: string;
  onChange: (next: string) => void;
  groups: SlashGroup[];
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
}

export function useSlashController({ value, onChange, groups, inputRef }: UseSlashOptions) {
  const [cursor, setCursor] = useState(0);
  const [activeIdx, setActiveIdx] = useState(0);

  const trigger = detectTrigger(value, cursor);
  const filteredGroups = useMemo(
    () => (trigger.active ? filterGroups(groups, trigger.query) : []),
    [groups, trigger.active, trigger.query],
  );
  const flat = useMemo(() => flatten(filteredGroups), [filteredGroups]);

  // reset selection when filter changes
  useEffect(() => {
    setActiveIdx(0);
  }, [trigger.query, trigger.active]);

  const close = useCallback(() => {
    // Move cursor away so trigger no longer matches: simplest is to remove
    // just the "/" and trailing query chars.
    if (!trigger.active) return;
    const newVal = value.slice(0, trigger.triggerStart) + value.slice(trigger.cursorEnd);
    onChange(newVal);
    requestAnimationFrame(() => {
      const pos = trigger.triggerStart;
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(pos, pos);
      setCursor(pos);
    });
  }, [trigger, value, onChange, inputRef]);

  const insertItem = useCallback(
    (item: SlashItem) => {
      const raw = typeof item.insert === 'function' ? item.insert() : item.insert;
      const cursorMarker = item.cursorMarker ? raw.indexOf('|') : -1;
      const insertText = cursorMarker >= 0 ? raw.replace('|', '') : raw;

      const head = value.slice(0, trigger.triggerStart);
      const tail = value.slice(trigger.cursorEnd);
      const next = head + insertText + tail;
      onChange(next);

      requestAnimationFrame(() => {
        const finalCaret =
          trigger.triggerStart +
          (cursorMarker >= 0 ? cursorMarker : insertText.length);
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(finalCaret, finalCaret);
        setCursor(finalCaret);
      });
    },
    [value, trigger.triggerStart, trigger.cursorEnd, onChange, inputRef],
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(e.target.value);
      setCursor(e.target.selectionStart ?? e.target.value.length);
    },
    [onChange],
  );

  const trackCaret = useCallback((e: { currentTarget: HTMLInputElement | HTMLTextAreaElement }) => {
    setCursor(e.currentTarget.selectionStart ?? 0);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!trigger.active || flat.length === 0) {
        // allow Esc to close even when no matches (clears the slash query)
        if (trigger.active && e.key === 'Escape') {
          e.preventDefault();
          close();
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % flat.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + flat.length) % flat.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const item = flat[activeIdx];
        if (item) insertItem(item);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    },
    [trigger.active, flat, activeIdx, insertItem, close],
  );

  return {
    /** True when the slash menu should render */
    isOpen: trigger.active,
    filteredGroups,
    activeIdx,
    setActiveIdx,
    insertItem,
    close,
    handleChange,
    handleKeyDown,
    trackCaret,
  };
}
