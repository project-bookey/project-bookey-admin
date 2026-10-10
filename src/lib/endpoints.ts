import { adminApi, adminUpload } from './api';
import type {
  AdminProfile, AuditRow, BannerAdminView, BannerKind, BannerUpsertRequest, BookRow, ClubRow, ClubStatus, Dashboard,
  EditorPickCreateRequest, EditorPickUpdateRequest, EditorPickView, TotpSecretView,
  AdminRole, AdminRow, AdminStatus, BookmarkPurchaseRow, BookmarkPurchaseStatus, CreateAdminRequest,
  SubscriptionRow, SubscriptionStore, WalletTransactionRow,
  AbuseReportRow, ContentAction, ContentDetail, ContentRow, ContentType, ModerationDetail,
  AppReleaseConfig, AppReleaseConfigRequest, BannerImageView, DevicePlatform, MaintenanceWindow,
  MaintenanceWindowRequest, PushAudience, PushCampaignKind, PushCampaignRequest, PushCampaignRow, PushCampaignView,
  PushTestRequest,
  FaqAdminView, FaqUpsertRequest, InquiryAdminView, InquiryCategory, InquiryRow, InquiryStatus, LoginResponse,
  ModerationResolution, ModerationRow, ModerationSource, ModerationStatus, NotificationStats,
  OpsFlagRow, Page, ReviewRow, SanctionType, SubscriptionGrantRequest, UpdateBookRequest, UserDetail, UserRow,
  UserStatus, VerificationLevel, WalletAdjustRequest,
} from './types';

const PAGE_SIZE = 20;

export const authApi = {
  login: (email: string, password: string, totpCode?: string) =>
    adminApi<LoginResponse>('/admin/v1/auth/login', {
      method: 'POST',
      auth: false,
      body: { email, password, totpCode: totpCode || undefined },
    }),
  me: () => adminApi<AdminProfile>('/admin/v1/auth/me'),
  /** 2FA 등록 1단계 — 시크릿만 발급한다. 확인 전에는 켜지지 않는다. 이미 켜져 있으면 409. */
  prepareTotp: () => adminApi<TotpSecretView>('/admin/v1/auth/totp', { method: 'POST' }),
  /** 2FA 등록 2단계 — 인증 앱 코드가 맞아야 켜진다. */
  confirmTotp: (code: string) =>
    adminApi<AdminProfile>('/admin/v1/auth/totp/confirm', { method: 'POST', body: { code } }),
  /** 바꾸면 지금 로그인도 끊긴다 — 새 비밀번호로 다시 로그인해야 한다. */
  changeOwnPassword: (currentPassword: string, newPassword: string) =>
    adminApi<void>('/admin/v1/auth/me/password', { method: 'PATCH', body: { currentPassword, newPassword } }),
};

/** 관리자 계정 관리 — 최고 관리자 전용. */
export const adminsApi = {
  list: () => adminApi<AdminRow[]>('/admin/v1/auth/admins'),
  create: (body: CreateAdminRequest) =>
    adminApi<AdminProfile>('/admin/v1/auth/admins', { method: 'POST', body }),
  changeRole: (adminId: number, role: AdminRole) =>
    adminApi<void>(`/admin/v1/auth/admins/${adminId}/role`, { method: 'PATCH', query: { role } }),
  /** 정지하면 다음 요청부터 막힌다. */
  changeStatus: (adminId: number, status: AdminStatus, reason: string) =>
    adminApi<void>(`/admin/v1/auth/admins/${adminId}/status`, { method: 'PATCH', body: { status, reason } }),
  /** 그 관리자의 기존 로그인이 끊긴다. */
  resetPassword: (adminId: number, newPassword: string, reason: string) =>
    adminApi<void>(`/admin/v1/auth/admins/${adminId}/password`, { method: 'PUT', body: { newPassword, reason } }),
  resetTotp: (adminId: number, reason: string) =>
    adminApi<void>(`/admin/v1/auth/admins/${adminId}/totp`, { method: 'DELETE', query: { reason } }),
};

export const dashboardApi = {
  get: () => adminApi<Dashboard>('/admin/v1/dashboard'),
};

