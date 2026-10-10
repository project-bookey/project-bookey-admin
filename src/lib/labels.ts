/**
 * 서버 enum 을 화면 문구로 바꾸는 표.
 *
 * 키 목록은 생성 타입에서 오므로, 서버가 값을 더하면 여기서 typecheck 가 깨져 빠뜨릴 수 없다.
 * 화면마다 따로 들고 있던 표·색을 여기로 모았다 — 같은 상태가 화면마다 다르게 보이지 않게.
 */
import type {
  AdminRole, AdminStatus, BannerKind, ContentAction, ContentType, PushCampaignKind, PushCampaignStatus, BookmarkPurchaseStatus, ClubStatus, ConsentKind, DeviceRow, IdentityRow,
  InquiryCategory, InquiryStatus, ModerationResolution, ModerationSource, ModerationStatus, SanctionType,
  SubscriptionStatus, SubscriptionStore, UserStatus, VerificationLevel, WalletTransactionKind,
} from './types';

/** Tag 색. */
export type Tone = 'neutral' | 'accent' | 'warn' | 'danger';

// ── 고객문의 ────────────────────────────────────────────
export const INQUIRY_CATEGORY_LABEL: Record<InquiryCategory, string> = {
  USAGE: '이용 문의',
  ACCOUNT: '계정·로그인',
  BUG: '오류 신고',
  PAYMENT: '결제·구독',
  SUGGESTION: '제안',
  ETC: '기타',
};

/** Select 에 늘어놓는 순서. 고객문의와 FAQ 가 같은 유형 체계를 쓴다. */
export const INQUIRY_CATEGORIES: InquiryCategory[] = [
  'USAGE',
  'ACCOUNT',
  'BUG',
  'PAYMENT',
  'SUGGESTION',
  'ETC',
];

export const INQUIRY_STATUSES: InquiryStatus[] = ['WAITING', 'ANSWERED'];

export const INQUIRY_STATUS_LABEL: Record<InquiryStatus, string> = {
  WAITING: '답변 대기',
  ANSWERED: '답변 완료',
};

export const INQUIRY_STATUS_TONE: Record<InquiryStatus, Tone> = {
  WAITING: 'warn',
  ANSWERED: 'accent',
};

// ── 회원 · 제재 ─────────────────────────────────────────
export const USER_STATUSES: UserStatus[] = ['ACTIVE', 'WRITE_BANNED', 'SUSPENDED', 'TERMINATED'];

export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVE: '정상',
  WRITE_BANNED: '쓰기 정지',
  SUSPENDED: '이용 정지',
  TERMINATED: '영구 정지',
};

export const USER_STATUS_TONE: Record<UserStatus, Tone> = {
  ACTIVE: 'neutral',
  WRITE_BANNED: 'warn',
  SUSPENDED: 'danger',
  TERMINATED: 'danger',
};

export const SANCTION_TYPES: SanctionType[] = ['WARN', 'WRITE_BAN', 'SUSPEND', 'TERMINATE'];

export const SANCTION_TYPE_LABEL: Record<SanctionType, string> = {
  WARN: '경고',
  WRITE_BAN: '쓰기 정지',
  SUSPEND: '이용 정지',
  TERMINATE: '영구 정지',
};

/** 제재마다 무엇이 막히는지 — 적용 전에 보여 준다. */
export const SANCTION_TYPE_HINT: Record<SanctionType, string> = {
  WARN: '상태는 그대로 두고 경고 알림만 보냅니다.',
  WRITE_BAN: '글·리뷰·댓글·채팅·엽서·닉네임/사진 변경이 막힙니다. 읽기와 문의는 됩니다.',
  SUSPEND: '로그인이 막히고, 지금 쓰고 있는 세션도 바로 끊깁니다.',
  TERMINATE: '로그인이 막히고 모임에서 모두 나가며 푸시가 꺼집니다. 계정과 기록은 남아 풀 수 있습니다.',
};

