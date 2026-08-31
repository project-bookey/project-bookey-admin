import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AGENTS.md / CLAUDE.md 자동 생성을 끈다 — 저장소 규칙은 루트에서 관리한다.
  agentRules: false,
  /* config options here */
};

export default nextConfig;
