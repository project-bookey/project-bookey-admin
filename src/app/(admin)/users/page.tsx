'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { errorMessage } from '@/lib/api';
import { usersApi } from '@/lib/endpoints';
import { formatDateTime, formatDuration, formatKrw } from '@/lib/format';
import {
  AUTH_PROVIDER_LABEL, CONSENT_KIND_LABEL, DEVICE_PLATFORM_LABEL, PAYMENT_STORE_LABEL, PURCHASE_STATUS_LABEL,
  PURCHASE_STATUS_TONE, SANCTION_TYPES, SANCTION_TYPE_HINT, SANCTION_TYPE_LABEL, SUBSCRIPTION_STATUS_LABEL,
  SUBSCRIPTION_STATUS_TONE, USER_STATUSES, USER_STATUS_LABEL, USER_STATUS_TONE, WALLET_TRANSACTION_KIND_LABEL,
} from '@/lib/labels';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/lib/toast';
import type { SanctionRow, SanctionType, UserDetail, WalletSummary } from '@/lib/types';
import { param, useListParams } from '@/lib/useListParams';
import { useCan } from '@/lib/useMe';
import { useConfirm } from '@/components/Confirm';
import { Modal } from '@/components/Modal';
import { QueryState } from '@/components/QueryState';
import { PageHeader } from '@/components/Shell';
import {
  Button, Card, Empty, ErrorText, Input, Metric, Pager, ResultCount, Select, Table, Tabs, Tag,
} from '@/components/ui';

const TABS = ['overview', 'payments', 'sanctions', 'devices'] as const;
type DialogTab = (typeof TABS)[number];

const FILTERS = {
  q: param.str(),
  status: param.oneOf(USER_STATUSES),
  /** 열린 회원 상세의 탭 — 링크로 바로 지갑 탭을 열 수 있게 URL 에 둔다. */
  tab: param.oneOf(TABS, 'overview'),
};

/** 회원 관리 — 조회는 마스킹이 기본, 전체 열람은 사유를 남겨야 한다 (§F13). */
export default function UsersPage() {
  const { params, setFilter, setParams, setPage, open, close } = useListParams(FILTERS);
  const { q, status, page, id } = params;
  const tab: DialogTab = params.tab || 'overview';

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

      {id !== undefined ? (
        <UserDialog key={id} userId={id} tab={tab} onTab={(next) => setParams({ tab: next })} onClose={close} />
      ) : null}
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

function UserDialog({ userId, tab, onTab, onClose }: {
  userId: number;
  tab: DialogTab;
  onTab: (tab: DialogTab) => void;
  onClose: () => void;
}) {
  const canViewPayments = useCan('VIEW_PAYMENTS');

  // 상세는 사유 없이 부른다 — 사유를 붙여 다시 부르면 개인정보 열람 기록이 그만큼 더 쌓인다.
  const detail = useQuery({
    queryKey: qk.users.detail(userId),
    queryFn: () => usersApi.detail(userId),
  });
  const data = detail.data;
  const current = tab === 'payments' && !canViewPayments ? 'overview' : tab;

  return (
    <Modal
      variant="side"
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
            {user.deletionRequestedAt ? (
              <p className="mt-3 rounded-lg bg-[var(--color-danger-soft)] px-4 py-2.5 font-mono text-[12px] font-bold text-[var(--color-danger)]">
                {formatDateTime(user.deletionRequestedAt)} 탈퇴를 신청했습니다 — 30일 뒤 계정이 지워집니다. 제재를 걸거나 풀 수 없습니다.
              </p>
            ) : null}

            <div className="mt-5">
              <Tabs<DialogTab>
                value={current}
                onChange={onTab}
                options={[
                  { value: 'overview', label: '개요' },
                  ...(canViewPayments ? [{ value: 'payments' as const, label: '지갑 · 결제' }] : []),
                  { value: 'sanctions', label: `제재 ${user.sanctions.length || ''}`.trim() },
                  { value: 'devices', label: '기기 · 동의' },
                ]}
              />
            </div>

            {current === 'overview' ? <OverviewTab user={user} /> : null}
            {current === 'payments' ? <PaymentsTab user={user} /> : null}
            {current === 'sanctions' ? <SanctionsTab user={user} /> : null}
            {current === 'devices' ? <DevicesTab user={user} /> : null}
          </>
        )}
      </QueryState>
    </Modal>
  );
}