export const usersApi = {
  list: (keyword?: string, status?: UserStatus, page = 0) =>
    adminApi<Page<UserRow>>('/admin/v1/users', { query: { keyword, status, page, size: PAGE_SIZE } }),
  /** 상세 — 이메일은 가려서 온다. 열 때마다 서버가 열람 기록(VIEW_USER)을 남긴다. */
  detail: (userId: number) => adminApi<UserDetail>(`/admin/v1/users/${userId}`),
  /** 이메일 전체 보기 — 사유가 개인정보 열람 기록(VIEW_USER_PII)으로 남는다. 한 번만 부르고 결과는 화면에 들고 있는다. */
  revealEmail: (userId: number, reason: string) =>
    adminApi<UserDetail>(`/admin/v1/users/${userId}`, { query: { revealReason: reason } }),
  /** 사유와 기간은 회원에게 알림으로 전달된다. */
  sanction: (userId: number, body: { type: SanctionType; reason: string; durationDays?: number }) =>
    adminApi<void>(`/admin/v1/users/${userId}/sanctions`, { method: 'POST', body }),
  /** 남은 제재로 상태를 다시 계산한다 — 다른 제재가 살아 있으면 그 상태가 남는다. */
  releaseSanction: (userId: number, sanctionId: number, reason: string) =>
    adminApi<void>(`/admin/v1/users/${userId}/sanctions/${sanctionId}`, {
      method: 'DELETE',
      query: { reason },
    }),
  /** 각 값은 더하거나 빼는 양(±). 잔액보다 많이 빼면 서버가 막는다. */
  adjustWallet: (userId: number, body: WalletAdjustRequest) =>
    adminApi<void>(`/admin/v1/users/${userId}/wallet`, { method: 'POST', body }),
  /** 남은 구독 기간 뒤에 이어 붙인다. */
  grantSubscription: (userId: number, body: SubscriptionGrantRequest) =>
    adminApi<void>(`/admin/v1/users/${userId}/subscription`, { method: 'POST', body }),
  revokeSubscription: (userId: number, reason: string) =>
    adminApi<void>(`/admin/v1/users/${userId}/subscription`, { method: 'DELETE', query: { reason } }),
  /** 결제 열람 권한 필요. 첫 쪽 조회는 열람 기록(VIEW_USER_PAYMENTS)이 남는다. */
  walletTransactions: (userId: number, page = 0) =>
    adminApi<Page<WalletTransactionRow>>(`/admin/v1/users/${userId}/wallet-transactions`, {
      query: { page, size: PAGE_SIZE },
    }),
  subscriptions: (userId: number) => adminApi<SubscriptionRow[]>(`/admin/v1/users/${userId}/subscriptions`),
  purchases: (userId: number, page = 0) =>
    adminApi<Page<BookmarkPurchaseRow>>(`/admin/v1/users/${userId}/bookmark-purchases`, {
      query: { page, size: PAGE_SIZE },
    }),
  /** 회원의 로그인을 모두 끊는다 — 다음 요청부터 다시 로그인해야 한다. */
  revokeSessions: (userId: number, reason: string) =>
    adminApi<void>(`/admin/v1/users/${userId}/sessions/revoke`, { method: 'POST', body: { reason } }),
};

export const paymentsApi = {
  /** 주문번호는 앞부분만 넣어도 찾는다. */
  search: (filter: { orderId?: string; status?: BookmarkPurchaseStatus; provider?: SubscriptionStore }, page = 0) =>
    adminApi<Page<BookmarkPurchaseRow>>('/admin/v1/bookmark-purchases', {
      query: { ...filter, page, size: PAGE_SIZE },
    }),
};

export const booksApi = {
  list: (keyword?: string, page = 0) =>
    adminApi<Page<BookRow>>('/admin/v1/books', { query: { keyword, page, size: PAGE_SIZE } }),
  update: (bookId: number, body: UpdateBookRequest) =>
    adminApi<void>(`/admin/v1/books/${bookId}`, { method: 'PATCH', body }),
};

export const adsApi = {
  list: (kind?: BannerKind) => adminApi<BannerAdminView[]>('/admin/v1/banners', { query: { kind } }),
  create: (body: BannerUpsertRequest) =>
    adminApi<BannerAdminView>('/admin/v1/banners', { method: 'POST', body }),
  update: (bannerId: number, body: BannerUpsertRequest) =>
    adminApi<BannerAdminView>(`/admin/v1/banners/${bannerId}`, { method: 'PUT', body }),
  remove: (bannerId: number) =>
    adminApi<void>(`/admin/v1/banners/${bannerId}`, { method: 'DELETE' }),
  /** 운영 서버 저장소가 꺼져 있으면 503 — 그때는 이미지 URL 을 직접 넣는다. */
  uploadImage: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return adminUpload<BannerImageView>('/admin/v1/banners/images', form);
  },
};

