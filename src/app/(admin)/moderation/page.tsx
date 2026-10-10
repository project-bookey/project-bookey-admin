'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { errorMessage } from '@/lib/api';
import { moderationApi } from '@/lib/endpoints';
import { formatDateTime, remainingSla } from '@/lib/format';
import {
  MODERATION_RESOLUTIONS, MODERATION_SOURCES, MODERATION_SOURCE_LABEL, MODERATION_STATUSES,
  MODERATION_STATUS_LABEL, MODERATION_STATUS_TONE, SANCTION_TYPES, SANCTION_TYPE_HINT, SANCTION_TYPE_LABEL,
} from '@/lib/labels';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/lib/toast';
import type { ModerationResolution, ModerationRow, SanctionType } from '@/lib/types';
import { param, useListParams } from '@/lib/useListParams';
import { useCan, useMe } from '@/lib/useMe';
import { Modal } from '@/components/Modal';
import { QueryState } from '@/components/QueryState';
import { PageHeader } from '@/components/Shell';
import { Button, Card, ErrorText, Input, Pager, ResultCount, Select, Table, Tag } from '@/components/ui';

const FILTERS = {
  status: param.oneOf(MODERATION_STATUSES, 'PENDING'),
  source: param.oneOf(MODERATION_SOURCES),
};

/** 신고 큐 — SLA 48h, 우선순위 순 (§F13 · §8.3). */
export default function ModerationPage() {
  const queryClient = useQueryClient();
  const me = useMe();
  const canModerate = useCan('MODERATE');
  const { params, setFilter, setPage } = useListParams(FILTERS);
  const { status, source, page } = params;
  const [selected, setSelected] = useState<ModerationRow | null>(null);

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

  const assignee = (ticket: ModerationRow) => {
    if (!ticket.assignedAdminId) return null;
    return ticket.assignedAdminId === me.data?.id ? '나' : `#${ticket.assignedAdminId}`;
  };

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
                        <p className="font-mono text-[10.5px] text-[var(--color-faint)]">사유 {ticket.reason}</p>
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
                      <td className="px-4 py-3">
                        <Tag tone={MODERATION_STATUS_TONE[ticket.status]}>{MODERATION_STATUS_LABEL[ticket.status]}</Tag>
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px] whitespace-nowrap">
                        {assignee(ticket) ?? (
                          !resolved && canModerate ? (
                            <Button
                              variant="ghost"
                              disabled={assign.isPending}
                              onClick={() => assign.mutate(ticket.id)}
                            >
                              내가 맡기
                            </Button>
                          ) : (
                            '—'
                          )
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!resolved && canModerate ? (
                          <Button variant="outline" onClick={() => setSelected(ticket)}>
                            처리
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

      {selected ? (
        <ResolveDialog
          ticket={selected}
          onClose={() => setSelected(null)}
          onDone={() => {
            setSelected(null);
            toast.success('신고를 처리했습니다.');
            queryClient.invalidateQueries({ queryKey: qk.moderation.all });
            queryClient.invalidateQueries({ queryKey: qk.dashboard });
            queryClient.invalidateQueries({ queryKey: qk.users.all });
          }}
        />
      ) : null}
    </>
  );
}

function ResolveDialog({ ticket, onClose, onDone }: {
  ticket: ModerationRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const [resolution, setResolution] = useState<ModerationResolution>('HIDE');
  const [note, setNote] = useState('');
  const [sanctionType, setSanctionType] = useState<SanctionType>('WRITE_BAN');
  const [durationDays, setDurationDays] = useState('7');

  const sanctioning = resolution === 'SANCTION';

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
    onSuccess: onDone,
  });

  return (
    <Modal
      eyebrow="신고 처리"
      title={`${MODERATION_SOURCE_LABEL[ticket.sourceType]} #${ticket.sourceId}`}
      busy={resolve.isPending}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" disabled={resolve.isPending} onClick={onClose}>
            취소
          </Button>
          <Button
            variant={sanctioning ? 'danger' : 'primary'}
            onClick={() => resolve.mutate()}
            disabled={resolve.isPending || (sanctioning && !note.trim())}
          >
            {resolve.isPending ? '처리 중…' : '처리 확정'}
          </Button>
        </>
      }
    >
      <p className="rounded-lg bg-[var(--color-surface-alt)] px-3 py-2.5 text-[13.5px] leading-relaxed break-words">
        {ticket.contentPreview ?? '(내용 없음)'}
      </p>
      <p className="mt-2 font-mono text-[11px] text-[var(--color-faint)]">
        작성자 {ticket.authorNickname ?? '—'} · 신고 {ticket.reportCount}건 · SLA 마감 {formatDateTime(ticket.slaDueAt)}
      </p>

      <div className="mt-5 flex flex-col gap-2">
        {MODERATION_RESOLUTIONS.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 ${
              resolution === option.value
                ? 'border-[var(--color-ink)] bg-[var(--color-surface-alt)]'
                : 'border-[var(--color-line)]'
            }`}
          >
            <input
              type="radio"
              checked={resolution === option.value}
              onChange={() => setResolution(option.value)}
              className="mt-1"
            />
            <span>
              <span className="block font-mono text-[12.5px] font-bold">{option.label}</span>
              <span className="block text-[12.5px] text-[var(--color-muted)]">{option.description}</span>
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
    </Modal>
  );
}
