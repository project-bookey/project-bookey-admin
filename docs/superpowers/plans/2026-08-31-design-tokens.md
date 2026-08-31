# 디자인 토큰 개편 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자 백오피스 비주얼을 잉크·종이 무드에서 모던 어드민(슬레이트 + Pretendard + 틸)으로 전환하고, 토큰을 원시+시맨틱 2층 구조로 재정의한다.

**Architecture:** `globals.css`의 `@theme`/`@theme inline`에 시맨틱 토큰을 정의하고(원시 층은 Tailwind 4 내장 팔레트), `ui.tsx`·`Shell.tsx` 프리미티브를 먼저 새 토큰으로 재작성한 뒤 9개 페이지를 기계적 치환으로 마이그레이션한다. 마이그레이션 도중 화면이 깨지지 않도록 구 변수명을 임시 별칭으로 유지하고 마지막 태스크에서 제거한다.

**Tech Stack:** Next.js 16 · Tailwind CSS 4 (`@theme inline`) · npm `pretendard` (가변 폰트 셀프호스트)

**스펙:** `docs/superpowers/specs/2026-08-31-design-tokens-design.md` — 모든 값의 근거. 충돌 시 스펙이 우선.

## Global Constraints

- 화면 코드는 **시맨틱 토큰 유틸리티만** 쓴다: `bg-surface`, `text-text-muted`, `border-border`, `bg-accent` 등. `slate-*`·`teal-*`·`amber-*` 등 원시 팔레트 유틸리티 직접 사용 금지.
- **글자로 쓰는 포인트·상태색은 항상 `*-text` 토큰**(700 단계): `text-accent-text`, `text-danger-text`, `text-warn-text`, `text-success-text`. 600(`accent`, `danger` 등)은 흰 글자를 얹는 배경면과 테두리에만.
- `font-mono`는 **코드성 텍스트 전용**: 핸들(@handle) · 가입 코드 · 이메일 · ID(`#12`, `BK-7F3A`) · ISBN · IP. 타임스탬프·사유·기간·통계 숫자는 sans. 통계·카운트 숫자에는 `tabular` 클래스(자리 폭 고정)를 쓴다.
- 폰트 굵기는 `font-semibold`(600)·`font-bold`(700)만 추가한다. 700은 KPI 숫자 전용. `font-medium` 등 다른 굵기 금지.
- 크기 유틸리티는 6단계만: `text-xs`(11) `text-sm`(12) `text-base`(14) `text-lg`(16) `text-xl`(20) `text-2xl`(24). `text-[13px]` 같은 임의 값 금지.
- radius는 `rounded-sm`(6) `rounded-md`(8) `rounded-lg`(12) `rounded-full`만.
- 페이지 본문 여백은 `p-6`(구 `px-7 py-6` 전부 교체).
- UI 문구·코드 주석·커밋 메시지는 한국어. 커밋 말미에 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- 테스트 프레임워크가 없다. 태스크마다 `npm run typecheck` + `npm run lint`가 게이트다.
- 시각 확인: 백엔드 없이 보려면 브라우저 콘솔에서 `sessionStorage.setItem('bookey.admin.token', 'design')` 후 이동 (Task 3에서 로그인 가드가 원복된 뒤에도 동일).

---

### Task 1: 폰트 의존성 + 토큰 기반 (globals.css 전면 교체)

**Files:**
- Modify: `package.json` (pretendard 의존성)
- Modify: `src/app/layout.tsx:1-5` (폰트 CSS 임포트)
- Modify: `src/app/globals.css` (전체 교체)

**Interfaces:**
- Produces: 시맨틱 색 토큰 유틸리티(`bg-bg`, `bg-surface`, `bg-surface-muted`, `text-text`, `text-text-muted`, `text-text-faint`, `border-border`, `border-border-strong`, `bg-accent`, `bg-accent-soft`, `text-accent-text`, `bg-accent-hover`, warn/danger/success 각 `-soft`/`-text`, `ring-ring`), 크기 토큰(`text-xs`~`text-2xl`), `rounded-sm/md/lg`, `shadow-sm/md/lg`, 전역 클래스 `.label`(11px/600/muted 라벨), `.tabular`(tabular-nums). 이후 모든 태스크가 이것만 사용.
- 임시 호환: 구 변수(`--color-paper` 등)와 구 클래스(`.eyebrow`, `.numeral`)는 별칭으로 유지 — Task 7에서 삭제.

