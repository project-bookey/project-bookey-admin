'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { errorMessage } from '@/lib/api';
import { moderationApi } from '@/lib/endpoints';
import { formatDateTime, remainingSla } from '@/lib/format';
import {
  CONTENT_STATUS_LABEL, CONTENT_STATUS_TONE, MODERATION_RESOLUTIONS, MODERATION_RESOLUTION_LABEL, MODERATION_SOURCES,
  MODERATION_SOURCE_LABEL, MODERATION_STATUSES, MODERATION_STATUS_LABEL, MODERATION_STATUS_TONE, POST_VISIBILITY_LABEL,
  REPORT_STATUS_LABEL, SANCTION_TYPES, SANCTION_TYPE_HINT, SANCTION_TYPE_LABEL, STATUSFUL_CONTENT_TYPES,
} from '@/lib/labels';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/lib/toast';
import type { ContentType, ModerationDetail, ModerationResolution, ModerationRow, SanctionType } from '@/lib/types';
import { param, useListParams } from '@/lib/useListParams';
import { useCan, useMe } from '@/lib/useMe';
import { Modal } from '@/components/Modal';
import { QueryState } from '@/components/QueryState';
import { PageHeader } from '@/components/Shell';
import { Button, Card, ErrorText, ImageThumb, Input, Pager, ResultCount, Select, Table, Tag } from '@/components/ui';

const FILTERS = {
  status: param.oneOf(MODERATION_STATUSES, 'PENDING'),
  source: param.oneOf(MODERATION_SOURCES),
};

const CONTENT_SOURCES: string[] = ['POST', 'REVIEW', 'CLUB_POST', 'POST_COMMENT', 'REVIEW_COMMENT', 'BOOK_REMARK'];

