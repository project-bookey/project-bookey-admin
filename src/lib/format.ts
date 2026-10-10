/** 화면에 숫자·날짜를 찍는 규칙. 값이 없으면 '—' 로 둔다. */

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ko-KR', { dateStyle: 'short' });
}

export function formatDuration(seconds?: number): string {
  const total = Math.max(0, Math.floor(seconds ?? 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  return `${minutes}분`;
}

export function formatNumber(value?: number | null): string {
  if (value === undefined || value === null) return '—';
  return value.toLocaleString('ko-KR');
}

export function formatKrw(value?: number | null): string {
  if (value === undefined || value === null) return '—';
  return `${value.toLocaleString('ko-KR')}원`;
}

export function formatPercent(ratio?: number | null): string {
  if (ratio === undefined || ratio === null) return '—';
  return `${Math.round(ratio * 100)}%`;
}

export function remainingSla(iso: string): { label: string; overdue: boolean } {
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs < 0) {
    return { label: `${Math.floor(-diffMs / 3600000)}시간 초과`, overdue: true };
  }
  const hours = Math.floor(diffMs / 3600000);
  return { label: `${hours}시간 남음`, overdue: false };
}