// ── 지갑 · 결제 ─────────────────────────────────────────
export const WALLET_TRANSACTION_KIND_LABEL: Record<WalletTransactionKind, string> = {
  PURCHASE: '책갈피 구매',
  SUBSCRIPTION_GRANT: '구독 월 지급',
  AFFILIATE: '제휴 적립',
  EXCHANGE_POSTCARD: '엽서로 교환',
  EXCHANGE_STAMP: '우표로 교환',
  SEND_POSTCARD_FREE: '엽서 발송(무료분)',
  SEND_POSTCARD: '엽서 발송',
  ATTACH_STAMP: '우표 동봉',
  REPLY_STAMP: '답장 우표',
  CLUB_SEAT: '모임 자리 늘리기',
  CLUB_CHAT_UNLOCK: '모임 채팅 열기',
  ATTENDANCE: '출석 보상',
  ADMIN_ADJUST: '관리자 조정',
};

export const PAYMENT_STORE_LABEL: Record<SubscriptionStore, string> = {
  APPLE: 'App Store',
  GOOGLE: 'Google Play',
  TOSS: '토스(웹)',
  ADMIN: '관리자 지급',
};

export const PAYMENT_STORES: SubscriptionStore[] = ['APPLE', 'GOOGLE', 'TOSS', 'ADMIN'];

export const SUBSCRIPTION_STATUS_LABEL: Record<SubscriptionStatus, string> = {
  ACTIVE: '이용 중',
  EXPIRED: '만료',
  CANCELLED: '해지',
};

export const SUBSCRIPTION_STATUS_TONE: Record<SubscriptionStatus, Tone> = {
  ACTIVE: 'accent',
  EXPIRED: 'neutral',
  CANCELLED: 'warn',
};

export const PURCHASE_STATUSES: BookmarkPurchaseStatus[] = ['PAID', 'PENDING', 'CANCELLED'];

export const PURCHASE_STATUS_LABEL: Record<BookmarkPurchaseStatus, string> = {
  PENDING: '결제 대기',
  PAID: '결제 완료',
  CANCELLED: '취소',
};

export const PURCHASE_STATUS_TONE: Record<BookmarkPurchaseStatus, Tone> = {
  PENDING: 'warn',
  PAID: 'accent',
  CANCELLED: 'neutral',
};

// ── 기기 · 연동 · 동의 ───────────────────────────────────
export const DEVICE_PLATFORM_LABEL: Record<DeviceRow['platform'], string> = {
  IOS: 'iOS',
  ANDROID: 'Android',
};

export const AUTH_PROVIDER_LABEL: Record<IdentityRow['provider'], string> = {
  APPLE: 'Apple',
  GOOGLE: 'Google',
  KAKAO: '카카오',
};

export const CONSENT_KIND_LABEL: Record<ConsentKind, string> = {
  TERMS: '[필수] 이용약관',
  PRIVACY: '[필수] 개인정보 수집·이용',
  AGE_14: '[필수] 만 14세 이상',
  PROFILE_OPTIONAL: '[선택] 성별·생년월일',
  MARKETING: '[선택] 광고성 정보 수신',
  THIRD_PARTY_YES24: '[선택] YES24 제3자 제공',
};

// ── 신고 큐 ─────────────────────────────────────────────
export const MODERATION_SOURCES: ModerationSource[] = [
  'REVIEW', 'POST', 'CLUB_POST', 'POST_COMMENT', 'REVIEW_COMMENT', 'BOOK_REMARK', 'CLUB', 'USER',
];

export const MODERATION_SOURCE_LABEL: Record<ModerationSource, string> = {
  REVIEW: '리뷰',
  POST: '독후감',
  CLUB_POST: '모임 글',
  CLUB: '모임',
  USER: '회원',
  POST_COMMENT: '독후감 댓글',
  REVIEW_COMMENT: '리뷰 댓글',
  BOOK_REMARK: '한줄평',
};

export const MODERATION_RESOLUTION_LABEL: Record<ModerationResolution, string> = {
  KEEP: '유지',
  HIDE: '숨김',
  DELETE: '삭제',
  SANCTION: '숨김 + 제재',
};

export const REPORT_STATUS_LABEL: Partial<Record<string, string>> = {
  PENDING: '처리 전',
  RESOLVED: '처리됨',
  REJECTED: '기각',
};

// ── 콘텐츠 검수 ─────────────────────────────────────────
/** 콘텐츠 검수 탭 순서. */
export const CONTENT_TYPES: ContentType[] = [
  'POST', 'REVIEW', 'CLUB_POST', 'POST_COMMENT', 'REVIEW_COMMENT', 'BOOK_REMARK',
];

