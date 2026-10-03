'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { faqsApi } from '@/lib/endpoints';
import { INQUIRY_CATEGORIES, INQUIRY_CATEGORY_LABEL } from '@/lib/labels';
import type { FaqAdminView, FaqUpsertRequest, InquiryCategory } from '@/lib/types';
import { PageHeader, Shell } from '@/components/Shell';
import {
  Button, Card, Empty, Input, Select, Table, Tag, Textarea, formatDateTime,
} from '@/components/ui';

const QUESTION_MAX = 200;
const ANSWER_MAX = 5000;

/** FAQ — 앱 고객센터에 노출할 자주 묻는 질문. 순서는 이 화면의 화살표로 정한다. */
export default function FaqsPage() {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<InquiryCategory | ''>('');
  const [editing, setEditing] = useState<FaqAdminView | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const faqs = useQuery({ queryKey: ['faqs'], queryFn: faqsApi.list });

  // 숨긴 항목까지 포함한 전체 순서. 순서 변경은 언제나 이 목록 전체를 보낸다.
  const all = [...(faqs.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const shown = category ? all.filter((faq) => faq.category === category) : all;
  const visibleCount = all.filter((faq) => faq.visible).length;

  const onError = (e: Error) => {
    setError(e.message || '처리하지 못했습니다.');
    // 다른 관리자가 목록을 바꿨을 수 있다 — 최신 목록으로 다시 맞춘다.
    queryClient.invalidateQueries({ queryKey: ['faqs'] });
  };

  const reorder = useMutation({
    mutationFn: faqsApi.reorder,
    onSuccess: (list) => {
      queryClient.setQueryData(['faqs'], list);
      setError(null);
    },
    onError,
  });

  const toggle = useMutation({
    mutationFn: (faq: FaqAdminView) =>
      faqsApi.update(faq.id, {
        category: faq.category,
        question: faq.question,
        answer: faq.answer,
        visible: !faq.visible,
      }),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: faqsApi.remove,
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
    },
    onError,
  });

  const busy = reorder.isPending || toggle.isPending || remove.isPending;

  /** 전체 목록에서, 지금 필터로 보이는 가장 가까운 이웃과 자리를 바꾼다. */
  const move = (faq: FaqAdminView, direction: -1 | 1) => {
    const from = all.findIndex((item) => item.id === faq.id);
    let to = from + direction;
    while (to >= 0 && to < all.length && category && all[to].category !== category) {
      to += direction;
    }
    if (from < 0 || to < 0 || to >= all.length) return;

    const ids = all.map((item) => item.id);
    [ids[from], ids[to]] = [ids[to], ids[from]];
    setError(null);
    reorder.mutate(ids);
  };

  return (
    <Shell>
      <PageHeader
        title="FAQ"
        description="앱에는 노출 중인 항목만 이 순서대로 보입니다."
        action={
          <div className="flex items-center gap-2">
            <div className="w-36">
              <Select
                aria-label="유형"
                value={category}
                onChange={(e) => setCategory(e.target.value as InquiryCategory | '')}
              >
                <option value="">전체 유형</option>
                {INQUIRY_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {INQUIRY_CATEGORY_LABEL[value]}
                  </option>
                ))}
              </Select>
            </div>
            <Button onClick={() => setCreating(true)}>새 FAQ</Button>
          </div>
        }
      />

      <div className="px-7 py-6">
        <p className="mb-3 font-mono text-[11.5px] text-[var(--color-muted)]">
          전체 {all.length}개 · 노출 {visibleCount}개
          {category ? ` · ${INQUIRY_CATEGORY_LABEL[category]} ${shown.length}개` : ''}
        </p>

        {error ? (
          <p className="mb-3 font-mono text-[11.5px] text-[var(--color-danger)]">{error}</p>
        ) : null}

        <Card>
          {faqs.isError ? (
            <Empty>
              목록을 불러오지 못했습니다.{' '}
              <button type="button" className="underline" onClick={() => faqs.refetch()}>
                다시 시도
              </button>
            </Empty>
          ) : shown.length === 0 ? (
            <Empty>
              {faqs.isPending
                ? '불러오는 중…'
                : category
                  ? '이 유형의 FAQ가 없습니다.'
                  : '등록된 FAQ가 없습니다. 오른쪽 위 ‘새 FAQ’로 추가하세요.'}
            </Empty>
          ) : (
            <Table head={['순서', '유형', '질문', '노출', '수정일', '']}>
              {shown.map((faq, index) => (
                <tr key={faq.id} className="border-b border-[var(--color-line)] last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="numeral w-6 text-[12px] text-[var(--color-faint)]">
                        {all.findIndex((item) => item.id === faq.id) + 1}
                      </span>
                      <ArrowButton
                        label="위로"
                        disabled={busy || index === 0}
                        onClick={() => move(faq, -1)}
                      >
                        ↑
                      </ArrowButton>
                      <ArrowButton
                        label="아래로"
                        disabled={busy || index === shown.length - 1}
                        onClick={() => move(faq, 1)}
                      >
                        ↓
                      </ArrowButton>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Tag>{INQUIRY_CATEGORY_LABEL[faq.category]}</Tag>
                  </td>
                  <td className="max-w-md px-4 py-3">
                    <p className={`text-[14px] font-bold ${faq.visible ? '' : 'text-[var(--color-muted)]'}`}>
                      {faq.question}
                    </p>
                    <p className="mt-0.5 truncate text-[12.5px] text-[var(--color-muted)]">{faq.answer}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {faq.visible ? <Tag tone="accent">노출</Tag> : <Tag>숨김</Tag>}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] whitespace-nowrap text-[var(--color-faint)]">
                    {formatDateTime(faq.updatedAt ?? faq.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" disabled={busy} onClick={() => setEditing(faq)}>
                        수정
                      </Button>
                      <Button
                        variant="outline"
                        className="min-w-[72px]"
                        disabled={busy}
                        onClick={() => toggle.mutate(faq)}
                      >
                        {faq.visible ? '숨기기' : '노출'}
                      </Button>
                      <Button
                        variant="danger"
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm(`"${faq.question}" FAQ를 삭제할까요?`)) {
                            remove.mutate(faq.id);
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

      {creating ? (
        <FaqDialog defaultCategory={category || 'USAGE'} onClose={() => setCreating(false)} />
      ) : null}
      {editing ? <FaqDialog faq={editing} onClose={() => setEditing(null)} /> : null}
    </Shell>
  );
}

function ArrowButton({ label, disabled, onClick, children }: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-line)] font-mono text-[13px] font-bold transition hover:border-[var(--color-ink)] disabled:opacity-30 disabled:hover:border-[var(--color-line)]"
    >
      {children}
    </button>
  );
}

function FaqDialog({ faq, defaultCategory = 'USAGE', onClose }: {
  faq?: FaqAdminView;
  defaultCategory?: InquiryCategory;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<FaqUpsertRequest>(() =>
    faq
      ? { category: faq.category, question: faq.question, answer: faq.answer, visible: faq.visible }
      : { category: defaultCategory, question: '', answer: '', visible: true },
  );
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const body = { ...draft, question: draft.question.trim(), answer: draft.answer.trim() };
      return faq ? faqsApi.update(faq.id, body) : faqsApi.create(body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      onClose();
    },
    onError: (e) => setError(e instanceof Error ? e.message : '저장하지 못했습니다.'),
  });

  const invalid = !draft.question.trim() || !draft.answer.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-6 py-10">
      <Card className="max-h-full w-full max-w-2xl overflow-y-auto p-6">
        <p className="eyebrow">{faq ? 'FAQ 수정' : 'FAQ 추가'}</p>
        <h2 className="mt-1 font-serif text-[20px] font-bold">{faq ? faq.question : '새 FAQ'}</h2>
        {!faq ? (
          <p className="mt-1 font-mono text-[11px] text-[var(--color-faint)]">
            새 항목은 목록 맨 아래에 붙습니다.
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-3">
          <div className="grid grid-cols-[180px_1fr] items-end gap-3">
            <Select
              label="유형"
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value as InquiryCategory })}
            >
              {INQUIRY_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {INQUIRY_CATEGORY_LABEL[value]}
                </option>
              ))}
            </Select>
            <label className="flex items-center gap-2 rounded-lg border border-[var(--color-line)] px-3 py-2">
              <input
                type="checkbox"
                checked={draft.visible}
                onChange={(e) => setDraft({ ...draft, visible: e.target.checked })}
              />
              <span className="text-[13px] font-bold">앱에 노출</span>
            </label>
          </div>
          <Input
            label="질문"
            value={draft.question}
            maxLength={QUESTION_MAX}
            onChange={(e) => setDraft({ ...draft, question: e.target.value })}
            placeholder="예: 비밀번호를 잊어버렸어요"
            hint={`${draft.question.length} / ${QUESTION_MAX}`}
          />
          <Textarea
            label="답변"
            value={draft.answer}
            rows={10}
            maxLength={ANSWER_MAX}
            onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
            placeholder="질문에 대한 답변을 적어주세요."
          />
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
