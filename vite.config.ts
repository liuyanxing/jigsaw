import { defineConfig } from 'vitest/config'

export default defineConfig({
  // 默认 5173;预览工具用 PORT 环境变量分配空闲端口(避免与已运行的 dev server 冲突)
  server: { port: Number(process.env.PORT) || 5173 },
  // core 单测为纯逻辑,无需 DOM
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
