'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { clearToken, errorMessage } from '@/lib/api';
import { authApi } from '@/lib/endpoints';
import { formatDateTime } from '@/lib/format';
import { ADMIN_ROLE_LABEL } from '@/lib/labels';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/lib/toast';
import type { TotpSecretView } from '@/lib/types';
import { useMe } from '@/lib/useMe';
import { Modal } from '@/components/Modal';
import { QueryState } from '@/components/QueryState';
import { PageHeader } from '@/components/Shell';
import { Button, Card, CopyButton, ErrorText, Input, Tag } from '@/components/ui';

/** 내 계정 — 프로필 확인과 2단계 인증(TOTP) 등록. */
export default function AccountPage() {
  const me = useMe();
  const [setup, setSetup] = useState<TotpSecretView | null>(null);

  const prepare = useMutation({
    mutationFn: authApi.prepareTotp,
    onSuccess: setSetup,
  });

  return (
    <>
      <PageHeader title="내 계정" description="관리자 계정 정보와 2단계 인증을 관리합니다." />
      <div className="max-w-2xl px-7 py-6">
        <QueryState query={me}>
          {(profile) => (
            <>
              <Card className="px-5 py-4">
                <p className="eyebrow">프로필</p>
                <dl className="mt-3 grid grid-cols-[100px_1fr] gap-y-2 text-[13.5px]">
                  <dt className="text-[var(--color-muted)]">이름</dt>
                  <dd className="font-bold">{profile.name}</dd>
                  <dt className="text-[var(--color-muted)]">이메일</dt>
                  <dd className="font-mono text-[12.5px]">{profile.email}</dd>
                  <dt className="text-[var(--color-muted)]">역할</dt>
                  <dd>
                    <Tag>{ADMIN_ROLE_LABEL[profile.role]}</Tag>
                  </dd>
                  <dt className="text-[var(--color-muted)]">마지막 로그인</dt>
                  <dd className="font-mono text-[12.5px]">{formatDateTime(profile.lastLoginAt)}</dd>
                </dl>
              </Card>

              <PasswordCard />

              <Card className="mt-4 px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow">2단계 인증</p>
                    <p className="mt-2 text-[13.5px]">
                      {profile.totpEnabled ? (
                        <Tag tone="accent">켜짐</Tag>
                      ) : (
                        <Tag tone="warn">꺼짐</Tag>
                      )}
                    </p>
                    <p className="mt-2 text-[13px] text-[var(--color-muted)]">
                      {profile.totpEnabled
                        ? '로그인할 때 인증 앱의 6자리 코드를 함께 입력합니다. 휴대폰을 바꾸거나 잃어버렸으면 최고 관리자에게 초기화를 요청하세요.'
                        : '개인정보를 다루는 계정이므로 켜 두기를 권합니다. Google Authenticator 같은 인증 앱이 필요합니다.'}
                    </p>
                  </div>
                  {!profile.totpEnabled ? (
                    <Button disabled={prepare.isPending} onClick={() => prepare.mutate()}>
                      {prepare.isPending ? '준비 중…' : '설정하기'}
                    </Button>
                  ) : null}
                </div>
              </Card>
            </>
          )}
        </QueryState>
      </div>

      {setup ? <TotpSetupDialog setup={setup} onClose={() => setSetup(null)} /> : null}
    </>
  );
}

const PASSWORD_MIN = 12;

