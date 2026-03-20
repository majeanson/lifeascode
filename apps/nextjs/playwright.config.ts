import { defineConfig, devices } from '@playwright/test'

/**
 * Performance benchmark config.
 * The dev server is started automatically before tests run.
 *
 * Set BASE_URL env var to test against a running server instead:
 *   BASE_URL=http://localhost:3001 bun test:perf
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Serial — consistent timing is more important than speed
  forbidOnly: !!process.env.CI,
  retries: 0,           // No retries — we want real first-load numbers
  workers: 1,           // Single worker for accurate, non-competing measurements
  reporter: [['list'], ['json', { outputFile: 'e2e-results/.last-playwright-run.json' }]],
  timeout: 120_000,     // Per-test timeout — dev-mode Turbopack JIT compilation can be slow

  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'bun run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,    // Reuse if already running (skip restart)
        timeout: 120_000,             // Up to 2 min for Next.js cold start
        stdout: 'pipe',
        stderr: 'pipe',
      },

  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    storageState: undefined,
    trace: 'off',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Disable cache for realistic measurements
        launchOptions: {
          args: ['--disable-application-cache', '--disable-cache'],
        },
      },
    },
  ],
})
