'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { errorMessage } from '@/lib/api';
import { opsApi, pushApi } from '@/lib/endpoints';
import { formatDateTime, formatNumber } from '@/lib/format';
import {
  PUSH_KINDS, PUSH_KIND_HINT, PUSH_KIND_LABEL, PUSH_STATUS_LABEL, PUSH_STATUS_TONE,
} from '@/lib/labels';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/lib/toast';
import type { PushCampaignKind, PushCampaignRow } from '@/lib/types';
import { useListParams } from '@/lib/useListParams';
import { useConfirm } from '@/components/Confirm';
import { Modal } from '@/components/Modal';
import { QueryState } from '@/components/QueryState';
import { PageHeader } from '@/components/Shell';
import { Button, Card, ErrorText, Input, Metric, Pager, ResultCount, Select, Table, Tag, Textarea } from '@/components/ui';

const FILTERS = {};
const TITLE_MAX = 60;
const BODY_MAX = 300;

/** 서버(PushMessages)와 같은 규칙으로, 회원에게 실제로 보일 문구를 미리 만든다. */
function finalTitle(kind: PushCampaignKind, title: string): string {
  const trimmed = title.trim();
  return kind === 'MARKETING' && !trimmed.startsWith('(광고)') ? `(광고) ${trimmed}` : trimmed;
}

function finalBody(kind: PushCampaignKind, body: string): string {
  const trimmed = body.trim();
  return kind === 'MARKETING' ? `${trimmed}\n수신 거부: 앱 설정 > 알림 > 광고성 정보 수신 끄기` : trimmed;
}

