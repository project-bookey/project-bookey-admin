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
    walletTransactions: (id: number, page: number) => ['users', 'wallet', id, page] as const,
    subscriptions: (id: number) => ['users', 'subscriptions', id] as const,
    purchases: (id: number, page: number) => ['users', 'purchases', id, page] as const,
  },
  payments: {
    all: ['payments'] as const,
    list: (filter: object) => ['payments', 'list', filter] as const,
  },
  admins: ['admins'] as const,
  appConfig: {
    all: ['appConfig'] as const,
    releases: ['appConfig', 'releases'] as const,
    maintenance: (page: number) => ['appConfig', 'maintenance', page] as const,
  },
  push: {
    all: ['push'] as const,
    list: (page: number) => ['push', 'list', page] as const,
    detail: (id: number) => ['push', 'detail', id] as const,
    audience: (kind: string) => ['push', 'audience', kind] as const,
  },
  inquiries: {
    all: ['inquiries'] as const,
    list: (filter: object) => ['inquiries', 'list', filter] as const,
    detail: (id: number) => ['inquiries', 'detail', id] as const,
  },
  moderation: {
    all: ['moderation'] as const,
    list: (filter: object) => ['moderation', 'list', filter] as const,
    detail: (id: number) => ['moderation', 'detail', id] as const,
  },
  contents: {
    all: ['contents'] as const,
    list: (filter: object) => ['contents', 'list', filter] as const,
    detail: (type: string, id: number) => ['contents', 'detail', type, id] as const,
  },
  books: {
    all: ['books'] as const,
    list: (filter: object) => ['books', 'list', filter] as const,
    detail: (id: number) => ['books', 'detail', id] as const,
    suggestions: (filter: object) => ['books', 'suggestions', filter] as const,
    tally: (id: number) => ['books', 'tally', id] as const,
    mergePreview: (sourceId: number, targetId: number) => ['books', 'mergePreview', sourceId, targetId] as const,
  },
  reviews: {
    all: ['reviews'] as const,
    list: (filter: object) => ['reviews', 'list', filter] as const,
  },
  clubs: {
    all: ['clubs'] as const,
    list: (filter: object) => ['clubs', 'list', filter] as const,
    detail: (id: number) => ['clubs', 'detail', id] as const,
    members: (id: number, status: string) => ['clubs', 'members', id, status] as const,
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
