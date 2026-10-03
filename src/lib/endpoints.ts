import { adminApi } from './api';
import type {
  AdminProfile, AuditRow, BannerAdminView, BannerKind, BannerUpsertRequest, BookRow, ClubRow, ClubStatus, Dashboard,
  FaqAdminView, FaqUpsertRequest, InquiryAdminView, InquiryCategory, InquiryRow, InquiryStatus, LoginResponse,
  ModerationResolution, ModerationRow, ModerationSource, ModerationStatus, NotificationStats,
  OpsFlagRow, Page, ReviewRow, SanctionType, UserDetail, UserRow, UserStatus, VerificationLevel,
} from './types';

export const authApi = {
  login: (email: string, password: string, totpCode?: string) =>
    adminApi<LoginResponse>('/admin/v1/auth/login', {
      method: 'POST',
      auth: false,
      body: { email, password, totpCode: totpCode || undefined },
    }),
  me: () => adminApi<AdminProfile>('/admin/v1/auth/me'),
};

export const dashboardApi = {
  get: () => adminApi<Dashboard>('/admin/v1/dashboard'),
};

export const usersApi = {
  list: (keyword?: string, status?: UserStatus, page = 0) =>
    adminApi<Page<UserRow>>('/admin/v1/users', { query: { keyword, status, page, size: 20 } }),
  detail: (userId: number, revealReason?: string) =>
    adminApi<UserDetail>(`/admin/v1/users/${userId}`, { query: { revealReason } }),
  sanction: (userId: number, body: { type: SanctionType; reason: string; durationDays?: number }) =>
    adminApi<void>(`/admin/v1/users/${userId}/sanctions`, { method: 'POST', body }),
  releaseSanction: (userId: number, sanctionId: number, reason: string) =>
    adminApi<void>(`/admin/v1/users/${userId}/sanctions/${sanctionId}`, {
      method: 'DELETE',
      query: { reason },
    }),
};

export const booksApi = {
  list: (keyword?: string, page = 0) =>
    adminApi<Page<BookRow>>('/admin/v1/books', { query: { keyword, page, size: 20 } }),
  update: (bookId: number, body: Record<string, unknown>) =>
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
};

export const moderationApi = {
  queue: (status?: ModerationStatus, sourceType?: ModerationSource, page = 0) =>
    adminApi<Page<ModerationRow>>('/admin/v1/moderation', {
      query: { status, sourceType, page, size: 20 },
    }),
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
      query: { status, category, page, size: 20 },
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
  list: (bookId?: number, page = 0) =>
    adminApi<Page<ReviewRow>>('/admin/v1/reviews', { query: { bookId, page, size: 20 } }),
  overrideVerification: (reviewId: number, level: VerificationLevel, reason: string) =>
    adminApi<void>(`/admin/v1/reviews/${reviewId}/verification`, {
      method: 'POST',
      body: { level, reason },
    }),
};

export const clubsApi = {
  list: (keyword?: string, status?: ClubStatus, page = 0) =>
    adminApi<Page<ClubRow>>('/admin/v1/clubs', { query: { keyword, status, page, size: 20 } }),
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
  list: (adminId?: number, action?: string, page = 0) =>
    adminApi<Page<AuditRow>>('/admin/v1/audit-logs', { query: { adminId, action, page, size: 50 } }),
};