function OverviewTab({ user }: { user: UserDetail }) {
  const confirm = useConfirm();
  const canSanction = useCan('SANCTION');
  const [reason, setReason] = useState('');
  const [revealed, setRevealed] = useState<{ email: string; reason: string } | null>(null);

  const reveal = useMutation({
    meta: { inlineError: true },
    mutationFn: (why: string) => usersApi.revealEmail(user.id, why),
    onSuccess: (view, why) => setRevealed({ email: view.email ?? '—', reason: why }),
  });

  const revokeSessions = async () => {
    await confirm({
      title: '이 회원의 로그인을 모두 끊을까요?',
      body: '모든 기기에서 로그아웃되고 다시 로그인해야 합니다. 기기 분실·계정 도용 신고 때 씁니다. 계정 상태는 바뀌지 않습니다.',
      confirmLabel: '끊기',
      tone: 'danger',
      reason: { label: '사유 (필수)', placeholder: '예: 휴대폰 분실 신고' },
      action: async ({ reason: why }) => {
        await usersApi.revokeSessions(user.id, why);
        toast.success('로그인을 모두 끊었습니다.');
      },
    });
  };

  return (
    <>
      <div className="mt-5 grid grid-cols-4 gap-3">
        <Metric label="세션" value={user.totalSessions} />
        <Metric label="총 독서" value={formatDuration(user.totalDurationSec)} />
        <Metric label="리뷰" value={user.reviewCount} />
        <Metric label="모임" value={user.clubCount} />
      </div>

      <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11.5px]">
        <span className="text-[var(--color-faint)]">쓴 글</span>
        <Link href={`/contents?type=POST&userId=${user.id}`} className="underline">독후감</Link>
        <Link href={`/reviews?userId=${user.id}`} className="underline">리뷰</Link>
        <Link href={`/contents?type=POST_COMMENT&userId=${user.id}`} className="underline">댓글</Link>
        <Link href={`/contents?type=BOOK_REMARK&userId=${user.id}`} className="underline">한줄평</Link>
        <Link href={`/contents?type=CLUB_POST&userId=${user.id}`} className="underline">모임 글</Link>
      </p>

      <dl className="mt-5 grid grid-cols-[120px_1fr] gap-y-2 rounded-lg border border-[var(--color-line)] px-4 py-3 text-[13px]">
        <dt className="text-[var(--color-muted)]">마지막 접속</dt>
        <dd className="font-mono text-[12.5px]">{formatDateTime(user.lastSeenAt)}</dd>
        <dt className="text-[var(--color-muted)]">로그인 수단</dt>
        <dd>
          {[user.hasPassword ? '이메일·비밀번호' : null, ...user.identities.map((i) => AUTH_PROVIDER_LABEL[i.provider])]
            .filter(Boolean)
            .join(' · ') || '—'}
        </dd>
        <dt className="text-[var(--color-muted)]">이메일 인증</dt>
        <dd className="font-mono text-[12.5px]">{user.emailVerifiedAt ? formatDateTime(user.emailVerifiedAt) : '안 함'}</dd>
        <dt className="text-[var(--color-muted)]">본인 인증</dt>
        <dd className="font-mono text-[12.5px]">{user.identityVerifiedAt ? formatDateTime(user.identityVerifiedAt) : '안 함'}</dd>
      </dl>

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

      {canSanction ? (
        <div className="mt-5 flex items-center justify-between rounded-lg border border-[var(--color-line)] px-4 py-3">
          <div>
            <p className="eyebrow">로그인 끊기</p>
            <p className="mt-1 text-[12.5px] text-[var(--color-muted)]">기기 분실·도용 신고 때 모든 기기에서 로그아웃시킵니다.</p>
          </div>
          <Button variant="danger" onClick={revokeSessions}>
            모두 끊기
          </Button>
        </div>
      ) : null}
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

function PaymentsTab({ user }: { user: UserDetail }) {
  const canSanction = useCan('SANCTION');
  const wallet = user.wallet ?? { bookmarks: 0, postcards: 0, stamps: 0 };
  const subscription = user.subscription;
  const subscribed = isCurrentSubscription(subscription);

  return (
    <>
      <div className="mt-5 grid grid-cols-4 gap-3">
        <Metric label="책갈피" value={wallet.bookmarks} />
        <Metric label="엽서" value={wallet.postcards} />
        <Metric label="우표" value={wallet.stamps} />
        <div className="rounded-lg bg-[var(--color-surface-alt)] px-3 py-2.5">
          <p className="eyebrow">구독</p>
          <p className="mt-1 text-[13px] font-bold">{subscribed ? 'Bookey Plus' : '없음'}</p>
          {subscription ? (
            <p className="font-mono text-[10.5px] text-[var(--color-faint)]">~ {formatDateTime(subscription.currentPeriodEnd)}</p>
          ) : null}
        </div>
      </div>

      {canSanction ? <WalletAdjust user={user} wallet={wallet} /> : null}
      {canSanction ? <SubscriptionActions user={user} /> : null}

      <WalletLedger userId={user.id} />
      <SubscriptionHistory userId={user.id} />
      <PurchaseHistory userId={user.id} />
    </>
  );
}

function WalletAdjust({ user, wallet }: { user: UserDetail; wallet: WalletSummary }) {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [bookmarks, setBookmarks] = useState('');
  const [postcards, setPostcards] = useState('');
  const [stamps, setStamps] = useState('');
  const [reason, setReason] = useState('');

  const invalid = [bookmarks, postcards, stamps].some((value) => value !== '' && !SIGNED_INT.test(value));
  const delta = {
    bookmarks: Number(bookmarks || 0),
    postcards: Number(postcards || 0),
    stamps: Number(stamps || 0),
  };
  const after = {
    bookmarks: wallet.bookmarks + delta.bookmarks,
    postcards: wallet.postcards + delta.postcards,
    stamps: wallet.stamps + delta.stamps,
  };
  const negative = after.bookmarks < 0 || after.postcards < 0 || after.stamps < 0;
  const nothing = delta.bookmarks === 0 && delta.postcards === 0 && delta.stamps === 0;

  const summary = [
    delta.bookmarks ? `책갈피 ${signed(delta.bookmarks)}` : null,
    delta.postcards ? `엽서 ${signed(delta.postcards)}` : null,
    delta.stamps ? `우표 ${signed(delta.stamps)}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const adjust = async () => {
    await confirm({
      title: '지갑을 조정할까요?',
      body: `${user.nickname} 님: ${summary} → 책갈피 ${after.bookmarks} · 엽서 ${after.postcards} · 우표 ${after.stamps}`,
      confirmLabel: '조정',
      action: async () => {
        await usersApi.adjustWallet(user.id, { ...delta, reason: reason.trim() });
        toast.success('지갑을 조정했습니다.');
        setBookmarks('');
        setPostcards('');
        setStamps('');
        setReason('');
        queryClient.invalidateQueries({ queryKey: qk.users.detail(user.id) });
        queryClient.invalidateQueries({ queryKey: ['users', 'wallet', user.id] });
      },
    });
  };

  const field = (label: string, value: string, set: (v: string) => void, current: number, next: number) => (
    <div>
      <Input label={label} inputMode="numeric" value={value} placeholder="0"
        onChange={(e) => set(e.target.value.replace(/[^\d-]/g, ''))} />
      <p className={`mt-1 font-mono text-[11px] ${next < 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-faint)]'}`}>
        {current} → {next}
      </p>
    </div>
  );

  return (
    <section className="mt-5 rounded-lg border border-[var(--color-line)] p-4">
      <p className="eyebrow">지갑 조정 (±)</p>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {field('책갈피', bookmarks, setBookmarks, wallet.bookmarks, after.bookmarks)}
        {field('엽서', postcards, setPostcards, wallet.postcards, after.postcards)}
        {field('우표', stamps, setStamps, wallet.stamps, after.stamps)}
      </div>
      <div className="mt-3">
        <Input label="사유 (필수)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예: 결제 오류 보상" />
      </div>
      <ErrorText
        error={invalid ? '숫자만 입력하세요. 빼려면 앞에 - 를 붙입니다.' : negative ? '잔액보다 많이 뺄 수 없습니다.' : null}
      />
      <div className="mt-4 flex justify-end">
        <Button disabled={invalid || negative || nothing || !reason.trim()} onClick={adjust}>
          조정
        </Button>
      </div>
    </section>
  );
}

