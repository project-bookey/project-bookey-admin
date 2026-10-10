'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { paymentsApi } from '@/lib/endpoints';
import { formatDateTime, formatKrw } from '@/lib/format';
import {
  PAYMENT_STORES, PAYMENT_STORE_LABEL, PURCHASE_STATUSES, PURCHASE_STATUS_LABEL, PURCHASE_STATUS_TONE,
} from '@/lib/labels';
import { qk } from '@/lib/queryKeys';
import { param, useListParams } from '@/lib/useListParams';
import { QueryState } from '@/components/QueryState';
import { PageHeader } from '@/components/Shell';
import { Button, Card, Input, Pager, ResultCount, Select, Table, Tag } from '@/components/ui';

const FILTERS = {
  orderId: param.str(),
  status: param.oneOf(PURCHASE_STATUSES),
  provider: param.oneOf(PAYMENT_STORES),
};

/** 결제 조회 — 결제 문의에 주문번호만 있을 때 회원을 찾는다. 구독은 회원 상세의 '지갑 · 결제' 탭에서 본다. */
export default function PaymentsPage() {
  const { params, setFilter, setPage } = useListParams(FILTERS);
  const { orderId, status, provider, page } = params;

  const purchases = useQuery({
    queryKey: qk.payments.list({ orderId, status, provider, page }),
    queryFn: () =>
      paymentsApi.search(
        { orderId: orderId || undefined, status: status || undefined, provider: provider || undefined },
        page,
      ),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title="결제 조회"
        description="책갈피 구매를 주문번호로 찾습니다. 구독 이력은 회원 상세의 '지갑 · 결제' 에서 봅니다."
      />

      <div className="px-7 py-6">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <OrderSearch key={orderId} initial={orderId} onSubmit={(value) => setFilter({ orderId: value })} />
          <div className="w-36">
            <Select label="상태" value={status} onChange={(e) => setFilter({ status: e.target.value as typeof status })}>
              <option value="">전체</option>
              {PURCHASE_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {PURCHASE_STATUS_LABEL[value]}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-40">
            <Select
              label="결제 수단"
              value={provider}
              onChange={(e) => setFilter({ provider: e.target.value as typeof provider })}
            >
              <option value="">전체</option>
              {PAYMENT_STORES.filter((value) => value !== 'ADMIN').map((value) => (
                <option key={value} value={value}>
                  {PAYMENT_STORE_LABEL[value]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <ResultCount total={purchases.data?.totalElements} />

        <Card>
          <QueryState
            query={purchases}
            isEmpty={(data) => data.content.length === 0}
            empty="조건에 맞는 결제가 없습니다."
            onFirstPage={page > 0 ? () => setPage(0) : undefined}
          >
            {(data) => (
              <Table head={['상태', '주문번호', '회원', '상품', '금액', '결제 수단', '시각']}>
                {data.content.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--color-line)] last:border-0">
                    <td className="px-4 py-3">
                      <Tag tone={PURCHASE_STATUS_TONE[row.status]}>{PURCHASE_STATUS_LABEL[row.status]}</Tag>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px]">{row.orderId}</td>
                    <td className="px-4 py-3 text-[13px] whitespace-nowrap">
                      <Link href={`/users?id=${row.userId}&tab=payments`} className="font-bold underline-offset-2 hover:underline">
                        {row.userNickname ?? `#${row.userId}`}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[13px]">
                      책갈피 {row.quantity}개{row.bonusQuantity ? ` (+${row.bonusQuantity})` : ''}
                      <p className="font-mono text-[10.5px] text-[var(--color-faint)]">{row.productId}</p>
                    </td>
                    <td className="numeral px-4 py-3 text-[12.5px]">{formatKrw(row.amountKrw)}</td>
                    <td className="px-4 py-3 text-[13px]">{PAYMENT_STORE_LABEL[row.provider]}</td>
                    <td className="px-4 py-3 font-mono text-[11px] whitespace-nowrap text-[var(--color-faint)]">
                      {formatDateTime(row.createdAt)}
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </QueryState>
        </Card>

        <Pager page={page} totalPages={purchases.data?.totalPages ?? 0} onChange={setPage} />
      </div>
    </>
  );
}

function OrderSearch({ initial, onSubmit }: { initial: string; onSubmit: (value: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value.trim());
      }}
    >
      <div className="w-72">
        <Input label="주문번호" value={value} onChange={(e) => setValue(e.target.value)} placeholder="앞부분만 넣어도 찾습니다" />
      </div>
      <Button type="submit">찾기</Button>
    </form>
  );
}
