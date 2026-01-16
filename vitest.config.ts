import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    // Use jsdom for React tests that need DOM APIs
    environmentMatchGlobs: [['packages/react/**/*.test.{ts,tsx}', 'jsdom']],
  },
});
