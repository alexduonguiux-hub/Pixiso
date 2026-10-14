import { defineConfig } from '@playwright/test';

// Chromium headless renders WebGL through SwiftShader (software). Renders are
// deterministic within one environment but may differ across GPUs/drivers.
export default defineConfig({
  testDir: './tests/render',
  timeout: 90_000,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  outputDir: '../../test-results',
  use: {
    browserName: 'chromium',
    headless: true,
    viewport: { width: 800, height: 600 },
    launchOptions: {
      args: [
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--ignore-gpu-blocklist',
      ],
    },
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
