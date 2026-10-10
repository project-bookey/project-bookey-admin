'use client';

import { ReactNode } from 'react';

import { useCan } from '@/lib/useMe';
import type { AdminCapability } from '@/lib/types';

/** 권한이 있을 때만 그린다. 서버가 어차피 막지만, 못 쓰는 버튼은 처음부터 보이지 않게. */
export function Can({ cap, children, fallback = null }: {
  cap: AdminCapability;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return useCan(cap) ? children : fallback;
}
