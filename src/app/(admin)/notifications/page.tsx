'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { opsApi } from '@/lib/endpoints';
import { formatDateTime, formatPercent } from '@/lib/format';
import { OPS_FLAG_META } from '@/lib/labels';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/lib/toast';
import type { OpsFlagRow } from '@/lib/types';
import { useCan } from '@/lib/useMe';
import { useConfirm } from '@/components/Confirm';
import { QueryState } from '@/components/QueryState';
import { PageHeader } from '@/components/Shell';
import { Button, Card, Eyebrow, StatCard, Tag } from '@/components/ui';

/** 알림 운영 — 발송 통계와 긴급 킬스위치 (§F13). */
export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const canManageOps = useCan('MANAGE_OPS');
  const stats = useQuery({ queryKey: qk.ops.stats, queryFn: opsApi.notificationStats });
  const flags = useQuery({ queryKey: qk.ops.flags, queryFn: opsApi.flags });

  const toggle = async (flag: OpsFlagRow) => {
    const meta = OPS_FLAG_META[flag.key];
    const turningOff = flag.enabled;
    await confirm({
      title: `${meta?.title ?? flag.key}을(를) ${turningOff ? '중단' : '재개'}할까요?`,
      body: meta?.description,
      confirmLabel: turningOff ? '중단' : '재개',
      tone: turningOff ? 'danger' : 'primary',
      reason: { label: '사유 (필수)', placeholder: turningOff ? '예: 오발송 확인, 원인 파악 중' : '예: 원인 수정 배포 완료' },
      // 전체 푸시를 멈추는 건 되돌려도 흔적이 남는다 — 실수로 누르지 않게 한 번 더 확인한다.
      typeToConfirm: flag.key === 'PUSH_ENABLED' && turningOff ? '중단' : undefined,
      action: async ({ reason }) => {
        await opsApi.updateFlag(flag.key, !flag.enabled, reason);
        toast.success(`${meta?.title ?? flag.key}을(를) ${turningOff ? '중단' : '재개'}했습니다.`);
        queryClient.invalidateQueries({ queryKey: qk.ops.all });
        queryClient.invalidateQueries({ queryKey: qk.dashboard });
      },
    });
  };

  const conversion = stats.data?.conversionRate;

  return (
    <>
      <PageHeader title="알림 운영" description="발송 성과를 보고, 필요하면 즉시 멈춥니다." />

      <div className="px-7 py-6">
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="7일 발송" value={stats.data?.sent7d} />
          <StatCard label="7일 전환" value={stats.data?.converted7d} />
          <StatCard
            label="전환율"
            value={conversion === undefined ? undefined : formatPercent(conversion)}
            target="목표 18%"
            warn={conversion !== undefined && conversion < 0.18}
          />
        </div>

        <section className="mt-8">
          <Eyebrow>운영 스위치</Eyebrow>
          <Card className="mt-3">
            <QueryState query={flags} isEmpty={(data) => data.length === 0} empty="운영 스위치가 없습니다.">
              {(data) => (
                <ul className="divide-y divide-[var(--color-line)]">
                  {data.map((flag) => {
                    const meta = OPS_FLAG_META[flag.key] ?? { title: flag.key, description: '' };
                    return (
                      <li key={flag.key} className="flex items-center gap-5 px-5 py-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-[14px] font-bold">{meta.title}</p>
                            {flag.enabled ? <Tag tone="accent">켜짐</Tag> : <Tag tone="danger">꺼짐</Tag>}
                          </div>
                          <p className="mt-1 text-[13px] text-[var(--color-muted)]">{meta.description}</p>
                          <p className="mt-1 font-mono text-[10.5px] text-[var(--color-faint)]">
                            최근 변경 {formatDateTime(flag.updatedAt)}
                            {flag.note ? ` · ${flag.note}` : ''}
                          </p>
                        </div>
                        {canManageOps ? (
                          <Button variant={flag.enabled ? 'danger' : 'primary'} onClick={() => toggle(flag)}>
                            {flag.enabled ? '중단' : '재개'}
                          </Button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </QueryState>
          </Card>
          {!canManageOps ? (
            <p className="mt-2 font-mono text-[11px] text-[var(--color-faint)]">스위치는 최고 관리자만 바꿀 수 있습니다.</p>
          ) : null}
        </section>
      </div>
    </>
  );
}
