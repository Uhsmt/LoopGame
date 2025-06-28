import { chromium, FullConfig } from "@playwright/test";

/**
 * Global setup for E2E tests
 * This runs once before all tests and can be used for:
 * - Setting up test data
 * - Configuring global state
 * - Warming up the application
 */
async function globalSetup(config: FullConfig) {
    console.log("🚀 Starting E2E test global setup...");

    // Create a browser instance for global setup tasks
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        console.log("🌐 Verifying application is accessible...");

        // Verify the application is running and accessible
        const baseURL = config.use?.baseURL || "http://localhost:1234";
        await page.goto(baseURL, { waitUntil: "networkidle" });

        // Wait for the game to initialize
        await page.waitForSelector("canvas", { timeout: 10000 });

        console.log("✅ Application is ready for E2E testing");

        // You could add more global setup here:
        // - Check for required assets
        // - Verify game initialization
        // - Set up test user data
    } catch (error) {
        console.error("❌ Global setup failed:", error);
        throw error;
    } finally {
        await browser.close();
    }

    console.log("🎯 Global setup completed successfully");
}

export default globalSetup;