- [ ] **Step 1: pretendard 설치**

Run: `npm install pretendard`
Expected: `package.json` dependencies에 `"pretendard": "^1.x"` 추가됨

- [ ] **Step 2: layout.tsx에 폰트 임포트 추가**

`src/app/layout.tsx` 상단 import 블록을 다음으로 교체 (기존 `./globals.css` 임포트 앞에 추가):

```tsx
import type { Metadata } from 'next';

import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './globals.css';
import { Providers } from '@/components/Providers';
```

- [ ] **Step 3: globals.css 전체 교체**

`src/app/globals.css`를 아래 내용으로 통째로 교체:

```css
@import "tailwindcss";

/*
 * 관리자 백오피스 테마 — 모던 어드민 (슬레이트 중성 + 틸 포인트 + Pretendard).
 * 2층 구조: 원시 층은 Tailwind 내장 팔레트를 그대로 쓰고,
 * 화면 코드는 아래 시맨틱 토큰만 참조한다.
 * 값의 근거: docs/superpowers/specs/2026-08-31-design-tokens-design.md
 */
@theme {
  --font-sans: "Pretendard Variable", Pretendard, -apple-system, "Segoe UI",
    "Apple SD Gothic Neo", sans-serif;
  /* 등폭은 코드성 텍스트(핸들·코드·이메일·ID) 전용 — 웹폰트 추가 없음 */
  --font-mono: ui-monospace, "Cascadia Mono", Consolas, monospace;

  --text-xs: 11px;
  --text-xs--line-height: 16px;
  --text-sm: 12px;
  --text-sm--line-height: 18px;
  --text-base: 14px;
  --text-base--line-height: 22px;
  --text-lg: 16px;
  --text-lg--line-height: 24px;
  --text-xl: 20px;
  --text-xl--line-height: 28px;
  --text-2xl: 24px;
  --text-2xl--line-height: 32px;

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* 구분의 기본은 테두리 — 그림자는 떠 있는 것에만 */
  --shadow-sm: 0 1px 2px rgb(15 23 42 / 0.06);
  --shadow-md: 0 4px 12px rgb(15 23 42 / 0.10);
  --shadow-lg: 0 12px 32px rgb(15 23 42 / 0.16);
}

/* 시맨틱 색 — Tailwind 내장 팔레트 참조 (변수 참조라 inline 필수) */
@theme inline {
  --color-bg: var(--color-slate-50);
  --color-surface: #ffffff;
  --color-surface-muted: var(--color-slate-100);
  --color-text: var(--color-slate-900);
  --color-text-muted: var(--color-slate-500);
  --color-text-faint: var(--color-slate-400);
  --color-border: var(--color-slate-200);
  --color-border-strong: var(--color-slate-300);
  --color-accent: var(--color-teal-600);
  --color-accent-hover: var(--color-teal-700);
  --color-accent-soft: var(--color-teal-50);
  --color-accent-text: var(--color-teal-700);
  --color-warn: var(--color-amber-600);
  --color-warn-soft: var(--color-amber-50);
  --color-warn-text: var(--color-amber-700);
  --color-danger: var(--color-red-600);
  --color-danger-soft: var(--color-red-50);
  --color-danger-text: var(--color-red-700);
  --color-success: var(--color-green-600);
  --color-success-soft: var(--color-green-50);
  --color-success-text: var(--color-green-700);
  --color-ring: var(--color-teal-600);
}

/* ── 마이그레이션 호환 별칭 — 페이지 이관 완료 후 Task 7에서 삭제 ── */
:root {
  --color-paper: var(--color-bg);
  --color-surface-alt: var(--color-surface-muted);
  --color-ink: var(--color-slate-900);
  --color-muted: var(--color-text-muted);
  --color-faint: var(--color-text-faint);
  --color-line: var(--color-border);
  --font-serif: var(--font-sans);
}

html,
body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}

/* 통계·카운트 숫자 — 등폭 폰트가 아니라 tnum으로 자리 폭을 고정한다 */
.tabular {
  font-variant-numeric: tabular-nums;
}

/* 섹션·필드 라벨 */
.label {
  font-size: 11px;
  line-height: 16px;
  font-weight: 600;
  color: var(--color-text-muted);
}

/* ── 마이그레이션 호환 클래스 — Task 7에서 삭제 ── */
.numeral {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
.eyebrow {
  font-size: 11px;
  line-height: 16px;
  font-weight: 600;
  letter-spacing: 0;
  color: var(--color-text-muted);
}

table {
  border-collapse: collapse;
}
```

