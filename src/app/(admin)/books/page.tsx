'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { errorMessage } from '@/lib/api';
import { booksApi } from '@/lib/endpoints';
import { BOOK_SOURCE_LABEL } from '@/lib/labels';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/lib/toast';
import type { BookRow, UpdateBookRequest } from '@/lib/types';
import { param, useListParams } from '@/lib/useListParams';
import { useCan } from '@/lib/useMe';
import { Modal } from '@/components/Modal';
import { QueryState } from '@/components/QueryState';
import { PageHeader } from '@/components/Shell';
import { Button, Card, ErrorText, ImageThumb, Input, Pager, ResultCount, Table, Tag } from '@/components/ui';

const FILTERS = { q: param.str() };

/** 도서 관리 — 페이지 수 보정이 핵심 (진척도 계산의 기준값). */
export default function BooksPage() {
  const canEdit = useCan('EDIT_BOOK');
  const { params, setFilter, setPage } = useListParams(FILTERS);
  const { q, page } = params;
  const [editing, setEditing] = useState<BookRow | null>(null);

  const books = useQuery({
    queryKey: qk.books.list({ q, page }),
    queryFn: () => booksApi.list(q || undefined, page),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title="도서"
        description="총 페이지 수는 진척도와 검증 등급의 기준값입니다. 빠진 값을 채워주세요."
      />

      <div className="px-7 py-6">
        <SearchForm key={q} initial={q} onSubmit={(value) => setFilter({ q: value })} />

        <ResultCount total={books.data?.totalElements} />

        <Card>
          <QueryState
            query={books}
            isEmpty={(data) => data.content.length === 0}
            empty="조건에 맞는 도서가 없습니다."
            onFirstPage={page > 0 ? () => setPage(0) : undefined}
          >
            {(data) => (
              <Table head={['제목', '저자', '출판사', '페이지', 'ISBN', '출처', '']}>
                {data.content.map((book) => (
                  <tr key={book.id} className="border-b border-[var(--color-line)] last:border-0">
                    <td className="max-w-xs px-4 py-3">
                      <p className="truncate text-[14px] font-bold">{book.title}</p>
                      {book.userCreated ? <Tag>사용자 등록</Tag> : null}
                    </td>
                    <td className="px-4 py-3 text-[13px]">{book.author ?? '—'}</td>
                    <td className="px-4 py-3 text-[13px] text-[var(--color-muted)]">{book.publisher ?? '—'}</td>
                    <td className="px-4 py-3">
                      {book.totalPages ? (
                        <span className="numeral text-[12px]">{book.totalPages}</span>
                      ) : (
                        <Tag tone="warn">없음</Tag>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[var(--color-faint)]">{book.isbn13 ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Tag>{BOOK_SOURCE_LABEL[book.source] ?? book.source}</Tag>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        href={`/reviews?bookId=${book.id}`}
                        className="mr-3 font-mono text-[12px] text-[var(--color-muted)] underline"
                      >
                        리뷰
                      </Link>
                      {canEdit ? (
                        <Button variant="outline" onClick={() => setEditing(book)}>
                          수정
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </QueryState>
        </Card>

        <Pager page={page} totalPages={books.data?.totalPages ?? 0} onChange={setPage} />
      </div>

      {editing ? <EditDialog book={editing} onClose={() => setEditing(null)} /> : null}
    </>
  );
}

function SearchForm({ initial, onSubmit }: { initial: string; onSubmit: (value: string) => void }) {
  const [keyword, setKeyword] = useState(initial);
  return (
    <form
      className="mb-4 flex items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(keyword.trim());
      }}
    >
      <div className="w-80">
        <Input
          label="검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="제목 · 저자 · ISBN"
        />
      </div>
      <Button type="submit">검색</Button>
    </form>
  );
}

function EditDialog({ book, onClose }: { book: BookRow; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author ?? '');
  const [publisher, setPublisher] = useState(book.publisher ?? '');
  const [totalPages, setTotalPages] = useState(String(book.totalPages ?? ''));
  const [coverUrl, setCoverUrl] = useState('');
  const [category, setCategory] = useState('');
  const [reason, setReason] = useState('');

  // 바뀐 칸만 보낸다 — 손대지 않은 값을 덮어쓰지 않게.
  const body: UpdateBookRequest = { reason: reason.trim() };
  if (title.trim() && title.trim() !== book.title) body.title = title.trim();
  if (author.trim() !== (book.author ?? '')) body.author = author.trim() || undefined;
  if (publisher.trim() !== (book.publisher ?? '')) body.publisher = publisher.trim() || undefined;
  if (totalPages && Number(totalPages) !== book.totalPages) body.totalPages = Number(totalPages);
  if (coverUrl.trim()) body.coverUrl = coverUrl.trim();
  if (category.trim()) body.category = category.trim();
  const changed = Object.keys(body).length > 1;

  const update = useMutation({
    meta: { inlineError: true },
    mutationFn: () => booksApi.update(book.id, body),
    onSuccess: () => {
      toast.success('도서 정보를 고쳤습니다.');
      queryClient.invalidateQueries({ queryKey: qk.books.all });
      onClose();
    },
  });

  return (
    <Modal
      eyebrow="도서 수정"
      title={book.title}
      busy={update.isPending}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" disabled={update.isPending} onClick={onClose}>
            취소
          </Button>
          <Button disabled={!changed || !reason.trim() || update.isPending} onClick={() => update.mutate()}>
            {update.isPending ? '저장 중…' : '저장'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Input label="제목" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="저자" value={author} onChange={(e) => setAuthor(e.target.value)} />
          <Input label="출판사" value={publisher} onChange={(e) => setPublisher(e.target.value)} />
        </div>
        <Input
          label="총 페이지"
          inputMode="numeric"
          value={totalPages}
          onChange={(e) => setTotalPages(e.target.value.replace(/\D/g, ''))}
          hint="이 값이 바뀌면 모든 독자의 진행률이 다시 계산됩니다."
        />
        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <Input
            label="표지 URL"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="https://..."
            hint="바꿀 때만 입력하세요. 비우면 그대로 둡니다."
          />
          <ImageThumb url={coverUrl.trim() || null} className="mb-5 h-16 w-12" />
        </div>
        <Input
          label="카테고리"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          hint="바꿀 때만 입력하세요. 비우면 그대로 둡니다."
        />
        <Input
          label="수정 사유 (필수)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="예: 알라딘 페이지 수와 실제 도서가 불일치"
        />
      </div>
      <ErrorText error={update.isError ? errorMessage(update.error, '수정하지 못했습니다.') : null} />
    </Modal>
  );
}
