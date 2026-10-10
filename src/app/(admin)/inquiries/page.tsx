'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { AdminApiError } from '@/lib/api';
import { inquiriesApi } from '@/lib/endpoints';
import {
  INQUIRY_CATEGORIES, INQUIRY_CATEGORY_LABEL, INQUIRY_STATUS_LABEL, USER_STATUS_LABEL,
} from '@/lib/labels';
import type { InquiryAdminView, InquiryCategory, InquiryStatus, UserStatus } from '@/lib/types';
import { PageHeader } from '@/components/Shell';
import {
  Button, Card, Empty, Pager, Select, Table, Tag, Textarea, formatDateTime,
} from '@/components/ui';

const ANSWER_MAX = 5000;

const STATUS_TONE: Record<InquiryStatus, 'warn' | 'accent'> = {
  WAITING: 'warn',
  ANSWERED: 'accent',
};

const USER_STATUS_TONE: Record<UserStatus, 'neutral' | 'warn' | 'danger'> = {
  ACTIVE: 'neutral',
  WRITE_BANNED: 'warn',
  SUSPENDED: 'danger',
  TERMINATED: 'danger',
};

/** 고객문의(1:1) — 답변 대기 건을 오래 기다린 순서로 처리한다. */
export default function InquiriesPage() {
  const [status, setStatus] = useState<InquiryStatus | ''>('WAITING');
  const [category, setCategory] = useState<InquiryCategory | ''>('');
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const inquiries = useQuery({
    queryKey: ['inquiries', status, category, page],
    queryFn: () => inquiriesApi.list(status || undefined, category || undefined, page),
    placeholderData: keepPreviousData,
  });

  const rows = inquiries.data?.content ?? [];

  return (
    <>
      <PageHeader
        title="고객문의"
        description="답변 대기는 오래 기다린 순서로 위에 옵니다."
        action={
          <div className="flex gap-2">
            <div className="w-36">
              <Select
                aria-label="상태"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as InquiryStatus | '');
                  setPage(0);
                }}
              >
                <option value="">전체 상태</option>
                <option value="WAITING">{INQUIRY_STATUS_LABEL.WAITING}</option>
                <option value="ANSWERED">{INQUIRY_STATUS_LABEL.ANSWERED}</option>
              </Select>
            </div>
            <div className="w-36">
              <Select
                aria-label="유형"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value as InquiryCategory | '');
                  setPage(0);
                }}
              >
                <option value="">전체 유형</option>
                {INQUIRY_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {INQUIRY_CATEGORY_LABEL[value]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        }
      />

      <div className="px-7 py-6">
        <p className="mb-3 font-mono text-[11.5px] text-[var(--color-muted)]">
          {status ? INQUIRY_STATUS_LABEL[status] : '전체'} {inquiries.data?.totalElements ?? 0}건
        </p>

        <Card>
          {inquiries.isError ? (
            <Empty>
              목록을 불러오지 못했습니다.{' '}
              <button type="button" className="underline" onClick={() => inquiries.refetch()}>
                다시 시도
              </button>
            </Empty>
          ) : rows.length === 0 ? (
            <Empty>
              {inquiries.isPending ? '불러오는 중…' : '조건에 맞는 문의가 없습니다.'}
              {!inquiries.isPending && page > 0 ? (
                <>
                  {' '}
                  <button type="button" className="underline" onClick={() => setPage(0)}>
                    첫 쪽으로
                  </button>
                </>
              ) : null}
            </Empty>
          ) : (
            <Table head={['상태', '유형', '내용', '회원', '첨부', '접수', '답변', '']}>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-[var(--color-line)] last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Tag tone={STATUS_TONE[row.status]}>{INQUIRY_STATUS_LABEL[row.status]}</Tag>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11.5px] whitespace-nowrap text-[var(--color-muted)]">
                    {INQUIRY_CATEGORY_LABEL[row.category]}
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <p className="truncate text-[13.5px]">{row.preview || '(내용 없음)'}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-[13px] font-bold">{row.userNickname}</span>{' '}
                    <span className="font-mono text-[11px] text-[var(--color-faint)]">@{row.userHandle}</span>
                  </td>
                  <td className="numeral px-4 py-3 text-[12px]">
                    {row.imageCount > 0 ? row.imageCount : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] whitespace-nowrap text-[var(--color-faint)]">
                    {formatDateTime(row.createdAt)}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] whitespace-nowrap text-[var(--color-faint)]">
                    {formatDateTime(row.answeredAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" onClick={() => setSelectedId(row.id)}>
                      보기
                    </Button>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Pager page={page} totalPages={inquiries.data?.totalPages ?? 0} onChange={setPage} />
      </div>

      {selectedId !== null ? (
        <InquiryDialog inquiryId={selectedId} onClose={() => setSelectedId(null)} />
      ) : null}
    </>
  );
}

function InquiryDialog({ inquiryId, onClose }: { inquiryId: number; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);

  // 상세 조회는 서버가 열람 기록을 남기므로, 404·403 같은 확정 오류는 다시 부르지 않는다.
  const detail = useQuery({
    queryKey: ['inquiry', inquiryId],
    queryFn: () => inquiriesApi.detail(inquiryId),
    retry: (count, e) => !(e instanceof AdminApiError && e.status < 500) && count < 1,
  });

  const deleted =
    removed || (detail.error instanceof AdminApiError && detail.error.code === 'INQUIRY_NOT_FOUND');

  // 사용자가 지운 문의면 목록·대시보드 숫자도 바로 맞춘다.
  useEffect(() => {
    if (!deleted) return;
    queryClient.invalidateQueries({ queryKey: ['inquiries'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }, [deleted, queryClient]);

  const submit = useMutation({
    mutationFn: (mode: 'answer' | 'edit') =>
      mode === 'answer'
        ? inquiriesApi.answer(inquiryId, draft.trim())
        : inquiriesApi.editAnswer(inquiryId, draft.trim()),
    onSuccess: (view) => {
      // 응답이 곧 최신 상세다 — 다시 조회하면 열람 기록만 한 줄 더 쌓인다.
      queryClient.setQueryData(['inquiry', inquiryId], view);
      queryClient.invalidateQueries({ queryKey: ['inquiries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setEditing(false);
      setDraft('');
      setError(null);
    },
    onError: (e) => {
      if (e instanceof AdminApiError) {
        if (e.code === 'INQUIRY_NOT_FOUND') {
          setRemoved(true);
          setError(null);
          return;
        }
        if (e.code === 'INQUIRY_ALREADY_ANSWERED' || e.code === 'INQUIRY_NOT_ANSWERED') {
          // 다른 관리자가 먼저 처리했거나 상태가 바뀌었다 — 최신 상태로 다시 그린다.
          setEditing(false);
          detail.refetch();
          queryClient.invalidateQueries({ queryKey: ['inquiries'] });
        }
        setError(e.message);
        return;
      }
      setError('저장하지 못했습니다.');
    },
  });

  const data = detail.data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-6 py-10">
      <Card className="max-h-full w-full max-w-2xl overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">고객문의 #{inquiryId}</p>
            {data ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Tag tone={STATUS_TONE[data.status]}>{INQUIRY_STATUS_LABEL[data.status]}</Tag>
                <Tag>{INQUIRY_CATEGORY_LABEL[data.category]}</Tag>
                <span className="font-mono text-[11px] text-[var(--color-faint)]">
                  접수 {formatDateTime(data.createdAt)}
                </span>
              </div>
            ) : null}
          </div>
          <Button variant="ghost" onClick={onClose}>
            닫기
          </Button>
        </div>

        {deleted ? (
          <p className="mt-5 rounded-lg bg-[var(--color-danger-soft)] px-4 py-3 font-mono text-[12px] font-bold text-[var(--color-danger)]">
            사용자가 삭제한 문의입니다.
          </p>
        ) : null}

        {detail.isPending ? (
          <p className="mt-6 text-[13.5px] text-[var(--color-muted)]">불러오는 중…</p>
        ) : null}

        {detail.isError && !deleted ? (
          <div className="mt-6">
            <p className="font-mono text-[11.5px] text-[var(--color-danger)]">
              {detail.error instanceof Error ? detail.error.message : '문의를 불러오지 못했습니다.'}
            </p>
            <Button variant="outline" className="mt-3" onClick={() => detail.refetch()}>
              다시 시도
            </Button>
          </div>
        ) : null}

        {data ? (
          <>
            <MemberLine data={data} />

            <section className="mt-5">
              <p className="eyebrow">문의 내용</p>
              <p className="mt-2 rounded-lg bg-[var(--color-surface-alt)] px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap break-words">
                {data.body}
              </p>

              {data.images.length > 0 ? (
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {data.images.map((image, index) => (
                    <a
                      key={image.id}
                      href={image.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`첨부 이미지 ${index + 1} 원본 보기`}
                      title="원본 보기"
                      className="block aspect-square rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-alt)] transition hover:border-[var(--color-ink)]"
                      style={{
                        backgroundImage: `url(${JSON.stringify(image.url)})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                  ))}
                </div>
              ) : null}

              <p className="mt-3 font-mono text-[11px] text-[var(--color-faint)]">
                {deviceLine(data)}
              </p>
            </section>

            {!deleted ? (
              <section className="mt-6 border-t border-[var(--color-line)] pt-5">
                <p className="eyebrow">답변</p>

                {data.status === 'WAITING' ? (
                  <div className="mt-3">
                    <Textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={8}
                      maxLength={ANSWER_MAX}
                      placeholder="사용자에게 보낼 답변을 적어주세요."
                      hint="등록하면 앱 알림으로 전달됩니다."
                    />
                    <ErrorText error={error} />
                    <div className="mt-4 flex justify-end">
                      <Button
                        disabled={!draft.trim() || submit.isPending}
                        onClick={() => {
                          if (!window.confirm('등록하면 사용자에게 알림이 갑니다. 등록할까요?')) return;
                          setError(null);
                          submit.mutate('answer');
                        }}
                      >
                        {submit.isPending ? '등록 중…' : '답변 등록'}
                      </Button>
                    </div>
                  </div>
                ) : editing ? (
                  <div className="mt-3">
                    <Textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={8}
                      maxLength={ANSWER_MAX}
                      hint="수정해도 알림은 다시 가지 않습니다."
                    />
                    <ErrorText error={error} />
                    <div className="mt-4 flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        disabled={submit.isPending}
                        onClick={() => {
                          setEditing(false);
                          setDraft('');
                          setError(null);
                        }}
                      >
                        취소
                      </Button>
                      <Button
                        disabled={!draft.trim() || submit.isPending}
                        onClick={() => {
                          setError(null);
                          submit.mutate('edit');
                        }}
                      >
                        {submit.isPending ? '저장 중…' : '저장'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <p className="rounded-lg border border-[var(--color-line)] px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap break-words">
                      {data.answer}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="font-mono text-[11px] text-[var(--color-faint)]">
                        {data.answeredByName ?? '—'} · {formatDateTime(data.answeredAt)}
                        {data.answerUpdatedAt ? ` · 수정됨 ${formatDateTime(data.answerUpdatedAt)}` : ''}
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setDraft(data.answer ?? '');
                          setError(null);
                          setEditing(true);
                        }}
                      >
                        수정
                      </Button>
                    </div>
                    <ErrorText error={error} />
                  </div>
                )}
              </section>
            ) : null}
          </>
        ) : null}
      </Card>
    </div>
  );
}

function MemberLine({ data }: { data: InquiryAdminView }) {
  const restricted = data.userStatus === 'SUSPENDED' || data.userStatus === 'TERMINATED';
  return (
    <section className="mt-5 rounded-lg border border-[var(--color-line)] px-4 py-3">
      <p className="eyebrow">회원</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-[14px] font-bold">{data.userNickname}</span>
        <span className="font-mono text-[12px] text-[var(--color-faint)]">@{data.userHandle}</span>
        {data.maskedEmail ? (
          <span className="font-mono text-[12px] text-[var(--color-muted)]">{data.maskedEmail}</span>
        ) : null}
        {data.userStatus ? (
          <Tag tone={USER_STATUS_TONE[data.userStatus]}>{USER_STATUS_LABEL[data.userStatus]}</Tag>
        ) : null}
      </div>
      {restricted ? (
        <p className="mt-1.5 font-mono text-[11px] text-[var(--color-danger)]">
          이용이 정지된 회원이라 앱에서 답변을 확인하지 못할 수 있습니다.
        </p>
      ) : null}
    </section>
  );
}

function ErrorText({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="mt-2 font-mono text-[11.5px] text-[var(--color-danger)]">{error}</p>;
}

function deviceLine(data: InquiryAdminView): string {
  const parts = [
    data.appVersion ? `앱 ${data.appVersion}` : null,
    data.platform ?? null,
    data.osVersion ? `OS ${data.osVersion}` : null,
    data.deviceModel ?? null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : '기기 정보 없음';
}
