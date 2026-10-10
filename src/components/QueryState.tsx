'use client';

import type { UseQueryResult } from '@tanstack/react-query';
import { ReactNode } from 'react';

import { errorMessage, isForbidden } from '@/lib/api';
import { Empty } from './ui';

/**
 * 목록·상세의 불러오는 중 / 권한 없음 / 오류(다시 시도) / 비었음 상태를 한곳에서 그린다.
 * 다음 쪽을 불러오는 동안(이전 쪽을 보여 주는 중)은 흐리게 둔다.
 */
export function QueryState<T>({ query, isEmpty, empty = '표시할 항목이 없습니다.', onFirstPage, children }: {
  query: UseQueryResult<T>;
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  /** 빈 쪽인데 첫 쪽이 아니면 '첫 쪽으로' 를 보여 준다. */
  onFirstPage?: () => void;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) {
    return <Empty>불러오는 중…</Empty>;
  }
  if (query.isError && query.data === undefined) {
    return (
      <Empty>
        {isForbidden(query.error)
          ? '이 화면을 볼 권한이 없습니다. 필요하면 최고 관리자에게 요청하세요.'
          : errorMessage(query.error, '불러오지 못했습니다.')}{' '}
        {!isForbidden(query.error) ? (
          <button type="button" className="underline" onClick={() => query.refetch()}>
            다시 시도
          </button>
        ) : null}
      </Empty>
    );
  }
  const data = query.data as T;
  if (isEmpty?.(data)) {
    return (
      <Empty>
        {empty}
        {onFirstPage ? (
          <>
            {' '}
            <button type="button" className="underline" onClick={onFirstPage}>
              첫 쪽으로
            </button>
          </>
        ) : null}
      </Empty>
    );
  }
  return (
    <div aria-busy={query.isPlaceholderData} className={query.isPlaceholderData ? 'opacity-60 transition-opacity' : ''}>
      {children(data)}
    </div>
  );
}