/** 전체 푸시 — 공지·광고 캠페인. 서버가 1분마다 대상자를 펼치고 방해 금지·야간을 피해 보낸다. */
export default function PushPage() {
  const { params, setPage, open, close } = useListParams(FILTERS);
  const { page, id } = params;
  const [composing, setComposing] = useState<PushCampaignRow | 'new' | null>(null);

  const campaigns = useQuery({
    queryKey: qk.push.list(page),
    queryFn: () => pushApi.list(page),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
  const flags = useQuery({ queryKey: qk.ops.flags, queryFn: opsApi.flags });
  const pushEnabled = flags.data?.find((flag) => flag.key === 'PUSH_ENABLED')?.enabled ?? true;

  return (
    <>
      <PageHeader
        title="전체 푸시"
        description="공지는 가입자 모두에게, 광고는 수신 동의자에게만 갑니다. 회원별 방해 금지 시간은 지켜서 보냅니다."
        action={<Button onClick={() => setComposing('new')}>새 푸시</Button>}
      />

      <div className="px-7 py-6">
        {!pushEnabled ? (
          <p className="mb-4 rounded-lg border-l-4 border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-4 py-3 text-[13px] font-bold text-[var(--color-danger)]">
            푸시 킬스위치가 꺼져 있어 캠페인이 멈춰 있습니다. 알림 운영에서 다시 켜면 이어서 나갑니다.
          </p>
        ) : null}
        <p className="mb-4 rounded-lg bg-[var(--color-surface-alt)] px-4 py-3 font-mono text-[11.5px] text-[var(--color-muted)]">
          지금 배포된 앱은 알림 목록에 공지를 보여 주지만, 링크를 눌러 화면을 여는 기능은 앱 업데이트 뒤에 동작합니다.
        </p>

        <ResultCount total={campaigns.data?.totalElements} />
        <Card>
          <QueryState
            query={campaigns}
            isEmpty={(data) => data.content.length === 0}
            empty="보낸 푸시가 없습니다."
            onFirstPage={page > 0 ? () => setPage(0) : undefined}
          >
            {(data) => (
              <Table head={['상태', '종류', '제목', '발송 시각', '대상', '만든 사람', '']}>
                {data.content.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--color-line)] last:border-0">
                    <td className="px-4 py-3">
                      <Tag tone={PUSH_STATUS_TONE[row.status]}>{PUSH_STATUS_LABEL[row.status]}</Tag>
                    </td>
                    <td className="px-4 py-3">
                      <Tag tone={row.kind === 'MARKETING' ? 'warn' : 'neutral'}>{PUSH_KIND_LABEL[row.kind]}</Tag>
                    </td>
                    <td className="max-w-sm px-4 py-3">
                      <p className="truncate text-[13.5px] font-bold">{row.title}</p>
                      <p className="truncate text-[12.5px] text-[var(--color-muted)]">{row.body}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11.5px] whitespace-nowrap text-[var(--color-muted)]">
                      {formatDateTime(row.scheduledAt)}
                    </td>
                    <td className="numeral px-4 py-3 text-[12px]">
                      {row.status === 'SCHEDULED' ? '—' : formatNumber(row.targetCount)}
                    </td>
                    <td className="px-4 py-3 text-[13px]">{row.createdByName ?? `#${row.createdBy}`}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" onClick={() => open(row.id)}>
                        보기
                      </Button>
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </QueryState>
        </Card>
        <Pager page={page} totalPages={campaigns.data?.totalPages ?? 0} onChange={setPage} />
      </div>

      {id !== undefined ? (
        <CampaignDrawer key={id} campaignId={id} onClose={close} onEdit={(row) => setComposing(row)} />
      ) : null}
      {composing ? (
        <ComposeDialog
          campaign={composing === 'new' ? undefined : composing}
          pushEnabled={pushEnabled}
          onClose={() => setComposing(null)}
        />
      ) : null}
    </>
  );
}

function CampaignDrawer({ campaignId, onClose, onEdit }: {
  campaignId: number;
  onClose: () => void;
  onEdit: (row: PushCampaignRow) => void;
}) {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const detail = useQuery({
    queryKey: qk.push.detail(campaignId),
    queryFn: () => pushApi.detail(campaignId),
    refetchInterval: (query) => (query.state.data?.campaign.status === 'SENDING' ? 10_000 : false),
  });

  const cancel = async (row: PushCampaignRow) => {
    await confirm({
      title: '푸시를 취소할까요?',
      body: '아직 나가지 않은 알림(방해 금지로 미뤄 둔 것 포함)은 지워집니다. 이미 나간 푸시는 되돌릴 수 없습니다.',
      confirmLabel: '취소하기',
      tone: 'danger',
      reason: { label: '사유 (필수)', placeholder: '예: 문구 실수' },
      action: async ({ reason }) => {
        await pushApi.cancel(row.id, reason);
        toast.success('푸시를 취소했습니다.');
        queryClient.invalidateQueries({ queryKey: qk.push.all });
      },
    });
  };

  return (
    <Modal variant="side" eyebrow={`전체 푸시 #${campaignId}`} title={detail.data?.campaign.title ?? '불러오는 중…'} onClose={onClose}>
      <QueryState query={detail}>
        {(data) => {
          const row = data.campaign;
          return (
            <>
              <div className="-mt-1 flex flex-wrap items-center gap-2">
                <Tag tone={PUSH_STATUS_TONE[row.status]}>{PUSH_STATUS_LABEL[row.status]}</Tag>
                <Tag tone={row.kind === 'MARKETING' ? 'warn' : 'neutral'}>{PUSH_KIND_LABEL[row.kind]}</Tag>
                <span className="font-mono text-[11px] text-[var(--color-faint)]">
                  예약 {formatDateTime(row.scheduledAt)}
                  {row.startedAt ? ` · 시작 ${formatDateTime(row.startedAt)}` : ''}
                  {row.finishedAt ? ` · 끝 ${formatDateTime(row.finishedAt)}` : ''}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-4 gap-3">
                <Metric label="대상" value={row.targetCount} />
                <Metric label="발송" value={data.sentCount} />
                <Metric label="대기" value={data.pendingCount} />
                <Metric label="열람" value={data.openedCount} />
              </div>
              {data.pendingCount > 0 ? (
                <p className="mt-2 font-mono text-[11px] text-[var(--color-muted)]">
                  대기는 방해 금지 시간이나 광고 야간(21–08시)이라 미뤄 둔 알림입니다.
                </p>
              ) : null}

              <section className="mt-5">
                <p className="eyebrow">회원에게 보이는 모습</p>
                <NotificationPreview title={data.finalTitle} body={data.finalBody} />
                {row.linkUrl ? (
                  <p className="mt-2 font-mono text-[11.5px] text-[var(--color-muted)]">링크 {row.linkUrl}</p>
                ) : null}
              </section>

              <div className="mt-6 flex justify-end gap-2">
                {row.status === 'SCHEDULED' ? (
                  <Button variant="outline" onClick={() => onEdit(row)}>
                    고치기
                  </Button>
                ) : null}
                {row.status === 'SCHEDULED' || row.status === 'SENDING' ? (
                  <Button variant="danger" onClick={() => cancel(row)}>
                    취소
                  </Button>
                ) : null}
              </div>
            </>
          );
        }}
      </QueryState>
    </Modal>
  );
}

function NotificationPreview({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-2 max-w-sm rounded-2xl bg-[var(--color-surface-alt)] px-4 py-3 shadow-sm">
      <p className="font-mono text-[10.5px] text-[var(--color-faint)]">bookey · 지금</p>
      <p className="mt-1 text-[13.5px] font-bold break-words">{title || '제목'}</p>
      <p className="mt-0.5 text-[13px] leading-snug whitespace-pre-wrap break-words text-[var(--color-muted)]">{body || '본문'}</p>
    </div>
  );
}

function toLocalInput(iso: string): string {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function ComposeDialog({ campaign, pushEnabled, onClose }: {
  campaign?: PushCampaignRow;
  pushEnabled: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [kind, setKind] = useState<PushCampaignKind>(campaign?.kind ?? 'NOTICE');
  const [title, setTitle] = useState(campaign?.title ?? '');
  const [body, setBody] = useState(campaign?.body ?? '');
  const [linkUrl, setLinkUrl] = useState(campaign?.linkUrl ?? '');
  const [scheduledAt, setScheduledAt] = useState(campaign ? toLocalInput(campaign.scheduledAt) : '');
  const [testIds, setTestIds] = useState('');

  const audience = useQuery({ queryKey: qk.push.audience(kind), queryFn: () => pushApi.audience(kind) });

  const link = linkUrl.trim();
  const linkError = link && !link.startsWith('https://') && !(link.startsWith('/') && !link.startsWith('//'))
    ? '링크는 https:// 주소나 / 로 시작하는 앱 화면 경로만 쓸 수 있습니다.'
    : null;
  const ids = testIds.split(/[\s,]+/).filter(Boolean).map(Number);
  const idsError = testIds.trim() && (ids.some((n) => !Number.isInteger(n) || n <= 0) || ids.length > 5)
    ? '회원 번호를 쉼표로 5명까지 적어 주세요.'
    : null;
  const ready = !!title.trim() && !!body.trim() && !linkError;

  const sendTest = useMutation({
    meta: { inlineError: true },
    mutationFn: () => pushApi.test({ kind, title: title.trim(), body: body.trim(), linkUrl: link || undefined, userIds: ids }),
    onSuccess: (result) => toast.success(`테스트 푸시를 ${result.delivered}명에게 보냈습니다.`),
  });

  const submit = async () => {
    const when = scheduledAt ? new Date(scheduledAt).toISOString() : undefined;
    const count = audience.data?.eligibleUsers;
    await confirm({
      title: campaign ? '예약을 고칠까요?' : when ? '푸시를 예약할까요?' : '지금 보낼까요?',
      body: (
        <>
          {PUSH_KIND_LABEL[kind]} · 대상 {count === undefined ? '—' : `${formatNumber(count)}명`}
          {when ? ` · ${formatDateTime(when)}` : ' · 1분 안에 시작'}
          <br />
          되돌릴 수 없습니다. 테스트 발송으로 먼저 확인하세요.
        </>
      ),
      confirmLabel: campaign ? '고치기' : '보내기',
      tone: 'danger',
      reason: { label: '사유 (필수)', placeholder: '예: 10월 점검 공지' },
      typeToConfirm: campaign ? undefined : '발송',
      action: async ({ reason }) => {
        const request = { kind, title: title.trim(), body: body.trim(), linkUrl: link || undefined, scheduledAt: when, reason };
        if (campaign) await pushApi.update(campaign.id, request);
        else await pushApi.create(request);
        toast.success(campaign ? '예약을 고쳤습니다.' : when ? '예약했습니다.' : '보내기 시작합니다.');
        queryClient.invalidateQueries({ queryKey: qk.push.all });
        onClose();
      },
    });
  };

  return (
    <Modal
      size="xl"
      eyebrow={campaign ? '예약 고치기' : '새 전체 푸시'}
      title={campaign ? campaign.title : '푸시 만들기'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            닫기
          </Button>
          <Button variant="danger" disabled={!ready || !pushEnabled} onClick={submit}>
            {campaign ? '고치기' : scheduledAt ? '예약하기' : '지금 보내기'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-[1fr_280px] gap-6">
        <div className="flex flex-col gap-3">
          <Select label="종류" value={kind} onChange={(e) => setKind(e.target.value as PushCampaignKind)}>
            {PUSH_KINDS.map((value) => (
              <option key={value} value={value}>
                {PUSH_KIND_LABEL[value]}
              </option>
            ))}
          </Select>
          <p className="-mt-1 font-mono text-[11px] text-[var(--color-muted)]">{PUSH_KIND_HINT[kind]}</p>
          <Input label={`제목 (${title.length}/${TITLE_MAX})`} value={title} maxLength={TITLE_MAX}
            onChange={(e) => setTitle(e.target.value)} placeholder="예: 10월 서비스 점검 안내" />
          <Textarea label="본문" rows={4} maxLength={BODY_MAX} value={body} onChange={(e) => setBody(e.target.value)} />
          <Input label="링크 (선택)" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="/home 또는 https://..." hint="앱 업데이트 뒤부터 눌렀을 때 열립니다." />
          <Input label="예약 시각 (비우면 바로)" type="datetime-local" value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)} />
          <ErrorText error={linkError} />

          <div className="mt-2 rounded-lg border border-[var(--color-line)] p-3">
            <p className="eyebrow">테스트 발송</p>
            <div className="mt-2 grid grid-cols-[1fr_auto] items-end gap-2">
              <Input label="회원 번호 (쉼표로, 5명까지)" value={testIds} onChange={(e) => setTestIds(e.target.value)} placeholder="예: 1, 42" />
              <Button variant="outline" className="mb-px" disabled={!ready || !testIds.trim() || !!idsError || sendTest.isPending}
                onClick={() => sendTest.mutate()}>
                {sendTest.isPending ? '보내는 중…' : '테스트 보내기'}
              </Button>
            </div>
            <ErrorText error={idsError ?? (sendTest.isError ? errorMessage(sendTest.error) : null)} />
          </div>
        </div>

        <div>
          <p className="eyebrow">미리보기</p>
          <NotificationPreview title={finalTitle(kind, title)} body={finalBody(kind, body)} />
          <div className="mt-4 rounded-lg bg-[var(--color-surface-alt)] px-3 py-2.5">
            <p className="eyebrow">대상</p>
            <p className="numeral mt-1 text-[18px]">
              {audience.data ? `${formatNumber(audience.data.eligibleUsers)}명` : '—'}
            </p>
            <p className="font-mono text-[10.5px] text-[var(--color-faint)]">
              {audience.data ? `푸시 받을 기기 있는 회원 ${formatNumber(audience.data.withPushDevice)}명 · 나머지는 앱 알림 목록에만` : ''}
            </p>
          </div>
          {!pushEnabled ? (
            <p className="mt-3 font-mono text-[11px] font-bold text-[var(--color-danger)]">푸시 킬스위치가 꺼져 있어 보낼 수 없습니다.</p>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
