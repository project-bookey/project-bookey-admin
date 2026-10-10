'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Fragment, useState } from 'react';

import { auditApi } from '@/lib/endpoints';
import { formatDateTime } from '@/lib/format';
import { AUDIT_ACTION_LABEL, CONTENT_TYPES, auditActionLabel } from '@/lib/labels';
import { qk } from '@/lib/queryKeys';
import type { AuditRow, ContentType } from '@/lib/types';
import { param, useListParams } from '@/lib/useListParams';
import { useMe } from '@/lib/useMe';
import { QueryState } from '@/components/QueryState';
import { PageHeader } from '@/components/Shell';
import { Button, Card, Checkbox, Pager, ResultCount, Select, Table, Tag } from '@/components/ui';

const FILTERS = {
  action: param.str(),
  adminId: param.int(),
  targetType: param.str(),
  targetId: param.int(),
};

const KNOWN_ACTIONS = Object.keys(AUDIT_ACTION_LABEL);

/** 대상 종류별로 상세 화면이 있으면 그리로 잇는다. */
function targetHref(row: AuditRow): string | null {
  if (row.targetId === undefined || row.targetId === null) return null;
  if (row.targetType === 'USER') return `/users?id=${row.targetId}`;
  if (row.targetType === 'INQUIRY') return `/inquiries?id=${row.targetId}`;
  if (row.targetType === 'ADMIN') return '/admins';
  if (CONTENT_TYPES.includes(row.targetType as ContentType)) {
    return `/contents?type=${row.targetType}&id=${row.targetId}`;
  }
  return null;
}

/** 감사 로그 — 누가 · 언제 · 무엇을 · 왜 (§F13). */
export default function AuditPage() {
  const me = useMe();
  const { params, setFilter, setPage } = useListParams(FILTERS);
  const { action, adminId, targetType, targetId, page } = params;
  const [expanded, setExpanded] = useState<number | null>(null);

  const logs = useQuery({
    queryKey: qk.audit.list({ action, adminId, targetType, targetId, page }),
    queryFn: () =>
      auditApi.list(
        { action: action || undefined, adminId, targetType: targetType || undefined, targetId },
        page,
      ),
    placeholderData: keepPreviousData,
  });

  const onlyMine = me.data !== undefined && adminId === me.data.id;

  return (
    <>
      <PageHeader title="감사 로그" description="변경뿐 아니라 개인정보 열람도 기록됩니다." />

      <div className="px-7 py-6">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="w-64">
            <Select label="액션" value={action} onChange={(e) => setFilter({ action: e.target.value })}>
              <option value="">전체</option>
              {KNOWN_ACTIONS.map((value) => (
                <option key={value} value={value}>
                  {auditActionLabel(value)}
                </option>
              ))}
              {action && !KNOWN_ACTIONS.includes(action) ? <option value={action}>{action}</option> : null}
            </Select>
          </div>
          {me.data ? (
            <Checkbox
              label="내 기록만"
              checked={onlyMine}
              onChange={(checked) => setFilter({ adminId: checked ? me.data.id : undefined })}
            />
          ) : null}
          {adminId !== undefined && !onlyMine ? (
            <FilterChip label={`관리자 #${adminId}`} onClear={() => setFilter({ adminId: undefined })} />
          ) : null}
          {targetType ? (
            <FilterChip
              label={`대상 ${targetType}${targetId !== undefined ? ` #${targetId}` : ''}`}
              onClear={() => setFilter({ targetType: '', targetId: undefined })}
            />
          ) : null}
        </div>

        <ResultCount total={logs.data?.totalElements} />

        <Card>
          <QueryState
            query={logs}
            isEmpty={(data) => data.content.length === 0}
            empty="기록이 없습니다."
            onFirstPage={page > 0 ? () => setPage(0) : undefined}
          >
            {(data) => (
              <Table head={['시각', '관리자', '액션', '대상', '사유', 'IP', '']}>
                {data.content.map((log) => {
                  const href = targetHref(log);
                  const hasDiff = !!log.beforeData || !!log.afterData;
                  return (
                    <Fragment key={log.id}>
                      <tr className="border-b border-[var(--color-line)] last:border-0">
                        <td className="px-4 py-2.5 font-mono text-[11px] whitespace-nowrap text-[var(--color-muted)]">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="px-4 py-2.5 text-[12.5px] whitespace-nowrap">
                          <button
                            type="button"
                            className="underline-offset-2 hover:underline"
                            title="이 관리자의 기록만 보기"
                            onClick={() => setFilter({ adminId: log.adminId })}
                          >
                            {log.adminName ?? `#${log.adminId}`}
                          </button>
                        </td>
                        <td className="px-4 py-2.5">
                          <Tag tone={log.action.includes('PII') ? 'warn' : 'neutral'} title={log.action}>
                            {auditActionLabel(log.action)}
                          </Tag>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[11px] whitespace-nowrap text-[var(--color-muted)]">
                          {log.targetType ? (
                            href ? (
                              <Link href={href} className="underline">
                                {log.targetType} #{log.targetId}
                              </Link>
                            ) : (
                              `${log.targetType} #${log.targetId ?? '-'}`
                            )
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="max-w-xs px-4 py-2.5 text-[13px]">
                          <span className="line-clamp-1" title={log.reason ?? undefined}>
                            {log.reason ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[11px] text-[var(--color-faint)]" title={log.userAgent ?? undefined}>
                          {log.ip ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {hasDiff ? (
                            <Button variant="ghost" onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                              {expanded === log.id ? '접기' : '변경 내용'}
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                      {expanded === log.id ? (
                        <tr className="border-b border-[var(--color-line)] bg-[var(--color-surface-alt)]">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="grid grid-cols-2 gap-4">
                              <DataBlock title="변경 전" data={log.beforeData} />
                              <DataBlock title="변경 후" data={log.afterData} />
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </Table>
            )}
          </QueryState>
        </Card>

        <Pager page={page} totalPages={logs.data?.totalPages ?? 0} onChange={setPage} />
      </div>
    </>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 font-mono text-[12px]">
      {label}
      <button type="button" aria-label="필터 지우기" onClick={onClear} className="text-[var(--color-faint)] hover:text-[var(--color-ink)]">
        ×
      </button>
    </span>
  );
}

function DataBlock({ title, data }: { title: string; data?: Record<string, unknown> | null }) {
  return (
    <div className="min-w-0">
      <p className="eyebrow">{title}</p>
      {data && Object.keys(data).length > 0 ? (
        <dl className="mt-1.5 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 font-mono text-[11.5px]">
          {Object.entries(data).map(([key, value]) => (
            <Fragment key={key}>
              <dt className="text-[var(--color-faint)]">{key}</dt>
              <dd className="break-all whitespace-pre-wrap">
                {typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '—')}
              </dd>
            </Fragment>
          ))}
        </dl>
      ) : (
        <p className="mt-1.5 font-mono text-[11.5px] text-[var(--color-faint)]">—</p>
      )}
    </div>
  );
}
