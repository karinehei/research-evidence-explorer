import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/browser',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://127.0.0.1:4173/research-evidence-explorer/',
    viewport: { width: 1366, height: 800 },
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'node --experimental-strip-types scripts/preview-subpath.ts',
    url: 'http://127.0.0.1:4173/research-evidence-explorer/',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  }
});
