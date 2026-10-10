'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { errorMessage } from '@/lib/api';
import { usersApi } from '@/lib/endpoints';
import { formatDateTime, formatDuration } from '@/lib/format';
import {
  SANCTION_TYPES, SANCTION_TYPE_HINT, SANCTION_TYPE_LABEL, USER_STATUSES, USER_STATUS_LABEL, USER_STATUS_TONE,
} from '@/lib/labels';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/lib/toast';
import type { SanctionRow, SanctionType, UserDetail } from '@/lib/types';
import { param, useListParams } from '@/lib/useListParams';
import { useCan } from '@/lib/useMe';
import { useConfirm } from '@/components/Confirm';
import { Modal } from '@/components/Modal';
import { QueryState } from '@/components/QueryState';
import { PageHeader } from '@/components/Shell';
import {
  Button, Card, ErrorText, Input, Metric, Pager, ResultCount, Select, Table, Tabs, Tag,
} from '@/components/ui';

const FILTERS = {
  q: param.str(),
  status: param.oneOf(USER_STATUSES),
};

/** 회원 관리 — 조회는 마스킹이 기본, 전체 열람은 사유를 남겨야 한다 (§F13). */
export default function UsersPage() {
  const { params, setFilter, setPage, open, close } = useListParams(FILTERS);
  const { q, status, page, id } = params;

  const users = useQuery({
    queryKey: qk.users.list({ q, status, page }),
    queryFn: () => usersApi.list(q || undefined, status || undefined, page),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title="회원" description="닉네임 · 핸들 · 이메일로 검색합니다." />

      <div className="px-7 py-6">
        <SearchForm key={q} initial={q} status={status} onSubmit={setFilter} />

        <ResultCount total={users.data?.totalElements} />

        <Card>
          <QueryState
            query={users}
            isEmpty={(data) => data.content.length === 0}
            empty="조건에 맞는 회원이 없습니다."
            onFirstPage={page > 0 ? () => setPage(0) : undefined}
          >
            {(data) => (
              <Table head={['회원', '이메일', '상태', '읽는 중', '완독', '가입', '']}>
                {data.content.map((user) => (
                  <tr key={user.id} className="border-b border-[var(--color-line)] last:border-0">
                    <td className="px-4 py-3">
                      <p className="text-[14px] font-bold">{user.nickname}</p>
                      <p className="font-mono text-[11px] text-[var(--color-faint)]">@{user.handle}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-[var(--color-muted)]">
                      {user.maskedEmail ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Tag tone={USER_STATUS_TONE[user.status]}>{USER_STATUS_LABEL[user.status]}</Tag>
                    </td>
                    <td className="numeral px-4 py-3 text-[12px]">{user.booksReading}</td>
                    <td className="numeral px-4 py-3 text-[12px]">{user.booksFinished}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[var(--color-faint)]">
                      {formatDateTime(user.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" onClick={() => open(user.id)}>
                        상세
                      </Button>
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </QueryState>
        </Card>

        <Pager page={page} totalPages={users.data?.totalPages ?? 0} onChange={setPage} />
      </div>

      {id !== undefined ? <UserDialog key={id} userId={id} onClose={close} /> : null}
    </>
  );
}

/** 검색어는 입력 중에는 화면에만 두고, 검색을 눌러야 URL 에 반영한다. URL 이 바뀌면 key 로 다시 만든다. */
function SearchForm({ initial, status, onSubmit }: {
  initial: string;
  status: (typeof USER_STATUSES)[number] | '';
  onSubmit: (patch: { q?: string; status?: (typeof USER_STATUSES)[number] | '' }) => void;
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
        <Input
          label="검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="닉네임 · 핸들 · 이메일"
        />
      </div>
      <div className="w-40">
        <Select
          label="상태"
          value={status}
          onChange={(e) => onSubmit({ status: e.target.value as typeof status })}
        >
          <option value="">전체</option>
          {USER_STATUSES.map((value) => (
            <option key={value} value={value}>
              {USER_STATUS_LABEL[value]}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit">검색</Button>
    </form>
  );
}

type DialogTab = 'overview' | 'sanctions' | 'wallet';

function UserDialog({ userId, onClose }: { userId: number; onClose: () => void }) {
  const [tab, setTab] = useState<DialogTab>('overview');
  const canSanction = useCan('SANCTION');

  // 상세는 사유 없이 부른다 — 사유를 붙여 다시 부르면 개인정보 열람 기록이 그만큼 더 쌓인다.
  const detail = useQuery({
    queryKey: qk.users.detail(userId),
    queryFn: () => usersApi.detail(userId),
  });
  const data = detail.data;

  return (
    <Modal
      size="lg"
      eyebrow={`회원 상세 · ID ${userId}`}
      title={
        data ? (
          <span className="flex flex-wrap items-center gap-2">
            {data.nickname}
            <Tag tone={USER_STATUS_TONE[data.status]}>{USER_STATUS_LABEL[data.status]}</Tag>
          </span>
        ) : (
          '불러오는 중…'
        )
      }
      onClose={onClose}
    >
      <QueryState query={detail}>
        {(user) => (
          <>
            <p className="-mt-2 font-mono text-[12px] text-[var(--color-faint)]">
              @{user.handle} · 가입 {formatDateTime(user.createdAt)}
            </p>

            <div className="mt-5">
              <Tabs<DialogTab>
                value={tab}
                onChange={setTab}
                options={[
                  { value: 'overview', label: '개요' },
                  { value: 'sanctions', label: `제재 ${user.sanctions.length || ''}`.trim() },
                  ...(canSanction ? [{ value: 'wallet' as const, label: '지갑 · 구독' }] : []),
                ]}
              />
            </div>

            {tab === 'overview' ? <OverviewTab user={user} /> : null}
            {tab === 'sanctions' ? <SanctionsTab user={user} /> : null}
            {tab === 'wallet' && canSanction ? <WalletTab user={user} /> : null}
          </>
        )}
      </QueryState>
    </Modal>
  );
}

function OverviewTab({ user }: { user: UserDetail }) {
  const [reason, setReason] = useState('');
  const [revealed, setRevealed] = useState<{ email: string; reason: string } | null>(null);

  const reveal = useMutation({
    meta: { inlineError: true },
    mutationFn: (why: string) => usersApi.revealEmail(user.id, why),
    onSuccess: (view, why) => setRevealed({ email: view.email ?? '—', reason: why }),
  });

  return (
    <>
      <div className="mt-5 grid grid-cols-4 gap-3">
        <Metric label="세션" value={user.totalSessions} />
        <Metric label="총 독서" value={formatDuration(user.totalDurationSec)} />
        <Metric label="리뷰" value={user.reviewCount} />
        <Metric label="모임" value={user.clubCount} />
      </div>

      <div className="mt-5 rounded-lg border border-[var(--color-line)] px-4 py-3">
        <p className="eyebrow">이메일</p>
        <p className="mt-1 font-mono text-[13px]">{revealed?.email ?? user.email ?? '—'}</p>
        {!revealed ? (
          <form
            className="mt-3 flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (reason.trim()) reveal.mutate(reason.trim());
            }}
          >
            <div className="flex-1">
              <Input
                label="전체 보기 사유"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="예: 계정 도용 신고 확인"
                hint="열람 자체가 개인정보 열람 기록으로 남습니다. 창을 닫으면 다시 가려집니다."
              />
            </div>
            <Button type="submit" variant="outline" disabled={!reason.trim() || reveal.isPending}>
              {reveal.isPending ? '확인 중…' : '열람'}
            </Button>
          </form>
        ) : (
          <p className="mt-2 font-mono text-[11px] text-[var(--color-warn)]">
            사유 &ldquo;{revealed.reason}&rdquo; 로 열람 기록됨
          </p>
        )}
        <ErrorText error={reveal.isError ? errorMessage(reveal.error) : null} />
      </div>
    </>
  );
}

function isActive(sanction: SanctionRow): boolean {
  return !sanction.releasedAt && (!sanction.endsAt || new Date(sanction.endsAt).getTime() > Date.now());
}

function SanctionsTab({ user }: { user: UserDetail }) {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const canWarn = useCan('WARN');
  const canSanction = useCan('SANCTION');
  const allowedTypes = SANCTION_TYPES.filter((type) => (type === 'WARN' ? canWarn : canSanction));

  const [type, setType] = useState<SanctionType>(allowedTypes[0] ?? 'WARN');
  const [reason, setReason] = useState('');
  const [durationDays, setDurationDays] = useState('7');
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: qk.users.all });
    queryClient.invalidateQueries({ queryKey: qk.dashboard });
  };

  const sanction = useMutation({
    meta: { inlineError: true },
    mutationFn: () =>
      usersApi.sanction(user.id, {
        type,
        reason: reason.trim(),
        durationDays: type !== 'WARN' && durationDays ? Number(durationDays) : undefined,
      }),
    onSuccess: () => {
      setReason('');
      setError(null);
      toast.success(`${SANCTION_TYPE_LABEL[type]}를 적용했습니다.`);
      refresh();
    },
    onError: (e) => setError(errorMessage(e, '제재를 적용하지 못했습니다.')),
  });

  const release = async (item: SanctionRow) => {
    await confirm({
      title: `${SANCTION_TYPE_LABEL[item.type]}를 해제할까요?`,
      body: '남은 다른 제재가 있으면 그 제재의 상태가 유지됩니다.',
      confirmLabel: '해제',
      reason: { label: '해제 사유 (필수)', placeholder: '예: 소명 확인' },
      action: async ({ reason: why }) => {
        await usersApi.releaseSanction(user.id, item.id, why);
        toast.success('제재를 해제했습니다.');
        refresh();
      },
    });
  };

  const submit = async () => {
    if (type !== 'WARN') {
      const ok = await confirm({
        title: `${SANCTION_TYPE_LABEL[type]}를 적용할까요?`,
        body: (
          <>
            {SANCTION_TYPE_HINT[type]}
            <br />
            기간: {durationDays ? `${durationDays}일` : '해제할 때까지'}
          </>
        ),
        confirmLabel: '적용',
        tone: 'danger',
      });
      if (!ok) return;
    }
    setError(null);
    sanction.mutate();
  };

  return (
    <>
      <section className="mt-5">
        <p className="eyebrow">제재 이력</p>
        {user.sanctions.length === 0 ? (
          <p className="mt-2 text-[13px] text-[var(--color-muted)]">제재 이력이 없습니다.</p>
        ) : (
          <ul className="mt-2 divide-y divide-[var(--color-line)] rounded-lg border border-[var(--color-line)]">
            {user.sanctions.map((item) => {
              const active = isActive(item);
              return (
                <li key={item.id} className="flex items-start gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag tone={active ? 'danger' : 'neutral'}>{SANCTION_TYPE_LABEL[item.type]}</Tag>
                      <span className="font-mono text-[11px] text-[var(--color-faint)]">
                        {formatDateTime(item.startsAt)}
                        {item.endsAt ? ` → ${formatDateTime(item.endsAt)}` : ' (기한 없음)'}
                        {item.releasedAt ? ` · ${formatDateTime(item.releasedAt)} 해제` : ''}
                        {!item.releasedAt && !active ? ' · 기간 끝남' : ''}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] break-words">{item.reason}</p>
                  </div>
                  {active && canSanction ? (
                    <Button variant="ghost" onClick={() => release(item)}>
                      해제
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {allowedTypes.length > 0 ? (
        <section className="mt-6 rounded-lg border border-[var(--color-line)] p-4">
          <p className="eyebrow">제재 적용</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Select label="종류" value={type} onChange={(e) => setType(e.target.value as SanctionType)}>
              {allowedTypes.map((value) => (
                <option key={value} value={value}>
                  {SANCTION_TYPE_LABEL[value]}
                </option>
              ))}
            </Select>
            {type !== 'WARN' ? (
              <Input
                label="기간(일)"
                inputMode="numeric"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value.replace(/\D/g, ''))}
                hint="비우면 해제할 때까지"
              />
            ) : null}
          </div>
          <p className="mt-2 font-mono text-[11px] text-[var(--color-muted)]">{SANCTION_TYPE_HINT[type]}</p>
          <div className="mt-3">
            <Input
              label="사유 (필수 · 회원에게 알림으로 전달됩니다)"
              value={reason}
              maxLength={500}
              onChange={(e) => setReason(e.target.value)}
              placeholder="어떤 운영 정책을 어겼는지 회원이 알아볼 수 있게"
            />
          </div>
          <ErrorText error={error} />
          <div className="mt-4 flex justify-end">
            <Button variant="danger" disabled={!reason.trim() || sanction.isPending} onClick={submit}>
              {sanction.isPending ? '적용 중…' : '제재 적용'}
            </Button>
          </div>
        </section>
      ) : null}
    </>
  );
}

const SIGNED_INT = /^-?\d+$/;

function WalletTab({ user }: { user: UserDetail }) {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [bookmarks, setBookmarks] = useState('');
  const [postcards, setPostcards] = useState('');
  const [stamps, setStamps] = useState('');
  const [reason, setReason] = useState('');
  const [months, setMonths] = useState('1');
  const [grantReason, setGrantReason] = useState('');

  const deltas = { bookmarks, postcards, stamps };
  const invalid = Object.values(deltas).some((value) => value !== '' && !SIGNED_INT.test(value));
  const parsed = {
    bookmarks: Number(bookmarks || 0),
    postcards: Number(postcards || 0),
    stamps: Number(stamps || 0),
  };
  const nothing = parsed.bookmarks === 0 && parsed.postcards === 0 && parsed.stamps === 0;

  const summary = [
    parsed.bookmarks ? `책갈피 ${signed(parsed.bookmarks)}` : null,
    parsed.postcards ? `엽서 ${signed(parsed.postcards)}` : null,
    parsed.stamps ? `우표 ${signed(parsed.stamps)}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const adjust = async () => {
    await confirm({
      title: '지갑을 조정할까요?',
      body: `${user.nickname} 님: ${summary}`,
      confirmLabel: '조정',
      action: async () => {
        await usersApi.adjustWallet(user.id, { ...parsed, reason: reason.trim() });
        toast.success('지갑을 조정했습니다.');
        setBookmarks('');
        setPostcards('');
        setStamps('');
        setReason('');
        queryClient.invalidateQueries({ queryKey: qk.audit.all });
      },
    });
  };

  const grant = async () => {
    await confirm({
      title: `구독 ${months}개월을 지급할까요?`,
      body: '남은 구독 기간 뒤에 이어 붙습니다.',
      confirmLabel: '지급',
      action: async () => {
        await usersApi.grantSubscription(user.id, { months: Number(months), reason: grantReason.trim() });
        toast.success('구독을 지급했습니다.');
        setGrantReason('');
      },
    });
  };

  const revoke = async () => {
    await confirm({
      title: '구독을 회수할까요?',
      body: '가장 최근 구독을 바로 끝냅니다. 스토어 결제 환불은 따로 처리해야 합니다.',
      confirmLabel: '회수',
      tone: 'danger',
      reason: { label: '회수 사유 (필수)', placeholder: '예: 중복 지급 정정' },
      action: async ({ reason: why }) => {
        await usersApi.revokeSubscription(user.id, why);
        toast.success('구독을 회수했습니다.');
      },
    });
  };

  return (
    <>
      <p className="mt-5 rounded-lg bg-[var(--color-surface-alt)] px-4 py-3 font-mono text-[11.5px] text-[var(--color-muted)]">
        현재 잔액과 구독 상태 조회는 결제 내역 화면이 나오면 함께 보입니다. 지금은 조정 결과를 감사 로그에서 확인하세요.
      </p>

      <section className="mt-5 rounded-lg border border-[var(--color-line)] p-4">
        <p className="eyebrow">지갑 조정 (±)</p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Input label="책갈피" inputMode="numeric" value={bookmarks} placeholder="0"
            onChange={(e) => setBookmarks(e.target.value.replace(/[^\d-]/g, ''))} />
          <Input label="엽서" inputMode="numeric" value={postcards} placeholder="0"
            onChange={(e) => setPostcards(e.target.value.replace(/[^\d-]/g, ''))} />
          <Input label="우표" inputMode="numeric" value={stamps} placeholder="0"
            onChange={(e) => setStamps(e.target.value.replace(/[^\d-]/g, ''))} />
        </div>
        <p className="mt-2 font-mono text-[11px] text-[var(--color-muted)]">
          더하려면 양수, 빼려면 음수(예: -3). 잔액보다 많이 뺄 수 없습니다.
        </p>
        <div className="mt-3">
          <Input label="사유 (필수)" value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="예: 결제 오류 보상" />
        </div>
        <ErrorText error={invalid ? '숫자만 입력하세요. 빼려면 앞에 - 를 붙입니다.' : null} />
        <div className="mt-4 flex justify-end">
          <Button disabled={invalid || nothing || !reason.trim()} onClick={adjust}>
            조정
          </Button>
        </div>
      </section>

      <section className="mt-5 rounded-lg border border-[var(--color-line)] p-4">
        <p className="eyebrow">구독 (Bookey Plus)</p>
        <div className="mt-3 grid grid-cols-[140px_1fr] gap-3">
          <Select label="지급 기간" value={months} onChange={(e) => setMonths(e.target.value)}>
            {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}개월
              </option>
            ))}
          </Select>
          <Input label="지급 사유 (필수)" value={grantReason} onChange={(e) => setGrantReason(e.target.value)}
            placeholder="예: 이벤트 당첨" />
        </div>
        <div className="mt-4 flex justify-between">
          <Button variant="danger" onClick={revoke}>
            구독 회수
          </Button>
          <Button disabled={!grantReason.trim()} onClick={grant}>
            구독 지급
          </Button>
        </div>
      </section>
    </>
  );
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}
