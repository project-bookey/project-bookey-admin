'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

import { AdminApiError, errorMessage } from '@/lib/api';
import { booksApi } from '@/lib/endpoints';
import { formatDateTime } from '@/lib/format';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/lib/toast';
import { param, useListParams } from '@/lib/useListParams';
import { useCan } from '@/lib/useMe';
import { useConfirm } from '@/components/Confirm';
import { Modal } from '@/components/Modal';
import { QueryState } from '@/components/QueryState';
import { PageHeader } from '@/components/Shell';
import { Button, Card, ErrorText, Pager, ResultCount, Table, Tabs, Tag } from '@/components/ui';

/** 기본은 검토가 필요한 책만 — all 이면 제안이 모인 책 전부. */
const FILTERS = { all: param.bool() };

/**
 * 페이지 수 제안 검토. 책에 페이지 수가 없으면 같은 값이 3표 모일 때 서버가 자동으로 넣는다.
 * 이미 값이 있는데 회원들이 다른 값을 내면 사람이 보고 정해야 한다 — 그 책들을 모아 보여 준다.
 */
export default function PageSuggestionsPage() {
  const { params, setFilter, setPage, open, close } = useListParams(FILTERS);
  const { all, page, id } = params;

  const list = useQuery({
    queryKey: qk.books.suggestions({ all, page }),
    queryFn: () => booksApi.pageSuggestions(!all, page),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title="페이지 제안"
        description="회원이 낸 총 페이지 수를 검토합니다. 빈 값은 같은 제안 3표로 자동 반영되고, 이미 값이 있으면 여기서 정합니다."
      />

      <div className="px-7 py-6">
        <div className="mb-4">
          <Tabs
            value={all ? 'all' : 'conflicts'}
            options={[
              { value: 'conflicts', label: '검토 필요' },
              { value: 'all', label: '전체' },
            ]}
            onChange={(value) => setFilter({ all: value === 'all' })}
          />
        </div>

        <ResultCount total={list.data?.totalElements} />

        <Card>
          <QueryState
            query={list}
            isEmpty={(data) => data.content.length === 0}
            empty={all ? '페이지 수 제안이 없습니다.' : '검토할 제안이 없습니다. 지금 값과 최다 제안이 모두 같습니다.'}
            onFirstPage={page > 0 ? () => setPage(0) : undefined}
          >
            {(data) => (
              <Table head={['도서', '지금 값', '최다 제안', '전체 제안', '마지막 제안', '']}>
                {data.content.map((row) => {
                  const differs = row.currentPages !== row.topPages;
                  return (
                    <tr key={row.bookId} className="border-b border-[var(--color-line)] last:border-0">
                      <td className="max-w-sm px-4 py-3">
                        <button
                          type="button"
                          onClick={() => open(row.bookId)}
                          className="block max-w-full truncate text-left text-[14px] font-bold hover:underline"
                        >
                          {row.title}
                        </button>
                        <p className="font-mono text-[10.5px] text-[var(--color-faint)]">#{row.bookId}</p>
                      </td>
                      <td className="px-4 py-3">
                        {row.currentPages ? (
                          <span className="numeral text-[12px]">{row.currentPages}</span>
                        ) : (
                          <Tag tone="warn">없음</Tag>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`numeral text-[12px] ${differs ? 'text-[var(--color-warn)]' : ''}`}>
                          {row.topPages}
                        </span>
                        <span className="ml-1.5 font-mono text-[11px] text-[var(--color-faint)]">{row.topVotes}표</span>
                      </td>
                      <td className="numeral px-4 py-3 text-[12px]">{row.totalVotes}</td>
                      <td className="px-4 py-3 font-mono text-[11px] whitespace-nowrap text-[var(--color-muted)]">
                        {formatDateTime(row.lastSuggestedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="outline" onClick={() => open(row.bookId)}>
                          검토
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </Table>
            )}
          </QueryState>
        </Card>

        <Pager page={page} totalPages={list.data?.totalPages ?? 0} onChange={setPage} />
      </div>

      {id !== undefined ? <ReviewDialog key={id} bookId={id} onClose={close} /> : null}
    </>
  );
}

function ReviewDialog({ bookId, onClose }: { bookId: number; onClose: () => void }) {
  const canEdit = useCan('EDIT_BOOK');
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const book = useQuery({ queryKey: qk.books.detail(bookId), queryFn: () => booksApi.detail(bookId) });
  const tally = useQuery({ queryKey: qk.books.tally(bookId), queryFn: () => booksApi.suggestionTally(bookId) });

  const gone = book.error instanceof AdminApiError && book.error.code === 'BOOK_NOT_FOUND';
  const current = book.data?.totalPages;
  const rows = tally.data ?? [];
  const totalVotes = rows.reduce((sum, row) => sum + row.votes, 0);
  const maxVotes = rows[0]?.votes ?? 0;

  const apply = async (pages: number) => {
    const done = await confirm({
      title: `총 페이지를 ${pages}쪽으로 바꿀까요?`,
      body: '이 책을 읽는 모든 회원의 진행률이 다시 계산됩니다. 제안은 그대로 남으니, 다 봤으면 제안을 비우세요.',
      confirmLabel: '반영',
      reason: { label: '사유 (필수)', placeholder: '예: 제안 다수와 실물 확인 일치' },
      action: ({ reason }) => booksApi.update(bookId, { totalPages: pages, reason }),
    });
    if (!done) return;
    toast.success(`총 페이지를 ${pages}쪽으로 바꿨습니다.`);
    queryClient.invalidateQueries({ queryKey: qk.books.all });
  };

  const clear = async () => {
    let removed = 0;
    const done = await confirm({
      title: '이 책의 제안을 모두 비울까요?',
      tone: 'danger',
      body: `모인 제안 ${totalVotes.toLocaleString('ko-KR')}건을 지웁니다. 지금 페이지 수는 그대로이고, 회원은 다시 제안할 수 있습니다.`,
      confirmLabel: '비우기',
      reason: { label: '사유 (필수)', placeholder: '예: 검토 완료, 지금 값이 맞음' },
      action: async ({ reason }) => {
        removed = (await booksApi.clearSuggestions(bookId, reason)).removed;
      },
    });
    if (!done) return;
    toast.success(`제안 ${removed.toLocaleString('ko-KR')}건을 비웠습니다.`);
    queryClient.invalidateQueries({ queryKey: qk.books.all });
  };

  return (
    <Modal
      size="lg"
      eyebrow={`페이지 제안 · 도서 #${bookId}`}
      title={book.data?.title}
      onClose={onClose}
      footer={
        canEdit && totalVotes > 0 ? (
          <Button variant="danger" onClick={clear}>
            제안 비우기
          </Button>
        ) : undefined
      }
    >
      {gone ? (
        <p className="rounded-lg bg-[var(--color-danger-soft)] px-4 py-3 font-mono text-[12px] font-bold text-[var(--color-danger)]">
          찾을 수 없는 도서입니다. 다른 책에 합쳐져 지워졌을 수 있습니다.
        </p>
      ) : null}

      {book.data ? (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--color-surface-alt)] px-4 py-3">
          <div>
            <p className="eyebrow">지금 값</p>
            <p className="numeral mt-1 text-[20px]">{current ? `${current}쪽` : '없음'}</p>
          </div>
          <Link href={`/books?id=${bookId}`} className="font-mono text-[12px] text-[var(--color-muted)] underline">
            도서 상세
          </Link>
        </div>
      ) : null}

      <section className="mt-5">
        <p className="eyebrow">제안 · 많이 나온 순</p>
        {tally.isPending ? (
          <p className="mt-2 text-[13.5px] text-[var(--color-muted)]">불러오는 중…</p>
        ) : tally.isError && !gone ? (
          <div className="mt-2">
            <ErrorText error={errorMessage(tally.error, '제안을 불러오지 못했습니다.')} />
            <Button variant="outline" className="mt-2" onClick={() => tally.refetch()}>
              다시 시도
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <p className="mt-2 text-[13.5px] text-[var(--color-muted)]">모인 제안이 없습니다.</p>
        ) : (
          <ul className="mt-2 divide-y divide-[var(--color-line)] rounded-lg border border-[var(--color-line)]">
            {rows.map((row) => (
              <li key={row.pages} className="flex items-center gap-4 px-4 py-2.5">
                <span className="numeral w-20 shrink-0 text-[14px]">{row.pages}쪽</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-alt)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-ink)]"
                    style={{ width: `${maxVotes ? (row.votes / maxVotes) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right font-mono text-[12px] text-[var(--color-muted)]">
                  {row.votes}표 · {Math.round((row.votes / totalVotes) * 100)}%
                </span>
                <span className="w-28 shrink-0 text-right">
                  {row.pages === current ? (
                    <Tag tone="accent">지금 값</Tag>
                  ) : canEdit && book.data ? (
                    <Button variant="outline" onClick={() => apply(row.pages)}>
                      이 값으로
                    </Button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Modal>
  );
}
