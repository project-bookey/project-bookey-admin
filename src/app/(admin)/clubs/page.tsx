'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { AdminApiError, errorMessage } from '@/lib/api';
import { clubsApi } from '@/lib/endpoints';
import { formatDate, formatDateTime } from '@/lib/format';
import {
  CLUB_MEMBER_ROLE_LABEL, CLUB_MEMBER_STATUSES, CLUB_MEMBER_STATUS_LABEL, CLUB_MEMBER_STATUS_TONE, CLUB_STATUSES,
  CLUB_STATUS_LABEL, CLUB_STATUS_TONE, CLUB_VISIBILITY_LABEL, USER_STATUS_LABEL, USER_STATUS_TONE,
} from '@/lib/labels';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/lib/toast';
import type { ClubMemberRow, ClubMemberStatus, ClubRow, ClubStatus } from '@/lib/types';
import { param, useListParams } from '@/lib/useListParams';
import { useCan } from '@/lib/useMe';
import { useConfirm } from '@/components/Confirm';
import { Modal } from '@/components/Modal';
import { QueryState } from '@/components/QueryState';
import { PageHeader } from '@/components/Shell';
import {
  Button, Card, CopyButton, ErrorText, Input, Metric, Pager, ResultCount, Select, Table, Tabs, Tag,
} from '@/components/ui';

const FILTERS = {
  q: param.str(),
  status: param.oneOf(CLUB_STATUSES),
};

/** 해산·코드 회전 대화상자가 받는 모임 — 목록 행이든 상세든. */
type ActionTarget = Pick<ClubRow, 'id' | 'name'>;
type ClubAction = { club: ActionTarget; kind: 'end' | 'rotate' };