function SubscriptionActions({ user }: { user: UserDetail }) {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [months, setMonths] = useState('1');
  const [reason, setReason] = useState('');

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: qk.users.detail(user.id) });
    queryClient.invalidateQueries({ queryKey: qk.users.subscriptions(user.id) });
  };

  const grant = async () => {
    await confirm({
      title: `구독 ${months}개월을 지급할까요?`,
      body: '남은 구독 기간 뒤에 이어 붙습니다.',
      confirmLabel: '지급',
      action: async () => {
        await usersApi.grantSubscription(user.id, { months: Number(months), reason: reason.trim() });
        toast.success('구독을 지급했습니다.');
        setReason('');
        refresh();
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
        refresh();
      },
    });
  };

  return (
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
        <Input label="지급 사유 (필수)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예: 이벤트 당첨" />
      </div>
      <div className="mt-4 flex justify-between">
        <Button variant="danger" disabled={!user.subscription} onClick={revoke}>
          구독 회수
        </Button>
        <Button disabled={!reason.trim()} onClick={grant}>
          구독 지급
        </Button>
      </div>
    </section>
  );
}

/** 결제 내역 목록들 — 탭을 열 때 불러오고, 쪽은 각 목록이 따로 들고 있는다. */
function WalletLedger({ userId }: { userId: number }) {
  const [page, setPage] = useState(0);
  const ledger = useQuery({
    queryKey: qk.users.walletTransactions(userId, page),
    queryFn: () => usersApi.walletTransactions(userId, page),
    placeholderData: keepPreviousData,
  });
  return (
    <section className="mt-6">
      <p className="eyebrow">지갑 원장</p>
      <Card className="mt-2">
        <QueryState query={ledger} isEmpty={(d) => d.content.length === 0} empty="원장 기록이 없습니다.">
          {(data) => (
            <ul className="divide-y divide-[var(--color-line)]">
              {data.content.map((row) => (
                <li key={row.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                  <span className="w-36 shrink-0 font-bold">{WALLET_TRANSACTION_KIND_LABEL[row.kind]}</span>
                  <span className="flex-1 font-mono text-[12px]">
                    {[
                      row.bookmarkDelta ? `책갈피 ${signed(row.bookmarkDelta)}` : null,
                      row.postcardDelta ? `엽서 ${signed(row.postcardDelta)}` : null,
                      row.stampDelta ? `우표 ${signed(row.stampDelta)}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || '변화 없음'}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--color-faint)]">{formatDateTime(row.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </QueryState>
      </Card>
      <Pager page={page} totalPages={ledger.data?.totalPages ?? 0} onChange={setPage} />
    </section>
  );
}

function SubscriptionHistory({ userId }: { userId: number }) {
  const history = useQuery({
    queryKey: qk.users.subscriptions(userId),
    queryFn: () => usersApi.subscriptions(userId),
  });
  return (
    <section className="mt-6">
      <p className="eyebrow">구독 이력</p>
      <Card className="mt-2">
        <QueryState query={history} isEmpty={(d) => d.length === 0} empty="구독한 적이 없습니다.">
          {(rows) => (
            <ul className="divide-y divide-[var(--color-line)]">
              {rows.map((row) => (
                <li key={row.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                  <Tag tone={SUBSCRIPTION_STATUS_TONE[row.status]}>{SUBSCRIPTION_STATUS_LABEL[row.status]}</Tag>
                  <span className="w-28 shrink-0">{PAYMENT_STORE_LABEL[row.store]}</span>
                  <span className="flex-1 font-mono text-[12px]">
                    {formatDateTime(row.currentPeriodStart)} → {formatDateTime(row.currentPeriodEnd)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </QueryState>
      </Card>
    </section>
  );
}

function PurchaseHistory({ userId }: { userId: number }) {
  const [page, setPage] = useState(0);
  const purchases = useQuery({
    queryKey: qk.users.purchases(userId, page),
    queryFn: () => usersApi.purchases(userId, page),
    placeholderData: keepPreviousData,
  });
  return (
    <section className="mt-6">
      <p className="eyebrow">책갈피 구매</p>
      <Card className="mt-2">
        <QueryState query={purchases} isEmpty={(d) => d.content.length === 0} empty="구매 내역이 없습니다.">
          {(data) => (
            <ul className="divide-y divide-[var(--color-line)]">
              {data.content.map((row) => (
                <li key={row.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                  <Tag tone={PURCHASE_STATUS_TONE[row.status]}>{PURCHASE_STATUS_LABEL[row.status]}</Tag>
                  <span className="w-24 shrink-0">{PAYMENT_STORE_LABEL[row.provider]}</span>
                  <span className="flex-1">
                    {row.quantity}개{row.bonusQuantity ? ` (+${row.bonusQuantity})` : ''} · {formatKrw(row.amountKrw)}
                    <span className="ml-2 font-mono text-[11px] text-[var(--color-faint)]">{row.orderId}</span>
                  </span>
                  <span className="font-mono text-[11px] text-[var(--color-faint)]">{formatDateTime(row.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </QueryState>
      </Card>
      <Pager page={page} totalPages={purchases.data?.totalPages ?? 0} onChange={setPage} />
    </section>
  );
}

function DevicesTab({ user }: { user: UserDetail }) {
  return (
    <>
      <section className="mt-5">
        <p className="eyebrow">기기</p>
        {user.devices.length === 0 ? (
          <Empty>등록된 기기가 없습니다 — 앱에서 푸시를 허용하지 않았거나 웹으로만 썼습니다.</Empty>
        ) : (
          <ul className="mt-2 divide-y divide-[var(--color-line)] rounded-lg border border-[var(--color-line)]">
            {user.devices.map((device, index) => (
              <li key={`${device.tokenTail}-${index}`} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                <span className="w-20 shrink-0 font-bold">{DEVICE_PLATFORM_LABEL[device.platform]}</span>
                {device.pushEnabled ? <Tag tone="accent">푸시 켜짐</Tag> : <Tag>푸시 꺼짐</Tag>}
                <span className="flex-1 font-mono text-[11px] text-[var(--color-faint)]">
                  토큰 …{device.tokenTail ?? '—'}
                </span>
                <span className="font-mono text-[11px] text-[var(--color-faint)]">최근 {formatDateTime(device.lastSeenAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <p className="eyebrow">소셜 연동</p>
        {user.identities.length === 0 ? (
          <p className="mt-2 text-[13px] text-[var(--color-muted)]">연동한 소셜 계정이 없습니다.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {user.identities.map((identity) => (
              <li key={identity.provider} className="rounded-lg border border-[var(--color-line)] px-3 py-2 text-[13px]">
                <span className="font-bold">{AUTH_PROVIDER_LABEL[identity.provider]}</span>
                <span className="ml-2 font-mono text-[11px] text-[var(--color-faint)]">{formatDateTime(identity.linkedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <p className="eyebrow">동의</p>
        {user.consents.length === 0 ? (
          <p className="mt-2 text-[13px] text-[var(--color-muted)]">동의 기록이 없습니다.</p>
        ) : (
          <ul className="mt-2 divide-y divide-[var(--color-line)] rounded-lg border border-[var(--color-line)]">
            {user.consents.map((consent) => (
              <li key={consent.kind} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                <span className="flex-1">{CONSENT_KIND_LABEL[consent.kind]}</span>
                {consent.agreed ? <Tag tone="accent">동의</Tag> : <Tag tone="warn">철회</Tag>}
                <span className="w-24 font-mono text-[11px] text-[var(--color-faint)]">{consent.version ?? '—'}</span>
                <span className="font-mono text-[11px] text-[var(--color-faint)]">{formatDateTime(consent.decidedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

/** 상태가 ACTIVE 여도 기간이 지났으면 끝난 구독이다(만료 처리 잡이 돌기 전일 수 있다). */
function isCurrentSubscription(subscription: UserDetail['subscription']): boolean {
  return subscription?.status === 'ACTIVE' && new Date(subscription.currentPeriodEnd).getTime() > Date.now();
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}
