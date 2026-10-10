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
/** 메뉴·버튼을 가리는 권한 — 서버가 역할에서 계산해 내 정보에 실어 준다. */
export type AdminCapability = AdminProfile['capabilities'][number];
export type TotpSecretView = Schemas['TotpSecretView'];
export type CreateAdminRequest = Schemas['CreateAdminRequest'];
export type AdminRow = Schemas['AdminRow'];
export type AdminStatus = AdminRow['status'];

// ── 대시보드 ─────────────────────────────────────────────
export type Dashboard = Schemas['DashboardView'];

// ── 회원 ────────────────────────────────────────────────
export type UserRow = Schemas['UserRow'];
export type UserDetail = Schemas['UserDetailView'];
export type SanctionRow = Schemas['SanctionRow'];
export type UserStatus = NonNullable<UserRow['status']>;
export type SanctionType = NonNullable<SanctionRow['type']>;
export type WalletAdjustRequest = Schemas['WalletAdjustRequest'];
export type SubscriptionGrantRequest = Schemas['SubscriptionGrantRequest'];

// ── 회원 CS (지갑 · 결제 · 기기 · 동의) ───────────────────
export type WalletSummary = Schemas['AdminWalletSummary'];
export type WalletTransactionRow = Schemas['AdminWalletTransactionRow'];
export type WalletTransactionKind = WalletTransactionRow['kind'];
export type SubscriptionRow = Schemas['AdminSubscriptionRow'];
export type SubscriptionStore = SubscriptionRow['store'];
export type SubscriptionStatus = SubscriptionRow['status'];
export type BookmarkPurchaseRow = Schemas['AdminBookmarkPurchaseRow'];
export type BookmarkPurchaseStatus = BookmarkPurchaseRow['status'];
export type DeviceRow = Schemas['AdminDeviceRow'];
export type IdentityRow = Schemas['AdminIdentityRow'];
export type ConsentRow = Schemas['AdminConsentRow'];
export type ConsentKind = ConsentRow['kind'];

// ── 도서 ────────────────────────────────────────────────
export type BookRow = Schemas['BookRow'];
export type UpdateBookRequest = Schemas['UpdateBookRequest'];

// ── 광고/배너 ───────────────────────────────────────────
export type BannerAdminView = Schemas['BannerAdminView'];
export type BannerUpsertRequest = Schemas['BannerUpsertRequest'];
export type BannerKind = BannerAdminView['kind'];

// ── 에디터 픽 ───────────────────────────────────────────
export type EditorPickView = Schemas['EditorPickView'];
export type EditorPickCreateRequest = Schemas['EditorPickCreateRequest'];
export type EditorPickUpdateRequest = Schemas['EditorPickUpdateRequest'];
export type BookSummary = Schemas['BookSummary'];

// ── 신고 큐 ─────────────────────────────────────────────
export type ModerationRow = Schemas['ModerationRow'];
export type ModerationSource = NonNullable<ModerationRow['sourceType']>;
export type ModerationStatus = NonNullable<ModerationRow['status']>;
export type ModerationResolution = NonNullable<Schemas['ResolveRequest']['resolution']>;
export type ModerationDetail = Schemas['ModerationDetailView'];
export type AbuseReportRow = Schemas['AbuseReportRow'];

// ── 콘텐츠 검수 ─────────────────────────────────────────
export type ContentRow = Schemas['AdminContentRow'];
export type ContentDetail = Schemas['AdminContentDetail'];
export type ContentAction = ContentRow['supportedActions'][number];
/** 콘텐츠 검수에서 다루는 종류 — 신고 대상 중 모임·회원을 뺀 것. */
export type ContentType = Exclude<ModerationSource, 'CLUB' | 'USER'>;

// ── 검증 심사 ───────────────────────────────────────────
export type ReviewRow = Schemas['ReviewRow'];
export type VerificationLevel = NonNullable<ReviewRow['verificationLevel']>;

// ── 모임 ────────────────────────────────────────────────
export type ClubRow = Schemas['ClubRow'];
export type ClubStatus = NonNullable<ClubRow['status']>;

// ── 고객문의 ────────────────────────────────────────────
export type InquiryRow = Schemas['InquiryRow'];
export type InquiryAdminView = Schemas['InquiryAdminView'];
export type InquiryImageView = Schemas['InquiryImageView'];
export type InquiryStatus = NonNullable<InquiryRow['status']>;
export type InquiryCategory = NonNullable<InquiryRow['category']>;

// ── FAQ ─────────────────────────────────────────────────
export type FaqAdminView = Schemas['FaqAdminView'];
export type FaqUpsertRequest = Schemas['FaqUpsertRequest'];

// ── 운영 ────────────────────────────────────────────────
export type NotificationStats = Schemas['NotificationStats'];
export type OpsFlagRow = Schemas['OpsFlagRow'];
export type AuditRow = Schemas['AuditRow'];
