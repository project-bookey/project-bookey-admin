/**
 * 서버 enum 을 화면 문구로 바꾸는 표.
 *
 * 키 목록은 생성 타입에서 오므로, 서버가 값을 더하면 여기서 typecheck 가 깨져 빠뜨릴 수 없다.
 * 화면마다 따로 들고 있던 표·색을 여기로 모았다 — 같은 상태가 화면마다 다르게 보이지 않게.
 */
import type {
  AdminRole, BannerKind, ClubStatus, InquiryCategory, InquiryStatus, ModerationResolution,
  ModerationSource, ModerationStatus, SanctionType, UserStatus, VerificationLevel,
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

// ── 신고 큐 ─────────────────────────────────────────────
export const MODERATION_SOURCES: ModerationSource[] = ['REVIEW', 'POST', 'CLUB_POST', 'CLUB', 'USER'];

export const MODERATION_SOURCE_LABEL: Record<ModerationSource, string> = {
  REVIEW: '리뷰',
  POST: '독후감',
  CLUB_POST: '모임 글',
  CLUB: '모임',
  USER: '회원',
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

// ── 광고 · 공지 ─────────────────────────────────────────
export const BANNER_KINDS: BannerKind[] = ['AD', 'NOTICE'];

export const BANNER_KIND_LABEL: Record<BannerKind, string> = {
  AD: '광고',
  NOTICE: '공지',
};

// ── 관리자 ──────────────────────────────────────────────
export const ADMIN_ROLE_LABEL: Record<AdminRole, string> = {
  SUPER_ADMIN: '최고 관리자',
  OPERATOR: '운영자',
  SUPPORT: 'CS 담당',
  VIEWER: '보기 전용',
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
  CREATE_EDITOR_PICK: '에디터 픽 추가',
  UPDATE_EDITOR_PICK: '에디터 픽 수정',
  DELETE_EDITOR_PICK: '에디터 픽 삭제',
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABEL[action] ?? action;
}
