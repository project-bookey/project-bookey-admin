'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useRef } from 'react';

/**
 * 목록 화면의 필터·쪽·상세 id 를 URL 에 둔다 — 새로고침·뒤로가기·링크 공유가 그대로 된다.
 *
 *  - 필터를 바꾸면 쪽은 처음으로 돌아간다(replace — 기록을 쌓지 않는다).
 *  - 상세를 열면 기록을 하나 쌓아(push) 뒤로가기로 닫힌다. 링크로 바로 들어왔으면 닫을 때 id·tab 만 지운다.
 *    상세 안의 탭은 spec 에 tab 으로 두고 setParams 로 바꾼다(쪽을 건드리지 않는다).
 *  - 기본값과 같은 필터는 URL 에 적지 않는다. 기본값이 '전체' 가 아닌 필터의 '전체' 는 ALL 로 적는다.
 *
 * spec 은 모듈 최상단에 상수로 두어 렌더마다 새로 만들지 않는다.
 */
// 메서드 문법으로 적어야 Parser<'A'> 를 Parser<unknown> 자리에 넣을 수 있다(매개변수 이변성).
export type Parser<T> = {
  parse(raw: string | null): T;
  /** null 이면 URL 에서 뺀다. */
  serialize(value: T): string | null;
};

export const param = {
  str: (): Parser<string> => ({
    parse: (raw) => raw ?? '',
    serialize: (value) => value.trim() || null,
  }),
  int: (): Parser<number | undefined> => ({
    parse: (raw) => {
      const n = Number(raw);
      return raw && Number.isInteger(n) && n > 0 ? n : undefined;
    },
    serialize: (value) => (value === undefined ? null : String(value)),
  }),
  bool: (): Parser<boolean> => ({
    parse: (raw) => raw === '1',
    serialize: (value) => (value ? '1' : null),
  }),
  /** '' 는 전체. fallback 은 URL 에 아무것도 없을 때의 값. */
  oneOf: <T extends string>(values: readonly T[], fallback: T | '' = ''): Parser<T | ''> => ({
    parse: (raw) => {
      if (raw === 'ALL') return '';
      return values.includes(raw as T) ? (raw as T) : fallback;
    },
    serialize: (value) => {
      if (value === fallback) return null;
      return value === '' ? 'ALL' : value;
    },
  }),
};

type Spec = Record<string, Parser<unknown>>;
type Parsed<S extends Spec> = { [K in keyof S]: S[K] extends Parser<infer T> ? T : never };

export function useListParams<S extends Spec>(spec: S) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const openedHere = useRef(false);

  const params = useMemo(() => {
    const parsed = {} as Parsed<S>;
    for (const key of Object.keys(spec) as (keyof S)[]) {
      parsed[key] = spec[key].parse(search.get(key as string)) as Parsed<S>[typeof key];
    }
    const page = Number(search.get('page'));
    const id = Number(search.get('id'));
    return {
      ...parsed,
      page: Number.isInteger(page) && page > 0 ? page : 0,
      id: search.get('id') && Number.isInteger(id) ? id : undefined,
    };
  }, [search, spec]);

  const href = (mutate: (query: URLSearchParams) => void) => {
    const query = new URLSearchParams(search.toString());
    mutate(query);
    const qs = query.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  return {
    params,
    setFilter: (patch: Partial<Parsed<S>>) => {
      router.replace(
        href((query) => {
          for (const key of Object.keys(patch)) {
            const serialized = spec[key].serialize(patch[key]);
            if (serialized === null) query.delete(key);
            else query.set(key, serialized);
          }
          query.delete('page');
        }),
        { scroll: false },
      );
    },
    /** 쪽은 그대로 두고 값만 바꾼다 — 열린 상세의 탭처럼 목록과 상관없는 값. */
    setParams: (patch: Partial<Parsed<S>>) => {
      router.replace(
        href((query) => {
          for (const key of Object.keys(patch)) {
            const serialized = spec[key].serialize(patch[key]);
            if (serialized === null) query.delete(key);
            else query.set(key, serialized);
          }
        }),
        { scroll: false },
      );
    },
    setPage: (page: number) => {
      router.replace(
        href((query) => {
          if (page > 0) query.set('page', String(page));
          else query.delete('page');
        }),
        { scroll: false },
      );
    },
    open: (id: number) => {
      openedHere.current = true;
      router.push(
        href((query) => {
          query.set('id', String(id));
          query.delete('tab');
        }),
        { scroll: false },
      );
    },
    close: () => {
      if (openedHere.current) {
        openedHere.current = false;
        router.back();
        return;
      }
      router.replace(
        href((query) => {
          query.delete('id');
          query.delete('tab');
        }),
        { scroll: false },
      );
    },
  };
}
