'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { errorMessage } from '@/lib/api';
import { adminsApi } from '@/lib/endpoints';
import { formatDateTime } from '@/lib/format';
import { ADMIN_ROLES, ADMIN_ROLE_HINT, ADMIN_ROLE_LABEL, ADMIN_STATUS_LABEL } from '@/lib/labels';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/lib/toast';
import type { AdminRole, AdminRow } from '@/lib/types';
import { useMe } from '@/lib/useMe';
import { useConfirm } from '@/components/Confirm';
import { Modal } from '@/components/Modal';
import { QueryState } from '@/components/QueryState';
import { PageHeader } from '@/components/Shell';
import { Button, Card, CopyButton, ErrorText, Input, ResultCount, Select, Table, Tag } from '@/components/ui';

const PASSWORD_MIN = 12;

/** 관리자 계정 — 최고 관리자 전용. 자기 계정은 여기서 바꾸지 않는다('내 계정' 에서). */
export default function AdminsPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const me = useMe();
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState<AdminRow | null>(null);

  const admins = useQuery({ queryKey: qk.admins, queryFn: adminsApi.list });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: qk.admins });
    queryClient.invalidateQueries({ queryKey: qk.audit.all });
  };

  const changeRole = async (admin: AdminRow, role: AdminRole) => {
    if (role === admin.role) return;
    await confirm({
      title: `${admin.name} 님의 역할을 바꿀까요?`,
      body: (
        <>
          {ADMIN_ROLE_LABEL[admin.role]} → <b>{ADMIN_ROLE_LABEL[role]}</b>
          <br />
          {ADMIN_ROLE_HINT[role]}
          <br />
          다음 요청부터 바로 적용됩니다.
        </>
      ),
      confirmLabel: '바꾸기',
      action: async () => {
        await adminsApi.changeRole(admin.id, role);
        toast.success('역할을 바꿨습니다.');
        refresh();
      },
    });
  };

  const toggleStatus = async (admin: AdminRow) => {
    const suspending = admin.status === 'ACTIVE';
    await confirm({
      title: `${admin.name} 님을 ${suspending ? '정지' : '다시 사용하게'} 할까요?`,
      body: suspending ? '다음 요청부터 바로 로그아웃되고 로그인할 수 없습니다.' : '다시 로그인할 수 있게 됩니다.',
      confirmLabel: suspending ? '정지' : '재활성화',
      tone: suspending ? 'danger' : 'primary',
      reason: { label: '사유 (필수)', placeholder: suspending ? '예: 퇴사, 계정 유출 의심' : '예: 복직' },
      action: async ({ reason }) => {
        await adminsApi.changeStatus(admin.id, suspending ? 'SUSPENDED' : 'ACTIVE', reason);
        toast.success(suspending ? '정지했습니다.' : '다시 사용할 수 있게 했습니다.');
        refresh();
      },
    });
  };

  const resetTotp = async (admin: AdminRow) => {
    await confirm({
      title: `${admin.name} 님의 2단계 인증을 초기화할까요?`,
      body: '휴대폰을 잃어버렸을 때 씁니다. 초기화하면 비밀번호만으로 로그인되니, 본인에게 바로 다시 등록하도록 알려 주세요.',
      confirmLabel: '초기화',
      tone: 'danger',
      reason: { label: '사유 (필수)', placeholder: '예: 휴대폰 분실' },
      action: async ({ reason }) => {
        await adminsApi.resetTotp(admin.id, reason);
        toast.success('2단계 인증을 초기화했습니다.');
        refresh();
      },
    });
  };

  return (
    <>
      <PageHeader
        title="관리자"
        description="관리자 계정과 역할을 관리합니다. 모든 변경은 감사 로그에 남습니다."
        action={<Button onClick={() => setCreating(true)}>관리자 추가</Button>}
      />

      <div className="px-7 py-6">
        <ResultCount total={admins.data?.length} />
        <Card>
          <QueryState query={admins} isEmpty={(data) => data.length === 0} empty="관리자가 없습니다.">
            {(data) => (
              <Table head={['관리자', '역할', '상태', '2FA', '마지막 로그인', '']}>
                {data.map((admin) => {
                  const self = admin.id === me.data?.id;
                  return (
                    <tr key={admin.id} className="border-b border-[var(--color-line)] last:border-0">
                      <td className="px-4 py-3">
                        <p className="text-[14px] font-bold">
                          {admin.name}
                          {self ? <span className="ml-2 font-mono text-[11px] text-[var(--color-faint)]">나</span> : null}
                        </p>
                        <p className="font-mono text-[11px] text-[var(--color-faint)]">{admin.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        {self ? (
                          <Tag>{ADMIN_ROLE_LABEL[admin.role]}</Tag>
                        ) : (
                          <div className="w-36">
                            <Select
                              aria-label="역할"
                              value={admin.role}
                              onChange={(e) => changeRole(admin, e.target.value as AdminRole)}
                            >
                              {ADMIN_ROLES.map((role) => (
                                <option key={role} value={role}>
                                  {ADMIN_ROLE_LABEL[role]}
                                </option>
                              ))}
                            </Select>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Tag tone={admin.status === 'ACTIVE' ? 'accent' : 'danger'}>{ADMIN_STATUS_LABEL[admin.status]}</Tag>
                      </td>
                      <td className="px-4 py-3">
                        {admin.totpEnabled ? <Tag tone="accent">켜짐</Tag> : <Tag tone="warn">꺼짐</Tag>}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[var(--color-faint)]">
                        {formatDateTime(admin.lastLoginAt)}
                        {admin.lastLoginIp ? <p>{admin.lastLoginIp}</p> : null}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {!self ? (
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" onClick={() => setResetting(admin)}>
                              비밀번호
                            </Button>
                            {admin.totpEnabled ? (
                              <Button variant="ghost" onClick={() => resetTotp(admin)}>
                                2FA 초기화
                              </Button>
                            ) : null}
                            <Button variant={admin.status === 'ACTIVE' ? 'danger' : 'outline'} onClick={() => toggleStatus(admin)}>
                              {admin.status === 'ACTIVE' ? '정지' : '재활성화'}
                            </Button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </Table>
            )}
          </QueryState>
        </Card>
        <p className="mt-2 font-mono text-[11px] text-[var(--color-faint)]">
          마지막 최고 관리자는 강등·정지할 수 없습니다. 내 비밀번호와 2단계 인증은 &lsquo;내 계정&rsquo; 에서 바꿉니다.
        </p>
      </div>

      {creating ? <CreateDialog onClose={() => setCreating(false)} onDone={refresh} /> : null}
      {resetting ? <ResetPasswordDialog admin={resetting} onClose={() => setResetting(null)} onDone={refresh} /> : null}
    </>
  );
}

/** 사람이 옮겨 적기 쉬운 임시 비밀번호(헷갈리는 글자 제외). 버튼을 누를 때만 만든다. */
function generatePassword(length = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (n) => chars[n % chars.length]).join('');
}

function PasswordField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-end gap-2">
      <Input
        label={`임시 비밀번호 (${PASSWORD_MIN}자 이상)`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="new-password"
        hint="본인에게 안전한 경로로 전달하고, 로그인 후 '내 계정' 에서 바꾸게 하세요."
      />
      <div className="mb-5 flex items-center gap-2">
        <Button variant="outline" onClick={() => onChange(generatePassword())}>
          자동 생성
        </Button>
        {value ? <CopyButton value={value} /> : null}
      </div>
    </div>
  );
}

function CreateDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<AdminRole>('SUPPORT');
  const [password, setPassword] = useState('');

  const create = useMutation({
    meta: { inlineError: true },
    mutationFn: () => adminsApi.create({ email: email.trim(), name: name.trim(), role, password }),
    onSuccess: () => {
      toast.success('관리자를 추가했습니다.');
      onDone();
      onClose();
    },
  });

  const invalid = !email.trim() || !name.trim() || password.length < PASSWORD_MIN;

  return (
    <Modal
      eyebrow="관리자 추가"
      title="새 관리자 계정"
      busy={create.isPending}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" disabled={create.isPending} onClick={onClose}>
            취소
          </Button>
          <Button disabled={invalid || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? '추가 중…' : '추가'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="이름" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
          <Input label="이메일" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
        </div>
        <Select label="역할" value={role} onChange={(e) => setRole(e.target.value as AdminRole)}>
          {ADMIN_ROLES.map((value) => (
            <option key={value} value={value}>
              {ADMIN_ROLE_LABEL[value]}
            </option>
          ))}
        </Select>
        <p className="-mt-1 font-mono text-[11px] text-[var(--color-muted)]">{ADMIN_ROLE_HINT[role]}</p>
        <PasswordField value={password} onChange={setPassword} />
      </div>
      <ErrorText error={create.isError ? errorMessage(create.error, '추가하지 못했습니다.') : null} />
    </Modal>
  );
}

function ResetPasswordDialog({ admin, onClose, onDone }: { admin: AdminRow; onClose: () => void; onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');

  const reset = useMutation({
    meta: { inlineError: true },
    mutationFn: () => adminsApi.resetPassword(admin.id, password, reason.trim()),
    onSuccess: () => {
      toast.success('비밀번호를 재설정했습니다. 그 관리자의 기존 로그인은 끊겼습니다.');
      onDone();
      onClose();
    },
  });

  return (
    <Modal
      eyebrow="비밀번호 재설정"
      title={`${admin.name} (${admin.email})`}
      busy={reset.isPending}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" disabled={reset.isPending} onClick={onClose}>
            취소
          </Button>
          <Button
            variant="danger"
            disabled={password.length < PASSWORD_MIN || !reason.trim() || reset.isPending}
            onClick={() => reset.mutate()}
          >
            {reset.isPending ? '재설정 중…' : '재설정'}
          </Button>
        </>
      }
    >
      <p className="text-[13px] text-[var(--color-muted)]">재설정하면 이 관리자가 지금 쓰고 있는 로그인이 바로 끊깁니다.</p>
      <div className="mt-4 flex flex-col gap-3">
        <PasswordField value={password} onChange={setPassword} />
        <Input label="사유 (필수)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예: 비밀번호 분실 요청" />
      </div>
      <ErrorText error={reset.isError ? errorMessage(reset.error, '재설정하지 못했습니다.') : null} />
    </Modal>
  );
}
