'use client';

import { useQuery } from '@tanstack/react-query';

import { authApi } from './endpoints';
import { qk } from './queryKeys';
import type { AdminCapability } from './types';

/** 내 관리자 정보. 권한이 바뀌면(403) Providers 가 다시 불러온다. */
export function useMe() {
  return useQuery({ queryKey: qk.me, queryFn: authApi.me, staleTime: 5 * 60_000, retry: false });
}

/**
 * 이 권한이 있는지. 내 정보를 불러오기 전에는 false — 버튼이 잠깐 보였다 사라지는 것보다 늦게 나타나는 편이 낫다.
 * 판정은 서버가 내려준 capabilities 로만 한다(역할표를 웹이 따로 들고 있지 않는다).
 */
export function useCan(capability: AdminCapability): boolean {
  const me = useMe();
  return me.data?.capabilities.includes(capability) ?? false;
}
