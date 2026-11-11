import { defineConfig, devices } from '@playwright/test';
import pkg from './package.json';

/**
 * End-to-end tests against the production build.
 *
 * `npm run build` must have run first: the web server below is `next start`,
 * as the Next.js testing guide recommends, so what is tested is what Vercel
 * serves. It runs on its own port and is never reused, so a `next dev` left
 * running on 3000 cannot stand in for the build.
 *
 * Files are named `*.e2e.ts`, not `*.spec.ts`, so Vitest's default pattern
 * (which has no config file in this repo) never picks them up.
 *
 * Record: docs/features/2026-11-11-e2e-tests.md
 */

// `playwright-core` is pinned beside `@playwright/test` only so that
// `@axe-core/playwright` (which takes it as a peer) shares the runner's copy.
// Two different versions break the types and the browser revisions, so a bump
// of one without the other stops here rather than somewhere obscure.
const runner = pkg.devDependencies['@playwright/test'];
const core = pkg.devDependencies['playwright-core'];
if (runner !== core) {
  throw new Error(
    `@playwright/test (${runner}) and playwright-core (${core}) must be the same version in package.json`,
  );
}

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // A flaky test is fixed, never retried into green.
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    {
      // Safari's engine at an iPhone-sized screen: carries the phone criterion.
      name: 'webkit-phone',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60_000,
    // Analytics stay off: the build must not have NEXT_PUBLIC_ANALYTICS_PROVIDER set.
  },
});
