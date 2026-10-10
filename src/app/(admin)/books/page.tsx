'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { ReactNode, useState } from 'react';

import { AdminApiError, errorMessage } from '@/lib/api';
import { booksApi } from '@/lib/endpoints';
import { formatDateTime } from '@/lib/format';
import { BOOK_SOURCE_LABEL } from '@/lib/labels';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/lib/toast';
import type { AdminBookCreateRequest, AdminBookView, BookRow, BookUsage, UpdateBookRequest } from '@/lib/types';
import { param, useListParams } from '@/lib/useListParams';
import { useCan } from '@/lib/useMe';
import { BookPicker } from '@/components/BookPicker';
import { useConfirm } from '@/components/Confirm';
import { Modal } from '@/components/Modal';
import { QueryState } from '@/components/QueryState';
import { PageHeader } from '@/components/Shell';
import { Button, Card, ErrorText, ImageThumb, Input, Metric, Pager, ResultCount, Table, Tag } from '@/components/ui';

const FILTERS = { q: param.str() };

/** 서버 UpdateBookRequest 의 totalPages 범위. */
const MAX_PAGES = 20000;

/** 사용처 수 — 상세와 병합 결과가 같은 순서·이름으로 보이게. */
const USAGE_ITEMS: { key: Exclude<keyof BookUsage, 'editorPick'>; label: string }[] = [
  { key: 'readingRecords', label: '독서 기록' },
  { key: 'reviews', label: '리뷰' },
  { key: 'posts', label: '독후감' },
  { key: 'remarks', label: '한줄평' },
  { key: 'likes', label: '좋아요' },
  { key: 'clubBooks', label: '모임 책' },
  { key: 'meetings', label: '만남' },
  { key: 'pageSuggestions', label: '페이지 제안' },
  { key: 'shareCards', label: '공유 카드' },
];

/** 수정 대화상자가 받는 도서 — 목록 행이든 상세든 같은 칸을 쓴다. */
type EditableBook = Pick<BookRow, 'id' | 'title' | 'author' | 'publisher' | 'totalPages' | 'coverUrl' | 'category'>;

