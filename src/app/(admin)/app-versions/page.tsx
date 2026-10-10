'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { errorMessage } from '@/lib/api';
import { appConfigApi } from '@/lib/endpoints';
import { formatDateTime } from '@/lib/format';
import { MAINTENANCE_STATUS_LABEL, MAINTENANCE_STATUS_TONE } from '@/lib/labels';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/lib/toast';
import type { AppReleaseConfig, MaintenanceWindow } from '@/lib/types';
import { useCan } from '@/lib/useMe';
import { useConfirm } from '@/components/Confirm';
import { Modal } from '@/components/Modal';
import { QueryState } from '@/components/QueryState';
import { PageHeader } from '@/components/Shell';
import { Button, Card, ErrorText, Eyebrow, Input, Pager, Table, Tag, Textarea } from '@/components/ui';

const PLATFORM_LABEL: Record<AppReleaseConfig['platform'], string> = { IOS: 'iOS', ANDROID: 'Android' };
const VERSION = /^\d{1,4}(\.\d{1,4}){0,2}$/;

/** 1.2.3 비교 — 서버(AppVersion)와 같은 규칙. 빠진 자리는 0. */
function compareVersion(a: string, b: string): number {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** 앱 버전 안내와 점검 예고 — 바꾸는 것은 최고 관리자만. */
export default function AppVersionsPage() {
  const canEdit = useCan('MANAGE_OPS');
  const [editing, setEditing] = useState<AppReleaseConfig | null>(null);
  const releases = useQuery({ queryKey: qk.appConfig.releases, queryFn: appConfigApi.releases });

  return (
    <>
      <PageHeader title="앱 버전 · 점검" description="강제·권장 업데이트 기준과 점검 예고를 관리합니다." />

      <div className="px-7 py-6">
        <p className="mb-5 rounded-lg border-l-4 border-[var(--color-warn)] bg-[var(--color-warn-soft)] px-4 py-3 text-[13px] text-[var(--color-ink)]">
          지금 배포된 앱은 아직 이 설정을 읽지 않습니다. 앱이 시작할 때 <code className="font-mono text-[12px]">/api/v1/public/app-config</code> 를
          확인하도록 업데이트한 뒤부터 강제 업데이트·점검 화면이 동작합니다.
        </p>

        <Eyebrow>앱 버전</Eyebrow>
        <QueryState query={releases} isEmpty={(data) => data.length === 0}>
          {(data) => (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {data.map((release) => (
                <Card key={release.platform} className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <p className="font-serif text-[18px] font-bold">{PLATFORM_LABEL[release.platform]}</p>
                    {canEdit ? (
                      <Button variant="outline" onClick={() => setEditing(release)}>
                        수정
                      </Button>
                    ) : null}
                  </div>
                  <dl className="mt-3 grid grid-cols-[110px_1fr] gap-y-1.5 text-[13px]">
                    <dt className="text-[var(--color-muted)]">최소 지원</dt>
                    <dd className="numeral">{release.minSupportedVersion}</dd>
                    <dt className="text-[var(--color-muted)]">최신</dt>
                    <dd className="numeral">{release.latestVersion}</dd>
                    <dt className="text-[var(--color-muted)]">스토어</dt>
                    <dd className="truncate font-mono text-[11.5px]">{release.storeUrl ?? '—'}</dd>
                    <dt className="text-[var(--color-muted)]">안내 문구</dt>
                    <dd>{release.updateMessage ?? '—'}</dd>
                  </dl>
                  <p className="mt-3 font-mono text-[11px] text-[var(--color-faint)]">
                    {release.updatedByName ?? '—'} · {formatDateTime(release.updatedAt)}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </QueryState>
        <p className="mt-2 font-mono text-[11px] text-[var(--color-faint)]">
          최소 지원보다 낮은 앱은 업데이트 전까지 넘어가지 못하고, 최신보다만 낮으면 업데이트를 권합니다.
        </p>

        <MaintenanceSection canEdit={canEdit} />
      </div>

      {editing ? <ReleaseDialog release={editing} onClose={() => setEditing(null)} /> : null}
    </>
  );
}

function ReleaseDialog({ release, onClose }: { release: AppReleaseConfig; onClose: () => void }) {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [min, setMin] = useState(release.minSupportedVersion);
  const [latest, setLatest] = useState(release.latestVersion);
  const [storeUrl, setStoreUrl] = useState(release.storeUrl ?? '');
  const [message, setMessage] = useState(release.updateMessage ?? '');
  const [reason, setReason] = useState('');

  const formatError =
    !VERSION.test(min) || !VERSION.test(latest)
      ? '버전은 1.2.3 처럼 숫자와 점으로 적어 주세요.'
      : compareVersion(min, latest) > 0
        ? '최소 지원 버전이 최신 버전보다 높을 수 없습니다.'
        : storeUrl.trim() && !storeUrl.trim().startsWith('https://')
          ? '스토어 주소는 https:// 로 시작해야 합니다.'
          : null;

  const save = useMutation({
    meta: { inlineError: true },
    mutationFn: () =>
      appConfigApi.updateRelease(release.platform, {
        minSupportedVersion: min.trim(),
        latestVersion: latest.trim(),
        storeUrl: storeUrl.trim() || undefined,
        updateMessage: message.trim() || undefined,
        reason: reason.trim(),
      }),
    onSuccess: () => {
      toast.success('앱 버전 안내를 바꿨습니다.');
      queryClient.invalidateQueries({ queryKey: qk.appConfig.all });
      onClose();
    },
  });

  const submit = async () => {
    // 최소 지원 버전을 올리면 그보다 낮은 앱이 모두 막힌다 — 한 번 더 확인한다.
    if (compareVersion(min, release.minSupportedVersion) > 0) {
      const ok = await confirm({
        title: `${PLATFORM_LABEL[release.platform]} 최소 지원 버전을 ${min} 로 올릴까요?`,
        body: `${min} 보다 낮은 앱은 스토어에서 업데이트하기 전까지 쓸 수 없습니다.`,
        confirmLabel: '올리기',
        tone: 'danger',
        typeToConfirm: '강제 업데이트',
      });
      if (!ok) return;
    }
    save.mutate();
  };

  return (
    <Modal
      eyebrow="앱 버전 안내"
      title={PLATFORM_LABEL[release.platform]}
      busy={save.isPending}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" disabled={save.isPending} onClick={onClose}>
            취소
          </Button>
          <Button disabled={!!formatError || !reason.trim() || save.isPending} onClick={submit}>
            {save.isPending ? '저장 중…' : '저장'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="최소 지원 버전" value={min} onChange={(e) => setMin(e.target.value)} hint="이보다 낮으면 강제 업데이트" />
          <Input label="최신 버전" value={latest} onChange={(e) => setLatest(e.target.value)} hint="이보다 낮으면 업데이트 권유" />
        </div>
        <Input label="스토어 주소" value={storeUrl} onChange={(e) => setStoreUrl(e.target.value)} placeholder="https://apps.apple.com/..." />
        <Textarea label="안내 문구" rows={2} maxLength={300} value={message} onChange={(e) => setMessage(e.target.value)}
          placeholder="예: 더 안정적인 새 버전이 나왔어요." />
        <Input label="사유 (필수)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예: 1.3.0 결제 오류 수정 배포" />
      </div>
      <ErrorText error={formatError ?? (save.isError ? errorMessage(save.error) : null)} />
    </Modal>
  );
}

function MaintenanceSection({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<MaintenanceWindow | 'new' | null>(null);
  const windows = useQuery({
    queryKey: qk.appConfig.maintenance(page),
    queryFn: () => appConfigApi.maintenance(page),
    placeholderData: keepPreviousData,
  });

  const cancel = async (item: MaintenanceWindow) => {
    await confirm({
      title: '점검을 취소할까요?',
      body: `"${item.title}" — 앱 안내에서 바로 빠집니다.`,
      confirmLabel: '취소하기',
      tone: 'danger',
      reason: { label: '사유 (필수)', placeholder: '예: 일정 연기' },
      action: async ({ reason }) => {
        await appConfigApi.cancelMaintenance(item.id, reason);
        toast.success('점검을 취소했습니다.');
        queryClient.invalidateQueries({ queryKey: qk.appConfig.all });
      },
    });
  };

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-end justify-between">
        <Eyebrow>점검 예고</Eyebrow>
        {canEdit ? <Button onClick={() => setEditing('new')}>점검 예고</Button> : null}
      </div>
      <Card>
        <QueryState query={windows} isEmpty={(data) => data.content.length === 0} empty="예고한 점검이 없습니다.">
          {(data) => (
            <Table head={['상태', '제목', '기간', '안내', '']}>
              {data.content.map((item) => {
                const open = item.status === 'SCHEDULED' || item.status === 'ACTIVE';
                return (
                  <tr key={item.id} className="border-b border-[var(--color-line)] last:border-0">
                    <td className="px-4 py-3">
                      <Tag tone={MAINTENANCE_STATUS_TONE[item.status] ?? 'neutral'}>
                        {MAINTENANCE_STATUS_LABEL[item.status] ?? item.status}
                      </Tag>
                    </td>
                    <td className="px-4 py-3 text-[13.5px] font-bold">{item.title}</td>
                    <td className="px-4 py-3 font-mono text-[11.5px] whitespace-nowrap text-[var(--color-muted)]">
                      {formatDateTime(item.startsAt)} → {formatDateTime(item.endsAt)}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-[13px] text-[var(--color-muted)]">
                      <span className="line-clamp-2">{item.message}</span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {canEdit && open ? (
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setEditing(item)}>
                            수정
                          </Button>
                          <Button variant="danger" onClick={() => cancel(item)}>
                            취소
                          </Button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </Table>
          )}
        </QueryState>
      </Card>
      <Pager page={page} totalPages={windows.data?.totalPages ?? 0} onChange={setPage} />
      {editing ? (
        <MaintenanceDialog item={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      ) : null}
    </section>
  );
}

function toLocalInput(iso: string): string {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function MaintenanceDialog({ item, onClose }: { item?: MaintenanceWindow; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(item?.title ?? '');
  const [message, setMessage] = useState(item?.message ?? '');
  const [startsAt, setStartsAt] = useState(item ? toLocalInput(item.startsAt) : '');
  const [endsAt, setEndsAt] = useState(item ? toLocalInput(item.endsAt) : '');
  const [reason, setReason] = useState('');

  const invalidPeriod = !!startsAt && !!endsAt && new Date(endsAt) <= new Date(startsAt);

  const save = useMutation({
    meta: { inlineError: true },
    mutationFn: () => {
      const body = {
        title: title.trim(),
        message: message.trim(),
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        reason: reason.trim(),
      };
      return item ? appConfigApi.updateMaintenance(item.id, body) : appConfigApi.createMaintenance(body);
    },
    onSuccess: () => {
      toast.success(item ? '점검 일정을 고쳤습니다.' : '점검을 예고했습니다.');
      queryClient.invalidateQueries({ queryKey: qk.appConfig.all });
      onClose();
    },
  });

  return (
    <Modal
      eyebrow={item ? '점검 일정 수정' : '점검 예고'}
      title={item?.title ?? '새 점검'}
      busy={save.isPending}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" disabled={save.isPending} onClick={onClose}>
            취소
          </Button>
          <Button
            disabled={!title.trim() || !message.trim() || !startsAt || !endsAt || invalidPeriod || !reason.trim() || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? '저장 중…' : '저장'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Input label="제목" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} placeholder="예: 서버 점검" />
        <Textarea label="안내 문구" rows={3} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)}
          placeholder="예: 더 나은 서비스를 위해 잠시 점검합니다. 02:00–04:00" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="시작" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          <Input label="끝" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </div>
        <Input label="사유 (필수)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예: DB 업그레이드" />
      </div>
      <ErrorText
        error={invalidPeriod ? '끝나는 시각이 시작 시각보다 뒤여야 합니다.' : save.isError ? errorMessage(save.error) : null}
      />
    </Modal>
  );
}
