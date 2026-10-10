'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { useConfirm } from '@/components/Confirm';
import { ImageUpload } from '@/components/ImageUpload';
import { Modal } from '@/components/Modal';
import { QueryState } from '@/components/QueryState';
import { PageHeader } from '@/components/Shell';
import { Button, Card, Checkbox, ErrorText, ImageThumb, Input, StatCard, Table, Tabs, Tag } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { adsApi } from '@/lib/endpoints';
import { formatDateTime } from '@/lib/format';
import { BANNER_KINDS, BANNER_KIND_LABEL } from '@/lib/labels';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/lib/toast';
import type { BannerAdminView, BannerKind, BannerUpsertRequest } from '@/lib/types';
import { param, useListParams } from '@/lib/useListParams';
import { useCan } from '@/lib/useMe';

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

const TAB_LABEL = BANNER_KIND_LABEL;

const FILTERS = { kind: param.oneOf(BANNER_KINDS, 'AD') };

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
  const confirm = useConfirm();
  const canManage = useCan('MANAGE_CONTENT');
  const { params, setFilter } = useListParams(FILTERS);
  const kind: BannerKind = params.kind || 'AD';
  const [editing, setEditing] = useState<BannerAdminView | null>(null);
  const [creating, setCreating] = useState(false);
  const [copying, setCopying] = useState<BannerAdminView | null>(null);

  const banners = useQuery({
    queryKey: qk.banners.list(kind),
    queryFn: () => adsApi.list(kind),
  });

  const activeCount = banners.data?.filter((banner) => bannerState(banner) === 'LIVE').length;

  const toggle = useMutation({
    mutationFn: (banner: BannerAdminView) => adsApi.update(banner.id, { ...toUpsert(banner), enabled: !banner.enabled }),
    onSuccess: (_, banner) => {
      toast.success(banner.enabled ? '껐습니다.' : '켰습니다.');
      queryClient.invalidateQueries({ queryKey: qk.banners.all });
    },
  });

  const remove = async (banner: BannerAdminView) => {
    await confirm({
      title: `${TAB_LABEL[banner.kind]}를 삭제할까요?`,
      body: `"${banner.title}" — 앱에서 바로 사라집니다. 잠시 내리려면 삭제 대신 '활성화' 를 끄세요.`,
      confirmLabel: '삭제',
      tone: 'danger',
      action: async () => {
        await adsApi.remove(banner.id);
        toast.success('삭제했습니다.');
        queryClient.invalidateQueries({ queryKey: qk.banners.all });
      },
    });
  };

  return (
    <>
      <PageHeader
        title="광고 · 공지"
        description="홈 광고 배너와 공지 팝업을 나눠서 운영합니다."
        action={canManage ? <Button onClick={() => setCreating(true)}>새 {TAB_LABEL[kind]}</Button> : null}
      />

      <div className="px-7 py-6">
        <div className="mb-5">
          <Tabs<BannerKind>
            value={kind}
            options={BANNER_KINDS.map((value) => ({ value, label: TAB_LABEL[value] }))}
            onChange={(value) => setFilter({ kind: value })}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatCard label={`등록 ${TAB_LABEL[kind]}`} value={banners.data?.length} />
          <StatCard label="현재 노출" value={activeCount} />
          <Card className="px-5 py-4">
            <p className="eyebrow">관리 범위</p>
            <p className="mt-2 text-[14px] font-bold">{TAB_LABEL[kind]} 소재</p>
            <p className="mt-1 font-mono text-[10.5px] text-[var(--color-faint)]">
              {kind === 'AD' ? '홈 광고 배너 슬롯에 사용' : '홈 공지 팝업에 사용'}
            </p>
          </Card>
        </div>

        <Card className="mt-6">
          <QueryState
            query={banners}
            isEmpty={(data) => data.length === 0}
            empty={`등록된 ${TAB_LABEL[kind]}가 없습니다.`}
          >
            {(data) => (
              <Table head={['상태', '소재', '노출 기간', '정렬', '링크', '']}>
                {data.map((banner) => (
                  <tr key={banner.id} className="border-b border-[var(--color-line)] last:border-0">
                    <td className="px-4 py-3">
                      <Tag tone={BANNER_STATE_TONE[bannerState(banner)]}>{BANNER_STATE_LABEL[bannerState(banner)]}</Tag>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ImageThumb url={banner.imageUrl} bgColor={banner.bgColor} />
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-bold">
                            <InlineBoldText text={banner.title} />
                          </p>
                          <p className="mt-0.5 line-clamp-1 text-[12.5px] text-[var(--color-muted)]">
                            <InlineBoldText text={banner.subtitle || '부제 없음'} />
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
                        <Button variant="ghost" disabled={toggle.isPending} onClick={() => toggle.mutate(banner)}>
                          {banner.enabled ? '끄기' : '켜기'}
                        </Button>
                        <Button variant="ghost" onClick={() => setCopying(banner)}>
                          복제
                        </Button>
                        <Button variant="outline" onClick={() => setEditing(banner)}>
                          수정
                        </Button>
                        <Button variant="danger" onClick={() => remove(banner)}>
                          삭제
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </QueryState>
        </Card>
      </div>

      {creating ? <AdDialog kind={kind} onClose={() => setCreating(false)} /> : null}
      {copying ? <AdDialog kind={copying.kind} copyFrom={copying} onClose={() => setCopying(null)} /> : null}
      {editing ? <AdDialog banner={editing} onClose={() => setEditing(null)} /> : null}
    </>
  );
}

function AdDialog({ kind, banner, copyFrom, onClose }: {
  kind?: BannerKind;
  banner?: BannerAdminView;
  /** 복제 — 내용을 채워 새로 만든다. 꺼진 채로 시작해 실수로 바로 노출되지 않게 한다. */
  copyFrom?: BannerAdminView;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(() =>
    banner
      ? fromBanner(banner)
      : copyFrom
        ? { ...fromBanner(copyFrom), title: `${copyFrom.title} (복사)`, enabled: false }
        : emptyDraft(),
  );
  const [imageSize, setImageSize] = useState<{ width?: number; height?: number } | null>(null);

  const save = useMutation({
    meta: { inlineError: true },
    mutationFn: () => {
      const body = toRequest(draft);
      const request = { ...body, kind: banner?.kind ?? kind ?? 'AD' };
      return banner ? adsApi.update(banner.id, request) : adsApi.create(request);
    },
    onSuccess: () => {
      toast.success('저장했습니다.');
      queryClient.invalidateQueries({ queryKey: qk.banners.all });
      onClose();
    },
  });

  const invalid = !draft.title.trim() || !draft.startsAt || !draft.endsAt || new Date(draft.startsAt) >= new Date(draft.endsAt);
  // 공지는 앱 홈 팝업의 4:5 사진 칸에 뜨고, 사진이 있으면 사진만 보인다(제목·부제는 사진이 없을 때만).
  const isNotice = (banner?.kind ?? kind) === 'NOTICE';
  const photoOnly = isNotice && !!draft.imageUrl.trim();

  return (
    <Modal
      size="xl"
      eyebrow={banner ? `${TAB_LABEL[banner.kind]} 수정` : copyFrom ? `${TAB_LABEL[copyFrom.kind]} 복제` : `${TAB_LABEL[kind ?? 'AD']} 생성`}
      title={<InlineBoldText text={banner ? banner.title : `새 ${TAB_LABEL[kind ?? 'AD']}`} />}
      busy={save.isPending}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" disabled={save.isPending} onClick={onClose}>
            취소
          </Button>
          <Button disabled={invalid || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? '저장 중…' : '저장'}
          </Button>
        </>
      }
    >
        <div className="grid grid-cols-[1fr_220px] gap-5">
          <div className="flex flex-col gap-3">
            <BoldTextInput
              label="제목"
              value={draft.title}
              onChange={(title) => setDraft({ ...draft, title })}
              placeholder="예: 9월 독서 챌린지"
            />
            <BoldTextInput
              label="부제"
              value={draft.subtitle}
              onChange={(subtitle) => setDraft({ ...draft, subtitle })}
              placeholder="앱에 표시할 짧은 설명"
            />
            <div className="grid grid-cols-[1fr_auto] items-start gap-2">
              <Input
                label="이미지 URL"
                value={draft.imageUrl}
                onChange={(e) => {
                  setDraft({ ...draft, imageUrl: e.target.value });
                  setImageSize(null);
                }}
                placeholder="https://... 또는 오른쪽에서 올리기"
                hint={
                  isNotice
                    ? '홈 팝업에 4:5 비율로 꽉 채워 보입니다(권장 1080×1350). 비율이 다르면 가운데를 기준으로 잘립니다. 사진이 있으면 제목·부제는 보이지 않으니 필요한 글자는 사진 안에 넣어 주세요.'
                    : undefined
                }
              />
              <div className="pt-[22px]">
                <ImageUpload
                  upload={adsApi.uploadImage}
                  onUploaded={(image) => {
                    setDraft((current) => ({ ...current, imageUrl: image.url }));
                    setImageSize({ width: image.width, height: image.height });
                  }}
                />
              </div>
            </div>
            {imageSize?.width && imageSize.height ? (
              <p className="-mt-1 font-mono text-[11px] text-[var(--color-muted)]">
                올린 이미지 {imageSize.width}×{imageSize.height}
                {isNotice && Math.abs(imageSize.width / imageSize.height - 0.8) > 0.05
                  ? ' — 4:5 가 아니라 팝업에서 잘립니다.'
                  : ''}
              </p>
            ) : null}
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
            <Checkbox
              label="활성화"
              checked={draft.enabled}
              onChange={(enabled) => setDraft({ ...draft, enabled })}
            />
          </div>

          <div>
            <p className="eyebrow mb-2">{isNotice ? '미리보기 · 4:5' : '미리보기'}</p>
            <div
              className="aspect-[4/5] rounded-lg border border-[var(--color-line)] p-4"
              style={{
                backgroundColor: draft.bgColor || undefined,
                backgroundImage: draft.imageUrl ? `url(${JSON.stringify(draft.imageUrl)})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className={`flex h-full flex-col justify-end ${photoOnly ? 'invisible' : ''}`}>
                <p className="text-[18px] font-bold leading-tight">
                  <InlineBoldText text={draft.title || '광고 제목'} />
                </p>
                <p className="mt-1 text-[13px] leading-snug text-[var(--color-muted)]">
                  <InlineBoldText text={draft.subtitle || '광고 부제'} />
                </p>
              </div>
            </div>
          </div>
        </div>

        <ErrorText error={save.isError ? errorMessage(save.error, '저장하지 못했습니다.') : null} />
    </Modal>
  );
}

function BoldTextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  const applyBold = () => {
    const input = ref.current;
    const start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const wrapped = `**${selected || '굵게'}**`;
    const next = `${value.slice(0, start)}${wrapped}${value.slice(end)}`;
    onChange(next);

    requestAnimationFrame(() => {
      input?.focus();
      const cursorStart = start + 2;
      const cursorEnd = cursorStart + (selected || '굵게').length;
      input?.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  return (
    <label className="block">
      <span className="eyebrow mb-1.5 block">{label}</span>
      <div className="flex overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] focus-within:border-[var(--color-ink)]">
        <input
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[14px] outline-none"
        />
        <button
          type="button"
          onClick={applyBold}
          title="선택한 글자를 굵게"
          className="border-l border-[var(--color-line)] px-3 py-2 font-serif text-[14px] font-bold text-[var(--color-ink)] hover:bg-[var(--color-surface-alt)]"
        >
          B
        </button>
      </div>
      <span className="mt-1 block font-mono text-[11px] text-[var(--color-faint)]">
        굵게 보일 문구를 선택하고 B를 누르세요.
      </span>
    </label>
  );
}

function InlineBoldText({ text }: { text: string }) {
  return parseBoldSegments(text).map((segment, index) => (
    <span key={`${segment.text}-${index}`} className={segment.bold ? 'font-bold text-[var(--color-ink)]' : undefined}>
      {segment.text}
    </span>
  ));
}

function parseBoldSegments(text: string): { text: string; bold: boolean }[] {
  const segments: { text: string; bold: boolean }[] = [];
  const pattern = /\*\*([^*]+)\*\*/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) segments.push({ text: text.slice(cursor, match.index), bold: false });
    segments.push({ text: match[1], bold: true });
    cursor = pattern.lastIndex;
  }

  if (cursor < text.length) segments.push({ text: text.slice(cursor), bold: false });
  return segments.length > 0 ? segments : [{ text, bold: false }];
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

type BannerState = 'LIVE' | 'SCHEDULED' | 'ENDED' | 'OFF';

const BANNER_STATE_LABEL: Record<BannerState, string> = {
  LIVE: '노출 중',
  SCHEDULED: '예약',
  ENDED: '종료',
  OFF: '꺼짐',
};

const BANNER_STATE_TONE: Record<BannerState, 'accent' | 'warn' | 'neutral' | 'danger'> = {
  LIVE: 'accent',
  SCHEDULED: 'warn',
  ENDED: 'neutral',
  OFF: 'danger',
};

function bannerState(banner: BannerAdminView): BannerState {
  if (!banner.enabled) return 'OFF';
  const now = Date.now();
  if (now < new Date(banner.startsAt).getTime()) return 'SCHEDULED';
  if (now >= new Date(banner.endsAt).getTime()) return 'ENDED';
  return 'LIVE';
}

function toUpsert(banner: BannerAdminView): BannerUpsertRequest {
  return {
    kind: banner.kind,
    title: banner.title,
    subtitle: banner.subtitle,
    imageUrl: banner.imageUrl,
    bgColor: banner.bgColor,
    linkUrl: banner.linkUrl,
    sortOrder: banner.sortOrder,
    enabled: banner.enabled,
    startsAt: banner.startsAt,
    endsAt: banner.endsAt,
  };
}
