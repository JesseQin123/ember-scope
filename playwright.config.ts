import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 45000,
  workers: 1,
  use: {
    baseURL: process.env.EMBER_BASE_URL || "http://127.0.0.1:5173",
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    channel: "chrome",
    headless: true,
    launchOptions: { args: ["--enable-webgl", "--ignore-gpu-blocklist"] },
  },
});
