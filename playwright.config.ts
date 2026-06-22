import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // Global per-test timeout — 30 s default is too tight for slow CI runners
  timeout: process.env.CI ? 60_000 : 30_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['html', { outputFolder: 'e2e/test-results/report' }],
    ['json', { outputFile: 'e2e/test-results/results.json' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5175',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: process.env.CI ? 20_000 : 10_000,
    navigationTimeout: process.env.CI ? 30_000 : 15_000,
    userAgent: 'Playwright-E2E',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        userAgent: `${devices['Desktop Chrome'].userAgent} Playwright-E2E`,
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        userAgent: `${devices['Desktop Firefox'].userAgent} Playwright-E2E`,
      },
    },
  ],

  outputDir: 'e2e/test-results/output',

  webServer: [
    {
      command: 'npm run dev',
      url: process.env.E2E_BASE_URL || 'http://127.0.0.1:5175',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      // Forward proxy target and PWA flag so the Vite dev server uses the
      // correct backend port in CI (8080) instead of the default (8787).
      env: {
        VITE_API_PROXY_TARGET: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8787',
        DISABLE_PWA: process.env.DISABLE_PWA || 'false',
      },
    },
  ],
});