/** 내 비밀번호 변경. 바꾸면 지금 로그인도 끊기므로 로그인 화면으로 보낸다. */
function PasswordCard() {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');

  const change = useMutation({
    meta: { inlineError: true },
    mutationFn: () => authApi.changeOwnPassword(current, next),
    onSuccess: () => {
      toast.success('비밀번호를 바꿨습니다. 새 비밀번호로 다시 로그인하세요.');
      clearToken();
      router.replace('/login');
    },
  });

  const mismatch = again.length > 0 && next !== again;
  const tooShort = next.length > 0 && next.length < PASSWORD_MIN;

  return (
    <Card className="mt-4 px-5 py-4">
      <p className="eyebrow">비밀번호 변경</p>
      <form
        className="mt-3 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (current && next.length >= PASSWORD_MIN && next === again) change.mutate();
        }}
      >
        <Input label="현재 비밀번호" type="password" autoComplete="current-password" value={current}
          onChange={(e) => setCurrent(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label={`새 비밀번호 (${PASSWORD_MIN}자 이상)`} type="password" autoComplete="new-password" value={next}
            onChange={(e) => setNext(e.target.value)} />
          <Input label="새 비밀번호 확인" type="password" autoComplete="new-password" value={again}
            onChange={(e) => setAgain(e.target.value)} />
        </div>
        <ErrorText
          error={
            tooShort
              ? `${PASSWORD_MIN}자 이상으로 정해 주세요.`
              : mismatch
                ? '새 비밀번호가 서로 다릅니다.'
                : change.isError
                  ? errorMessage(change.error)
                  : null
          }
        />
        <div className="flex items-center justify-between">
          <p className="font-mono text-[11px] text-[var(--color-faint)]">바꾸면 지금 로그인이 끊기고 다시 로그인해야 합니다.</p>
          <Button
            type="submit"
            disabled={!current || next.length < PASSWORD_MIN || next !== again || change.isPending}
          >
            {change.isPending ? '바꾸는 중…' : '바꾸기'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

/**
 * 시크릿을 인증 앱에 넣고, 앱이 보여 주는 코드를 확인해야 2FA 가 켜진다.
 * 확인 전에 닫으면 켜지지 않으므로 다음 로그인이 막히지 않는다 — 다시 '설정하기' 를 누르면 새 시크릿을 받는다.
 */
function TotpSetupDialog({ setup, onClose }: { setup: TotpSecretView; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');

  const confirm = useMutation({
    meta: { inlineError: true },
    mutationFn: () => authApi.confirmTotp(code),
    onSuccess: (profile) => {
      queryClient.setQueryData(qk.me, profile);
      toast.success('2단계 인증을 켰습니다. 다음 로그인부터 코드를 입력합니다.');
      onClose();
    },
  });

  return (
    <Modal
      eyebrow="2단계 인증 설정"
      title="인증 앱에 계정을 추가하세요"
      busy={confirm.isPending}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" disabled={confirm.isPending} onClick={onClose}>
            나중에
          </Button>
          <Button disabled={code.length !== 6 || confirm.isPending} onClick={() => confirm.mutate()}>
            {confirm.isPending ? '확인 중…' : '확인하고 켜기'}
          </Button>
        </>
      }
    >
      <ol className="list-decimal space-y-3 pl-5 text-[13.5px] leading-relaxed">
        <li>
          인증 앱에서 &lsquo;설정 키 입력&rsquo; 을 고르고 아래 키를 넣으세요(시간 기준).
          <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-[var(--color-surface-alt)] px-3 py-2.5">
            <code className="font-mono text-[14px] tracking-widest break-all">{setup.secret}</code>
            <CopyButton value={setup.secret} />
          </div>
          <p className="mt-1.5 font-mono text-[11px] text-[var(--color-faint)]">
            otpauth 링크를 지원하는 앱이면{' '}
            <CopyButton value={setup.otpauthUri} label="링크 복사" /> 로 한 번에 추가할 수도 있습니다.
          </p>
        </li>
        <li>
          앱에 표시된 6자리 코드를 입력하세요.
          <form
            className="mt-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.length === 6) confirm.mutate();
            }}
          >
            <Input
              autoFocus
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
            />
          </form>
        </li>
      </ol>
      <ErrorText error={confirm.isError ? errorMessage(confirm.error) : null} />
      <p className="mt-4 font-mono text-[11px] text-[var(--color-faint)]">
        확인하기 전에는 켜지지 않습니다. 이 창을 닫아도 로그인에는 영향이 없습니다.
      </p>
    </Modal>
  );
}
