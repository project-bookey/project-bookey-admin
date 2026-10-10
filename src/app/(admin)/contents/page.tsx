'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { contentsApi } from '@/lib/endpoints';
import { formatDateTime } from '@/lib/format';
import {
  CONTENT_ACTION_LABEL, CONTENT_ACTION_VERB, CONTENT_STATUSES, CONTENT_STATUS_LABEL, CONTENT_STATUS_TONE, CONTENT_TYPES,
  MODERATION_SOURCE_LABEL, POST_VISIBILITY_LABEL, STATUSFUL_CONTENT_TYPES, USER_STATUS_LABEL, USER_STATUS_TONE,
} from '@/lib/labels';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/lib/toast';
import type { ContentAction, ContentRow, ContentType } from '@/lib/types';
import { param, useListParams } from '@/lib/useListParams';
import { useConfirm } from '@/components/Confirm';
import { Modal } from '@/components/Modal';
import { QueryState } from '@/components/QueryState';
import { PageHeader } from '@/components/Shell';
import {
  Button, Card, Checkbox, ImageThumb, Input, Pager, ResultCount, Select, Table, Tabs, Tag,
} from '@/components/ui';

const FILTERS = {
  type: param.oneOf(CONTENT_TYPES, 'POST'),
  status: param.oneOf(CONTENT_STATUSES),
  q: param.str(),
  reported: param.bool(),
  userId: param.int(),
  bookId: param.int(),
};

/**
 * 콘텐츠 검수 — 신고가 없어도 회원이 쓴 글을 찾아 숨기거나 지운다.
 * 독후감·리뷰·모임 글은 숨김(작성자만 봄)·복구·삭제, 댓글·한줄평은 삭제만 된다.
 */
