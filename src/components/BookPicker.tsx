'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { booksApi } from '@/lib/endpoints';
import { qk } from '@/lib/queryKeys';
import type { BookRow } from '@/lib/types';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { Input } from './ui';

/** 도서 검색 후 하나 고르기. 두 글자부터 찾는다. disabledIds 의 책은 고를 수 없다(예: 이미 추천 중). */
export function BookPicker({ onPick, disabledIds = [], disabledHint = '이미 추가됨', autoFocus }: {
  onPick: (book: BookRow) => void;
  disabledIds?: number[];
  disabledHint?: string;
  autoFocus?: boolean;
}) {
  const [keyword, setKeyword] = useState('');
  const query = useDebouncedValue(keyword.trim());
  const enabled = query.length >= 2;

  const results = useQuery({
    queryKey: qk.books.list({ q: query, page: 0, picker: true }),
    queryFn: () => booksApi.list(query, 0),
    enabled,
  });

  return (
    <div>
      <Input
        label="도서 검색"
        value={keyword}
        autoFocus={autoFocus}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="제목 · 저자 · ISBN (두 글자 이상)"
      />
      {enabled ? (
        <ul className="mt-2 max-h-72 divide-y divide-[var(--color-line)] overflow-y-auto rounded-lg border border-[var(--color-line)]">
          {results.isPending ? (
            <li className="px-3 py-2.5 text-[13px] text-[var(--color-muted)]">찾는 중…</li>
          ) : (results.data?.content.length ?? 0) === 0 ? (
            <li className="px-3 py-2.5 text-[13px] text-[var(--color-muted)]">찾는 도서가 없습니다.</li>
          ) : (
            results.data!.content.map((book) => {
              const disabled = disabledIds.includes(book.id);
              return (
                <li key={book.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onPick(book)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[var(--color-surface-alt)] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-bold">{book.title}</span>
                      <span className="block truncate font-mono text-[11px] text-[var(--color-faint)]">
                        {book.author ?? '저자 미상'} · {book.publisher ?? '—'} · #{book.id}
                      </span>
                    </span>
                    {disabled ? (
                      <span className="font-mono text-[11px] text-[var(--color-faint)]">{disabledHint}</span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
