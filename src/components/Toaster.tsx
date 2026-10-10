'use client';

import { dismissToast, useToasts } from '@/lib/toast';

const TONE = {
  success: 'border-[var(--color-accent)] text-[var(--color-accent)]',
  info: 'border-[var(--color-line)] text-[var(--color-ink)]',
  error: 'border-[var(--color-danger)] text-[var(--color-danger)]',
} as const;

/** 화면 오른쪽 아래에 쌓이는 토스트. */
export function Toaster() {
  const items = useToasts();
  return (
    <div className="pointer-events-none fixed right-5 bottom-5 z-[60] flex w-80 flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          role={item.tone === 'error' ? 'alert' : 'status'}
          className={`pointer-events-auto flex items-start gap-3 rounded-lg border-l-4 bg-[var(--color-surface)] px-4 py-3 shadow-lg ${TONE[item.tone]}`}
        >
          <p className="flex-1 text-[13px] leading-snug font-bold break-words">{item.message}</p>
          <button
            type="button"
            aria-label="닫기"
            onClick={() => dismissToast(item.id)}
            className="font-mono text-[12px] text-[var(--color-faint)] hover:text-[var(--color-ink)]"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
