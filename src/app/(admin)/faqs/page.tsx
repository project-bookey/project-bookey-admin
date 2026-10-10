'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { errorMessage } from '@/lib/api';
import { faqsApi } from '@/lib/endpoints';
import { formatDateTime } from '@/lib/format';
import { INQUIRY_CATEGORIES, INQUIRY_CATEGORY_LABEL } from '@/lib/labels';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/lib/toast';
import type { FaqAdminView, FaqUpsertRequest, InquiryCategory } from '@/lib/types';
import { param, useListParams } from '@/lib/useListParams';
import { useCan } from '@/lib/useMe';
import { useConfirm } from '@/components/Confirm';
import { Modal } from '@/components/Modal';
import { QueryState } from '@/components/QueryState';
import { PageHeader } from '@/components/Shell';
import {
  Button, Card, Checkbox, ErrorText, Input, Select, Table, Tag, Textarea,
} from '@/components/ui';

const QUESTION_MAX = 200;
const ANSWER_MAX = 5000;

const FILTERS = { category: param.oneOf(INQUIRY_CATEGORIES) };

/** FAQ — 앱 고객센터에 노출할 자주 묻는 질문. 순서는 이 화면의 화살표로 정한다. */
export default function FaqsPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const canEdit = useCan('HANDLE_SUPPORT');
  const { params, setFilter } = useListParams(FILTERS);
  const { category } = params;
  const [editing, setEditing] = useState<FaqAdminView | null>(null);
  const [creating, setCreating] = useState(false);

  const faqs = useQuery({ queryKey: qk.faqs, queryFn: faqsApi.list });

  // 숨긴 항목까지 포함한 전체 순서. 순서 변경은 언제나 이 목록 전체를 보낸다.
  const all = [...(faqs.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const shown = category ? all.filter((faq) => faq.category === category) : all;
  const visibleCount = all.filter((faq) => faq.visible).length;

  // 실패하면 공용 토스트가 알리고, 다른 관리자가 목록을 바꿨을 수 있어 최신 목록으로 다시 맞춘다.
  const onError = () => {
    queryClient.invalidateQueries({ queryKey: qk.faqs });
  };

  const reorder = useMutation({
    mutationFn: faqsApi.reorder,
    onSuccess: (list) => {
      queryClient.setQueryData(qk.faqs, list);
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
      queryClient.invalidateQueries({ queryKey: qk.faqs });
    },
    onError,
  });

  const remove = async (faq: FaqAdminView) => {
    await confirm({
      title: 'FAQ를 삭제할까요?',
      body: `"${faq.question}" — 앱 고객센터에서 바로 사라집니다. 잠시 내리려면 삭제 대신 '숨기기' 를 쓰세요.`,
      confirmLabel: '삭제',
      tone: 'danger',
      action: async () => {
        await faqsApi.remove(faq.id);
        toast.success('삭제했습니다.');
        queryClient.invalidateQueries({ queryKey: qk.faqs });
      },
    });
  };

  const busy = reorder.isPending || toggle.isPending;

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
    reorder.mutate(ids);
  };

  return (
    <>
      <PageHeader
        title="FAQ"
        description="앱에는 노출 중인 항목만 이 순서대로 보입니다."
        action={
          <div className="flex items-center gap-2">
            <div className="w-36">
              <Select
                aria-label="유형"
                value={category}
                onChange={(e) => setFilter({ category: e.target.value as InquiryCategory | '' })}
              >
                <option value="">전체 유형</option>
                {INQUIRY_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {INQUIRY_CATEGORY_LABEL[value]}
                  </option>
                ))}
              </Select>
            </div>
            {canEdit ? <Button onClick={() => setCreating(true)}>새 FAQ</Button> : null}
          </div>
        }
      />

      <div className="px-7 py-6">
        <p className="mb-3 font-mono text-[11.5px] text-[var(--color-muted)]">
          {faqs.data
            ? `전체 ${all.length}개 · 노출 ${visibleCount}개${category ? ` · ${INQUIRY_CATEGORY_LABEL[category]} ${shown.length}개` : ''}`
            : '\u00a0'}
        </p>

        <Card>
          <QueryState
            query={faqs}
            isEmpty={() => shown.length === 0}
            empty={category ? '이 유형의 FAQ가 없습니다.' : '등록된 FAQ가 없습니다. 오른쪽 위 ‘새 FAQ’로 추가하세요.'}
          >
            {() => (
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
                        disabled={!canEdit || busy || index === 0}
                        onClick={() => move(faq, -1)}
                      >
                        ↑
                      </ArrowButton>
                      <ArrowButton
                        label="아래로"
                        disabled={!canEdit || busy || index === shown.length - 1}
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
                    {canEdit ? (
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
                        <Button variant="danger" disabled={busy} onClick={() => remove(faq)}>
                          삭제
                        </Button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </Table>
            )}
          </QueryState>
        </Card>
      </div>

      {creating ? (
        <FaqDialog defaultCategory={category || 'USAGE'} onClose={() => setCreating(false)} />
      ) : null}
      {editing ? <FaqDialog faq={editing} onClose={() => setEditing(null)} /> : null}
    </>
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
  const save = useMutation({
    meta: { inlineError: true },
    mutationFn: () => {
      const body = { ...draft, question: draft.question.trim(), answer: draft.answer.trim() };
      return faq ? faqsApi.update(faq.id, body) : faqsApi.create(body);
    },
    onSuccess: () => {
      toast.success('저장했습니다.');
      queryClient.invalidateQueries({ queryKey: qk.faqs });
      onClose();
    },
  });

  const invalid = !draft.question.trim() || !draft.answer.trim();

  return (
    <Modal
      size="lg"
      eyebrow={faq ? 'FAQ 수정' : 'FAQ 추가'}
      title={faq ? faq.question : '새 FAQ'}
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
        {!faq ? (
          <p className="-mt-2 mb-4 font-mono text-[11px] text-[var(--color-faint)]">
            새 항목은 목록 맨 아래에 붙습니다.
          </p>
        ) : null}

        <div className="flex flex-col gap-3">
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
            <Checkbox
              label="앱에 노출"
              checked={draft.visible}
              onChange={(visible) => setDraft({ ...draft, visible })}
            />
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

        <ErrorText error={save.isError ? errorMessage(save.error, '저장하지 못했습니다.') : null} />
    </Modal>
  );
}
