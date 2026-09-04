'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { PageHeader, Shell } from '@/components/Shell';
import { Button, Card, Empty, Input, Table, Tag, formatDateTime } from '@/components/ui';
import { adsApi } from '@/lib/endpoints';
import type { BannerAdminView, BannerKind, BannerUpsertRequest } from '@/lib/types';

type Draft = {
  title: string;
  subtitle: string;
  imageUrl: string;
  bgColor: string;
  linkUrl: string;
  sortOrder: string;
  enabled: boolean;
  startsAt: string;
  endsAt: string;
};

const TAB_LABEL: Record<BannerKind, string> = {
  AD: '광고',
  NOTICE: '공지',
};

const emptyDraft = (): Draft => {
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  return {
    title: '',
    subtitle: '',
    imageUrl: '',
    bgColor: '#F2F0EA',
    linkUrl: '',
    sortOrder: '0',
    enabled: true,
    startsAt: toInputDateTime(now.toISOString()),
    endsAt: toInputDateTime(nextMonth.toISOString()),
  };
};

export default function AdsPage() {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<BannerKind>('AD');
  const [editing, setEditing] = useState<BannerAdminView | null>(null);
  const [creating, setCreating] = useState(false);

  const banners = useQuery({
    queryKey: ['ads', 'banners', kind],
    queryFn: () => adsApi.list(kind),
  });

  const remove = useMutation({
    mutationFn: adsApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ads'] }),
  });

  const activeCount = (banners.data ?? []).filter((banner) => isActiveNow(banner)).length;

  return (
    <Shell>
      <PageHeader
        title="광고센터"
        description="광고와 공지 소재를 분리해서 운영합니다."
        action={<Button onClick={() => setCreating(true)}>새 {TAB_LABEL[kind]}</Button>}
      />

      <div className="px-7 py-6">
        <div className="mb-5 inline-flex rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-1">
          {(['AD', 'NOTICE'] as BannerKind[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setKind(tab);
                setCreating(false);
                setEditing(null);
              }}
              className={`rounded-md px-4 py-2 font-mono text-[12.5px] font-bold transition ${
                kind === tab
                  ? 'bg-[var(--color-ink)] text-white'
                  : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-alt)]'
              }`}
            >
              {TAB_LABEL[tab]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Card className="px-5 py-4">
            <p className="eyebrow">등록 {TAB_LABEL[kind]}</p>
            <p className="numeral mt-2 text-[26px]">{banners.data?.length ?? 0}</p>
          </Card>
          <Card className="px-5 py-4">
            <p className="eyebrow">현재 노출</p>
            <p className="numeral mt-2 text-[26px]">{activeCount}</p>
          </Card>
          <Card className="px-5 py-4">
            <p className="eyebrow">관리 범위</p>
            <p className="mt-2 text-[14px] font-bold">{TAB_LABEL[kind]} 소재</p>
            <p className="mt-1 font-mono text-[10.5px] text-[var(--color-faint)]">
              {kind === 'AD' ? '홈/팝업 광고 슬롯에 사용' : '서비스 공지 슬롯에 사용'}
            </p>
          </Card>
        </div>

        <Card className="mt-6">
          {(banners.data?.length ?? 0) === 0 ? (
            <Empty>등록된 {TAB_LABEL[kind]}가 없습니다.</Empty>
          ) : (
            <Table head={['상태', '소재', '노출 기간', '정렬', '링크', '']}>
              {banners.data!.map((banner) => (
                <tr key={banner.id} className="border-b border-[var(--color-line)] last:border-0">
                  <td className="px-4 py-3">
                    {isActiveNow(banner) ? (
                      <Tag tone="accent">노출 중</Tag>
                    ) : banner.enabled ? (
                      <Tag tone="warn">대기/종료</Tag>
                    ) : (
                      <Tag tone="danger">꺼짐</Tag>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-12 w-20 shrink-0 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-alt)]"
                        style={{
                          backgroundColor: banner.bgColor || undefined,
                          backgroundImage: banner.imageUrl ? `url(${banner.imageUrl})` : undefined,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-bold">{banner.title}</p>
                        <p className="mt-0.5 line-clamp-1 text-[12.5px] text-[var(--color-muted)]">
                          {banner.subtitle || '부제 없음'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-[var(--color-muted)]">
                    {formatDateTime(banner.startsAt)}
                    <br />
                    {formatDateTime(banner.endsAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="numeral text-[12px]">{banner.sortOrder}</span>
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-3 font-mono text-[11px] text-[var(--color-faint)]">
                    {banner.linkUrl || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setEditing(banner)}>
                        수정
                      </Button>
                      <Button
                        variant="danger"
                        disabled={remove.isPending}
                        onClick={() => {
                          if (window.confirm(`"${banner.title}" ${TAB_LABEL[kind]}를 삭제할까요?`)) {
                            remove.mutate(banner.id);
                          }
                        }}
                      >
                        삭제
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>

      {creating ? <AdDialog kind={kind} onClose={() => setCreating(false)} /> : null}
      {editing ? <AdDialog banner={editing} onClose={() => setEditing(null)} /> : null}
    </Shell>
  );
}

function AdDialog({ kind, banner, onClose }: { kind?: BannerKind; banner?: BannerAdminView; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(() => (banner ? fromBanner(banner) : emptyDraft()));
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const body = toRequest(draft);
      const request = { ...body, kind: banner?.kind ?? kind ?? 'AD' };
      return banner ? adsApi.update(banner.id, request) : adsApi.create(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads'] });
      onClose();
    },
    onError: (e) => setError(e instanceof Error ? e.message : '저장하지 못했습니다.'),
  });

  const invalid = !draft.title.trim() || !draft.startsAt || !draft.endsAt || new Date(draft.startsAt) >= new Date(draft.endsAt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-6">
      <Card className="max-h-[92vh] w-full max-w-3xl overflow-y-auto p-6">
        <p className="eyebrow">{banner ? `${TAB_LABEL[banner.kind]} 수정` : `${TAB_LABEL[kind ?? 'AD']} 생성`}</p>
        <h2 className="mt-1 font-serif text-[20px] font-bold">
          {banner ? banner.title : `새 ${TAB_LABEL[kind ?? 'AD']}`}
        </h2>

        <div className="mt-5 grid grid-cols-[1fr_220px] gap-5">
          <div className="flex flex-col gap-3">
            <Input
              label="제목"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="예: 9월 독서 챌린지"
            />
            <Input
              label="부제"
              value={draft.subtitle}
              onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
              placeholder="앱에 표시할 짧은 설명"
            />
            <Input
              label="이미지 URL"
              value={draft.imageUrl}
              onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}
              placeholder="https://..."
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="배경색"
                value={draft.bgColor}
                onChange={(e) => setDraft({ ...draft, bgColor: e.target.value })}
                placeholder="#F2F0EA"
              />
              <Input
                label="정렬"
                inputMode="numeric"
                value={draft.sortOrder}
                onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value.replace(/[^\d-]/g, '') })}
              />
            </div>
            <Input
              label="링크 URL"
              value={draft.linkUrl}
              onChange={(e) => setDraft({ ...draft, linkUrl: e.target.value })}
              placeholder="bookey:// 또는 https://"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="노출 시작"
                type="datetime-local"
                value={draft.startsAt}
                onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })}
              />
              <Input
                label="노출 종료"
                type="datetime-local"
                value={draft.endsAt}
                onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 rounded-lg border border-[var(--color-line)] px-3 py-2">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
              />
              <span className="text-[13px] font-bold">활성화</span>
            </label>
          </div>

          <div>
            <p className="eyebrow mb-2">미리보기</p>
            <div
              className="aspect-[4/5] rounded-lg border border-[var(--color-line)] p-4"
              style={{
                backgroundColor: draft.bgColor || undefined,
                backgroundImage: draft.imageUrl ? `url(${draft.imageUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="flex h-full flex-col justify-end">
                <p className="text-[18px] font-bold leading-tight">{draft.title || '광고 제목'}</p>
                <p className="mt-1 text-[13px] leading-snug text-[var(--color-muted)]">
                  {draft.subtitle || '광고 부제'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <p className="mt-3 font-mono text-[11.5px] text-[var(--color-danger)]">{error}</p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button disabled={invalid || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? '저장 중…' : '저장'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function fromBanner(banner: BannerAdminView): Draft {
  return {
    title: banner.title,
    subtitle: banner.subtitle ?? '',
    imageUrl: banner.imageUrl ?? '',
    bgColor: banner.bgColor ?? '',
    linkUrl: banner.linkUrl ?? '',
    sortOrder: String(banner.sortOrder),
    enabled: banner.enabled,
    startsAt: toInputDateTime(banner.startsAt),
    endsAt: toInputDateTime(banner.endsAt),
  };
}

function toRequest(draft: Draft): BannerUpsertRequest {
  return {
    kind: 'AD',
    title: draft.title.trim(),
    subtitle: draft.subtitle.trim() || undefined,
    imageUrl: draft.imageUrl.trim() || undefined,
    bgColor: draft.bgColor.trim() || undefined,
    linkUrl: draft.linkUrl.trim() || undefined,
    sortOrder: Number(draft.sortOrder || 0),
    enabled: draft.enabled,
    startsAt: new Date(draft.startsAt).toISOString(),
    endsAt: new Date(draft.endsAt).toISOString(),
  };
}

function toInputDateTime(iso: string): string {
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function isActiveNow(banner: BannerAdminView): boolean {
  const now = Date.now();
  return banner.enabled && new Date(banner.startsAt).getTime() <= now && now < new Date(banner.endsAt).getTime();
}
