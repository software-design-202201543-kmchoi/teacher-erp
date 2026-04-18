import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "teacher",
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".auth/teacher.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "student",
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".auth/student.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "parent",
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".auth/parent.json",
      },
      dependencies: ["setup"],
    },
  ],
})