- [ ] **Step 4: 검사**

Run: `npm run typecheck && npm run lint`
Expected: 둘 다 에러 0

- [ ] **Step 5: 시각 확인**

dev 서버에서 아무 페이지나 열어 확인: 배경이 종이색→연슬레이트, 전체 글꼴이 세리프→Pretendard로 바뀌었고 레이아웃이 깨진 곳 없음 (구 변수는 별칭으로 살아 있음).

- [ ] **Step 6: 커밋**

```bash
git add package.json package-lock.json src/app/layout.tsx src/app/globals.css
git commit -m "디자인 토큰 2층 구조로 재정의하고 Pretendard 도입

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: ui.tsx 프리미티브 재스타일

**Files:**
- Modify: `src/components/ui.tsx` (전체 교체)

**Interfaces:**
- Consumes: Task 1의 시맨틱 유틸리티·`.label`·`.tabular`
- Produces: `Tag`의 tone에 `'success'` 추가 — `tone?: 'neutral' | 'accent' | 'warn' | 'danger' | 'success'`. 컴포넌트 시그니처는 그 외 전부 기존과 동일 (`Card`, `Eyebrow`, `Button(variant: 'primary'|'outline'|'danger'|'ghost')`, `Input`, `Select`, `Table`, `Empty`, `formatDateTime`, `formatDuration`, `remainingSla`). 페이지 태스크(4·5·6)가 이 시그니처에 의존.

- [ ] **Step 1: ui.tsx 전체 교체**

```tsx
'use client';

import { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-border bg-surface shadow-sm ${className}`}>
      {children}
    </div>
  );
}

/** 섹션 라벨. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="label">{children}</p>;
}

export function Button({
  children, onClick, variant = 'primary', disabled, type = 'button', className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'outline' | 'danger' | 'ghost';
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}) {
  const base =
    'inline-flex items-center justify-center rounded-md px-4 py-2 text-base font-semibold transition disabled:opacity-40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25';
  const styles = {
    primary: 'bg-accent text-white hover:bg-accent-hover',
    outline: 'border border-border-strong text-text hover:bg-surface-muted',
    danger: 'border border-danger text-danger-text hover:bg-danger-soft',
    ghost: 'text-text-muted hover:bg-surface-muted hover:text-text',
  }[variant];

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}

export function Tag({ children, tone = 'neutral' }: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'warn' | 'danger' | 'success';
}) {
  const styles = {
    neutral: 'bg-surface-muted text-text-muted',
    accent: 'bg-accent-soft text-accent-text',
    warn: 'bg-warn-soft text-warn-text',
    danger: 'bg-danger-soft text-danger-text',
    success: 'bg-success-soft text-success-text',
  }[tone];
  return (
    <span className={`inline-block rounded-sm px-1.5 py-0.5 text-xs font-semibold ${styles}`}>
      {children}
    </span>
  );
}

export function Input({
  label, hint, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }) {
  return (
    <label className="block">
      {label ? <span className="label mb-1.5 block">{label}</span> : null}
      <input
        {...props}
        className={`w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-base outline-none focus:border-accent focus:ring-[3px] focus:ring-ring/25 ${props.className ?? ''}`}
      />
      {hint ? <span className="mt-1 block text-xs text-text-faint">{hint}</span> : null}
    </label>
  );
}

export function Select({
  label, children, ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="block">
      {label ? <span className="label mb-1.5 block">{label}</span> : null}
      <select
        {...props}
        className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-base outline-none focus:border-accent focus:ring-[3px] focus:ring-ring/25"
      >
        {children}
      </select>
    </label>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left">
        <thead>
          <tr className="border-b border-border bg-surface-muted">
            {head.map((label) => (
              <th key={label} className="px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-text-muted">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 py-14 text-center text-base text-text-muted">{children}</div>
  );
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
}

export function formatDuration(seconds?: number): string {
  const total = Math.max(0, Math.floor(seconds ?? 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  return `${minutes}분`;
}

export function remainingSla(iso: string): { label: string; overdue: boolean } {
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs < 0) {
    return { label: `${Math.floor(-diffMs / 3600000)}시간 초과`, overdue: true };
  }
  const hours = Math.floor(diffMs / 3600000);
  return { label: `${hours}시간 남음`, overdue: false };
}
```

- [ ] **Step 2: 검사**

Run: `npm run typecheck && npm run lint`
Expected: 에러 0 (Tag의 'success'는 아직 아무도 안 쓰므로 영향 없음)

- [ ] **Step 3: 시각 확인**

회원 페이지 등에서 카드·버튼·태그·입력이 새 스타일(틸 버튼, 슬레이트 테두리, 표 헤더 회색 배경)로 보이는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add src/components/ui.tsx
git commit -m "공용 UI 프리미티브를 새 토큰 체계로 재스타일

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Shell·PageHeader 재스타일 + 로그인 가드 원복 + 로그인 페이지

**Files:**
- Modify: `src/components/Shell.tsx` (전체 교체 — **주석 처리된 로그인 가드를 반드시 살려서** 커밋)
- Modify: `src/app/login/page.tsx`

**Interfaces:**
- Consumes: Task 1 토큰, Task 2의 `Button`, `Card`, `Input`
- Produces: `Shell`, `PageHeader` 시그니처 불변. **PageHeader·본문 여백이 `px-6`으로 바뀌므로** 페이지 태스크는 본문 래퍼를 `p-6`으로 맞춘다.

- [ ] **Step 1: Shell.tsx 전체 교체**

주의: 현재 워킹 트리에는 로그인 가드가 디자인 작업용으로 주석 처리되어 있다. 아래 코드는 가드가 **살아 있는** 버전이다 — 그대로 교체한다. (백엔드 없이 화면을 보려면 `sessionStorage.setItem('bookey.admin.token', 'design')`.)

```tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { clearToken, getToken } from '@/lib/api';
import { authApi } from '@/lib/endpoints';

const NAV = [
  { href: '/', label: '대시보드' },
  { href: '/moderation', label: '신고 큐' },
  { href: '/users', label: '회원' },
  { href: '/books', label: '도서' },
  { href: '/reviews', label: '검증 심사' },
  { href: '/clubs', label: '모임' },
  { href: '/notifications', label: '알림 운영' },
  { href: '/audit', label: '감사 로그' },
];

/** 관리자 공통 셸. 로그인하지 않았으면 /login 으로 보낸다. */
export function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const me = useQuery({ queryKey: ['admin', 'me'], queryFn: authApi.me, retry: false });

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-surface">
        <div className="border-b border-border px-5 py-5">
          <p className="text-lg font-bold tracking-tight">bookey</p>
          <p className="label mt-0.5">ADMIN</p>
        </div>

        <nav className="p-2">
          {NAV.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm font-semibold transition ${
                  active
                    ? 'bg-accent text-white'
                    : 'text-text-muted hover:bg-surface-muted hover:text-text'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-border px-5 py-4">
          <p className="text-sm font-semibold">{me.data?.name ?? '—'}</p>
          <p className="font-mono text-xs text-text-faint">{me.data?.role ?? ''}</p>
          <button
            onClick={() => {
              clearToken();
              router.replace('/login');
            }}
            className="mt-2 text-xs text-text-muted underline hover:text-text"
          >
            로그아웃
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

export function PageHeader({ title, description, action }: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-4 border-b border-border px-6 py-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}
```

- [ ] **Step 2: login/page.tsx 비주얼 치환**

로직(useMutation, 상태)은 그대로 두고 마크업 클래스만 교체:

| 위치 | 기존 | 변경 |
|---|---|---|
| 브랜드 h1 | `font-serif text-[34px] font-bold tracking-tight` | `text-2xl font-bold tracking-tight` |
| 구분 바 | `mt-3 h-[3px] w-10 bg-[var(--color-ink)]` | `mt-3 h-[3px] w-10 bg-accent` |
| "ADMIN CONSOLE" | `eyebrow mt-3` | `label mt-3` |
| 에러 문구 | `font-mono text-[11.5px] text-[var(--color-danger)]` | `text-sm text-danger-text` |
| 하단 안내 | `mt-4 font-mono text-[11px] text-[var(--color-faint)]` | `mt-4 text-xs text-text-faint` |

- [ ] **Step 3: 검사**

Run: `npm run typecheck && npm run lint`
Expected: 에러 0

- [ ] **Step 4: 시각 확인**

`/login`과 (가짜 토큰 세팅 후) 아무 페이지: 사이드바가 흰 배경 + 틸 활성 항목, 페이지 제목이 20px 세미볼드인지. **로그인 가드 동작 확인**: sessionStorage를 비우면 `/users` 진입 시 `/login`으로 리다이렉트되는지.

- [ ] **Step 5: 커밋**

```bash
git add src/components/Shell.tsx src/app/login/page.tsx
git commit -m "셸·로그인 화면을 새 토큰 체계로 재스타일하고 로그인 가드 원복

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## 페이지 공통 치환표 (Task 4·5·6에서 사용)

각 페이지에서 아래 패턴을 **전부** 치환한다. 이 표에 없는 변경은 각 태스크의 개별 지시를 따른다.

| 기존 | 변경 | 비고 |
|---|---|---|
| `px-7 py-6` (본문 래퍼) | `p-6` | 페이지 여백 24px |
| `border-[var(--color-line)]` | `border-border` | `divide-[var(--color-line)]` → `divide-border` |
| `bg-[var(--color-surface-alt)]` | `bg-surface-muted` | |
| `text-[var(--color-muted)]` | `text-text-muted` | |
| `text-[var(--color-faint)]` | `text-text-faint` | |
| `text-[var(--color-danger)]` | `text-danger-text` | 글자는 700 단계 |
| `bg-[var(--color-danger-soft)]` | `bg-danger-soft` | |
| `border-[var(--color-danger)]` | `border-danger` | 면·테두리는 600 유지 |
| `text-[var(--color-warn)]` | `text-warn-text` | |
| `border-[var(--color-ink)]` (선택 상태) | `border-accent` | 선택 강조는 틸로 |
| `className="eyebrow"` | `className="label"` | `eyebrow mb-1.5` 등 조합 포함 |
| `numeral` (통계·카운트) | `tabular` + 크기·굵기는 아래 규칙 | |
| `font-serif text-[19px]~[22px] font-bold` (다이얼로그 h2) | `text-lg font-semibold` | |
| 다이얼로그 에러 `font-mono text-[11.5px]` | `text-sm` (색은 `text-danger-text`) | |
| 타임스탬프·기간·사유 라인의 `font-mono` | 제거(sans) + `text-xs text-text-faint` | mono는 코드성만 |
| 본문·셀 주 텍스트 `text-[13.5px]`/`text-[14px]` | `text-base` | `font-bold` 동반 시 `font-semibold` |
| 셀 보조 텍스트 `text-[12.5px]`/`text-[13px]` | `text-sm` | |
| 메타 라인 `text-[10.5px]`/`text-[11px]` | `text-xs` | |
| 카운트 셀 `numeral text-[12px]` | `tabular text-sm` | |
| 다이얼로그 인용 박스 `rounded-lg bg-[var(--color-surface-alt)]` | `rounded-md bg-surface-muted` (글자 `text-sm`) | |
| 다이얼로그 래퍼 `<Card className="w-full max-w-… p-6">` ~ `</Card>` | `<div className="w-full max-w-… rounded-lg bg-surface p-6 shadow-lg">` ~ `</div>` | 모달은 테두리 없이 `shadow-lg` (스펙 그림자 규칙). 기존 `max-h-full overflow-y-auto` 등은 유지 |

**치환 후 각 페이지에서 검증:** `grep -n "var(--color\|font-serif\|eyebrow\|numeral\|text-\[1" <파일>` 결과 0건.

---

### Task 4: 대시보드 + 신고 큐 페이지

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/moderation/page.tsx`

**Interfaces:**
- Consumes: Task 2 `Tag`(success 포함)·`Eyebrow`, Task 3 `PageHeader`, 공통 치환표

- [ ] **Step 1: page.tsx (대시보드) — 공통 치환표 적용 + 개별 변경**

개별 변경 (공통 표 외):

`Stat` 컴포넌트의 값 표시 (26px → KPI 토큰):
```tsx
<p className={`tabular mt-2 text-2xl leading-none font-bold ${warn ? 'text-danger-text' : ''}`}>
  {value}
</p>
```
`Stat`의 목표 문구: `<p className="mt-1.5 text-xs text-text-faint">{target}</p>`

`Metric`의 값: `<p className="tabular mt-1 text-lg font-semibold">{value}</p>`

SLA 초과 배너 (rounded-xl → lg, 제목 mono 제거):
```tsx
<div className="mt-5 rounded-lg border-l-4 border-danger bg-danger-soft px-5 py-4">
  <p className="text-sm font-semibold text-danger-text">
    48시간 SLA를 넘긴 신고가 {data?.overdueModeration}건 있습니다
  </p>
  <p className="mt-1 text-sm text-text-muted">
    미처리 48시간 초과 비율이 10%를 넘으면 안티 지표에 걸립니다.
  </p>
</div>
```

"전체 보기" 링크: `className="text-sm font-semibold text-accent-text underline"`

대기 큐 항목의 SLA 표시: `` className={`tabular text-xs ${sla.overdue ? 'text-danger-text' : 'text-text-muted'}`} ``

푸시 스위치 태그: `<Tag tone="accent">발송 중</Tag>` → `<Tag tone="success">발송 중</Tag>`

- [ ] **Step 2: moderation/page.tsx — 공통 치환표 적용 + 개별 변경**

상태 태그 (처리 완료는 성공 톤):
```tsx
<Tag tone={ticket.status === 'RESOLVED' ? 'success' : 'neutral'}>
  {ticket.status}
</Tag>
```

SLA 셀: `` className={`tabular px-4 py-3 text-sm ${sla.overdue ? 'text-danger-text' : 'text-text-muted'}`} ``

ResolveDialog 라디오 선택 상태:
```tsx
className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 ${
  resolution === option.value
    ? 'border-accent bg-accent-soft'
    : 'border-border'
}`}
```
라디오 옵션 라벨: `<span className="block text-base font-semibold">{option.label}</span>` (mono 제거) · 설명: `<span className="block text-sm text-text-muted">`

- [ ] **Step 3: 검사 + 잔재 grep**

Run: `npm run typecheck && npm run lint`
Run: `grep -n "var(--color\|font-serif\|eyebrow\|numeral\|text-\[1" src/app/page.tsx src/app/moderation/page.tsx`
Expected: typecheck·lint 에러 0, grep 0건

- [ ] **Step 4: 시각 확인 후 커밋**

```bash
git add src/app/page.tsx src/app/moderation/page.tsx
git commit -m "대시보드·신고 큐 화면을 새 토큰으로 이관

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: 회원 + 도서 + 검증 심사 페이지

