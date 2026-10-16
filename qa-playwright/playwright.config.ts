import { defineConfig, devices } from '@playwright/test';
import { loadEnv } from './src/config/env';

const env = loadEnv();

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : undefined,
  forbidOnly: !!process.env.CI,
  reporter: [
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['json', { outputFile: 'reports/results.json' }],
    ['list'],
  ],
  use: {
    baseURL: env.webBaseUrl,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: env.timeout,
    extraHTTPHeaders: { 'Accept-Language': 'es' },
  },
  projects: [
    { name: 'web-chromium', testDir: './tests/web', use: { ...devices['Desktop Chrome'] } },
    { name: 'web-firefox', testDir: './tests/web', use: { ...devices['Desktop Firefox'] } },
    { name: 'api', testDir: './tests/api', use: { baseURL: env.apiBaseUrl } },
    { name: 'mobile-webview', testDir: './tests/mobile' },
  ],
  outputDir: 'reports/artifacts',
});
