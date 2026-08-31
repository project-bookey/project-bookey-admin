# 디자인 토큰 개편 — 설계 문서

2026-08-31 · 사용자와 브레인스토밍으로 합의된 최종안

## 목적

관리자 백오피스의 비주얼을 기존 "잉크·종이" 에디토리얼 무드(종이색 배경 + 세리프 + 타자기체)에서
**모던 어드민**(슬레이트 그레이 + Pretendard + 틸 포인트)으로 전면 전환한다.
토큰을 **원시 팔레트 + 시맨틱 별칭의 2층 구조**로 재정의하고, 화면 코드는 시맨틱 토큰만 쓴다.

## 합의된 방향 (결정 순서대로)

| 결정 | 선택 | 비고 |
|---|---|---|
| 무드 | 모던 어드민으로 전환 | 잉크·종이 무드 폐기 |
| 다크 모드 | 라이트 전용 | 단, 시맨틱 이름으로 지어 다크 추가 여지는 남김 |
| 포인트 컬러 | 틸 `#0D9488` (teal-600) | 블루·인디고·바이올렛 후보 중 선택 |
| 중성 그레이 | 슬레이트 (쿨 그레이) | 틸과 같은 차가운 계열 |
| 상태색 | 중립 + 경고 + 위험 + **성공(초록) 추가** | 틸과의 시각 구분은 색조 차이(청록 175° vs 황록 142°)로 확보 |
| 본문 폰트 | Pretendard Variable | npm `pretendard` 패키지 셀프호스트 |
| 밀도 | 표준 (본문 14px) | 컴팩트/여유 아님 |
| 토큰 구조 | 2층 (원시 + 시맨틱) | 원시 층은 Tailwind 4 기본 팔레트를 그대로 사용 |

## 1. 색

### 원시 팔레트 (primitive)

Tailwind 4 기본 팔레트를 원시 층으로 그대로 쓴다. 임의 hex를 만들지 않는다.
사용 스케일: `slate 50–900` 전체, `teal 50/100/500/600/700`, `amber·red·green 50/600/700`.

### 시맨틱 토큰 (화면 코드는 이것만 사용)

| 토큰 | 원시 값 | 용도 |
|---|---|---|
| `bg` | slate-50 `#F8FAFC` | 페이지 배경 |
| `surface` | white `#FFFFFF` | 카드·테이블·사이드바 |
| `surface-muted` | slate-100 `#F1F5F9` | 표 헤더 행·비활성 면 |
| `text` | slate-900 `#0F172A` | 본문 |
| `text-muted` | slate-500 `#64748B` | 보조 설명 |
| `text-faint` | slate-400 `#94A3B8` | 타임스탬프·자리표시 |
| `border` | slate-200 `#E2E8F0` | 기본 테두리·구분선 |
| `border-strong` | slate-300 `#CBD5E1` | 입력 기본 테두리 |
| `accent` | teal-600 `#0D9488` | 버튼·활성 내비 배경 |
| `accent-hover` | teal-700 `#0F766E` | accent의 호버 |
| `accent-soft` | teal-50 `#F0FDFA` | 강조 배경(태그 등) |
| `accent-text` | teal-700 `#0F766E` | 틸 글자 (아래 접근성 규칙) |
| `warn` / `warn-soft` / `warn-text` | amber 600 / 50 / 700 | 경고 |
| `danger` / `danger-soft` / `danger-text` | red 600 / 50 / 700 | 위험·파괴적 동작 |
| `success` / `success-soft` / `success-text` | green 600 / 50 / 700 | 성공·완료 |
| `ring` | teal-600 | 포커스 링 |

**접근성 규칙**: teal-600은 흰 배경 위 작은 글자로 약 3.9:1이라 AA 미달.
**글자로 쓰는 틸·상태색은 항상 700 단계**(`*-text`, 4.5:1 이상)를 쓴다.
상태 태그는 "50 배경 + 700 글자" 조합으로 고정한다. 600은 흰 글자를 얹는 면(배경)에만 쓴다.

## 2. 타이포그래피

### 패밀리 (2개)

- `font-sans`: `Pretendard Variable` — npm `pretendard` 패키지에서 가변 파일 임포트. 모든 UI 텍스트 기본.
- `font-mono`: `ui-monospace, 'Cascadia Mono', Consolas, monospace` — **코드성 텍스트 전용**
  (핸들 `@handle`, 가입 코드, 이메일, ID, 해시). 웹폰트를 추가하지 않는다.

### 크기 6단계 (px / 행높이 / 기본 굵기)

| 토큰 | 값 | 용도 |
|---|---|---|
| `text-2xl` | 24 / 32 / 700 | KPI 숫자 전용 |
| `text-xl` | 20 / 28 / 600 | 페이지 제목 |
| `text-lg` | 16 / 24 / 600 | 섹션·다이얼로그 제목 |
| `text-base` | 14 / 22 / 400 | 본문·테이블 셀·입력·버튼 |
| `text-sm` | 12 / 18 / 400 | 보조 설명 (표 헤더는 600) |
| `text-xs` | 11 / 16 / 400 | 타임스탬프 (태그·필드 라벨은 600) |