/** 모임 운영 — 신고된 모임 처리, 멤버 내보내기·호스트 넘기기, 코드 강제 회전, 강제 해산 (§F13). 상세는 ?id= 로 열린다. */
export default function ClubsPage() {
  const canModerate = useCan('MODERATE');
  const { params, setFilter, setPage, open, close } = useListParams(FILTERS);
  const { q, status, page, id } = params;
  const [action, setAction] = useState<ClubAction | null>(null);

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
                        <button
                          type="button"
                          onClick={() => open(club.id)}
                          className="block max-w-full truncate text-left text-[14px] font-bold hover:underline"
                        >
                          {club.name}
                        </button>
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
                        <Button variant="outline" onClick={() => open(club.id)} className="mr-1">
                          상세
                        </Button>
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

      {id !== undefined ? <ClubDialog key={id} clubId={id} onClose={close} onAction={setAction} /> : null}
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
  club: ActionTarget;
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

const MEMBER_TABS: { value: ClubMemberStatus | 'ALL'; label: string }[] = [
  ...CLUB_MEMBER_STATUSES.map((value) => ({ value, label: CLUB_MEMBER_STATUS_LABEL[value] })),
  { value: 'ALL', label: '전체' },
];

/** 모임 상세 — 정보와 멤버. 멤버를 내보내거나 호스트를 넘긴다(호스트 장기 미접속·분쟁 대응). */
function ClubDialog({ clubId, onClose, onAction }: {
  clubId: number;
  onClose: () => void;
  onAction: (action: ClubAction) => void;
}) {
  const canModerate = useCan('MODERATE');
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [memberStatus, setMemberStatus] = useState<ClubMemberStatus | 'ALL'>('ACTIVE');

  const detail = useQuery({ queryKey: qk.clubs.detail(clubId), queryFn: () => clubsApi.detail(clubId) });
  const members = useQuery({
    queryKey: qk.clubs.members(clubId, memberStatus),
    queryFn: () => clubsApi.members(clubId, memberStatus === 'ALL' ? undefined : memberStatus),
    placeholderData: keepPreviousData,
  });

  const gone = detail.error instanceof AdminApiError && detail.error.code === 'CLUB_NOT_FOUND';
  const club = detail.data;
  const over = club?.status === 'ENDED' || club?.status === 'ARCHIVED';
  // 끝난 모임은 멤버를 손볼 일이 없다 — 서버는 막지 않지만 버튼을 감춘다.
  const canManageMembers = canModerate && !!club && !over;

  const kick = async (member: ClubMemberRow) => {
    const done = await confirm({
      title: `${member.nickname ?? `회원 #${member.userId}`}님을 내보낼까요?`,
      tone: 'danger',
      body: '내보낸 멤버는 이 모임을 더 열 수 없습니다. 채팅 이용권과 아직 시작하지 않은 만남 참여는 지워지고, 남긴 메모는 그대로 남습니다.',
      confirmLabel: '내보내기',
      reason: { label: '사유 (필수)', placeholder: '감사 로그와 멤버 기록에 남습니다' },
      action: ({ reason }) => clubsApi.kick(clubId, member.userId, reason),
    });
    if (!done) return;
    toast.success('멤버를 내보냈습니다.');
    queryClient.invalidateQueries({ queryKey: qk.clubs.all });
  };

  const transfer = async (member: ClubMemberRow) => {
    if (!club) return;
    const done = await confirm({
      title: '호스트를 넘길까요?',
      body: (
        <>
          {club.ownerNickname ?? `회원 #${club.ownerId}`}님 → {member.nickname ?? `회원 #${member.userId}`}님. 지금 호스트는
          일반 멤버로 남습니다.
        </>
      ),
      confirmLabel: '넘기기',
      reason: { label: '사유 (필수)', placeholder: '예: 호스트 장기 미접속' },
      action: ({ reason }) => clubsApi.transferHost(clubId, member.userId, reason),
    });
    if (!done) return;
    toast.success('호스트를 넘겼습니다.');
    queryClient.invalidateQueries({ queryKey: qk.clubs.all });
  };

  return (
    <Modal
      variant="side"
      eyebrow={`모임 #${clubId}`}
      title={club?.name}
      onClose={onClose}
      footer={
        canModerate && club ? (
          <>
            <Button variant="ghost" onClick={() => onAction({ club, kind: 'rotate' })}>
              코드 회전
            </Button>
            {!over ? (
              <Button variant="danger" onClick={() => onAction({ club, kind: 'end' })}>
                해산
              </Button>
            ) : null}
          </>
        ) : undefined
      }
    >
      {detail.isPending ? <p className="text-[13.5px] text-[var(--color-muted)]">불러오는 중…</p> : null}

      {gone ? (
        <p className="rounded-lg bg-[var(--color-danger-soft)] px-4 py-3 font-mono text-[12px] font-bold text-[var(--color-danger)]">
          찾을 수 없는 모임입니다.
        </p>
      ) : null}

      {detail.isError && !gone ? (
        <div>
          <ErrorText error={errorMessage(detail.error, '모임을 불러오지 못했습니다.')} />
          <Button variant="outline" className="mt-3" onClick={() => detail.refetch()}>
            다시 시도
          </Button>
        </div>
      ) : null}

      {club ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone={CLUB_STATUS_TONE[club.status]}>{CLUB_STATUS_LABEL[club.status]}</Tag>
            <Tag>{CLUB_VISIBILITY_LABEL[club.visibility]}</Tag>
            <span className="font-mono text-[11px] text-[var(--color-faint)]">{formatDateTime(club.createdAt)} 생성</span>
          </div>

          {club.description ? (
            <p className="mt-4 rounded-lg bg-[var(--color-surface-alt)] px-4 py-3 text-[13.5px] leading-relaxed whitespace-pre-wrap break-words">
              {club.description}
            </p>
          ) : null}

          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
            <dt className="text-[var(--color-muted)]">호스트</dt>
            <dd>
              <Link href={`/users?id=${club.ownerId}`} className="underline">
                {club.ownerNickname ?? `회원 #${club.ownerId}`}
              </Link>
            </dd>
            <dt className="text-[var(--color-muted)]">초대 코드</dt>
            <dd className="flex items-center gap-3">
              <span className="numeral tracking-widest">{club.joinCode}</span>
              <CopyButton value={club.joinCode} />
            </dd>
            <dt className="text-[var(--color-muted)]">기간</dt>
            <dd className="font-mono text-[12px]">
              {formatDate(club.startsAt)} → {club.endsAt ? formatDate(club.endsAt) : '—'}
            </dd>
            <dt className="text-[var(--color-muted)]">읽은 책</dt>
            <dd className="break-words">{club.bookTitles.length > 0 ? club.bookTitles.join(' · ') : '—'}</dd>
          </dl>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Metric label="인원" value={`${club.memberCount}/${club.memberLimit}`} />
            <Metric label="글" value={club.postCount} />
            <Metric label="만남" value={club.meetingCount} />
          </div>

          <section className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <p className="eyebrow">멤버</p>
              <Tabs value={memberStatus} options={MEMBER_TABS} onChange={setMemberStatus} />
            </div>

            <div className={`mt-3 ${members.isPlaceholderData ? 'opacity-60' : ''}`}>
              {members.isPending ? (
                <p className="text-[13.5px] text-[var(--color-muted)]">불러오는 중…</p>
              ) : members.isError ? (
                <div>
                  <ErrorText error={errorMessage(members.error, '멤버를 불러오지 못했습니다.')} />
                  <Button variant="outline" className="mt-2" onClick={() => members.refetch()}>
                    다시 시도
                  </Button>
                </div>
              ) : members.data.length === 0 ? (
                <p className="text-[13.5px] text-[var(--color-muted)]">해당하는 멤버가 없습니다.</p>
              ) : (
                <ul className="divide-y divide-[var(--color-line)] rounded-lg border border-[var(--color-line)]">
                  {members.data.map((member) => (
                    <MemberItem
                      key={member.userId}
                      member={member}
                      canManage={canManageMembers}
                      onKick={() => kick(member)}
                      onTransfer={() => transfer(member)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      ) : null}
    </Modal>
  );
}

function MemberItem({ member, canManage, onKick, onTransfer }: {
  member: ClubMemberRow;
  canManage: boolean;
  onKick: () => void;
  onTransfer: () => void;
}) {
  const active = member.status === 'ACTIVE';
  const host = member.role === 'HOST';
  // 정지·탈퇴한 회원에게는 서버가 호스트를 넘기지 않는다.
  const reachable = member.userStatus !== 'SUSPENDED' && member.userStatus !== 'TERMINATED';
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link href={`/users?id=${member.userId}`} className="text-[13.5px] font-bold underline">
            {member.nickname ?? `회원 #${member.userId}`}
          </Link>
          {member.handle ? (
            <span className="font-mono text-[11px] text-[var(--color-faint)]">@{member.handle}</span>
          ) : null}
          {host ? <Tag tone="accent">{CLUB_MEMBER_ROLE_LABEL.HOST}</Tag> : null}
          {member.role === 'MODERATOR' ? <Tag>{CLUB_MEMBER_ROLE_LABEL.MODERATOR}</Tag> : null}
          {!active ? (
            <Tag tone={CLUB_MEMBER_STATUS_TONE[member.status]}>{CLUB_MEMBER_STATUS_LABEL[member.status]}</Tag>
          ) : null}
          {member.userStatus && member.userStatus !== 'ACTIVE' ? (
            <Tag tone={USER_STATUS_TONE[member.userStatus]}>{USER_STATUS_LABEL[member.userStatus]}</Tag>
          ) : null}
        </div>
        <p className="mt-0.5 font-mono text-[11px] text-[var(--color-faint)]">
          {formatDateTime(member.joinedAt)} 참여
          {member.leftAt ? ` · ${formatDateTime(member.leftAt)} ${member.status === 'KICKED' ? '내보냄' : '나감'}` : ''}
        </p>
        {member.kickReason ? (
          <p className="mt-1 text-[12.5px] text-[var(--color-muted)]">사유: {member.kickReason}</p>
        ) : null}
      </div>
      {canManage && active && !host ? (
        <div className="flex shrink-0 gap-1">
          {reachable ? (
            <Button variant="ghost" onClick={onTransfer}>
              호스트로
            </Button>
          ) : null}
          <Button variant="danger" onClick={onKick}>
            내보내기
          </Button>
        </div>
      ) : null}
    </li>
  );
}
