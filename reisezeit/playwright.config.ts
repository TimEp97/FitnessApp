import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://127.0.0.1:4179',
    trace: 'off',
    // Optional: vorhandenes Chromium nutzen (z. B. PW_CHROMIUM_PATH=/opt/pw-browsers/chromium)
    launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH || undefined },
  },
  // Jeder Test läuft einmal im Handy- und einmal im Laptop-Layout
  projects: [
    { name: 'handy', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --port 4179 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:4179',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