**Files:**
- Modify: `src/app/users/page.tsx`
- Modify: `src/app/books/page.tsx`
- Modify: `src/app/reviews/page.tsx`

**Interfaces:**
- Consumes: Task 2 `Tag`(success 포함), 공통 치환표

- [ ] **Step 1: users/page.tsx — 공통 치환표 적용 + 개별 변경**

상태 톤 맵 (정상 회원은 성공 톤):
```tsx
const STATUS_TONE: Record<UserStatus, 'success' | 'warn' | 'danger'> = {
  ACTIVE: 'success',
  WRITE_BANNED: 'warn',
  SUSPENDED: 'danger',
  TERMINATED: 'danger',
};
```

코드성 텍스트는 mono **유지**: 핸들 `@{user.handle}`(`font-mono text-xs text-text-faint`), 이메일 셀(`font-mono text-sm text-text-muted`), 다이얼로그의 `@handle · ID {user.id}` 라인과 이메일 값(`font-mono text-sm`).
가입일 셀은 sans로: `text-xs text-text-faint`.
닉네임: `text-base font-semibold`.
열람 기록 문구: `mt-2 text-xs text-warn-text` (mono 제거).
`Metric` 박스: `rounded-md bg-surface-muted px-3 py-2.5`, 값 `tabular mt-1 text-lg font-semibold`.
제재 이력 날짜 라인: `text-xs text-text-faint` (mono 제거).

