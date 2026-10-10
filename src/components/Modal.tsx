'use client';

import { ReactNode, useEffect, useRef } from 'react';

const SIZE = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
} as const;

/**
 * 공용 대화상자. 브라우저의 <dialog> 를 모달로 열어 배경 잠금·Esc·포커스 복귀를 맡긴다.
 * 바깥(배경)을 누르거나 Esc 를 누르면 닫힌다. 저장 중(busy)에는 닫히지 않는다.
 * variant='side' 는 오른쪽에 붙는 서랍으로, 회원 상세처럼 긴 내용을 띄울 때 쓴다.
 */
export function Modal({
  onClose, eyebrow, title, size = 'md', variant = 'center', footer, busy = false, children,
}: {
  onClose: () => void;
  eyebrow?: ReactNode;
  title?: ReactNode;
  size?: keyof typeof SIZE;
  variant?: 'center' | 'side';
  footer?: ReactNode;
  busy?: boolean;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // 배경에서 눌렀다가 배경에서 뗀 경우만 닫는다 — 입력란에서 글자를 드래그하다 밖에서 떼도 닫히지 않게.
  const pressedOnBackdrop = useRef(false);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      dialog?.close();
    };
  }, []);

  const placement =
    variant === 'side'
      ? 'ml-auto mr-0 my-0 h-full max-h-none w-full max-w-2xl rounded-none border-l'
      : `m-auto w-[calc(100%-3rem)] ${SIZE[size]} max-h-[92vh] rounded-xl border`;

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onMouseDown={(event) => {
        pressedOnBackdrop.current = event.target === event.currentTarget;
      }}
      onMouseUp={(event) => {
        if (pressedOnBackdrop.current && event.target === event.currentTarget && !busy) onClose();
        pressedOnBackdrop.current = false;
      }}
      className={`${placement} overflow-y-auto border-[var(--color-line)] bg-[var(--color-surface)] p-0 text-[var(--color-ink)] backdrop:bg-black/35`}
    >
      <div className="p-6">
        {eyebrow || title ? (
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
              {title ? <h2 className="mt-1 font-serif text-[20px] font-bold break-words">{title}</h2> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="shrink-0 font-mono text-[12px] font-bold text-[var(--color-muted)] hover:text-[var(--color-ink)] disabled:opacity-40"
            >
              닫기
            </button>
          </div>
        ) : null}
        {children}
        {footer ? <div className="mt-6 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </dialog>
  );
}
