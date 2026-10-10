'use client';

import Link from 'next/link';
import { ButtonHTMLAttributes, ReactNode, useState } from 'react';

import type { Tone } from '@/lib/labels';

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
  children, variant = 'primary', type = 'button', className = '', ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'danger' | 'ghost';
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
    <button type={type} {...props} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}

export function Tag({ children, tone = 'neutral', title }: {
  children: ReactNode;
  tone?: Tone;
  title?: string;
}) {
  const styles = {
    neutral: 'bg-[var(--color-surface-alt)] text-[var(--color-muted)]',
    accent: 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]',
    warn: 'bg-[var(--color-warn-soft)] text-[var(--color-warn)]',
    danger: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]',
  }[tone];
  return (
    <span title={title} className={`inline-block rounded px-1.5 py-0.5 font-mono text-[10.5px] font-bold whitespace-nowrap ${styles}`}>
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

export function ErrorText({ error }: { error: string | null | undefined }) {
  if (!error) return null;
  return <p className="mt-2 font-mono text-[11.5px] text-[var(--color-danger)]">{error}</p>;
}

export function Checkbox({ label, checked, onChange, disabled }: {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-line)] px-3 py-2">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="text-[13px] font-bold">{label}</span>
    </label>
  );
}

/** 목록 위 '전체 N건'. 아직 모르면 그리지 않는다. */
export function ResultCount({ label = '전체', total }: { label?: string; total?: number }) {
  if (total === undefined) return <p className="mb-3 h-[18px]" />;
  return (
    <p className="mb-3 font-mono text-[11.5px] text-[var(--color-muted)]">
      {label} {total.toLocaleString('ko-KR')}건
    </p>
  );
}

/** 탭 전환. 값은 부르는 쪽이 URL 등에 둔다. */
export function Tabs<T extends string>({ value, options, onChange }: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="tablist" className="inline-flex rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-md px-4 py-2 font-mono text-[12.5px] font-bold transition ${
            value === option.value
              ? 'bg-[var(--color-ink)] text-white'
              : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-alt)]'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * 큰 지표 카드. value 가 undefined 면 아직 불러오는 중이라 '—' 를 찍는다(0 으로 보이면 오해한다).
 * href 를 주면 카드 전체가 그 화면으로 가는 링크가 된다.
 */
export function StatCard({ label, value, target, warn, href }: {
  label: string;
  value?: number | string;
  target?: string;
  warn?: boolean;
  href?: string;
}) {
  const card = (
    <Card className={`h-full px-5 py-4 ${href ? 'transition group-hover:border-[var(--color-ink)]' : ''}`}>
      <p className="eyebrow">
        {label}
        {href ? ' ›' : ''}
      </p>
      <p className={`numeral mt-2 text-[26px] leading-none ${warn ? 'text-[var(--color-danger)]' : ''}`}>
        {value === undefined ? '—' : typeof value === 'number' ? value.toLocaleString('ko-KR') : value}
      </p>
      {target ? <p className="mt-1.5 font-mono text-[10.5px] text-[var(--color-faint)]">{target}</p> : null}
    </Card>
  );
  if (!href) return card;
  return (
    <Link href={href} className="group block">
      {card}
    </Link>
  );
}

/** 작은 지표. 상세 대화상자 안에서 쓴다. */
export function Metric({ label, value }: { label: string; value?: number | string }) {
  return (
    <div className="rounded-lg bg-[var(--color-surface-alt)] px-3 py-2.5">
      <p className="eyebrow">{label}</p>
      <p className="numeral mt-1 text-[15px]">
        {value === undefined ? '—' : typeof value === 'number' ? value.toLocaleString('ko-KR') : value}
      </p>
    </div>
  );
}

/** 한 번 누르면 복사하고 잠깐 '복사됨' 을 보여 준다. */
export function CopyButton({ value, label = '복사' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="font-mono text-[11px] font-bold text-[var(--color-muted)] underline hover:text-[var(--color-ink)]"
    >
      {copied ? '복사됨' : label}
    </button>
  );
}

/** 배경 이미지 썸네일. URL 은 따옴표째 넣어 괄호·공백이 섞여도 CSS 가 깨지지 않게 한다. */
export function ImageThumb({ url, bgColor, className = 'h-12 w-20' }: {
  url?: string | null;
  bgColor?: string | null;
  className?: string;
}) {
  return (
    <div
      className={`shrink-0 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-alt)] ${className}`}
      style={{
        backgroundColor: bgColor || undefined,
        backgroundImage: url ? `url(${JSON.stringify(url)})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    />
  );
}
