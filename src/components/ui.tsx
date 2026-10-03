'use client';

import { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] ${className}`}
    >
      {children}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="eyebrow">
      <span className="text-[var(--color-accent)]">❧ </span>
      {children}
    </p>
  );
}

export function Button({
  children, onClick, variant = 'primary', disabled, type = 'button', className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'outline' | 'danger' | 'ghost';
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}) {
  const base =
    'inline-flex items-center justify-center rounded-lg px-3.5 py-2 font-mono text-[12.5px] font-bold transition disabled:opacity-40';
  const styles = {
    primary: 'bg-[var(--color-ink)] text-white hover:opacity-85',
    outline:
      'border border-[var(--color-ink)] text-[var(--color-ink)] hover:bg-[var(--color-surface-alt)]',
    danger: 'border border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]',
    ghost: 'text-[var(--color-muted)] hover:text-[var(--color-ink)]',
  }[variant];

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}

export function Tag({ children, tone = 'neutral' }: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'warn' | 'danger';
}) {
  const styles = {
    neutral: 'bg-[var(--color-surface-alt)] text-[var(--color-muted)]',
    accent: 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]',
    warn: 'bg-[var(--color-warn-soft)] text-[var(--color-warn)]',
    danger: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]',
  }[tone];
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 font-mono text-[10.5px] font-bold ${styles}`}>
      {children}
    </span>
  );
}

export function Input({
  label, hint, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }) {
  return (
    <label className="block">
      {label ? <span className="eyebrow mb-1.5 block">{label}</span> : null}
      <input
        {...props}
        className={`w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-[14px] outline-none focus:border-[var(--color-ink)] ${props.className ?? ''}`}
      />
      {hint ? <span className="mt-1 block font-mono text-[11px] text-[var(--color-faint)]">{hint}</span> : null}
    </label>
  );
}

/** 여러 줄 입력. 줄바꿈은 그대로 보내고, maxLength 를 주면 오른쪽 아래에 글자 수를 센다. */
export function Textarea({
  label, hint, rows = 6, maxLength, ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string }) {
  const length = typeof props.value === 'string' ? props.value.length : 0;
  return (
    <label className="block">
      {label ? <span className="eyebrow mb-1.5 block">{label}</span> : null}
      <textarea
        {...props}
        rows={rows}
        maxLength={maxLength}
        className={`block w-full resize-y whitespace-pre-wrap rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-[14px] leading-relaxed outline-none focus:border-[var(--color-ink)] ${props.className ?? ''}`}
      />
      {hint || maxLength ? (
        <span className="mt-1 flex items-start justify-between gap-3 font-mono text-[11px] text-[var(--color-faint)]">
          <span>{hint}</span>
          {maxLength ? (
            <span className={`numeral shrink-0 ${length >= maxLength ? 'text-[var(--color-danger)]' : ''}`}>
              {length} / {maxLength}
            </span>
          ) : null}
        </span>
      ) : null}
    </label>
  );
}

export function Select({
  label, children, ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="block">
      {label ? <span className="eyebrow mb-1.5 block">{label}</span> : null}
      <select
        {...props}
        className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 font-mono text-[12.5px] outline-none focus:border-[var(--color-ink)]"
      >
        {children}
      </select>
    </label>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left">
        <thead>
          <tr className="border-b border-[var(--color-line)]">
            {head.map((label) => (
              <th key={label} className="eyebrow px-4 py-2.5 whitespace-nowrap">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 py-14 text-center text-[14px] text-[var(--color-muted)]">{children}</div>
  );
}

/** 페이지 넘김. page 는 0부터 센다. 한 쪽뿐이면 그리지 않는다. */
export function Pager({ page, totalPages, onChange }: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const isFirst = page <= 0;
  const isLast = page >= totalPages - 1;
  const link =
    'rounded-lg px-3 py-1.5 font-mono text-[12px] font-bold text-[var(--color-ink)] transition hover:bg-[var(--color-surface-alt)] disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent';
  return (
    <nav aria-label="페이지" className="flex items-center justify-center gap-2 py-3">
      <button type="button" className={link} disabled={isFirst} onClick={() => onChange(page - 1)}>
        ‹ 이전
      </button>
      <span className="font-mono text-[11px] text-[var(--color-faint)]">·</span>
      <span className="numeral text-[12px]">
        {page + 1} / {totalPages}
      </span>
      <span className="font-mono text-[11px] text-[var(--color-faint)]">·</span>
      <button type="button" className={link} disabled={isLast} onClick={() => onChange(page + 1)}>
        다음 ›
      </button>
    </nav>
  );
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
}

export function formatDuration(seconds?: number): string {
  const total = Math.max(0, Math.floor(seconds ?? 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  return `${minutes}분`;
}

export function remainingSla(iso: string): { label: string; overdue: boolean } {
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs < 0) {
    return { label: `${Math.floor(-diffMs / 3600000)}시간 초과`, overdue: true };
  }
  const hours = Math.floor(diffMs / 3600000);
  return { label: `${hours}시간 남음`, overdue: false };
}
