/**
 * 관리자 API 응답 타입.
 *
 * 실제 정의는 백엔드가 발행하는 OpenAPI 문서에서 생성한다(`npm run types`).
 * 이 파일은 생성 타입에 화면에서 쓰기 좋은 이름을 붙여 다시 내보내는 얇은 층이다.
 * 여기에 필드를 직접 적지 않는다 — 서버와 어긋나기 시작하는 지점이 되기 때문이다.
 */
import type { components } from '@/api/generated';

type Schemas = components['schemas'];

/** 페이지 응답 봉투. 서버가 내려주는 형태를 그대로 쓰되 항목 타입만 갈아끼운다. */
export type Page<T> = Omit<Schemas['PageResponseUserRow'], 'content'> & { content: T[] };

// ── 인증 ─────────────────────────────────────────────────
export type AdminProfile = Schemas['AdminProfile'];
export type LoginResponse = Schemas['LoginResponse'];
export type AdminRole = NonNullable<AdminProfile['role']>;

// ── 대시보드 ─────────────────────────────────────────────
export type Dashboard = Schemas['DashboardView'];

// ── 회원 ────────────────────────────────────────────────
export type UserRow = Schemas['UserRow'];
export type UserDetail = Schemas['UserDetailView'];
export type SanctionRow = Schemas['SanctionRow'];
export type UserStatus = NonNullable<UserRow['status']>;
export type SanctionType = NonNullable<SanctionRow['type']>;

// ── 도서 ────────────────────────────────────────────────
export type BookRow = Schemas['BookRow'];

// ── 신고 큐 ─────────────────────────────────────────────
export type ModerationRow = Schemas['ModerationRow'];
export type ModerationSource = NonNullable<ModerationRow['sourceType']>;
export type ModerationStatus = NonNullable<ModerationRow['status']>;
export type ModerationResolution = NonNullable<Schemas['ResolveRequest']['resolution']>;

// ── 검증 심사 ───────────────────────────────────────────
export type ReviewRow = Schemas['ReviewRow'];
export type VerificationLevel = NonNullable<ReviewRow['verificationLevel']>;

// ── 모임 ────────────────────────────────────────────────
export type ClubRow = Schemas['ClubRow'];
export type ClubStatus = NonNullable<ClubRow['status']>;

// ── 운영 ────────────────────────────────────────────────
export type NotificationStats = Schemas['NotificationStats'];
export type OpsFlagRow = Schemas['OpsFlagRow'];
export type AuditRow = Schemas['AuditRow'];
