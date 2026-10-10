import { Shell } from '@/components/Shell';

/** 로그인 뒤 화면 공통 틀. 메뉴·내 정보가 화면을 옮겨 다녀도 다시 그려지지 않는다. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
