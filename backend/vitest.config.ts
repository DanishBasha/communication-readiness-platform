import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Load env vars before any module is imported in each test worker
    setupFiles: ['./tests/setup.ts'],
    // Run test files sequentially to avoid port/db conflicts
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
  },
});
