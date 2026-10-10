/**
 * 알림 토스트. React 밖(전역 mutation 오류 처리)에서도 부를 수 있게 모듈 상태로 둔다.
 */
import { useSyncExternalStore } from 'react';

import { errorMessage } from './api';

export type ToastTone = 'success' | 'error' | 'info';
export type ToastItem = { id: number; tone: ToastTone; message: string };

const EMPTY: ToastItem[] = [];
let items: ToastItem[] = EMPTY;
let seq = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function push(tone: ToastTone, message: string, ttlMs: number) {
  const id = ++seq;
  items = [...items, { id, tone, message }].slice(-4);
  emit();
  setTimeout(() => dismissToast(id), ttlMs);
}

export function dismissToast(id: number) {
  const next = items.filter((item) => item.id !== id);
  if (next.length === items.length) return;
  items = next;
  emit();
}

export const toast = {
  success: (message: string) => push('success', message, 4000),
  info: (message: string) => push('info', message, 4000),
  /** 오류는 조금 더 오래 띄운다. Error 를 그대로 넘기면 서버 메시지를 꺼내 쓴다. */
  error: (error: unknown) => push('error', typeof error === 'string' ? error : errorMessage(error), 7000),
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useToasts(): ToastItem[] {
  return useSyncExternalStore(subscribe, () => items, () => EMPTY);
}