/** 숨김·복구가 되는(상태가 있는) 종류 — 나머지는 삭제만 된다. */
export const STATUSFUL_CONTENT_TYPES: ContentType[] = ['POST', 'REVIEW', 'CLUB_POST'];

export const CONTENT_STATUSES = ['VISIBLE', 'HIDDEN', 'DELETED'] as const;

export const CONTENT_STATUS_LABEL: Partial<Record<string, string>> = {
  VISIBLE: '노출',
  HIDDEN: '숨김',
  DELETED: '삭제',
};

export const CONTENT_STATUS_TONE: Partial<Record<string, Tone>> = {
  VISIBLE: 'neutral',
  HIDDEN: 'warn',
  DELETED: 'danger',
};

export const CONTENT_ACTION_LABEL: Record<ContentAction, string> = {
  HIDE: '숨김',
  RESTORE: '복구',
  DELETE: '삭제',
};

/** 확인창·토스트 문구 — '숨김할까요' 가 아니라 '숨길까요'. */
export const CONTENT_ACTION_VERB: Record<ContentAction, { ask: string; done: string }> = {
  HIDE: { ask: '숨길까요', done: '숨겼습니다' },
  RESTORE: { ask: '복구할까요', done: '복구했습니다' },
  DELETE: { ask: '삭제할까요', done: '삭제했습니다' },
};

export const POST_VISIBILITY_LABEL: Partial<Record<string, string>> = {
  PUBLIC: '공개',
  LINK: '링크 공개',
  PRIVATE: '비공개',
  CLUB: '모임 공개',
};

export const MODERATION_STATUSES: ModerationStatus[] = ['PENDING', 'IN_REVIEW', 'RESOLVED'];

export const MODERATION_STATUS_LABEL: Record<ModerationStatus, string> = {
  PENDING: '대기',
  IN_REVIEW: '검토 중',
  RESOLVED: '처리 완료',
};

export const MODERATION_STATUS_TONE: Record<ModerationStatus, Tone> = {
  PENDING: 'warn',
  IN_REVIEW: 'neutral',
  RESOLVED: 'accent',
};

export const MODERATION_RESOLUTIONS: { value: ModerationResolution; label: string; description: string }[] = [
  { value: 'KEEP', label: '유지', description: '문제 없음 — 다시 노출' },
  { value: 'HIDE', label: '숨김', description: '비노출 처리' },
  { value: 'DELETE', label: '삭제', description: '내용 삭제' },
  { value: 'SANCTION', label: '숨김 + 제재', description: '작성자에게 제재 적용' },
];

// ── 검증 심사 ───────────────────────────────────────────
export const VERIFICATION_LEVELS: VerificationLevel[] = [
  'VERIFIED_FULL',
  'VERIFIED_PARTIAL',
  'UNVERIFIED',
  'FLAGGED',
];

export const VERIFICATION_LEVEL_LABEL: Record<VerificationLevel, string> = {
  VERIFIED_FULL: '완독 검증',
  VERIFIED_PARTIAL: '부분 검증',
  UNVERIFIED: '미검증',
  FLAGGED: '의심',
};

export const VERIFICATION_LEVEL_TONE: Record<VerificationLevel, Tone> = {
  VERIFIED_FULL: 'accent',
  VERIFIED_PARTIAL: 'neutral',
  UNVERIFIED: 'neutral',
  FLAGGED: 'danger',
};

// ── 모임 ────────────────────────────────────────────────
export const CLUB_STATUSES: ClubStatus[] = ['RECRUITING', 'ACTIVE', 'ENDED', 'ARCHIVED'];

export const CLUB_STATUS_LABEL: Record<ClubStatus, string> = {
  RECRUITING: '모집 중',
  ACTIVE: '진행 중',
  ENDED: '종료',
  ARCHIVED: '보관',
};

export const CLUB_STATUS_TONE: Record<ClubStatus, Tone> = {
  RECRUITING: 'accent',
  ACTIVE: 'accent',
  ENDED: 'neutral',
  ARCHIVED: 'neutral',
};

