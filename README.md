# project-bookey-admin

bookey 관리자 백오피스 (Next.js).

관련 저장소
- **[project-bookey-backend](https://github.com/project-bookey/project-bookey-backend)** — 백엔드 API
- **[project-bookey-app](https://github.com/project-bookey/project-bookey-app)** — 모바일 앱

> 사용자 앱과 **코드·빌드·도메인·인증을 공유하지 않습니다.** 관리자 번들이 사용자에게
> 전달되는 경로를 원천 차단하기 위해 저장소부터 분리했습니다. 검색엔진 색인도 막혀 있습니다.

## 구성

```
project-bookey-admin/
├─ src/app/
│   ├─ (admin)/          로그인 뒤 화면 — 공통 셸(layout.tsx)
│   │   ├─ page.tsx        대시보드 — KPI · 처리 대기 큐
│   │   ├─ moderation/     신고 큐 (SLA 48h) — 티켓 상세(신고자·원문·작성자 이력)에서 판정
│   │   ├─ contents/       콘텐츠 검수 — 독후감·리뷰·모임 글·댓글·한줄평 숨김/복구/삭제
│   │   ├─ inquiries/      고객문의 (1:1) 답변 · 수정
│   │   ├─ users/          회원 상세(서랍) — 개요 · 지갑/결제 · 제재 · 기기/동의, 로그인 끊기
│   │   ├─ payments/       결제 조회 — 주문번호로 책갈피 구매 찾기
│   │   ├─ books/          도서 메타 보정
│   │   ├─ editor-picks/   홈 '추천' 줄(에디터 픽)
│   │   ├─ reviews/        검증 등급 심사 — 상태·등급·신고·회원·도서로 거르기
│   │   ├─ clubs/          모임 운영 · 코드 회전 · 강제 해산
│   │   ├─ faqs/           FAQ 작성 · 노출 · 순서
│   │   ├─ ads/            광고 · 공지 배너 — 이미지 올리기 · 상태(노출/예약/종료/꺼짐) · 켜기/끄기 · 복제
│   │   ├─ notifications/  발송 통계 · 운영 스위치(킬스위치)
│   │   ├─ push/           전체 푸시(공지·광고 캠페인) — 미리보기 · 대상자 수 · 테스트 발송 (최고 관리자)
│   │   ├─ app-versions/   앱 최소/최신 버전 안내 · 점검 예고 (최고 관리자)
│   │   ├─ audit/          감사 로그
│   │   ├─ admins/         관리자 계정 — 추가 · 역할 · 정지 · 비밀번호/2FA 초기화 (최고 관리자)
│   │   └─ account/        내 계정 · 비밀번호 변경 · 2단계 인증 등록
│   └─ login/
├─ src/lib/            API 클라이언트 · 타입 별칭 · 라벨 · 쿼리 키 · URL 상태(useListParams) · 권한(useMe)
├─ src/components/     셸 · 공용 UI · Modal · Confirm · 토스트 · QueryState · BookPicker
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

## 화면 규칙

- 목록의 필터·쪽·열린 상세는 URL 에 둔다(`useListParams`) — 새로고침·뒤로가기·링크 공유가 된다.
- 메뉴·버튼은 서버가 내 정보(`/auth/me`)에 실어 주는 `capabilities` 로 가린다(`useCan`, `<Can>`). 역할표를 웹에 두지 않는다.
- 확인이 필요한 조치는 `useConfirm()` 을 쓴다(사유 입력·확인 문구 입력 지원). `window.confirm` 은 쓰지 않는다.
- 변경 실패는 기본으로 토스트가 뜬다. 화면 안에 오류를 직접 그리면 mutation 에 `meta: { inlineError: true }` 를 단다.

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

## AWS 배포

현재 운영 배포는 EC2 프리티어 인스턴스 1대 + Docker Compose 기준입니다. `main` 브랜치에 푸시하면
`.github/workflows/deploy-ec2.yml` 이 typecheck/lint/build를 통과한 뒤 EC2에 소스를 업로드하고 `admin` 서비스만 다시 빌드/기동합니다.

GitHub Repository Variables:

| 키 | 예시 |
|---|---|
| `EC2_APP_DIR` | `/opt/bookey` |
| `NEXT_PUBLIC_ADMIN_API_URL` | `https://api.bookey.site` |

GitHub Repository Secrets:

| 키 | 담는 값 |
|---|---|
| `EC2_HOST` | EC2 public IP 또는 DNS |
| `EC2_USER` | 예: `ec2-user` |
| `EC2_SSH_KEY` | EC2 접속용 private key 전체 내용 |

준비할 AWS 리소스:

| 리소스 | 권장 이름 | 비고 |
|---|---|---|
| EC2 | `bookey-prod` | Amazon Linux 2023, `t4g.micro`, Docker/Compose 설치 |
| Elastic IP | `43.200.154.240` | DNS A 레코드 대상 |
| Security Group | `bookey-ec2-sg` | `80`·`443` 공개, nginx가 내부 `3100`으로 연결 |
| `/opt/bookey/docker-compose.yml` | 서버 로컬 파일 | `admin` 서비스 정의 |

운영 관리자 주소는 `https://admin.bookey.site`입니다. Google Cloud Run 배포는 제거했고,
`Deploy to EC2`가 자동 배포를 담당합니다. 빌드·타입 검사·lint를 통과한 소스만 반영하며
배포 전 이미지·소스를 백업하고 상태 확인 실패 시 이전 버전으로 복구합니다.

AWS 자동배포는 `AWS_DEPLOY_ROLE_ARN`, `EC2_SECURITY_GROUP_ID` 저장소 변수와 GitHub OIDC를 사용합니다. 관리자 저장소 main만 역할을 사용할 수 있으며, 배포 러너 IPv4의 SSH 접근을 임시 허용하고 종료 시 제거합니다.
