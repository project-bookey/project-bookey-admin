'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { errorMessage } from '@/lib/api';
import { reviewsApi } from '@/lib/endpoints';
import { formatDateTime } from '@/lib/format';
import {
  CONTENT_STATUSES, CONTENT_STATUS_LABEL, CONTENT_STATUS_TONE, VERIFICATION_LEVELS, VERIFICATION_LEVEL_LABEL,
  VERIFICATION_LEVEL_TONE,
} from '@/lib/labels';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/lib/toast';
import type { ReviewRow, VerificationLevel } from '@/lib/types';
import { param, useListParams } from '@/lib/useListParams';
import { useCan } from '@/lib/useMe';
import { BookPicker } from '@/components/BookPicker';
import { Modal } from '@/components/Modal';
import { QueryState } from '@/components/QueryState';
import { PageHeader } from '@/components/Shell';
import { Button, Card, Checkbox, ErrorText, Input, Pager, ResultCount, Select, Tag } from '@/components/ui';

const FILTERS = {
  bookId: param.int(),
  userId: param.int(),
  status: param.oneOf(CONTENT_STATUSES),
  level: param.oneOf(VERIFICATION_LEVELS),
  reported: param.bool(),
};

/** 검증 심사 — 등급 산정 근거(스냅샷)를 보고 수동 조정한다 (§8.2 · §F13). */
export default function ReviewsPage() {
  const canModerate = useCan('MODERATE');
  const { params, setFilter, setPage } = useListParams(FILTERS);
  const { bookId, userId, status, level, reported, page } = params;
  const [selected, setSelected] = useState<ReviewRow | null>(null);
  const [picking, setPicking] = useState(false);

  const reviews = useQuery({
    queryKey: qk.reviews.list({ bookId, userId, status, level, reported, page }),
    queryFn: () =>
      reviewsApi.list(
        { bookId, userId, status: status || undefined, verificationLevel: level || undefined, reportedOnly: reported },
        page,
      ),
    placeholderData: keepPreviousData,
  });

  const bookTitle = bookId !== undefined ? reviews.data?.content[0]?.bookTitle : undefined;

  return (
    <>
      <PageHeader
        title="검증 심사"
        description="등급은 리뷰 작성 시점에 고정됩니다. 조정하면 사유가 감사 로그에 남습니다."
        action={
          bookId !== undefined ? (
            <span className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 font-mono text-[12px]">
              도서: {bookTitle ?? `#${bookId}`}
              <button
                type="button"
                aria-label="도서 필터 지우기"
                onClick={() => setFilter({ bookId: undefined })}
                className="text-[var(--color-faint)] hover:text-[var(--color-ink)]"
              >
                ×
              </button>
            </span>
          ) : (
            <Button variant="outline" onClick={() => setPicking(true)}>
              도서로 거르기
            </Button>
          )
        }
      />

      <div className="px-7 py-6">
        <div className="mb-4 flex flex-wrap items-end gap-3">
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
          <div className="w-36">
            <Select label="검증 등급" value={level} onChange={(e) => setFilter({ level: e.target.value as typeof level })}>
              <option value="">전체</option>
              {VERIFICATION_LEVELS.map((value) => (
                <option key={value} value={value}>
                  {VERIFICATION_LEVEL_LABEL[value]}
                </option>
              ))}
            </Select>
          </div>
          <Checkbox label="신고된 것만" checked={reported} onChange={(checked) => setFilter({ reported: checked })} />
          {userId !== undefined ? (
            <span className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 font-mono text-[12px]">
              회원 #{userId}
              <button type="button" aria-label="회원 필터 지우기" onClick={() => setFilter({ userId: undefined })}
                className="text-[var(--color-faint)] hover:text-[var(--color-ink)]">
                ×
              </button>
            </span>
          ) : null}
        </div>
        <ResultCount total={reviews.data?.totalElements} />
        <Card>
          <QueryState
            query={reviews}
            isEmpty={(data) => data.content.length === 0}
            empty="표시할 리뷰가 없습니다."
            onFirstPage={page > 0 ? () => setPage(0) : undefined}
          >
            {(data) => (
              <ul className="divide-y divide-[var(--color-line)]">
                {data.content.map((review) => (
                  <li key={review.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Tag tone={VERIFICATION_LEVEL_TONE[review.verificationLevel]}>
                            {VERIFICATION_LEVEL_LABEL[review.verificationLevel]}
                          </Tag>
                          <button
                            type="button"
                            className="text-[13.5px] font-bold underline-offset-2 hover:underline"
                            title="이 도서의 리뷰만 보기"
                            onClick={() => setFilter({ bookId: review.bookId })}
                          >
                            {review.bookTitle ?? '—'}
                          </button>
                          <span className="font-mono text-[11px] text-[var(--color-faint)]">
                            {review.authorNickname ?? '—'} · {review.rating ? `★${review.rating}` : '별점 없음'} ·{' '}
                            {formatDateTime(review.createdAt)}
                          </span>
                          {review.status !== 'VISIBLE' ? (
                            <Tag tone={CONTENT_STATUS_TONE[review.status] ?? 'warn'}>
                              {CONTENT_STATUS_LABEL[review.status] ?? review.status}
                            </Tag>
                          ) : null}
                          {review.reportCount > 0 ? <Tag tone="danger">신고 {review.reportCount}</Tag> : null}
                        </div>
                        <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed">{review.body}</p>
                        {review.verificationSnapshot ? (
                          <p className="mt-1.5 font-mono text-[10.5px] text-[var(--color-faint)]">
                            커버리지 {Math.round((Number(review.verificationSnapshot.coverage) || 0) * 100)}% · 타이머{' '}
                            {String(review.verificationSnapshot.timerSessionCount ?? '—')}회 · 인정{' '}
                            {String(review.verificationSnapshot.verifiedMinutes ?? '—')}분 / 요구{' '}
                            {String(review.verificationSnapshot.requiredMinutes ?? '—')}분
                          </p>
                        ) : null}
                      </div>
                      {canModerate ? (
                        <Button variant="outline" onClick={() => setSelected(review)}>
                          등급 조정
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
        </Card>

        <Pager page={page} totalPages={reviews.data?.totalPages ?? 0} onChange={setPage} />
      </div>

      {picking ? (
        <Modal eyebrow="도서로 거르기" title="리뷰를 볼 도서를 고르세요" onClose={() => setPicking(false)}>
          <BookPicker
            autoFocus
            onPick={(book) => {
              setPicking(false);
              setFilter({ bookId: book.id });
            }}
          />
        </Modal>
      ) : null}

      {selected ? <OverrideDialog review={selected} onClose={() => setSelected(null)} /> : null}
    </>
  );
}

function OverrideDialog({ review, onClose }: { review: ReviewRow; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [level, setLevel] = useState<VerificationLevel>(review.verificationLevel);
  const [reason, setReason] = useState('');

  const override = useMutation({
    meta: { inlineError: true },
    mutationFn: () => reviewsApi.overrideVerification(review.id, level, reason.trim()),
    onSuccess: () => {
      toast.success('검증 등급을 조정했습니다.');
      queryClient.invalidateQueries({ queryKey: qk.reviews.all });
      onClose();
    },
  });

  return (
    <Modal
      size="sm"
      eyebrow="검증 등급 조정"
      title={review.bookTitle ?? `리뷰 #${review.id}`}
      busy={override.isPending}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" disabled={override.isPending} onClick={onClose}>
            취소
          </Button>
          <Button
            disabled={!reason.trim() || level === review.verificationLevel || override.isPending}
            onClick={() => override.mutate()}
          >
            {override.isPending ? '저장 중…' : '조정'}
          </Button>
        </>
      }
    >
      <p className="rounded-lg bg-[var(--color-surface-alt)] px-3 py-2.5 text-[13px] leading-relaxed break-words">
        {review.body}
      </p>
      <div className="mt-4">
        <Select label="등급" value={level} onChange={(e) => setLevel(e.target.value as VerificationLevel)}>
          {VERIFICATION_LEVELS.map((key) => (
            <option key={key} value={key}>
              {VERIFICATION_LEVEL_LABEL[key]}
            </option>
          ))}
        </Select>
      </div>
      <div className="mt-3">
        <Input
          label="조정 사유 (필수)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="예: 재검증 요청 확인, 세션 기록 정상"
        />
      </div>
      <ErrorText error={override.isError ? errorMessage(override.error, '조정하지 못했습니다.') : null} />
    </Modal>
  );
}