/** 앱 버전 안내 · 점검 일정 — 바꾸는 것은 최고 관리자만. */
export const appConfigApi = {
  releases: () => adminApi<AppReleaseConfig[]>('/admin/v1/app-config'),
  updateRelease: (platform: DevicePlatform, body: AppReleaseConfigRequest) =>
    adminApi<AppReleaseConfig>(`/admin/v1/app-config/${platform}`, { method: 'PUT', body }),
  maintenance: (page = 0) =>
    adminApi<Page<MaintenanceWindow>>('/admin/v1/maintenance-windows', { query: { page, size: PAGE_SIZE } }),
  createMaintenance: (body: MaintenanceWindowRequest) =>
    adminApi<MaintenanceWindow>('/admin/v1/maintenance-windows', { method: 'POST', body }),
  updateMaintenance: (id: number, body: MaintenanceWindowRequest) =>
    adminApi<MaintenanceWindow>(`/admin/v1/maintenance-windows/${id}`, { method: 'PUT', body }),
  cancelMaintenance: (id: number, reason: string) =>
    adminApi<MaintenanceWindow>(`/admin/v1/maintenance-windows/${id}/cancel`, { method: 'POST', body: { reason } }),
};

/** 전체 푸시 — 최고 관리자만. 실제 발송은 서버 잡이 1분마다 한다. */
export const pushApi = {
  list: (page = 0) => adminApi<Page<PushCampaignRow>>('/admin/v1/push-campaigns', { query: { page, size: PAGE_SIZE } }),
  detail: (id: number) => adminApi<PushCampaignView>(`/admin/v1/push-campaigns/${id}`),
  audience: (kind: PushCampaignKind) =>
    adminApi<PushAudience>('/admin/v1/push-campaigns/audience', { query: { kind } }),
  create: (body: PushCampaignRequest) =>
    adminApi<PushCampaignRow>('/admin/v1/push-campaigns', { method: 'POST', body }),
  update: (id: number, body: PushCampaignRequest) =>
    adminApi<PushCampaignRow>(`/admin/v1/push-campaigns/${id}`, { method: 'PUT', body }),
  cancel: (id: number, reason: string) =>
    adminApi<PushCampaignRow>(`/admin/v1/push-campaigns/${id}/cancel`, { method: 'POST', body: { reason } }),
  test: (body: PushTestRequest) =>
    adminApi<{ delivered: number }>('/admin/v1/push-campaigns/test', { method: 'POST', body }),
};

/** 홈 '추천' 줄(에디터 픽). 비어 있으면 앱은 YES24 베스트셀러를 대신 보여 준다. */
export const editorPicksApi = {
  list: () => adminApi<EditorPickView[]>('/admin/v1/editor-picks'),
  create: (body: EditorPickCreateRequest) =>
    adminApi<EditorPickView>('/admin/v1/editor-picks', { method: 'POST', body }),
  update: (pickId: number, body: EditorPickUpdateRequest) =>
    adminApi<EditorPickView>(`/admin/v1/editor-picks/${pickId}`, { method: 'PATCH', body }),
  remove: (pickId: number) => adminApi<void>(`/admin/v1/editor-picks/${pickId}`, { method: 'DELETE' }),
};

/** 콘텐츠 검수 — 독후감·리뷰·모임 글·댓글·한줄평. */
export const contentsApi = {
  list: (
    type: ContentType,
    filter: { userId?: number; bookId?: number; clubId?: number; status?: string; keyword?: string; reportedOnly?: boolean },
    page = 0,
  ) =>
    adminApi<Page<ContentRow>>('/admin/v1/contents', {
      query: { type, ...filter, reportedOnly: filter.reportedOnly || undefined, page, size: PAGE_SIZE },
    }),
  /** 원문 — 열람 기록(VIEW_CONTENT)이 남는다. */
  detail: (type: ContentType, id: number) => adminApi<ContentDetail>(`/admin/v1/contents/${type}/${id}`),
  /** 숨김·복구·삭제. 열린 신고도 함께 처리된다. */
  act: (type: ContentType, id: number, action: ContentAction, reason: string) =>
    adminApi<void>(`/admin/v1/contents/${type}/${id}/actions`, { method: 'POST', body: { action, reason } }),
};

export const moderationApi = {
  queue: (status?: ModerationStatus, sourceType?: ModerationSource, page = 0) =>
    adminApi<Page<ModerationRow>>('/admin/v1/moderation', {
      query: { status, sourceType, page, size: PAGE_SIZE },
    }),
  /** 신고 상세 — 신고자·사유·원문·작성자 제재 이력. 열람 기록(VIEW_MODERATION)이 남는다. */
  detail: (ticketId: number) => adminApi<ModerationDetail>(`/admin/v1/moderation/${ticketId}`),
  /** 한 회원이 신고한 내역. */
  reportsBy: (reporterId: number, page = 0) =>
    adminApi<Page<AbuseReportRow>>('/admin/v1/abuse-reports', { query: { reporterId, page, size: PAGE_SIZE } }),
  assign: (ticketId: number) =>
    adminApi<void>(`/admin/v1/moderation/${ticketId}/assign`, { method: 'POST' }),
  resolve: (
    ticketId: number,
    body: {
      resolution: ModerationResolution;
      note?: string;
      sanction?: { type: SanctionType; reason: string; durationDays?: number };
    },
  ) => adminApi<void>(`/admin/v1/moderation/${ticketId}/resolve`, { method: 'POST', body }),
};