// ── 도서 ────────────────────────────────────────────────
/** 도서 출처는 서버에서 문자열로 온다. 모르는 값은 그대로 보여 준다. */
export const BOOK_SOURCE_LABEL: Partial<Record<string, string>> = {
  KAKAO: '카카오',
  ALADIN: '알라딘',
  GOOGLE: '구글',
  NAVER: '네이버',
  MANUAL: '직접 등록',
};

// ── 광고 · 공지 ─────────────────────────────────────────
export const BANNER_KINDS: BannerKind[] = ['AD', 'NOTICE'];

export const BANNER_KIND_LABEL: Record<BannerKind, string> = {
  AD: '광고',
  NOTICE: '공지',
};

// ── 앱 버전 · 점검 ───────────────────────────────────────
export const MAINTENANCE_STATUS_LABEL: Partial<Record<string, string>> = {
  SCHEDULED: '예정',
  ACTIVE: '진행 중',
  ENDED: '끝남',
  CANCELLED: '취소',
};

export const MAINTENANCE_STATUS_TONE: Partial<Record<string, Tone>> = {
  SCHEDULED: 'accent',
  ACTIVE: 'danger',
  ENDED: 'neutral',
  CANCELLED: 'neutral',
};

// ── 전체 푸시 ───────────────────────────────────────────
export const PUSH_KINDS: PushCampaignKind[] = ['NOTICE', 'MARKETING'];

export const PUSH_KIND_LABEL: Record<PushCampaignKind, string> = {
  NOTICE: '서비스 공지',
  MARKETING: '광고',
};

export const PUSH_KIND_HINT: Record<PushCampaignKind, string> = {
  NOTICE: '가입자 모두에게 갑니다. 약관 변경·점검·장애처럼 서비스 안내만 — 이벤트·혜택 홍보는 광고로 보내야 합니다.',
  MARKETING: '광고성 정보 수신에 동의한 회원에게만, 08–21시에만 갑니다. 제목에 (광고), 본문 끝에 수신 거부 방법이 자동으로 붙습니다.',
};

export const PUSH_STATUS_LABEL: Record<PushCampaignStatus, string> = {
  SCHEDULED: '예약',
  SENDING: '보내는 중',
  DONE: '완료',
  CANCELLED: '취소',
};

export const PUSH_STATUS_TONE: Record<PushCampaignStatus, Tone> = {
  SCHEDULED: 'accent',
  SENDING: 'warn',
  DONE: 'neutral',
  CANCELLED: 'neutral',
};

// ── 관리자 ──────────────────────────────────────────────
export const ADMIN_ROLES: AdminRole[] = ['SUPER_ADMIN', 'OPERATOR', 'SUPPORT', 'VIEWER'];

export const ADMIN_ROLE_LABEL: Record<AdminRole, string> = {
  SUPER_ADMIN: '최고 관리자',
  OPERATOR: '운영자',
  SUPPORT: 'CS 담당',
  VIEWER: '보기 전용',
};

/** 역할마다 할 수 있는 일 — 관리자를 만들거나 역할을 바꿀 때 보여 준다(서버 AdminRole 과 같은 내용). */
export const ADMIN_ROLE_HINT: Record<AdminRole, string> = {
  SUPER_ADMIN: '모든 기능 · 관리자 계정 · 운영 스위치',
  OPERATOR: '신고 처리 · 제재 · 지갑/구독 조정 · 도서 · 광고/공지 · 에디터 픽',
  SUPPORT: '고객문의 · FAQ · 경고 · 결제 내역 열람',
  VIEWER: '보기만 — 결제 내역은 볼 수 없음',
};

export const ADMIN_STATUS_LABEL: Record<AdminStatus, string> = {
  ACTIVE: '사용 중',
  SUSPENDED: '정지',
};

/** 운영 스위치 설명. 서버가 모르는 키를 더해도 화면은 키 이름과 메모로 그린다. */
export const OPS_FLAG_META: Partial<Record<string, { title: string; description: string }>> = {
  PUSH_ENABLED: {
    title: '전체 푸시 발송',
    description: '끄면 푸시가 나가지 않고 앱 알림 목록에만 남습니다. 다시 켜도 쌓인 알림이 한꺼번에 나가지 않습니다. 오발송 사고 시 긴급 차단용입니다.',
  },
  CLUB_CREATION_OPEN: {
    title: '모임 생성 허용',
    description: '끄면 새 모임을 만들 수 없습니다. 기존 모임은 그대로 운영됩니다.',
  },
  SIGNUP_OPEN: {
    title: '신규 가입 허용',
    description: '끄면 신규 가입이 막힙니다. 기존 회원 로그인은 유지됩니다.',
  },
};