/** 도서 관리 — 페이지 수 보정이 핵심 (진척도 계산의 기준값). 상세는 ?id= 로 열린다. */
export default function BooksPage() {
  const canEdit = useCan('EDIT_BOOK');
  const { params, setFilter, setPage, open, close } = useListParams(FILTERS);
  const { q, page, id } = params;
  const [editing, setEditing] = useState<EditableBook | null>(null);
  const [creating, setCreating] = useState(false);

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
        action={canEdit ? <Button onClick={() => setCreating(true)}>도서 등록</Button> : null}
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
                      <button
                        type="button"
                        onClick={() => open(book.id)}
                        className="block max-w-full truncate text-left text-[14px] font-bold hover:underline"
                      >
                        {book.title}
                      </button>
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
                      <Button variant="ghost" onClick={() => open(book.id)} className="mr-1">
                        상세
                      </Button>
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

      {id !== undefined ? (
        <BookDialog
          key={id}
          bookId={id}
          onClose={close}
          // 원본은 지워졌다 — 기록을 쌓지 않고 대상 상세로 바꾼다.
          onMerged={(targetId) => open(targetId, { replace: true })}
        />
      ) : null}
      {editing ? <EditDialog book={editing} onClose={() => setEditing(null)} /> : null}
      {creating ? (
        <CreateDialog
          onClose={() => setCreating(false)}
          onOpen={(bookId) => {
            setCreating(false);
            open(bookId);
          }}
        />
      ) : null}
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

// ── 상세 ────────────────────────────────────────────────

function BookDialog({ bookId, onClose, onMerged }: {
  bookId: number;
  onClose: () => void;
  onMerged: (targetId: number) => void;
}) {
  const canEdit = useCan('EDIT_BOOK');
  const canMerge = useCan('MERGE_BOOKS');
  const [editing, setEditing] = useState(false);
  const [merging, setMerging] = useState(false);

  const detail = useQuery({ queryKey: qk.books.detail(bookId), queryFn: () => booksApi.detail(bookId) });
  const gone = detail.error instanceof AdminApiError && detail.error.code === 'BOOK_NOT_FOUND';
  const book = detail.data;

  return (
    <>
      <Modal
        size="lg"
        eyebrow={`도서 #${bookId}`}
        title={book?.title}
        onClose={onClose}
        footer={
          book && (canMerge || canEdit) ? (
            <>
              {canMerge ? (
                <Button variant="outline" onClick={() => setMerging(true)}>
                  다른 책에 합치기
                </Button>
              ) : null}
              {canEdit ? <Button onClick={() => setEditing(true)}>수정</Button> : null}
            </>
          ) : undefined
        }
      >
        {detail.isPending ? <p className="text-[13.5px] text-[var(--color-muted)]">불러오는 중…</p> : null}

        {gone ? (
          <p className="rounded-lg bg-[var(--color-danger-soft)] px-4 py-3 font-mono text-[12px] font-bold text-[var(--color-danger)]">
            찾을 수 없는 도서입니다. 다른 책에 합쳐져 지워졌을 수 있습니다.
          </p>
        ) : null}

        {detail.isError && !gone ? (
          <div>
            <ErrorText error={errorMessage(detail.error, '도서를 불러오지 못했습니다.')} />
            <Button variant="outline" className="mt-3" onClick={() => detail.refetch()}>
              다시 시도
            </Button>
          </div>
        ) : null}

        {book ? (
          <>
            <BookFacts book={book} />

            <section className="mt-6">
              <p className="eyebrow">이 책을 쓰는 곳</p>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {USAGE_ITEMS.map((item) => (
                  <Metric key={item.key} label={item.label} value={book.usage[item.key]} />
                ))}
                <Metric label="에디터 픽" value={book.usage.editorPick ? '추천 중' : '—'} />
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[12px] text-[var(--color-muted)]">
                <Link href={`/reviews?bookId=${book.id}`} className="underline hover:text-[var(--color-ink)]">
                  리뷰 보기
                </Link>
                <Link href={`/contents?type=POST&bookId=${book.id}`} className="underline hover:text-[var(--color-ink)]">
                  독후감 보기
                </Link>
                <Link
                  href={`/contents?type=BOOK_REMARK&bookId=${book.id}`}
                  className="underline hover:text-[var(--color-ink)]"
                >
                  한줄평 보기
                </Link>
                {book.usage.pageSuggestions > 0 ? (
                  <Link href={`/page-suggestions?id=${book.id}`} className="underline hover:text-[var(--color-ink)]">
                    페이지 제안 검토
                  </Link>
                ) : null}
              </div>
            </section>
          </>
        ) : null}
      </Modal>

      {editing && book ? <EditDialog book={book} onClose={() => setEditing(false)} /> : null}
      {merging && book ? (
        <MergeDialog
          source={book}
          onClose={() => setMerging(false)}
          onMerged={(targetId) => {
            setMerging(false);
            onMerged(targetId);
          }}
        />
      ) : null}
    </>
  );
}

function BookFacts({ book }: { book: Omit<AdminBookView, 'usage'> }) {
  return (
    <div className="flex gap-4">
      <ImageThumb url={book.coverUrl} className="h-28 w-20" />
      <dl className="grid flex-1 grid-cols-[auto_1fr] content-start gap-x-4 gap-y-1.5 text-[13px]">
        <Fact label="저자">{book.author ?? '—'}</Fact>
        <Fact label="출판사">{book.publisher ?? '—'}</Fact>
        <Fact label="총 페이지">
          {book.totalPages ? <span className="numeral">{book.totalPages}</span> : <Tag tone="warn">없음</Tag>}
        </Fact>
        <Fact label="ISBN">
          <span className="font-mono text-[12px]">{book.isbn13 ?? '—'}</span>
        </Fact>
        <Fact label="카테고리">{book.category ?? '—'}</Fact>
        <Fact label="출처">
          <span className="inline-flex flex-wrap gap-1">
            <Tag>{BOOK_SOURCE_LABEL[book.source] ?? book.source}</Tag>
            {book.userCreated ? <Tag>사용자 등록</Tag> : null}
          </span>
        </Fact>
        <Fact label="들어온 때">
          <span className="font-mono text-[12px]">{formatDateTime(book.createdAt)}</span>
        </Fact>
      </dl>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-[var(--color-muted)]">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

// ── 수정 · 등록 ─────────────────────────────────────────

function pagesInvalid(value: string): boolean {
  return value !== '' && (Number(value) < 1 || Number(value) > MAX_PAGES);
}

function EditDialog({ book, onClose }: { book: EditableBook; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author ?? '');
  const [publisher, setPublisher] = useState(book.publisher ?? '');
  const [totalPages, setTotalPages] = useState(String(book.totalPages ?? ''));
  const [coverUrl, setCoverUrl] = useState(book.coverUrl ?? '');
  const [category, setCategory] = useState(book.category ?? '');
  const [reason, setReason] = useState('');

  // 바뀐 칸만 보낸다 — 손대지 않은 값을 덮어쓰지 않게. 표지·카테고리는 서버가 지우지 못해 비우면 그대로 둔다.
  const body: UpdateBookRequest = { reason: reason.trim() };
  if (title.trim() && title.trim() !== book.title) body.title = title.trim();
  if (author.trim() !== (book.author ?? '')) body.author = author.trim() || undefined;
  if (publisher.trim() !== (book.publisher ?? '')) body.publisher = publisher.trim() || undefined;
  if (totalPages && Number(totalPages) !== book.totalPages) body.totalPages = Number(totalPages);
  if (coverUrl.trim() && coverUrl.trim() !== (book.coverUrl ?? '')) body.coverUrl = coverUrl.trim();
  if (category.trim() && category.trim() !== (book.category ?? '')) body.category = category.trim();
  const changed = Object.keys(body).length > 1;
  const badPages = pagesInvalid(totalPages);

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
          <Button
            disabled={!changed || badPages || !reason.trim() || update.isPending}
            onClick={() => update.mutate()}
          >
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
          hint={
            badPages
              ? `1부터 ${MAX_PAGES.toLocaleString('ko-KR')} 사이로 입력하세요.`
              : '이 값이 바뀌면 모든 독자의 진행률이 다시 계산됩니다.'
          }
        />
        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <Input
            label="표지 URL"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="https://..."
            hint="지울 수는 없습니다 — 비워 두면 그대로 둡니다."
          />
          <ImageThumb url={coverUrl.trim() || null} className="mb-5 h-16 w-12" />
        </div>
        <Input
          label="카테고리"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          hint="지울 수는 없습니다 — 비워 두면 그대로 둡니다."
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

/** 같은 ISBN 이 있으면 서버가 409 와 함께 "도서 #12 제목" 을 알려 준다 — 그 책을 바로 열 수 있게 번호를 뽑는다. */
function existingBookId(error: unknown): number | null {
  if (!(error instanceof AdminApiError) || error.status !== 409) return null;
  const match = /#(\d+)/.exec(error.message);
  return match ? Number(match[1]) : null;
}

function CreateDialog({ onClose, onOpen }: { onClose: () => void; onOpen: (bookId: number) => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: '', author: '', publisher: '', totalPages: '', isbn13: '', coverUrl: '', category: '', reason: '',
  });
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const badPages = pagesInvalid(form.totalPages);
  const isbnDigits = form.isbn13.replace(/[\s-]/g, '');
  const badIsbn = isbnDigits !== '' && !/^\d{13}$/.test(isbnDigits);

  const create = useMutation({
    meta: { inlineError: true },
    mutationFn: () => {
      const body: AdminBookCreateRequest = {
        title: form.title.trim(),
        reason: form.reason.trim(),
        author: form.author.trim() || undefined,
        publisher: form.publisher.trim() || undefined,
        totalPages: form.totalPages ? Number(form.totalPages) : undefined,
        isbn13: isbnDigits || undefined,
        coverUrl: form.coverUrl.trim() || undefined,
        category: form.category.trim() || undefined,
      };
      return booksApi.create(body);
    },
    onSuccess: (book) => {
      toast.success('도서를 등록했습니다.');
      queryClient.invalidateQueries({ queryKey: qk.books.all });
      onOpen(book.id);
    },
  });

  const duplicateId = existingBookId(create.error);

  return (
    <Modal
      eyebrow="도서 등록"
      title="외부 검색에 없는 책 등록"
      busy={create.isPending}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" disabled={create.isPending} onClick={onClose}>
            취소
          </Button>
          <Button
            disabled={!form.title.trim() || !form.reason.trim() || badPages || badIsbn || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? '등록 중…' : '등록'}
          </Button>
        </>
      }
    >
      <p className="mb-4 text-[13px] text-[var(--color-muted)]">
        회원이 검색해도 나오지 않는 책을 직접 넣습니다. 먼저 목록에서 같은 책이 없는지 찾아보세요.
      </p>
      <div className="flex flex-col gap-3">
        <Input label="제목 (필수)" value={form.title} maxLength={300} onChange={set('title')} autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <Input label="저자" value={form.author} maxLength={200} onChange={set('author')} />
          <Input label="출판사" value={form.publisher} maxLength={200} onChange={set('publisher')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="총 페이지"
            inputMode="numeric"
            value={form.totalPages}
            onChange={(e) => setForm((prev) => ({ ...prev, totalPages: e.target.value.replace(/\D/g, '') }))}
            hint={badPages ? `1부터 ${MAX_PAGES.toLocaleString('ko-KR')} 사이로 입력하세요.` : '모르면 비워 두세요.'}
          />
          <Input
            label="ISBN"
            value={form.isbn13}
            maxLength={20}
            onChange={set('isbn13')}
            placeholder="978-89-..."
            hint={badIsbn ? '13자리 숫자여야 합니다.' : '하이픈째 붙여 넣어도 됩니다.'}
          />
        </div>
        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <Input
            label="표지 URL"
            value={form.coverUrl}
            maxLength={500}
            onChange={set('coverUrl')}
            placeholder="https://..."
          />
          <ImageThumb url={form.coverUrl.trim() || null} className="h-16 w-12" />
        </div>
        <Input label="카테고리" value={form.category} maxLength={100} onChange={set('category')} />
        <Input
          label="등록 사유 (필수)"
          value={form.reason}
          maxLength={500}
          onChange={set('reason')}
          placeholder="예: 독립출판물이라 외부 검색에 없음"
        />
      </div>
      <ErrorText error={create.isError ? errorMessage(create.error, '등록하지 못했습니다.') : null} />
      {duplicateId ? (
        <Button variant="outline" className="mt-2" onClick={() => onOpen(duplicateId)}>
          도서 #{duplicateId} 열기
        </Button>
      ) : null}
    </Modal>
  );
}

// ── 병합 ────────────────────────────────────────────────

function MergeDialog({ source, onClose, onMerged }: {
  source: AdminBookView;
  onClose: () => void;
  onMerged: (targetId: number) => void;
}) {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [target, setTarget] = useState<BookRow | null>(null);
  const [reason, setReason] = useState('');

  const preview = useQuery({
    queryKey: qk.books.mergePreview(source.id, target?.id ?? 0),
    queryFn: () => booksApi.mergePreview(source.id, target!.id),
    enabled: target !== null,
  });
  const data = target ? preview.data : undefined;

  const submit = async () => {
    if (!target) return;
    const done = await confirm({
      title: '두 책을 합칠까요?',
      tone: 'danger',
      confirmLabel: '병합',
      typeToConfirm: '병합',
      body: (
        <ul className="list-disc space-y-1 pl-5">
          <li>
            원본 #{source.id} “{source.title}” — 지워집니다.
          </li>
          <li>
            대상 #{target.id} “{target.title}” — 원본의 기록이 모두 이리로 옮겨집니다.
          </li>
          <li>되돌릴 수 없습니다.</li>
        </ul>
      ),
      action: async () => {
        const result = await booksApi.merge(source.id, target.id, reason.trim());
        const moved = USAGE_ITEMS.reduce((sum, item) => sum + result.moved[item.key], 0);
        toast.success(`기록 ${moved.toLocaleString('ko-KR')}건을 옮기고 원본을 지웠습니다.`);
        queryClient.removeQueries({ queryKey: qk.books.detail(source.id) });
        queryClient.invalidateQueries({ queryKey: qk.books.all });
      },
    });
    if (done) onMerged(target.id);
  };

  return (
    <Modal
      size="xl"
      eyebrow="도서 병합 · 최고 관리자"
      title="다른 책에 합치기"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button variant="danger" disabled={!data?.mergeable || !reason.trim()} onClick={submit}>
            병합…
          </Button>
        </>
      }
    >
      <p className="text-[13px] text-[var(--color-muted)]">
        같은 책이 두 번 들어왔을 때 씁니다. 원본(이 책)을 가리키던 독서 기록·리뷰·독후감·좋아요 등을 대상으로 옮기고
        원본을 지웁니다. 회원이 직접 등록했거나 ISBN 이 없는 책만 원본이 될 수 있습니다.
      </p>

      <div className="mt-5 grid grid-cols-2 items-start gap-4">
        <MergeSide label="원본 — 지워짐" book={data?.source ?? source} />
        {target ? (
          <div>
            {data ? (
              <MergeSide label="대상 — 남음" book={data.target} />
            ) : (
              <div className="rounded-lg border border-[var(--color-line)] px-4 py-3">
                <p className="eyebrow">대상 — 남음</p>
                <p className="mt-2 text-[14px] font-bold">{target.title}</p>
                <p className="mt-1 text-[12.5px] text-[var(--color-muted)]">
                  {preview.isError ? '미리보기를 불러오지 못했습니다.' : '미리보기를 불러오는 중…'}
                </p>
              </div>
            )}
            <Button variant="ghost" className="mt-2" onClick={() => setTarget(null)}>
              대상 다시 고르기
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-[var(--color-line)] px-4 py-3">
            <p className="eyebrow mb-2">대상 — 남음</p>
            <BookPicker onPick={setTarget} disabledIds={[source.id]} disabledHint="원본" autoFocus />
          </div>
        )}
      </div>

      {preview.isError && target ? (
        <div className="mt-3">
          <ErrorText error={errorMessage(preview.error, '미리보기를 불러오지 못했습니다.')} />
          <Button variant="outline" className="mt-2" onClick={() => preview.refetch()}>
            다시 시도
          </Button>
        </div>
      ) : null}

      {data ? (
        <>
          <section className="mt-5">
            <p className="eyebrow">두 책에 모두 있는 기록</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Metric label="두 책을 다 담은 회원" value={data.sharedReaders} />
              <Metric label="두 책 다 좋아요" value={data.sharedLikes} />
              <Metric label="두 책 다 페이지 제안" value={data.sharedSuggestions} />
            </div>
            <p className="mt-2 font-mono text-[11px] text-[var(--color-faint)]">
              겹치는 좋아요·페이지 제안은 원본 쪽을 지웁니다. 두 책을 다 담은 회원의 원본 기록은 대상의 다음 회차로 이어집니다.
            </p>
          </section>

          {data.blockers.length > 0 ? (
            <Notice tone="danger" title="병합할 수 없습니다" items={data.blockers} />
          ) : null}
          {data.warnings.length > 0 ? <Notice tone="warn" title="확인하세요" items={data.warnings} /> : null}

          {data.mergeable ? (
            <div className="mt-5">
              <Input
                label="병합 사유 (필수)"
                value={reason}
                maxLength={500}
                onChange={(e) => setReason(e.target.value)}
                placeholder="예: 사용자 등록 도서가 정식 도서와 중복"
              />
            </div>
          ) : null}
        </>
      ) : null}
    </Modal>
  );
}

function MergeSide({ label, book }: { label: string; book: AdminBookView }) {
  const total = USAGE_ITEMS.reduce((sum, item) => sum + book.usage[item.key], 0);
  return (
    <div className="rounded-lg border border-[var(--color-line)] px-4 py-3">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 text-[14px] font-bold break-words">
        {book.title} <span className="font-mono text-[11px] font-normal text-[var(--color-faint)]">#{book.id}</span>
      </p>
      <p className="mt-1 text-[12.5px] text-[var(--color-muted)]">
        {book.author ?? '저자 미상'} · {book.publisher ?? '—'} · {book.totalPages ? `${book.totalPages}쪽` : '페이지 없음'}
      </p>
      <p className="mt-1 font-mono text-[11px] text-[var(--color-faint)]">
        ISBN {book.isbn13 ?? '없음'} · {BOOK_SOURCE_LABEL[book.source] ?? book.source}
        {book.userCreated ? ' · 사용자 등록' : ''}
      </p>
      <p className="mt-2 font-mono text-[11.5px] text-[var(--color-muted)]">
        {USAGE_ITEMS.filter((item) => book.usage[item.key] > 0)
          .map((item) => `${item.label} ${book.usage[item.key].toLocaleString('ko-KR')}`)
          .join(' · ') || '쓰는 곳 없음'}
        {book.usage.editorPick ? ' · 에디터 픽' : ''}
      </p>
      <p className="mt-1 font-mono text-[11px] text-[var(--color-faint)]">합계 {total.toLocaleString('ko-KR')}건</p>
    </div>
  );
}

// Tailwind 는 클래스 이름을 글자 그대로 찾는다 — 조합하지 말고 통째로 적는다.
const NOTICE_TONE = {
  danger: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]',
  warn: 'bg-[var(--color-warn-soft)] text-[var(--color-warn)]',
} as const;

function Notice({ tone, title, items }: { tone: keyof typeof NOTICE_TONE; title: string; items: string[] }) {
  return (
    <div className={`mt-4 rounded-lg px-4 py-3 ${NOTICE_TONE[tone]}`}>
      <p className="font-mono text-[12px] font-bold">{title}</p>
      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
