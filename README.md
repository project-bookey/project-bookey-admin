# project-bookey-admin

bookey 관리자 백오피스 (Next.js).

관련 저장소
- **[project-bookey-backend](https://github.com/Jay-0315/project-bookey-backend)** — 백엔드 API, 기획서
- **[project-bookey-app](https://github.com/Jay-0315/project-bookey-app)** — 모바일 앱

> 사용자 앱과 **코드·빌드·도메인·인증을 공유하지 않습니다.** 관리자 번들이 사용자에게
> 전달되는 경로를 원천 차단하기 위해 저장소부터 분리했습니다. 검색엔진 색인도 막혀 있습니다.

## 구성

```
project-bookey-admin/
├─ src/app/
│   ├─ page.tsx        대시보드 — KPI · 처리 대기 큐
│   ├─ moderation/     신고 큐 (SLA 48h)
│   ├─ users/          회원 · 제재 · PII 열람
│   ├─ books/          도서 메타 보정
│   ├─ reviews/        검증 등급 심사
│   ├─ clubs/          모임 운영 · 코드 회전 · 강제 해산
│   ├─ notifications/  발송 통계 · 운영 스위치(킬스위치)
│   ├─ audit/          감사 로그
│   └─ login/
├─ src/lib/            API 클라이언트 · 타입
├─ src/components/     셸 · 공용 UI
└─ scripts/            OpenAPI → TS 타입 생성기
```

## 시작하기

```bash
# 백엔드 저장소에서 API 서버를 먼저 띄웁니다 (http://localhost:8080)
npm install
npm run dev        # http://localhost:3100
```

로컬 시드 계정: `admin@bookey.local` / `bookey-local-1234`
(백엔드의 `ADMIN_SEED_PASSWORD` 로 바꿀 수 있습니다.)

## 백엔드와의 계약

```bash
npm run types                                    # 로컬 서버 기준
BOOKEY_API_URL=https://api.bookey.app npm run types
```

`src/api/generated.ts` 가 만들어집니다. **이 파일은 커밋합니다** — 저장소만 받아도 바로 빌드되고,
서버 API 가 바뀌면 무엇이 달라졌는지 변경 이력에 그대로 드러나기 때문입니다.

앱 코드는 생성 타입을 직접 쓰지 않고, 얇은 별칭 층을 거쳐 씁니다. 필드를 손으로 적는 곳은 없습니다.

## 운영 주의

- 관리자 API 는 서비스 API 와 **분리된 인증 체계**입니다. 서비스 JWT 로는 접근할 수 없습니다.
- 회원 이메일은 기본 마스킹이며, 전체 열람은 **사유 입력 후 1회성**으로만 가능하고 감사 로그에 남습니다.
- 모든 관리자 행위(조회 포함)가 `admin_audit_logs` 에 기록됩니다.

## 환경 변수

| 키 | 설명 |
|---|---|
| `NEXT_PUBLIC_ADMIN_API_URL` | 관리자 API 주소 (기본 `http://localhost:8080`) |

## 검사

```bash
npm run typecheck
```