- [ ] **Step 2: books/page.tsx — 공통 치환표 적용 + 개별 변경**

제목: `text-base font-semibold`. 저자: `text-base`. 출판사: `text-sm text-text-muted`.
페이지 수: `<span className="tabular text-sm">{book.totalPages}</span>`.
ISBN은 mono 유지: `font-mono text-xs text-text-faint`.

- [ ] **Step 3: reviews/page.tsx — 공통 치환표 적용 + 개별 변경**

등급 톤 맵 (완독 검증은 성공 톤):
```tsx
const LEVEL_TONE: Record<VerificationLevel, 'success' | 'neutral' | 'warn' | 'danger'> = {
  VERIFIED_FULL: 'success',
  VERIFIED_PARTIAL: 'neutral',
  UNVERIFIED: 'neutral',
  FLAGGED: 'danger',
};
```
책 제목: `text-base font-semibold`. 작성자·별점·날짜 메타 라인: `text-xs text-text-faint` (mono 제거).
리뷰 본문: `mt-2 line-clamp-2 text-base leading-relaxed`.
검증 스냅샷 라인(통계): `tabular mt-1.5 text-xs text-text-faint` (mono 제거).

- [ ] **Step 4: 검사 + 잔재 grep**

Run: `npm run typecheck && npm run lint`
Run: `grep -n "var(--color\|font-serif\|eyebrow\|numeral\|text-\[1" src/app/users/page.tsx src/app/books/page.tsx src/app/reviews/page.tsx`
Expected: 에러 0, grep 0건

