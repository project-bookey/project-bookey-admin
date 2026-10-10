/**
 * react-query 키. 도메인마다 prefix 하나를 두고, 바뀌면 prefix 로 한꺼번에 무효화한다.
 * 화면마다 키를 손으로 적으면 'user' 와 'users' 처럼 어긋나 무효화가 빠진다.
 */
export const qk = {
  me: ['admin', 'me'] as const,
  dashboard: ['dashboard'] as const,
  users: {
    all: ['users'] as const,
    list: (filter: object) => ['users', 'list', filter] as const,
    detail: (id: number) => ['users', 'detail', id] as const,
  },
  inquiries: {
    all: ['inquiries'] as const,
    list: (filter: object) => ['inquiries', 'list', filter] as const,
    detail: (id: number) => ['inquiries', 'detail', id] as const,
  },
  moderation: {
    all: ['moderation'] as const,
    list: (filter: object) => ['moderation', 'list', filter] as const,
  },
  books: {
    all: ['books'] as const,
    list: (filter: object) => ['books', 'list', filter] as const,
  },
  reviews: {
    all: ['reviews'] as const,
    list: (filter: object) => ['reviews', 'list', filter] as const,
  },
  clubs: {
    all: ['clubs'] as const,
    list: (filter: object) => ['clubs', 'list', filter] as const,
  },
  audit: {
    all: ['audit'] as const,
    list: (filter: object) => ['audit', 'list', filter] as const,
  },
  faqs: ['faqs'] as const,
  banners: {
    all: ['banners'] as const,
    list: (kind: string) => ['banners', 'list', kind] as const,
  },
  editorPicks: ['editorPicks'] as const,
  ops: {
    all: ['ops'] as const,
    stats: ['ops', 'stats'] as const,
    flags: ['ops', 'flags'] as const,
  },
};