/** 신고 큐 — SLA 48h, 우선순위 순 (§F13 · §8.3). 행을 열면 신고자·원문·작성자 이력을 보고 판정한다. */
export default function ModerationPage() {
  const queryClient = useQueryClient();
  const canModerate = useCan('MODERATE');
  const canWarn = useCan('WARN');
  const { params, setFilter, setPage, open, close } = useListParams(FILTERS);
  const { status, source, page, id } = params;

  const queue = useQuery({
    queryKey: qk.moderation.list({ status, source, page }),
    queryFn: () => moderationApi.queue(status || undefined, source || undefined, page),
    placeholderData: keepPreviousData,
  });

  const assign = useMutation({
    mutationFn: (ticketId: number) => moderationApi.assign(ticketId),
    onSuccess: () => {
      toast.success('담당으로 지정했습니다.');
      queryClient.invalidateQueries({ queryKey: qk.moderation.all });
    },
  });

  return (
    <>
      <PageHeader
        title="신고 큐"
        description="접수 48시간 안에 1차 판정합니다. 우선순위가 높은 건이 위에 옵니다."
        action={
          <div className="flex gap-2">
            <div className="w-36">
              <Select aria-label="상태" value={status} onChange={(e) => setFilter({ status: e.target.value as typeof status })}>
                <option value="">전체 상태</option>
                {MODERATION_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {MODERATION_STATUS_LABEL[value]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-36">
              <Select aria-label="대상" value={source} onChange={(e) => setFilter({ source: e.target.value as typeof source })}>
                <option value="">전체 대상</option>
                {MODERATION_SOURCES.map((value) => (
                  <option key={value} value={value}>
                    {MODERATION_SOURCE_LABEL[value]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        }
      />

      <div className="px-7 py-6">
        <ResultCount total={queue.data?.totalElements} />
        <Card>
          <QueryState
            query={queue}
            isEmpty={(data) => data.content.length === 0}
            empty="표시할 신고가 없습니다."
            onFirstPage={page > 0 ? () => setPage(0) : undefined}
          >
            {(data) => (
              <Table head={['대상', '내용', '작성자', '신고', 'SLA', '상태', '담당', '']}>
                {data.content.map((ticket) => {
                  const sla = remainingSla(ticket.slaDueAt);
                  const resolved = ticket.status === 'RESOLVED';
                  return (
                    <tr key={ticket.id} className="border-b border-[var(--color-line)] last:border-0">
                      <td className="px-4 py-3">
                        <Tag tone={ticket.priority <= 1 ? 'danger' : 'neutral'}>
                          {MODERATION_SOURCE_LABEL[ticket.sourceType]}
                        </Tag>
                      </td>
                      <td className="max-w-sm px-4 py-3">
                        <p className="truncate text-[13.5px]">{ticket.contentPreview ?? '(내용 없음)'}</p>
                        <p className="font-mono text-[10.5px] text-[var(--color-faint)]">
                          사유 {ticket.reason} · 접수 {formatDateTime(ticket.createdAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-[13px]">{ticket.authorNickname ?? '—'}</td>
                      <td className="numeral px-4 py-3 text-[12px]">{ticket.reportCount}</td>
                      <td
                        className={`numeral px-4 py-3 text-[11.5px] whitespace-nowrap ${
                          resolved ? 'text-[var(--color-faint)]' : sla.overdue ? 'text-[var(--color-danger)]' : 'text-[var(--color-muted)]'
                        }`}
                      >
                        {resolved ? '—' : sla.label}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Tag tone={MODERATION_STATUS_TONE[ticket.status]}>{MODERATION_STATUS_LABEL[ticket.status]}</Tag>
                        {ticket.resolution ? (
                          <span className="ml-1 font-mono text-[10.5px] text-[var(--color-faint)]">
                            {MODERATION_RESOLUTION_LABEL[ticket.resolution]}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px] whitespace-nowrap">
                        <Assignee ticket={ticket} onAssign={canModerate ? () => assign.mutate(ticket.id) : undefined} busy={assign.isPending} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canWarn ? (
                          <Button variant={resolved ? 'ghost' : 'outline'} onClick={() => open(ticket.id)}>
                            {resolved ? '보기' : '열기'}
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </Table>
            )}
          </QueryState>
        </Card>

        <Pager page={page} totalPages={queue.data?.totalPages ?? 0} onChange={setPage} />
      </div>

      {id !== undefined ? <TicketDrawer key={id} ticketId={id} onClose={close} /> : null}
    </>
  );
}

function Assignee({ ticket, onAssign, busy }: { ticket: ModerationRow; onAssign?: () => void; busy?: boolean }) {
  const me = useMe();
  if (ticket.assignedAdminId) {
    return <>{ticket.assignedAdminId === me.data?.id ? '나' : (ticket.assignedAdminName ?? `#${ticket.assignedAdminId}`)}</>;
  }
  if (ticket.status !== 'RESOLVED' && onAssign) {
    return (
      <Button variant="ghost" disabled={busy} onClick={onAssign}>
        내가 맡기
      </Button>
    );
  }
  return <>—</>;
}

function TicketDrawer({ ticketId, onClose }: { ticketId: number; onClose: () => void }) {
  const queryClient = useQueryClient();
  const canModerate = useCan('MODERATE');

  // 열 때마다 열람 기록(VIEW_MODERATION)이 남는다.
  const detail = useQuery({
    queryKey: qk.moderation.detail(ticketId),
    queryFn: () => moderationApi.detail(ticketId),
  });

  const assign = useMutation({
    mutationFn: () => moderationApi.assign(ticketId),
    onSuccess: () => {
      toast.success('담당으로 지정했습니다.');
      queryClient.invalidateQueries({ queryKey: qk.moderation.all });
    },
  });

  return (
    <Modal
      variant="side"
      eyebrow={`신고 #${ticketId}`}
      title={
        detail.data
          ? `${MODERATION_SOURCE_LABEL[detail.data.ticket.sourceType]} #${detail.data.ticket.sourceId}`
          : '불러오는 중…'
      }
      onClose={onClose}
    >
      <QueryState query={detail}>
        {(data) => {
          const ticket = data.ticket;
          const resolved = ticket.status === 'RESOLVED';
          const sla = remainingSla(ticket.slaDueAt);
          return (
            <>
              <div className="-mt-1 flex flex-wrap items-center gap-2">
                <Tag tone={MODERATION_STATUS_TONE[ticket.status]}>{MODERATION_STATUS_LABEL[ticket.status]}</Tag>
                <span className="font-mono text-[11px] text-[var(--color-faint)]">
                  신고 {ticket.reportCount}건 · 접수 {formatDateTime(ticket.createdAt)}
                  {!resolved ? ` · SLA ${sla.label}` : ''}
                  {ticket.assignedAdminName ? ` · 담당 ${ticket.assignedAdminName}` : ''}
                </span>
                {!resolved && !ticket.assignedAdminId && canModerate ? (
                  <Button variant="ghost" disabled={assign.isPending} onClick={() => assign.mutate()}>
                    내가 맡기
                  </Button>
                ) : null}
              </div>

              <ContentSection data={data} />
              <ReportsSection data={data} />
              <AuthorSection data={data} />

              {resolved ? (
                <section className="mt-6 rounded-lg border border-[var(--color-line)] px-4 py-3">
                  <p className="eyebrow">판정</p>
                  <p className="mt-1.5 text-[14px] font-bold">
                    {ticket.resolution ? MODERATION_RESOLUTION_LABEL[ticket.resolution] : '—'}
                  </p>
                  <p className="mt-1 text-[13px] text-[var(--color-muted)] break-words">{ticket.resolutionNote || '메모 없음'}</p>
                  <p className="mt-1 font-mono text-[11px] text-[var(--color-faint)]">
                    {ticket.assignedAdminName ?? '—'} · {formatDateTime(ticket.resolvedAt)}
                  </p>
                </section>
              ) : canModerate ? (
                <ResolveForm data={data} onDone={onClose} />
              ) : (
                <p className="mt-6 font-mono text-[11.5px] text-[var(--color-faint)]">판정은 신고 처리 권한이 있는 관리자가 합니다.</p>
              )}
            </>
          );
        }}
      </QueryState>
    </Modal>
  );
}

function ContentSection({ data }: { data: ModerationDetail }) {
  const { ticket, content } = data;
  if (!content) {
    return (
      <section className="mt-5 rounded-lg border border-[var(--color-line)] px-4 py-3">
        <p className="eyebrow">대상</p>
        <p className="mt-1.5 text-[13.5px]">{ticket.contentPreview ?? '(삭제됨)'}</p>
        {ticket.sourceType === 'USER' ? (
          <Link href={`/users?id=${ticket.sourceId}`} className="mt-1 inline-block font-mono text-[12px] underline">
            회원 상세로
          </Link>
        ) : null}
      </section>
    );
  }
  const row = content.content;
  return (
    <section className="mt-5 rounded-lg border border-[var(--color-line)] px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="eyebrow">원문</p>
        <Tag tone={CONTENT_STATUS_TONE[row.status] ?? 'neutral'}>{CONTENT_STATUS_LABEL[row.status] ?? row.status}</Tag>
        {row.visibility ? <Tag>{POST_VISIBILITY_LABEL[row.visibility] ?? row.visibility}</Tag> : null}
        {row.contextLabel ? (
          <span className="font-mono text-[11px] text-[var(--color-faint)]">{row.contextLabel}</span>
        ) : null}
      </div>
      <div className="mt-2 max-h-72 overflow-y-auto rounded-lg bg-[var(--color-surface-alt)] px-3 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap break-words">
        {content.body || '(내용 없음)'}
      </div>
      {content.imageUrl ? (
        <a href={content.imageUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block" title="원본 보기">
          <ImageThumb url={content.imageUrl} className="h-24 w-24" />
        </a>
      ) : null}
      <p className="mt-2 font-mono text-[11px] text-[var(--color-faint)]">
        작성 {formatDateTime(row.createdAt)} ·{' '}
        <Link href={`/contents?type=${row.type}&id=${row.id}`} className="underline">
          콘텐츠 검수에서 보기
        </Link>
      </p>
    </section>
  );
}

function ReportsSection({ data }: { data: ModerationDetail }) {
  return (
    <section className="mt-5">
      <p className="eyebrow">신고 {data.reports.length}건</p>
      {data.reports.length === 0 ? (
        <p className="mt-2 text-[13px] text-[var(--color-muted)]">신고 기록이 없습니다.</p>
      ) : (
        <ul className="mt-2 divide-y divide-[var(--color-line)] rounded-lg border border-[var(--color-line)]">
          {data.reports.map((report) => (
            <li key={report.id} className="px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <Link href={`/users?id=${report.reporterId}`} className="font-bold underline-offset-2 hover:underline">
                  {report.reporterNickname ?? `#${report.reporterId}`}
                </Link>
                <Tag>{report.reason}</Tag>
                <span className="font-mono text-[11px] text-[var(--color-faint)]">
                  {formatDateTime(report.createdAt)} · {REPORT_STATUS_LABEL[report.status] ?? report.status}
                </span>
              </div>
              {report.detail ? <p className="mt-1 text-[13px] text-[var(--color-muted)] break-words">{report.detail}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AuthorSection({ data }: { data: ModerationDetail }) {
  const { ticket, authorSanctions } = data;
  if (!ticket.authorId) return null;
  return (
    <section className="mt-5">
      <div className="flex items-center gap-2">
        <p className="eyebrow">작성자</p>
        <Link href={`/users?id=${ticket.authorId}&tab=sanctions`} className="text-[13px] font-bold underline-offset-2 hover:underline">
          {ticket.authorNickname ?? `#${ticket.authorId}`}
        </Link>
        <Link href={`/contents?type=POST&userId=${ticket.authorId}`} className="font-mono text-[11px] text-[var(--color-muted)] underline">
          쓴 글 보기
        </Link>
      </div>
      {authorSanctions.length === 0 ? (
        <p className="mt-2 text-[13px] text-[var(--color-muted)]">제재 이력이 없습니다.</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {authorSanctions.map((s) => (
            <li key={s.id} className="rounded-lg border border-[var(--color-line)] px-3 py-1.5 font-mono text-[11.5px]">
              {SANCTION_TYPE_LABEL[s.type]} · {formatDateTime(s.startsAt)}
              {s.releasedAt ? ' · 해제됨' : ''}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ResolveForm({ data, onDone }: { data: ModerationDetail; onDone: () => void }) {
  const queryClient = useQueryClient();
  const ticket = data.ticket;
  const [resolution, setResolution] = useState<ModerationResolution>('HIDE');
  const [note, setNote] = useState('');
  const [sanctionType, setSanctionType] = useState<SanctionType>('WRITE_BAN');
  const [durationDays, setDurationDays] = useState('7');

  const sanctioning = resolution === 'SANCTION';
  const isContent = CONTENT_SOURCES.includes(ticket.sourceType);
  const removesOnly = isContent && !STATUSFUL_CONTENT_TYPES.includes(ticket.sourceType as ContentType);

  const resolve = useMutation({
    meta: { inlineError: true },
    mutationFn: () =>
      moderationApi.resolve(ticket.id, {
        resolution,
        note: note.trim() || undefined,
        sanction: sanctioning
          ? {
              type: sanctionType,
              reason: note.trim(),
              durationDays: sanctionType !== 'WARN' && durationDays ? Number(durationDays) : undefined,
            }
          : undefined,
      }),
    onSuccess: () => {
      toast.success('신고를 처리했습니다.');
      queryClient.invalidateQueries({ queryKey: qk.moderation.all });
      queryClient.invalidateQueries({ queryKey: qk.contents.all });
      queryClient.invalidateQueries({ queryKey: qk.dashboard });
      queryClient.invalidateQueries({ queryKey: qk.users.all });
      onDone();
    },
  });

  const hint = removesOnly
    ? '댓글·한줄평은 숨김이 없어 숨김·제재를 고르면 삭제됩니다.'
    : ticket.sourceType === 'CLUB'
      ? '모임 신고에서 삭제는 모임을 강제 종료합니다. 제재는 호스트에게 걸립니다.'
      : ticket.sourceType === 'USER'
        ? '회원 신고는 유지(문제 없음) 또는 제재로 판정합니다.'
        : null;

  return (
    <section className="mt-6 rounded-lg border border-[var(--color-ink)] p-4">
      <p className="eyebrow">판정</p>
      {hint ? <p className="mt-1 font-mono text-[11px] text-[var(--color-muted)]">{hint}</p> : null}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {MODERATION_RESOLUTIONS.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 ${
              resolution === option.value ? 'border-[var(--color-ink)] bg-[var(--color-surface-alt)]' : 'border-[var(--color-line)]'
            }`}
          >
            <input type="radio" checked={resolution === option.value} onChange={() => setResolution(option.value)} className="mt-1" />
            <span>
              <span className="block font-mono text-[12.5px] font-bold">{option.label}</span>
              <span className="block text-[12px] text-[var(--color-muted)]">{option.description}</span>
            </span>
          </label>
        ))}
      </div>

      {sanctioning ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Select label="제재 종류" value={sanctionType} onChange={(e) => setSanctionType(e.target.value as SanctionType)}>
              {SANCTION_TYPES.map((value) => (
                <option key={value} value={value}>
                  {SANCTION_TYPE_LABEL[value]}
                </option>
              ))}
            </Select>
            {sanctionType !== 'WARN' ? (
              <Input
                label="기간(일)"
                inputMode="numeric"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value.replace(/\D/g, ''))}
                hint="비우면 해제할 때까지"
              />
            ) : null}
          </div>
          <p className="mt-2 font-mono text-[11px] text-[var(--color-muted)]">{SANCTION_TYPE_HINT[sanctionType]}</p>
        </>
      ) : null}

      <div className="mt-4">
        <Input
          label={sanctioning ? '처리 사유 (필수 · 제재 사유로 회원에게 전달됩니다)' : '처리 사유'}
          value={note}
          maxLength={500}
          onChange={(e) => setNote(e.target.value)}
          placeholder="판단 근거를 남겨주세요 — 감사 로그에 기록됩니다"
        />
      </div>
      <ErrorText error={resolve.isError ? errorMessage(resolve.error, '처리하지 못했습니다.') : null} />
      <div className="mt-4 flex justify-end">
        <Button
          variant={sanctioning || resolution === 'DELETE' ? 'danger' : 'primary'}
          disabled={resolve.isPending || (sanctioning && !note.trim())}
          onClick={() => resolve.mutate()}
        >
          {resolve.isPending ? '처리 중…' : '판정 확정'}
        </Button>
      </div>
    </section>
  );
}
