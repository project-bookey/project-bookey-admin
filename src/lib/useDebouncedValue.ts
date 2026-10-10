'use client';

import { useEffect, useState } from 'react';

/** 입력이 멈추고 delay 가 지나야 값을 넘긴다 — 글자마다 검색 요청을 보내지 않게. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