- [ ] **Step 5: 시각 확인 후 커밋**

```bash
git add src/app/users/page.tsx src/app/books/page.tsx src/app/reviews/page.tsx
git commit -m "회원·도서·검증 심사 화면을 새 토큰으로 이관

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: 모임 + 알림 운영 + 감사 로그 페이지

**Files:**
- Modify: `src/app/clubs/page.tsx`
- Modify: `src/app/notifications/page.tsx`
- Modify: `src/app/audit/page.tsx`

**Interfaces:**
- Consumes: Task 2 `Tag`(success 포함)·`Eyebrow`, 공통 치환표

- [ ] **Step 1: clubs/page.tsx — 공통 치환표 적용 + 개별 변경**

모임 이름: `text-base font-semibold`. 생성일 라인: `text-xs text-text-faint` (mono 제거).
가입 코드는 mono **유지**: `font-mono px-4 py-3 text-sm tracking-widest`.
인원·토론 수: `tabular text-sm`. 기간 셀: `text-xs text-text-muted` (mono 제거).
STATUS_TONE은 기존 유지 (`RECRUITING`/`ACTIVE`: `'accent'` — 진행 중 상태는 포인트 톤).
새 초대 코드 표시: `<p className="font-mono mt-1 text-2xl tracking-[0.3em]">{result}</p>`.

- [ ] **Step 2: notifications/page.tsx — 공통 치환표 적용 + 개별 변경**

KPI 값 3곳 (26px → KPI 토큰): `tabular mt-2 text-2xl font-bold`, 전환율 경고 시 `text-warn-text`:
```tsx
<p
  className={`tabular mt-2 text-2xl font-bold ${
    (stats.data?.conversionRate ?? 0) < 0.18 ? 'text-warn-text' : ''
  }`}
