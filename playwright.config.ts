import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for E2E testing of LoopGame
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    testDir: "./tests/e2e",

    /* Run tests in files in parallel */
    fullyParallel: true,

    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,

    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,

    /* Opt out of parallel tests on CI. */
    workers: process.env.CI ? 1 : undefined,

    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: [
        ["html", { outputFolder: "playwright-report" }],
        ["json", { outputFile: "test-results/e2e-results.json" }],
        ["line"],
    ],

    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        baseURL: "http://localhost:1234",

        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: "on-first-retry",

        /* Take screenshot on failure */
        screenshot: "only-on-failure",

        /* Record video on failure */
        video: "retain-on-failure",

        /* Timeout for each test */
        timeout: 30000,
    },

    /* Configure projects for major browsers */
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },

        {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
        },

        {
            name: "webkit",
            use: { ...devices["Desktop Safari"] },
        },

        /* Test against mobile viewports. */
        {
            name: "Mobile Chrome",
            use: { ...devices["Pixel 5"] },
        },
        {
            name: "Mobile Safari",
            use: { ...devices["iPhone 12"] },
        },
    ],

    /* Run your local dev server before starting the tests */
    webServer: {
        command: "npm start",
        url: "http://localhost:1234",
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000, // 2 minutes
    },

    /* Global setup and teardown */
    globalSetup: require.resolve("./tests/e2e/setup/global-setup.ts"),

    /* Output directories */
    outputDir: "test-results/",

    /* Expect configuration */
    expect: {
        /* Timeout for expect() calls */
        timeout: 5000,
    },
});
