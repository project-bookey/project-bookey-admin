'use client';

import { useRef, useState } from 'react';

import { AdminApiError, errorMessage } from '@/lib/api';
import { ErrorText } from './ui';

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * 이미지 올리기 버튼. 고르면 바로 올리고 URL 을 돌려준다(저장은 부르는 쪽 폼이 한다).
 * 운영 서버처럼 저장소가 꺼져 있으면 URL 을 직접 넣으라고 안내한다.
 */
export function ImageUpload({ upload, onUploaded, label = '이미지 올리기' }: {
  upload: (file: File) => Promise<{ url: string; width?: number; height?: number }>;
  onUploaded: (image: { url: string; width?: number; height?: number }) => void;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!ACCEPT.includes(file.type)) {
      setError('JPG·PNG·WebP 만 올릴 수 있습니다.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('10MB 까지 올릴 수 있습니다.');
      return;
    }
    setBusy(true);
    try {
      onUploaded(await upload(file));
    } catch (e) {
      setError(
        e instanceof AdminApiError && e.code === 'STORAGE_DISABLED'
          ? '이 서버는 이미지 업로드가 꺼져 있습니다. 이미지 URL 을 직접 넣어 주세요.'
          : errorMessage(e, '올리지 못했습니다.'),
      );
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div>
      <input ref={input} type="file" accept={ACCEPT.join(',')} hidden onChange={(e) => pick(e.target.files?.[0])} />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="rounded-lg border border-[var(--color-ink)] px-3 py-2 font-mono text-[12px] font-bold transition hover:bg-[var(--color-surface-alt)] disabled:opacity-40"
      >
        {busy ? '올리는 중…' : label}
      </button>
      <ErrorText error={error} />
    </div>
  );
}
