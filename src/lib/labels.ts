/**
 * 서버 enum 을 화면 문구로 바꾸는 표.
 *
 * 키 목록은 생성 타입에서 오므로, 서버가 값을 더하면 여기서 typecheck 가 깨져 빠뜨릴 수 없다.
 */
import type { InquiryCategory, InquiryStatus, UserStatus } from './types';

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

export const INQUIRY_STATUS_LABEL: Record<InquiryStatus, string> = {
  WAITING: '답변 대기',
  ANSWERED: '답변 완료',
};

export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVE: '정상',
  WRITE_BANNED: '쓰기 정지',
  SUSPENDED: '이용 정지',
  TERMINATED: '영구 정지',
};
