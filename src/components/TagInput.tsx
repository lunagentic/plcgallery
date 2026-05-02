import styled from '@emotion/styled';
import { type KeyboardEvent, useState } from 'react';

const Wrap = styled.div`
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.surface};
  border-radius: 12px;
  padding: 8px 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  min-height: 48px;
  &:focus-within {
    border-color: ${({ theme }) => theme.brand};
  }
`;

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 4px 4px 10px;
  background: ${({ theme }) => theme.brandSoft};
  color: ${({ theme }) => theme.brandInk};
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  & button {
    width: 18px;
    height: 18px;
    border-radius: 999px;
    color: ${({ theme }) => theme.brandInk};
    opacity: 0.55;
    font-size: 11px;
    display: grid;
    place-items: center;
    &:hover {
      background: rgba(0, 0, 0, 0.08);
      opacity: 1;
    }
  }
  &::before {
    content: '#';
    opacity: 0.55;
    margin-right: -2px;
  }
`;

const NakedInput = styled.input`
  flex: 1;
  min-width: 80px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.text};
  font-size: 13px;
  padding: 4px 4px;
  &:focus {
    outline: none;
  }
  &::placeholder {
    color: ${({ theme }) => theme.textSoft};
  }
`;

const SuggestionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
  font-size: 11px;
  color: ${({ theme }) => theme.textSoft};
  align-items: center;
`;

const SuggChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.textMuted};
  background: transparent;
  &::before {
    content: '#';
    opacity: 0.5;
    margin-right: -2px;
  }
  &:hover {
    color: ${({ theme }) => theme.text};
    border-color: ${({ theme }) => theme.borderStrong};
    background: ${({ theme }) => theme.surface};
  }
`;

const MAX_TAG_LENGTH = 20;
const MAX_TAGS = 8;

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = '태그 추가 후 Enter',
}: Props) {
  const [draft, setDraft] = useState('');

  const add = (raw: string) => {
    const tag = raw.trim().replace(/^#+/, '').slice(0, MAX_TAG_LENGTH);
    if (!tag) return;
    if (value.includes(tag)) return;
    if (value.length >= MAX_TAGS) return;
    onChange([...value, tag]);
  };

  const remove = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || (e.key === 'Tab' && draft.trim())) {
      e.preventDefault();
      add(draft);
      setDraft('');
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      e.preventDefault();
      onChange(value.slice(0, -1));
    }
  };

  const remaining = MAX_TAGS - value.length;
  const availableSuggestions = suggestions.filter((s) => !value.includes(s));

  return (
    <div>
      <Wrap>
        {value.map((tag) => (
          <Chip key={tag}>
            {tag}
            <button type="button" onClick={() => remove(tag)} aria-label={`Remove ${tag}`}>
              ✕
            </button>
          </Chip>
        ))}
        <NakedInput
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/[\s,]/g, ''))}
          onBlur={() => {
            if (draft.trim()) {
              add(draft);
              setDraft('');
            }
          }}
          onKeyDown={onKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          maxLength={MAX_TAG_LENGTH}
          disabled={value.length >= MAX_TAGS}
        />
      </Wrap>
      {availableSuggestions.length > 0 && (
        <SuggestionRow>
          <span>추천:</span>
          {availableSuggestions.map((s) => (
            <SuggChip key={s} type="button" onClick={() => add(s)} disabled={remaining <= 0}>
              {s}
            </SuggChip>
          ))}
          <span style={{ marginLeft: 'auto' }}>
            {value.length}/{MAX_TAGS}
          </span>
        </SuggestionRow>
      )}
    </div>
  );
}
