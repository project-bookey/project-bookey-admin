'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useEffect, useSyncExternalStore } from 'react';

import { clearToken, getToken } from '@/lib/api';
import { dashboardApi } from '@/lib/endpoints';
import { ADMIN_ROLE_LABEL } from '@/lib/labels';
import { qk } from '@/lib/queryKeys';
import type { AdminCapability, Dashboard } from '@/lib/types';
import { useMe } from '@/lib/useMe';
import { Empty } from './ui';

/** badge — 대시보드 숫자 중 메뉴 옆에 띄울 처리 대기 건수. */
type NavItem = {
  href: string;
  label: string;
  cap?: AdminCapability;
  badge?: keyof Pick<Dashboard, 'pendingModeration' | 'waitingInquiries'>;
};

/** 메뉴. cap 이 있으면 그 권한이 있는 관리자에게만 보인다(서버도 같은 권한으로 막는다). */
const NAV: { group: string; items: NavItem[] }[] = [
  { group: '현황', items: [{ href: '/', label: '대시보드' }] },
  {
    group: '처리 대기',
    items: [
      { href: '/moderation', label: '신고 큐', badge: 'pendingModeration' },
      { href: '/inquiries', label: '고객문의', badge: 'waitingInquiries' },
    ],
  },
  {
    group: '회원',
    items: [
      { href: '/users', label: '회원' },
      { href: '/payments', label: '결제 조회', cap: 'VIEW_PAYMENTS' },
    ],
  },
  {
    group: '콘텐츠',
    items: [
      { href: '/books', label: '도서' },
      { href: '/editor-picks', label: '에디터 픽', cap: 'MANAGE_CONTENT' },
      { href: '/reviews', label: '검증 심사' },
      { href: '/clubs', label: '모임' },
      { href: '/faqs', label: 'FAQ' },
    ],
  },
  {
    group: '앱 운영',
    items: [
      { href: '/ads', label: '광고 · 공지', cap: 'MANAGE_CONTENT' },
      { href: '/notifications', label: '알림 운영' },
    ],
  },
  {
    group: '관리',
    items: [
      { href: '/audit', label: '감사 로그' },
      { href: '/admins', label: '관리자', cap: 'MANAGE_ADMINS' },
    ],
  },
];

const noopSubscribe = () => () => {};

/** 관리자 공통 셸. 로그인하지 않았으면 /login 으로 보내고, 그 전에는 화면을 그리지 않는다. */
export function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  // 토큰은 sessionStorage 에 있어 서버 렌더에선 알 수 없다 — 클라이언트에서 확인한 뒤에 그린다.
  const signedIn = useSyncExternalStore(noopSubscribe, () => getToken() !== null, () => false);
  const me = useMe();
  // 메뉴 배지 — 대시보드와 같은 캐시를 쓴다. 1분마다 다시 센다.
  const dashboard = useQuery({
    queryKey: qk.dashboard,
    queryFn: dashboardApi.get,
    enabled: signedIn,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!getToken()) router.replace('/login');
  }, [router]);

  if (!signedIn) return null;

  const capabilities = me.data?.capabilities ?? [];

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-52 shrink-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="border-b border-[var(--color-line)] px-5 py-5">
          <p className="font-serif text-[19px] font-bold tracking-tight">bookey</p>
          <p className="eyebrow mt-1">ADMIN</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {NAV.map((section) => {
            const items = section.items.filter((item) => !item.cap || capabilities.includes(item.cap));
            if (items.length === 0) return null;
            return (
              <div key={section.group} className="mb-2">
                <p className="px-3 pt-2 pb-1 font-mono text-[10px] font-bold tracking-wider text-[var(--color-faint)]">
                  {section.group}
                </p>
                {items.map((item) => {
                  const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                  const count = item.badge ? dashboard.data?.[item.badge] : undefined;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 font-mono text-[12.5px] font-bold transition ${
                        active
                          ? 'bg-[var(--color-ink)] text-white'
                          : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-alt)]'
                      }`}
                    >
                      {item.label}
                      {count ? (
                        <span
                          className={`rounded-full px-1.5 text-[10.5px] ${
                            active ? 'bg-white text-[var(--color-ink)]' : 'bg-[var(--color-danger)] text-white'
                          }`}
                        >
                          {count > 99 ? '99+' : count}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-[var(--color-line)] px-5 py-4">
          <Link href="/account" className="block text-[13px] font-bold underline-offset-2 hover:underline">
            {me.data?.name ?? '—'}
          </Link>
          <p className="font-mono text-[11px] text-[var(--color-faint)]">
            {me.data ? ADMIN_ROLE_LABEL[me.data.role] : ''}
            {me.data && !me.data.totpEnabled ? (
              <Link href="/account" className="ml-1 text-[var(--color-warn)] underline">
                2FA 꺼짐
              </Link>
            ) : null}
          </p>
          <button
            onClick={() => {
              clearToken();
              router.replace('/login');
            }}
            className="mt-2 font-mono text-[11px] text-[var(--color-muted)] underline"
          >
            로그아웃
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        {/* 화면들이 URL 검색 파라미터(useSearchParams)를 읽으므로 경계를 둔다(Next 16 요구 사항). */}
        <Suspense fallback={<Empty>불러오는 중…</Empty>}>{children}</Suspense>
      </main>
    </div>
  );
}

export function PageHeader({ title, description, action }: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-4 border-b border-[var(--color-line)] px-7 py-6">
      <div>
        <h1 className="font-serif text-[24px] font-bold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 text-[13.5px] text-[var(--color-muted)]">{description}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}
