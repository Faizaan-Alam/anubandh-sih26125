import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./specs",
  timeout: 90_000,
  use: {
    baseURL: "http://localhost:3000",
    headless: true
  },
  webServer: undefined
});