// ── 감사 로그 ───────────────────────────────────────────
/** 감사 액션은 서버에서 문자열로 온다. 모르는 액션은 코드 그대로 보여 준다. */
export const AUDIT_ACTION_LABEL: Partial<Record<string, string>> = {
  LOGIN: '관리자 로그인',
  ENABLE_TOTP: '2단계 인증 켜기',
  CREATE_ADMIN: '관리자 생성',
  CHANGE_ADMIN_ROLE: '관리자 권한 변경',
  VIEW_USER: '회원 조회',
  VIEW_USER_PII: '회원 개인정보 열람',
  SANCTION_WARN: '제재 · 경고',
  SANCTION_WRITE_BAN: '제재 · 쓰기 정지',
  SANCTION_SUSPEND: '제재 · 이용 정지',
  SANCTION_TERMINATE: '제재 · 영구 정지',
  RELEASE_SANCTION: '제재 해제',
  GRANT_SUBSCRIPTION: '구독 지급',
  REVOKE_SUBSCRIPTION: '구독 회수',
  ADJUST_WALLET: '지갑 조정',
  UPDATE_BOOK: '도서 수정',
  OVERRIDE_VERIFICATION: '검증 등급 조정',
  FORCE_END_CLUB: '모임 강제 해산',
  ROTATE_CLUB_CODE: '초대 코드 회전',
  TRANSFER_CLUB_HOST: '호스트 승계',
  UPDATE_OPS_FLAG: '운영 스위치 변경',
  RESOLVE_MODERATION: '신고 처리',
  VIEW_INQUIRY: '문의 열람',
  ANSWER_INQUIRY: '문의 답변',
  EDIT_INQUIRY_ANSWER: '문의 답변 수정',
  CREATE_BANNER: '배너 생성',
  UPDATE_BANNER: '배너 수정',
  DELETE_BANNER: '배너 삭제',
  CREATE_FAQ: 'FAQ 추가',
  UPDATE_FAQ: 'FAQ 수정',
  REORDER_FAQ: 'FAQ 순서 변경',
  DELETE_FAQ: 'FAQ 삭제',
  VIEW_USER_PAYMENTS: '회원 결제 내역 열람',
  REVOKE_USER_SESSIONS: '회원 로그인 끊기',
  SUSPEND_ADMIN: '관리자 정지',
  ACTIVATE_ADMIN: '관리자 재활성화',
  RESET_ADMIN_PASSWORD: '관리자 비밀번호 재설정',
  RESET_ADMIN_TOTP: '관리자 2FA 초기화',
  CHANGE_OWN_PASSWORD: '내 비밀번호 변경',
  VIEW_MODERATION: '신고 상세 열람',
  VIEW_CONTENT: '콘텐츠 원문 열람',
  HIDE_CONTENT: '콘텐츠 숨김',
  RESTORE_CONTENT: '콘텐츠 복구',
  DELETE_CONTENT: '콘텐츠 삭제',
  UPDATE_APP_RELEASE: '앱 버전 안내 변경',
  CREATE_MAINTENANCE: '점검 예고',
  UPDATE_MAINTENANCE: '점검 일정 수정',
  CANCEL_MAINTENANCE: '점검 취소',
  CREATE_PUSH_CAMPAIGN: '전체 푸시 만들기',
  UPDATE_PUSH_CAMPAIGN: '전체 푸시 수정',
  CANCEL_PUSH_CAMPAIGN: '전체 푸시 취소',
  TEST_PUSH_CAMPAIGN: '전체 푸시 테스트 발송',
  CREATE_EDITOR_PICK: '에디터 픽 추가',
  UPDATE_EDITOR_PICK: '에디터 픽 수정',
  DELETE_EDITOR_PICK: '에디터 픽 삭제',
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABEL[action] ?? action;
}
