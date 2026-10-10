'use client';

import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { isClientError, isForbidden } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/lib/toast';
import { ConfirmProvider } from './Confirm';
import { Toaster } from './Toaster';

/**
 * 공용 설정.
 *  - 4xx 는 다시 불러도 같으니 재시도하지 않는다. 상세 조회는 열람 기록이 남으므로 재시도하면 감사 로그만 늘어난다.
 *  - 변경 실패는 기본으로 토스트를 띄운다. 화면 안에 오류를 직접 그리는 mutation 은 meta: { inlineError: true } 를 단다.
 *  - 403 이면 그사이 권한이 바뀌었을 수 있어 내 정보를 다시 불러 메뉴·버튼을 맞춘다.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => {
    const queryClient: QueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: (count, error) => !isClientError(error) && count < 1,
          staleTime: 10_000,
          refetchOnWindowFocus: false,
        },
      },
      mutationCache: new MutationCache({
        onError: (error, _variables, _context, mutation) => {
          if (isForbidden(error)) {
            queryClient.invalidateQueries({ queryKey: qk.me });
          }
          if (!mutation.meta?.inlineError) {
            toast.error(error);
          }
        },
      }),
    });
    return queryClient;
  });

  return (
    <QueryClientProvider client={client}>
      <ConfirmProvider>
        {children}
        <Toaster />
      </ConfirmProvider>
    </QueryClientProvider>
  );
}
