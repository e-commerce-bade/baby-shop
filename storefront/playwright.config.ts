import { defineConfig, devices } from '@playwright/test'

/**
 * E2E config for the Bade Bebe storefront.
 *
 * Default target is the live Railway deploy so we can audit production directly.
 * Override with PLAYWRIGHT_BASE_URL to point at a local dev server, e.g.
 *   PLAYWRIGHT_BASE_URL=http://localhost:5175 npx playwright test
 */
const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  'https://badebebe-frontend-production.up.railway.app'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 4,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      // Pixel 5 is a chromium-based device descriptor (393x851, touch, mobile UA)
      use: { ...devices['Pixel 5'] },
    },
  ],
})
