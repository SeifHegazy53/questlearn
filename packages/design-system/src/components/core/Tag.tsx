import type { ReactNode } from 'react';

export interface TagProps {
  children: ReactNode;
  onRemove?: () => void;
  disabled?: boolean;
}

export function Tag({ children, onRemove, disabled }: TagProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'var(--gray-100)',
        color: 'var(--gray-700)',
        padding: '4px 8px 4px 10px',
        borderRadius: 'var(--radius-sm)',
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        fontWeight: 'var(--fw-medium)',
      }}
    >
      {children}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label="Remove"
          style={{
            appearance: 'none',
            border: 'none',
            background: 'none',
            padding: 0,
            display: 'inline-flex',
            cursor: disabled ? 'not-allowed' : 'pointer',
            color: 'var(--gray-500)',
            fontSize: 14,
            lineHeight: 1,
            fontFamily: 'inherit',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          ×
        </button>
      ) : null}
    </span>
  );
}
