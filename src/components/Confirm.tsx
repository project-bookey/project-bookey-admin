'use client';

import { ReactNode, createContext, useCallback, useContext, useState } from 'react';

import { errorMessage } from '@/lib/api';
import { Modal } from './Modal';
import { Button, ErrorText, Input } from './ui';

export type ConfirmOptions = {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  tone?: 'primary' | 'danger';
  /** 사유를 받는다. 감사 로그에 남는 조치는 사유를 필수로 둔다. */
  reason?: { label: string; placeholder?: string; hint?: string; required?: boolean; maxLength?: number };
  /** 되돌리기 어려운 조치는 이 문구를 직접 입력해야 확정된다. */
  typeToConfirm?: string;
  /**
   * 확정을 누르면 대화상자 안에서 실행한다 — 실행 중 표시, 실패하면 닫지 않고 오류를 보여 준다.
   * 없으면 확정 즉시 닫고 결과만 돌려준다.
   */
  action?: (input: { reason: string }) => Promise<unknown>;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<{ reason: string } | null>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

type Pending = ConfirmOptions & { id: number; resolve: (result: { reason: string } | null) => void };

/** window.confirm 대신 쓰는 확인 대화상자. 취소하면 null, 확정하면 입력한 사유를 돌려준다. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (options) =>
      new Promise((resolve) => {
        setPending({ ...options, id: Date.now(), resolve });
      }),
    [],
  );

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending ? (
        <ConfirmDialog
          key={pending.id}
          options={pending}
          onDone={(result) => {
            pending.resolve(result);
            setPending(null);
          }}
        />
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('ConfirmProvider 안에서만 쓸 수 있습니다.');
  return confirm;
}

function ConfirmDialog({ options, onDone }: {
  options: ConfirmOptions;
  onDone: (result: { reason: string } | null) => void;
}) {
  const [reason, setReason] = useState('');
  const [typed, setTyped] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reasonMissing = options.reason?.required !== false && !!options.reason && !reason.trim();
  const typeMismatch = !!options.typeToConfirm && typed.trim() !== options.typeToConfirm;

  const submit = async () => {
    const input = { reason: reason.trim() };
    if (!options.action) {
      onDone(input);
      return;
    }
    setRunning(true);
    setError(null);
    try {
      await options.action(input);
      onDone(input);
    } catch (e) {
      setError(errorMessage(e));
      setRunning(false);
    }
  };

  return (
    <Modal
      size="sm"
      eyebrow="확인"
      title={options.title}
      busy={running}
      onClose={() => onDone(null)}
      footer={
        <>
          <Button variant="ghost" disabled={running} onClick={() => onDone(null)}>
            취소
          </Button>
          <Button
            variant={options.tone === 'danger' ? 'danger' : 'primary'}
            disabled={running || reasonMissing || typeMismatch}
            onClick={submit}
          >
            {running ? '처리 중…' : (options.confirmLabel ?? '확인')}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!running && !reasonMissing && !typeMismatch) submit();
        }}
      >
        {options.body ? (
          <div className="text-[13.5px] leading-relaxed text-[var(--color-muted)]">{options.body}</div>
        ) : null}
        {options.reason ? (
          <div className="mt-4">
            <Input
              autoFocus
              label={options.reason.label}
              value={reason}
              maxLength={options.reason.maxLength ?? 500}
              placeholder={options.reason.placeholder}
              hint={options.reason.hint}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
        ) : null}
        {options.typeToConfirm ? (
          <div className="mt-4">
            <Input
              autoFocus={!options.reason}
              label={`확인을 위해 "${options.typeToConfirm}" 을(를) 입력하세요`}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
            />
          </div>
        ) : null}
        <ErrorText error={error} />
        {/* Enter 로 확정할 수 있게 — 버튼은 footer 에 있어 폼 밖이다. */}
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}