>
```
"목표 18%": `mt-1 text-xs text-text-faint`. 스위치 제목: `text-base font-semibold`.
켜짐 태그: `<Tag tone="success">켜짐</Tag>` (accent → success). 꺼짐은 danger 유지.
최근 변경 라인: `mt-1 text-xs text-text-faint` (mono 제거).

- [ ] **Step 3: audit/page.tsx — 공통 치환표 적용 + 개별 변경**

시각 셀은 sans로: `px-4 py-2.5 text-xs whitespace-nowrap text-text-muted`.
관리자 ID는 mono **유지**: `font-mono px-4 py-2.5 text-sm` (`#{log.adminId}`).
대상 셀 mono 유지: `font-mono px-4 py-2.5 text-xs text-text-muted`.
사유 셀: `text-sm`. IP는 mono 유지: `font-mono px-4 py-2.5 text-xs text-text-faint`.

- [ ] **Step 4: 검사 + 잔재 grep**

Run: `npm run typecheck && npm run lint`
Run: `grep -n "var(--color\|font-serif\|eyebrow\|numeral\|text-\[1" src/app/clubs/page.tsx src/app/notifications/page.tsx src/app/audit/page.tsx`
Expected: 에러 0, grep 0건

- [ ] **Step 5: 시각 확인 후 커밋**

```bash
git add src/app/clubs/page.tsx src/app/notifications/page.tsx src/app/audit/page.tsx
git commit -m "모임·알림 운영·감사 로그 화면을 새 토큰으로 이관

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: 호환 별칭 제거 + 전수 검증

**Files:**
- Modify: `src/app/globals.css` (호환 블록 2개 삭제)

**Interfaces:**
- Consumes: Task 4·5·6 완료 (구 변수·클래스 참조가 소스에 남아 있지 않아야 함)

- [ ] **Step 1: 잔재 전수 확인 (삭제 전)**

Run: `grep -rn "color-paper\|color-ink\|color-line\|color-muted\|color-faint\|surface-alt\|font-serif\|eyebrow\|numeral" src --include="*.tsx"`
Expected: 0건. 남아 있으면 해당 페이지 태스크의 치환 누락 — 먼저 고친다.

- [ ] **Step 2: globals.css에서 호환 블록 삭제**

`/* ── 마이그레이션 호환 별칭 — … ── */`로 시작하는 `:root { … }` 블록 전체와,
`/* ── 마이그레이션 호환 클래스 — … ── */` 아래 `.numeral`·`.eyebrow` 정의를 삭제한다.
`.tabular`·`.label`·`html, body`·`table` 규칙은 남긴다.

- [ ] **Step 3: 최종 검사**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: 전부 에러 0 (build까지 통과해야 Tailwind 토큰 파이프라인 확정)

- [ ] **Step 4: 9개 페이지 전수 시각 확인**

가짜 토큰 세팅 후 `/`, `/moderation`, `/users`, `/books`, `/reviews`, `/clubs`, `/notifications`, `/audit`, `/login` 순회:
세리프·Courier·종이색·네이비 잔재 없음 · 태그가 "50 배경 + 700 글자" · KPI 숫자 24px 볼드 · 포커스 링(틸) 동작.

- [ ] **Step 5: 커밋**

```bash
git add src/app/globals.css
git commit -m "마이그레이션 호환 별칭 제거로 토큰 개편 마무리

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
