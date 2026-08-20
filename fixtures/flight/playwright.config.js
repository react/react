import {defineConfig, devices} from '@playwright/test';

const isCI = Boolean(process.env.CI);

export default defineConfig({
  // relative to this configuration file.
  testDir: '__tests__/__e2e__',
  fullyParallel: true,
  // Fail the build on CI if you accidentally left test.only in the source code.
  forbidOnly: !isCI,
  retries: isCI ? 2 : 0,
  // Opt out of parallel tests on CI.
  workers: isCI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',

    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {...devices['Desktop Chrome']},
    },
  ],
  webServer: {
    command: 'yarn dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !isCI,
  },
});
