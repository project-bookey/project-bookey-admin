'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { errorMessage } from '@/lib/api';
import { clubsApi } from '@/lib/endpoints';
import { formatDate, formatDateTime } from '@/lib/format';
import { CLUB_STATUSES, CLUB_STATUS_LABEL, CLUB_STATUS_TONE } from '@/lib/labels';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/lib/toast';
import type { ClubRow, ClubStatus } from '@/lib/types';
import { param, useListParams } from '@/lib/useListParams';
import { useCan } from '@/lib/useMe';
import { Modal } from '@/components/Modal';
import { QueryState } from '@/components/QueryState';
import { PageHeader } from '@/components/Shell';
import { Button, Card, CopyButton, ErrorText, Input, Pager, ResultCount, Select, Table, Tag } from '@/components/ui';

const FILTERS = {
  q: param.str(),
  status: param.oneOf(CLUB_STATUSES),
};

/** 모임 운영 — 신고된 모임 처리, 코드 강제 회전, 강제 해산 (§F13). */
export default function ClubsPage() {
  const canModerate = useCan('MODERATE');
  const { params, setFilter, setPage } = useListParams(FILTERS);
  const { q, status, page } = params;
  const [action, setAction] = useState<{ club: ClubRow; kind: 'end' | 'rotate' } | null>(null);

  const clubs = useQuery({
    queryKey: qk.clubs.list({ q, status, page }),
    queryFn: () => clubsApi.list(q || undefined, status || undefined, page),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title="모임" description="운영 중인 독서 모임과 초대 코드를 관리합니다." />

      <div className="px-7 py-6">
        <SearchForm key={q} initial={q} status={status} onSubmit={setFilter} />

        <ResultCount total={clubs.data?.totalElements} />

        <Card>
          <QueryState
            query={clubs}
            isEmpty={(data) => data.content.length === 0}
            empty="조건에 맞는 모임이 없습니다."
            onFirstPage={page > 0 ? () => setPage(0) : undefined}
          >
            {(data) => (
              <Table head={['모임', '호스트', '코드', '인원', '기간', '토론', '상태', '']}>
                {data.content.map((club) => {
                  const over = club.status === 'ENDED' || club.status === 'ARCHIVED';
                  return (
                    <tr key={club.id} className="border-b border-[var(--color-line)] last:border-0">
                      <td className="max-w-xs px-4 py-3">
                        <p className="truncate text-[14px] font-bold">{club.name}</p>
                        <p className="font-mono text-[10.5px] text-[var(--color-faint)]">
                          {formatDateTime(club.createdAt)} 생성
                        </p>
                      </td>
                      <td className="px-4 py-3 text-[13px]">{club.ownerNickname ?? '—'}</td>
                      <td className="numeral px-4 py-3 text-[12px] tracking-widest">{club.joinCode}</td>
                      <td className="numeral px-4 py-3 text-[12px]">
                        {club.memberCount}/{club.memberLimit}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] whitespace-nowrap text-[var(--color-muted)]">
                        {formatDate(club.startsAt)} → {club.endsAt ? formatDate(club.endsAt) : '—'}
                      </td>
                      <td className="numeral px-4 py-3 text-[12px]">{club.postCount}</td>
                      <td className="px-4 py-3">
                        <Tag tone={CLUB_STATUS_TONE[club.status]}>{CLUB_STATUS_LABEL[club.status]}</Tag>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {canModerate ? (
                          <>
                            <Button variant="ghost" onClick={() => setAction({ club, kind: 'rotate' })} className="mr-1">
                              코드 회전
                            </Button>
                            {!over ? (
                              <Button variant="danger" onClick={() => setAction({ club, kind: 'end' })}>
                                해산
                              </Button>
                            ) : null}
                          </>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </Table>
            )}
          </QueryState>
        </Card>

        <Pager page={page} totalPages={clubs.data?.totalPages ?? 0} onChange={setPage} />
      </div>

      {action ? <ActionDialog club={action.club} kind={action.kind} onClose={() => setAction(null)} /> : null}
    </>
  );
}

function SearchForm({ initial, status, onSubmit }: {
  initial: string;
  status: ClubStatus | '';
  onSubmit: (patch: { q?: string; status?: ClubStatus | '' }) => void;
}) {
  const [keyword, setKeyword] = useState(initial);
  return (
    <form
      className="mb-4 flex items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ q: keyword.trim() });
      }}
    >
      <div className="w-72">
        <Input label="검색" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="모임 이름" />
      </div>
      <div className="w-40">
        <Select label="상태" value={status} onChange={(e) => onSubmit({ status: e.target.value as ClubStatus | '' })}>
          <option value="">전체</option>
          {CLUB_STATUSES.map((value) => (
            <option key={value} value={value}>
              {CLUB_STATUS_LABEL[value]}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit">검색</Button>
    </form>
  );
}

function ActionDialog({ club, kind, onClose }: {
  club: ClubRow;
  kind: 'end' | 'rotate';
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const run = useMutation({
    meta: { inlineError: true },
    mutationFn: async () => {
      if (kind === 'end') {
        await clubsApi.forceEnd(club.id, reason.trim());
        return null;
      }
      const rotated = await clubsApi.rotateCode(club.id, reason.trim());
      return rotated.joinCode;
    },
    onSuccess: (code) => {
      queryClient.invalidateQueries({ queryKey: qk.clubs.all });
      if (code) {
        setResult(code);
      } else {
        toast.success('모임을 해산했습니다.');
        onClose();
      }
    },
  });

  return (
    <Modal
      size="sm"
      eyebrow={kind === 'end' ? '모임 강제 해산' : '초대 코드 강제 회전'}
      title={club.name}
      busy={run.isPending}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" disabled={run.isPending} onClick={onClose}>
            {result ? '닫기' : '취소'}
          </Button>
          {!result ? (
            <Button
              variant={kind === 'end' ? 'danger' : 'primary'}
              disabled={!reason.trim() || run.isPending}
              onClick={() => run.mutate()}
            >
              {run.isPending ? '처리 중…' : kind === 'end' ? '해산' : '회전'}
            </Button>
          ) : null}
        </>
      }
    >
      <p className="text-[13px] text-[var(--color-muted)]">
        {kind === 'end'
          ? '멤버들의 개인 독서 기록은 유지되고, 모임만 종료 처리됩니다.'
          : '기존 코드는 즉시 무효가 됩니다. 이미 참가한 멤버는 영향을 받지 않습니다.'}
      </p>

      {result ? (
        <div className="mt-4 flex items-end justify-between rounded-lg bg-[var(--color-surface-alt)] px-4 py-3">
          <div>
            <p className="eyebrow">새 초대 코드</p>
            <p className="numeral mt-1 text-[22px] tracking-[0.3em]">{result}</p>
          </div>
          <CopyButton value={result} />
        </div>
      ) : (
        <div className="mt-4">
          <Input
            label="사유 (필수)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="감사 로그에 남습니다"
          />
        </div>
      )}

      <ErrorText error={run.isError ? errorMessage(run.error, '처리하지 못했습니다.') : null} />
    </Modal>
  );
}
