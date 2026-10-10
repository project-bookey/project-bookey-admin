/**
 * 관리자 API 클라이언트.
 *
 * 서비스 API 와 완전히 분리된 /admin/v1/** 만 호출한다.
 * 토큰은 sessionStorage 에 둔다 — 탭을 닫으면 사라지고, 30분 유휴 만료는 서버가 강제한다(§F13).
 */
export const ADMIN_API_BASE =
  process.env.NEXT_PUBLIC_ADMIN_API_URL ?? 'http://localhost:8080';

const TOKEN_KEY = 'bookey.admin.token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.sessionStorage.removeItem(TOKEN_KEY);
}

export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  auth?: boolean;
};

export async function adminApi<T>(path: string, options: Options = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true } = options;

  const url = new URL(`${ADMIN_API_BASE}${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new AdminApiError(0, 'NETWORK', '서버에 연결하지 못했습니다. 네트워크를 확인해 주세요.');
  }

  if (response.status === 401 && auth) {
    clearToken();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
  }

  if (response.status === 204) return undefined as T;

  // 게이트웨이 오류 페이지(HTML)처럼 JSON 이 아닌 응답도 있다 — 파싱이 실패해도 상태 코드로 오류를 만든다.
  const text = await response.text();
  let data: { code?: string; message?: string } | undefined;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = undefined;
  }

  if (!response.ok) {
    throw new AdminApiError(
      response.status,
      data?.code ?? 'UNKNOWN',
      data?.message ?? `요청을 처리하지 못했습니다. (${response.status})`,
    );
  }
  return data as T;
}

/**
 * 파일 업로드(multipart). Content-Type 은 브라우저가 경계(boundary)와 함께 채우도록 비워 둔다.
 */
export async function adminUpload<T>(path: string, form: FormData): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let response: Response;
  try {
    response = await fetch(`${ADMIN_API_BASE}${path}`, { method: 'POST', headers, body: form });
  } catch {
    throw new AdminApiError(0, 'NETWORK', '서버에 연결하지 못했습니다. 네트워크를 확인해 주세요.');
  }
  if (response.status === 401) {
    clearToken();
    if (typeof window !== 'undefined') window.location.href = '/login';
  }
  const text = await response.text();
  let data: ({ code?: string; message?: string } & Record<string, unknown>) | undefined;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = undefined;
  }
  if (!response.ok) {
    throw new AdminApiError(
      response.status,
      data?.code ?? 'UNKNOWN',
      data?.message ?? (response.status === 413 ? '파일이 너무 큽니다.' : `업로드하지 못했습니다. (${response.status})`),
    );
  }
  return data as T;
}

/** 화면에 띄울 오류 문구. 서버 메시지가 있으면 그대로 쓴다. */
export function errorMessage(error: unknown, fallback = '요청을 처리하지 못했습니다.'): string {
  if (error instanceof AdminApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function isForbidden(error: unknown): boolean {
  return error instanceof AdminApiError && error.status === 403;
}

/** 다시 불러도 결과가 같은 오류(권한·없음·잘못된 요청) — 재시도하지 않는다. */
export function isClientError(error: unknown): boolean {
  return error instanceof AdminApiError && error.status >= 400 && error.status < 500;
}
