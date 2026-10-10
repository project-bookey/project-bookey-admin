'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { errorMessage } from '@/lib/api';
import { editorPicksApi } from '@/lib/endpoints';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/lib/toast';
import type { BookRow, EditorPickView } from '@/lib/types';
import { BookPicker } from '@/components/BookPicker';
import { useConfirm } from '@/components/Confirm';
import { Modal } from '@/components/Modal';
import { QueryState } from '@/components/QueryState';
import { PageHeader } from '@/components/Shell';
import { Button, Card, ErrorText, ImageThumb, Input, ResultCount, Table, Textarea } from '@/components/ui';

const NOTE_MAX = 200;
const STEP = 10;

/**
 * 에디터 픽 — 앱 홈의 '추천' 줄과 도서 검색 화면의 추천 목록.
 * 비어 있으면 앱은 YES24 베스트셀러를 대신 보여 준다. 정렬값이 작을수록 앞에 온다.
 */
export default function EditorPicksPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<EditorPickView | null>(null);

  const picks = useQuery({ queryKey: qk.editorPicks, queryFn: editorPicksApi.list });
  const ordered = [...(picks.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);

  // 정렬값이 같은 항목이 섞여 있을 수 있어, 자리를 바꿀 때 바뀐 항목만 10 단위로 다시 매긴다.
  const reorder = useMutation({
    mutationFn: async (next: EditorPickView[]) => {
      for (const [index, pick] of next.entries()) {
        const sortOrder = (index + 1) * STEP;
        if (pick.sortOrder !== sortOrder) {
          await editorPicksApi.update(pick.id, { sortOrder, note: pick.note });
        }
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.editorPicks }),
  });

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    reorder.mutate(next);
  };

  const remove = async (pick: EditorPickView) => {
    await confirm({
      title: '추천에서 뺄까요?',
      body: `"${pick.book.title}" 이(가) 앱 홈 추천 줄에서 바로 빠집니다.`,
      confirmLabel: '빼기',
      tone: 'danger',
      action: async () => {
        await editorPicksApi.remove(pick.id);
        toast.success('추천에서 뺐습니다.');
        queryClient.invalidateQueries({ queryKey: qk.editorPicks });
      },
    });
  };

  return (
    <>
      <PageHeader
        title="에디터 픽"
        description="앱 홈 '추천' 줄에 이 순서대로 보입니다. 비어 있으면 앱은 베스트셀러를 대신 보여 줍니다."
        action={<Button onClick={() => setAdding(true)}>도서 추가</Button>}
      />

      <div className="px-7 py-6">
        <ResultCount total={picks.data?.length} />
        <Card>
          <QueryState
            query={picks}
            isEmpty={(data) => data.length === 0}
            empty="추천 도서가 없습니다. 지금 앱에는 베스트셀러가 대신 보입니다."
          >
            {() => (
              <Table head={['순서', '도서', '메모', '정렬값', '']}>
                {ordered.map((pick, index) => (
                  <tr key={pick.id} className="border-b border-[var(--color-line)] last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="numeral w-6 text-[12px] text-[var(--color-faint)]">{index + 1}</span>
                        <ArrowButton label="위로" disabled={reorder.isPending || index === 0} onClick={() => move(index, -1)}>
                          ↑
                        </ArrowButton>
                        <ArrowButton
                          label="아래로"
                          disabled={reorder.isPending || index === ordered.length - 1}
                          onClick={() => move(index, 1)}
                        >
                          ↓
                        </ArrowButton>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ImageThumb url={pick.book.coverUrl} className="h-14 w-10" />
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-bold">{pick.book.title}</p>
                          <p className="truncate font-mono text-[11px] text-[var(--color-faint)]">
                            {pick.book.author ?? '저자 미상'} · {pick.book.publisher ?? '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-[13px] text-[var(--color-muted)]">
                      <span className="line-clamp-2">{pick.note || '—'}</span>
                    </td>
                    <td className="numeral px-4 py-3 text-[12px] text-[var(--color-faint)]">{pick.sortOrder}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setEditing(pick)}>
                          메모
                        </Button>
                        <Button variant="danger" onClick={() => remove(pick)}>
                          빼기
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

      {adding ? (
        <AddDialog
          existingBookIds={ordered.map((pick) => pick.book.id)}
          nextSortOrder={(ordered.at(-1)?.sortOrder ?? 0) + STEP}
          onClose={() => setAdding(false)}
        />
      ) : null}
      {editing ? <NoteDialog pick={editing} onClose={() => setEditing(null)} /> : null}
    </>
  );
}

function AddDialog({ existingBookIds, nextSortOrder, onClose }: {
  existingBookIds: number[];
  nextSortOrder: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [book, setBook] = useState<BookRow | null>(null);
  const [note, setNote] = useState('');

  const create = useMutation({
    meta: { inlineError: true },
    mutationFn: () =>
      editorPicksApi.create({ bookId: book!.id, sortOrder: nextSortOrder, note: note.trim() || undefined }),
    onSuccess: () => {
      toast.success('추천에 추가했습니다. 맨 뒤에 붙었습니다.');
      queryClient.invalidateQueries({ queryKey: qk.editorPicks });
      onClose();
    },
  });

  return (
    <Modal
      eyebrow="에디터 픽 추가"
      title={book ? book.title : '추천할 도서를 고르세요'}
      busy={create.isPending}
      onClose={onClose}
      footer={
        book ? (
          <>
            <Button variant="ghost" disabled={create.isPending} onClick={() => setBook(null)}>
              다른 책 고르기
            </Button>
            <Button disabled={create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? '추가 중…' : '추가'}
            </Button>
          </>
        ) : undefined
      }
    >
      {book ? (
        <>
          <p className="font-mono text-[11.5px] text-[var(--color-muted)]">
            {book.author ?? '저자 미상'} · {book.publisher ?? '—'} · 목록 맨 뒤(정렬값 {nextSortOrder})에 붙습니다.
          </p>
          <div className="mt-4">
            <Textarea
              label="메모 (선택)"
              rows={3}
              value={note}
              maxLength={NOTE_MAX}
              onChange={(e) => setNote(e.target.value)}
              placeholder="고른 이유 — 운영 참고용"
            />
          </div>
        </>
      ) : (
        <BookPicker autoFocus disabledIds={existingBookIds} disabledHint="이미 추천 중" onPick={setBook} />
      )}
      <ErrorText error={create.isError ? errorMessage(create.error, '추가하지 못했습니다.') : null} />
    </Modal>
  );
}

function NoteDialog({ pick, onClose }: { pick: EditorPickView; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState(pick.note ?? '');
  const [sortOrder, setSortOrder] = useState(String(pick.sortOrder));

  const save = useMutation({
    meta: { inlineError: true },
    mutationFn: () =>
      editorPicksApi.update(pick.id, { sortOrder: Number(sortOrder || 0), note: note.trim() || undefined }),
    onSuccess: () => {
      toast.success('저장했습니다.');
      queryClient.invalidateQueries({ queryKey: qk.editorPicks });
      onClose();
    },
  });

  return (
    <Modal
      size="sm"
      eyebrow="에디터 픽 수정"
      title={pick.book.title}
      busy={save.isPending}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" disabled={save.isPending} onClick={onClose}>
            취소
          </Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? '저장 중…' : '저장'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Input
          label="정렬값"
          inputMode="numeric"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value.replace(/[^\d-]/g, ''))}
          hint="작을수록 앞에 옵니다. 목록의 화살표로 바꿔도 됩니다."
        />
        <Textarea label="메모" rows={3} value={note} maxLength={NOTE_MAX} onChange={(e) => setNote(e.target.value)} />
      </div>
      <ErrorText error={save.isError ? errorMessage(save.error, '저장하지 못했습니다.') : null} />
    </Modal>
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