export const inquiriesApi = {
  /** 답변 대기만 거르면 오래 기다린 순, 그 밖에는 최신 순으로 온다. */
  list: (status?: InquiryStatus, category?: InquiryCategory, page = 0) =>
    adminApi<Page<InquiryRow>>('/admin/v1/inquiries', {
      query: { status, category, page, size: PAGE_SIZE },
    }),
  /** 상세를 열 때마다 서버가 열람 기록(VIEW_INQUIRY)을 남긴다. */
  detail: (inquiryId: number) => adminApi<InquiryAdminView>(`/admin/v1/inquiries/${inquiryId}`),
  /** 첫 답변 — 사용자에게 알림이 간다. */
  answer: (inquiryId: number, answer: string) =>
    adminApi<InquiryAdminView>(`/admin/v1/inquiries/${inquiryId}/answer`, {
      method: 'POST',
      body: { answer },
    }),
  /** 답변 수정 — 알림은 다시 가지 않는다. */
  editAnswer: (inquiryId: number, answer: string) =>
    adminApi<InquiryAdminView>(`/admin/v1/inquiries/${inquiryId}/answer`, {
      method: 'PUT',
      body: { answer },
    }),
};

export const faqsApi = {
  /** 숨긴 항목까지 노출 순서대로 모두 온다. */
  list: () => adminApi<FaqAdminView[]>('/admin/v1/faqs'),
  create: (body: FaqUpsertRequest) =>
    adminApi<FaqAdminView>('/admin/v1/faqs', { method: 'POST', body }),
  update: (faqId: number, body: FaqUpsertRequest) =>
    adminApi<FaqAdminView>(`/admin/v1/faqs/${faqId}`, { method: 'PUT', body }),
  remove: (faqId: number) => adminApi<void>(`/admin/v1/faqs/${faqId}`, { method: 'DELETE' }),
  /** 숨긴 항목까지 전체 id 를 원하는 순서대로 보내야 한다 — 빠지면 서버가 400 으로 막는다. */
  reorder: (ids: number[]) =>
    adminApi<FaqAdminView[]>('/admin/v1/faqs/order', { method: 'PUT', body: { ids } }),
};

export const reviewsApi = {
  /** 숨김·삭제 리뷰까지 모두 최근 순. */
  list: (
    filter: { bookId?: number; userId?: number; status?: string; verificationLevel?: VerificationLevel; reportedOnly?: boolean },
    page = 0,
  ) =>
    adminApi<Page<ReviewRow>>('/admin/v1/reviews', {
      query: { ...filter, reportedOnly: filter.reportedOnly || undefined, page, size: PAGE_SIZE },
    }),
  overrideVerification: (reviewId: number, level: VerificationLevel, reason: string) =>
    adminApi<void>(`/admin/v1/reviews/${reviewId}/verification`, {
      method: 'POST',
      body: { level, reason },
    }),
};

export const clubsApi = {
  list: (keyword?: string, status?: ClubStatus, page = 0) =>
    adminApi<Page<ClubRow>>('/admin/v1/clubs', { query: { keyword, status, page, size: PAGE_SIZE } }),
  forceEnd: (clubId: number, reason: string) =>
    adminApi<void>(`/admin/v1/clubs/${clubId}/force-end`, { method: 'POST', body: { reason } }),
  rotateCode: (clubId: number, reason: string) =>
    adminApi<{ joinCode: string }>(`/admin/v1/clubs/${clubId}/rotate-code`, {
      method: 'POST',
      body: { reason },
    }),
};

export const opsApi = {
  notificationStats: () => adminApi<NotificationStats>('/admin/v1/notifications/stats'),
  flags: () => adminApi<OpsFlagRow[]>('/admin/v1/ops-flags'),
  updateFlag: (key: string, enabled: boolean, note?: string) =>
    adminApi<void>(`/admin/v1/ops-flags/${key}`, { method: 'PATCH', body: { enabled, note } }),
};

export const auditApi = {
  list: (filter: { adminId?: number; action?: string; targetType?: string; targetId?: number }, page = 0) =>
    adminApi<Page<AuditRow>>('/admin/v1/audit-logs', { query: { ...filter, page, size: 50 } }),
};