export default function ContentsPage() {
  const { params, setFilter, setPage, open, close } = useListParams(FILTERS);
  const { status, q, reported, userId, bookId, page, id } = params;
  const type: ContentType = params.type || 'POST';
  const statusful = STATUSFUL_CONTENT_TYPES.includes(type);

  const contents = useQuery({
    queryKey: qk.contents.list({ type, status, q, reported, userId, bookId, page }),
    queryFn: () =>
      contentsApi.list(
        type,
        {
          status: statusful ? status || undefined : undefined,
          keyword: q || undefined,
          reportedOnly: reported,
          userId,
          bookId,
        },
        page,
      ),
    placeholderData: keepPreviousData,
  });

  const act = useContentAction();

  return (
    <>
      <PageHeader
        title="콘텐츠 검수"
        description="회원이 쓴 글을 찾아 숨기거나 지웁니다. 조치하면 그 글의 열린 신고도 함께 처리됩니다."
      />

      <div className="px-7 py-6">
        <div className="mb-4">
          <Tabs<ContentType>
            value={type}
            options={CONTENT_TYPES.map((value) => ({ value, label: MODERATION_SOURCE_LABEL[value] }))}
            onChange={(value) => setFilter({ type: value, status: '' })}
          />
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <KeywordSearch key={q} initial={q} onSubmit={(value) => setFilter({ q: value })} />
          {statusful ? (
            <div className="w-32">
              <Select label="상태" value={status} onChange={(e) => setFilter({ status: e.target.value as typeof status })}>
                <option value="">전체</option>
                {CONTENT_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {CONTENT_STATUS_LABEL[value]}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          <Checkbox label="신고된 것만" checked={reported} onChange={(checked) => setFilter({ reported: checked })} />
          {userId !== undefined ? (
            <FilterChip label={`회원 #${userId}`} onClear={() => setFilter({ userId: undefined })} />
          ) : null}
          {bookId !== undefined ? (
            <FilterChip label={`도서 #${bookId}`} onClear={() => setFilter({ bookId: undefined })} />
          ) : null}
        </div>

        <ResultCount total={contents.data?.totalElements} />

        <Card>
          <QueryState
            query={contents}
            isEmpty={(data) => data.content.length === 0}
            empty="조건에 맞는 글이 없습니다."
            onFirstPage={page > 0 ? () => setPage(0) : undefined}
          >
            {(data) => (
              <Table head={['상태', '내용', '작성자', '맥락', '신고', '작성', '']}>
                {data.content.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--color-line)] last:border-0">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Tag tone={CONTENT_STATUS_TONE[row.status] ?? 'neutral'}>{CONTENT_STATUS_LABEL[row.status] ?? row.status}</Tag>
                      {row.visibility && row.visibility !== 'PUBLIC' ? (
                        <p className="mt-1 font-mono text-[10.5px] text-[var(--color-faint)]">
                          {POST_VISIBILITY_LABEL[row.visibility] ?? row.visibility}
                        </p>
                      ) : null}
                    </td>
                    <td className="max-w-md px-4 py-3">
                      {row.title ? <p className="truncate text-[13.5px] font-bold">{row.title}</p> : null}
                      <p className="line-clamp-2 text-[13px] text-[var(--color-muted)]">{row.preview || '(내용 없음)'}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <AuthorCell row={row} onFilter={() => setFilter({ userId: row.authorId })} />
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-[12.5px] text-[var(--color-muted)]">
                      {row.contextLabel ?? '—'}
                    </td>
                    <td className="numeral px-4 py-3 text-[12px]">
                      {row.reportCount > 0 ? <Tag tone="danger">{row.reportCount}</Tag> : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] whitespace-nowrap text-[var(--color-faint)]">
                      {formatDateTime(row.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" onClick={() => open(row.id)}>
                          원문
                        </Button>
                        {row.supportedActions.map((action) => (
                          <Button
                            key={action}
                            variant={action === 'DELETE' ? 'danger' : 'outline'}
                            onClick={() => act(row, action)}
                          >
                            {CONTENT_ACTION_LABEL[action]}
                          </Button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </QueryState>
        </Card>

        <Pager page={page} totalPages={contents.data?.totalPages ?? 0} onChange={setPage} />
      </div>

      {id !== undefined ? <ContentDialog key={`${type}-${id}`} type={type} id={id} onClose={close} /> : null}
    </>
  );
}

/** 숨김·복구·삭제 — 사유를 받아 확인창 안에서 실행한다. */
function useContentAction() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  return async (row: ContentRow, action: ContentAction, after?: () => void) => {
    const removesForGood = action === 'DELETE' && !STATUSFUL_CONTENT_TYPES.includes(row.type as ContentType);
    const body =
      action === 'HIDE'
        ? '작성자에게만 보이고 다른 사람에게는 사라집니다. 언제든 복구할 수 있습니다.'
        : action === 'RESTORE'
          ? '다시 모두에게 보입니다.'
          : removesForGood
            ? '완전히 지워 되돌릴 수 없습니다. 답글도 함께 지워집니다. 원문은 감사 로그에 남습니다.'
            : '아무에게도 보이지 않습니다(작성자 포함). 기록은 남아 복구할 수 있습니다.';
    await confirm({
      title: `이 ${MODERATION_SOURCE_LABEL[row.type]}을(를) ${CONTENT_ACTION_VERB[action].ask}?`,
      body,
      confirmLabel: CONTENT_ACTION_LABEL[action],
      tone: action === 'RESTORE' ? 'primary' : 'danger',
      reason: { label: '사유 (필수)', placeholder: '예: 광고성 글, 욕설' },
      action: async ({ reason }) => {
        await contentsApi.act(row.type as ContentType, row.id, action, reason);
        toast.success(CONTENT_ACTION_VERB[action].done);
        queryClient.invalidateQueries({ queryKey: qk.contents.all });
        queryClient.invalidateQueries({ queryKey: qk.moderation.all });
        queryClient.invalidateQueries({ queryKey: qk.reviews.all });
        queryClient.invalidateQueries({ queryKey: qk.dashboard });
        after?.();
      },
    });
  };
}

function AuthorCell({ row, onFilter }: { row: ContentRow; onFilter: () => void }) {
  if (!row.authorId) return <>—</>;
  return (
    <div className="text-[13px]">
      <Link href={`/users?id=${row.authorId}`} className="font-bold underline-offset-2 hover:underline">
        {row.authorNickname ?? `#${row.authorId}`}
      </Link>
      {row.authorStatus && row.authorStatus !== 'ACTIVE' ? (
        <span className="ml-1">
          <Tag tone={USER_STATUS_TONE[row.authorStatus]}>{USER_STATUS_LABEL[row.authorStatus]}</Tag>
        </span>
      ) : null}
      <button type="button" onClick={onFilter} className="ml-1 font-mono text-[10.5px] text-[var(--color-faint)] underline">
        이 회원 글만
      </button>
    </div>
  );
}

function ContentDialog({ type, id, onClose }: { type: ContentType; id: number; onClose: () => void }) {
  const act = useContentAction();
  // 원문을 열 때마다 열람 기록(VIEW_CONTENT)이 남는다.
  const detail = useQuery({
    queryKey: qk.contents.detail(type, id),
    queryFn: () => contentsApi.detail(type, id),
  });

  return (
    <Modal size="lg" eyebrow={`${MODERATION_SOURCE_LABEL[type]} #${id}`} title={detail.data?.content.title ?? '원문'} onClose={onClose}>
      <QueryState query={detail}>
        {(data) => {
          const row = data.content;
          return (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Tag tone={CONTENT_STATUS_TONE[row.status] ?? 'neutral'}>{CONTENT_STATUS_LABEL[row.status] ?? row.status}</Tag>
                {row.visibility ? <Tag>{POST_VISIBILITY_LABEL[row.visibility] ?? row.visibility}</Tag> : null}
                {row.reportCount > 0 ? <Tag tone="danger">신고 {row.reportCount}</Tag> : null}
                <span className="font-mono text-[11px] text-[var(--color-faint)]">
                  {row.authorNickname ?? '—'} · {formatDateTime(row.createdAt)}
                  {row.contextLabel ? ` · ${row.contextLabel}` : ''}
                </span>
              </div>
              <div className="mt-4 max-h-[50vh] overflow-y-auto rounded-lg bg-[var(--color-surface-alt)] px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap break-words">
                {data.body || '(내용 없음)'}
              </div>
              {data.imageUrl ? (
                <a href={data.imageUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block" title="원본 보기">
                  <ImageThumb url={data.imageUrl} className="h-32 w-32" />
                </a>
              ) : null}
              <div className="mt-4 flex items-center justify-between">
                <div className="font-mono text-[11.5px]">
                  {data.ticketId ? (
                    <Link href={`/moderation?id=${data.ticketId}&status=ALL`} className="underline">
                      신고 #{data.ticketId} 보기
                    </Link>
                  ) : (
                    <span className="text-[var(--color-faint)]">신고 없음</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {row.supportedActions.map((action) => (
                    <Button
                      key={action}
                      variant={action === 'DELETE' ? 'danger' : 'outline'}
                      onClick={() => act(row, action, onClose)}
                    >
                      {CONTENT_ACTION_LABEL[action]}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          );
        }}
      </QueryState>
    </Modal>
  );
}

function KeywordSearch({ initial, onSubmit }: { initial: string; onSubmit: (value: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value.trim());
      }}
    >
      <div className="w-72">
        <Input label="내용 검색" value={value} onChange={(e) => setValue(e.target.value)} placeholder="제목 · 본문에 들어간 말" />
      </div>
      <Button type="submit">찾기</Button>
    </form>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 font-mono text-[12px]">
      {label}
      <button type="button" aria-label="필터 지우기" onClick={onClear} className="text-[var(--color-faint)] hover:text-[var(--color-ink)]">
        ×
      </button>
    </span>
  );
}
