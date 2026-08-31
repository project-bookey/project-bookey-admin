import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // AGENTS.md / CLAUDE.md 자동 생성을 끈다 — 저장소 규칙은 루트에서 관리한다.
  agentRules: false,
  output: "standalone",
  turbopack: {
    root: projectRoot,
  },
  /* config options here */
};

export default nextConfig;
