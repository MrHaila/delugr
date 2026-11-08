import { defineConfig, devices } from '@playwright/test'

/**
 * Browser e2e tests for critical paths (see docs/agents/e2e-testing.md).
 * Runs its own dev server on a fixed port so it never collides with a running `bun run dev`.
 */
const PORT = 5199

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  // File System Access API is Chromium-only.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `bunx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
})
