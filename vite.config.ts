import { defineConfig } from 'vitest/config'

export default defineConfig({
  // core 单测为纯逻辑,无需 DOM
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