### 규칙

- 굵기는 **400 / 600 / 700 세 단계만** 쓴다 (700은 KPI 숫자 전용).
- 통계·카운트 숫자는 mono가 아니라 **Pretendard + `font-variant-numeric: tabular-nums`** 로 자리 폭을 고정한다.
- 기존 `.numeral`(Courier 굵은 숫자)과 `.eyebrow`(mono 대문자 자간 라벨)는 폐기한다.
  라벨은 `text-xs` 600 + `text-muted`로 대체한다. 세리프·장식 글리프(❧)도 함께 폐기.

## 3. 구조

### radius

| 토큰 | 값 | 용도 |
|---|---|---|
| `radius-sm` | 6px | 태그·작은 칩 |
| `radius-md` | 8px | 버튼·입력·셀렉트 |
| `radius-lg` | 12px | 카드·다이얼로그 |
| `radius-full` | 9999px | 아바타·카운트 배지 |

### 그림자 — 구분의 기본은 테두리, 그림자는 "떠 있는 것"에만

| 토큰 | 값 | 용도 |
|---|---|---|
| `shadow-sm` | `0 1px 2px rgb(15 23 42 / 0.06)` | 카드 (테두리와 함께) |
| `shadow-md` | `0 4px 12px rgb(15 23 42 / 0.10)` | 드롭다운·팝오버 |
| `shadow-lg` | `0 12px 32px rgb(15 23 42 / 0.16)` | 다이얼로그·모달 (이때만 테두리 생략) |

### 간격 — 새 토큰 없음, Tailwind 4px 그리드 위 사용 규칙만 고정

페이지 여백 24 (`p-6`) · 카드 내부 20 (`p-5`) · 테이블 셀 16×12 (`px-4 py-3`) ·
섹션 사이 24 (`gap-6`) · 폼 필드 사이 16 (`gap-4`) · 인접 버튼 8 (`gap-2`)

### 포커스

모든 인터랙티브 요소 공통: 테두리 `accent` + 3px 링 `ring` 25% 불투명도
(`focus-visible` 기준, 마우스 클릭에는 링을 띄우지 않는다).

## 구현 아키텍처

- 토큰은 `src/app/globals.css`의 `@theme` 블록에 정의한다. 원시 층은 Tailwind 4 내장 팔레트
  변수(`--color-slate-50` 등)를 그대로 쓰므로 **원시 토큰을 재정의하지 않는다.**
  시맨틱 토큰이 내장 변수를 참조한다 (예: `--color-bg: var(--color-slate-50)`).
  주의: 다른 변수를 참조하는 토큰은 Tailwind 4에서 `@theme inline` 블록에 정의해야 한다.
- 화면 코드(`ui.tsx`, `Shell.tsx`, 각 page)는 시맨틱 토큰만 참조한다.
  `slate-*`·`teal-*` 유틸리티를 컴포넌트에서 직접 쓰지 않는다 — 이것이 2층 구조의 유일한 사용 규칙이다.
- Pretendard는 npm `pretendard` 패키지를 의존성에 추가하고 globals.css에서 임포트한다.

### 기존 토큰 → 새 토큰 매핑 (마이그레이션 기준표)

| 기존 | 새 토큰 |
|---|---|
| `--color-paper` | `bg` |
| `--color-surface` | `surface` |
| `--color-surface-alt` | `surface-muted` |
| `--color-ink` | 글자면 `text`, 버튼 배경이면 `accent` (역할에 따라 분리) |
| `--color-muted` | `text-muted` |
| `--color-faint` | `text-faint` |
| `--color-line` | `border` |
| `--color-accent` / `-soft` | `accent` / `accent-soft` (값은 네이비 → 틸) |
| `--color-warn` / `-soft` | `warn`(면) 또는 `warn-text`(글자) / `warn-soft` |
| `--color-danger` / `-soft` | `danger`(면) 또는 `danger-text`(글자) / `danger-soft` |
| (없음) | `success` 계열 신설 |
| `--font-serif` | 폐기 → `font-sans` (Pretendard) |
| `--font-mono` (Courier) | 시스템 등폭 스택으로 교체, 코드성 텍스트 전용으로 축소 |

## 범위 밖

- 다크 모드 (시맨틱 이름만 준비, 팔레트는 미설계)
- 차트·데이터 시각화 팔레트 (대시보드에 차트를 넣게 될 때 별도 설계)
- 컴포넌트 신규 추가·레이아웃 변경 (토큰 교체와 그에 따른 기존 컴포넌트 재스타일까지만)
- 로그인 가드·robots 등 비주얼 외 동작

## 검증

- `npm run typecheck` 통과
- 로그인 가드 임시 해제 상태(현재)에서 9개 페이지 전부 육안 확인:
  세리프·Courier·종이색·네이비가 남은 곳이 없는지, 태그가 "50 배경 + 700 글자"인지
- 대비 확인: 글자로 쓰인 틸·상태색이 모두 700 단계인지 코드 검색으로 확인
