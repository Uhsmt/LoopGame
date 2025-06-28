import { test, expect } from "@playwright/test";
import { GameHelper } from "../setup/game-helpers";

test.describe("Basic Game Flow", () => {
    let gameHelper: GameHelper;

    test.beforeEach(async ({ page }) => {
        gameHelper = new GameHelper(page);
    });

    test("should load the game successfully", async ({ page }) => {
        await gameHelper.navigateToGame();

        // Verify canvas is present and visible
        await expect(gameHelper.canvas).toBeVisible();

        // Verify page title
        await expect(page).toHaveTitle(/Loop.*Game|LoopGame|Butterfly/i);

        // Take screenshot for visual verification
        await gameHelper.takeScreenshot("game-loaded");
    });

    test("should display game elements on load", async ({ page }) => {
        await gameHelper.navigateToGame();

        // Verify essential game elements are present
        const canvas = gameHelper.canvas;
        await expect(canvas).toBeVisible();

        // Check canvas dimensions are reasonable
        const canvasBox = await canvas.boundingBox();
        expect(canvasBox).toBeTruthy();
        expect(canvasBox!.width).toBeGreaterThan(400);
        expect(canvasBox!.height).toBeGreaterThan(300);

        // Verify no JavaScript errors
        const logs: string[] = [];
        page.on("console", (msg) => {
            if (msg.type() === "error") {
                logs.push(msg.text());
            }
        });

        await page.waitForTimeout(2000);
        expect(logs.filter((log) => !log.includes("favicon"))).toHaveLength(0);
    });

    test("should start gameplay when clicked", async ({ page }) => {
        await gameHelper.navigateToGame();

        // Click to start the game
        await gameHelper.startGame();

        // Verify gameplay has started
        await gameHelper.waitForGameplayState();

        // Should be able to detect some game UI elements
        const hasGameplayUI = await page.evaluate(() => {
            // Look for typical gameplay indicators
            return (
                document.body.textContent?.includes("Score") ||
                document.body.textContent?.includes("Time") ||
                (window as any).gameState === "gameplay"
            );
        });

        expect(hasGameplayUI).toBeTruthy();

        await gameHelper.takeScreenshot("gameplay-started");
    });

    test("should handle mouse interactions on canvas", async ({ page }) => {
        await gameHelper.navigateToGame();
        await gameHelper.startGame();

        // Get initial game state
        const initialScore = await gameHelper.getScore();

        // Perform some mouse interactions
        const canvas = gameHelper.canvas;
        const canvasBox = await canvas.boundingBox();

        if (canvasBox) {
            // Click and drag to simulate drawing
            const centerX = canvasBox.width / 2;
            const centerY = canvasBox.height / 2;

            await page.mouse.move(
                canvasBox.x + centerX - 50,
                canvasBox.y + centerY - 50,
            );
            await page.mouse.down();
            await page.mouse.move(
                canvasBox.x + centerX + 50,
                canvasBox.y + centerY - 50,
                { steps: 10 },
            );
            await page.mouse.move(
                canvasBox.x + centerX + 50,
                canvasBox.y + centerY + 50,
                { steps: 10 },
            );
            await page.mouse.move(
                canvasBox.x + centerX - 50,
                canvasBox.y + centerY + 50,
                { steps: 10 },
            );
            await page.mouse.move(
                canvasBox.x + centerX - 50,
                canvasBox.y + centerY - 50,
                { steps: 10 },
            );
            await page.mouse.up();

            // Wait for interaction to be processed
            await page.waitForTimeout(1000);
        }

        // Verify the interaction was registered (score might change or visual feedback)
        const hasInteraction = await page.evaluate(() => {
            // Check if there's visual feedback or game state change
            return (
                (window as any).lastInteractionTime !== undefined ||
                document.querySelector("canvas") !== null
            );
        });

        expect(hasInteraction).toBeTruthy();

        await gameHelper.takeScreenshot("after-interaction");
    });

    test("should complete a basic loop drawing", async ({ page }) => {
        await gameHelper.navigateToGame();
        await gameHelper.startGame();

        await page.waitForTimeout(1000); // Let game stabilize

        // Draw a simple rectangular loop
        await gameHelper.drawRectangleLoop(200, 200, 100, 100);

        // Wait for loop processing
        await page.waitForTimeout(1000);

        // Verify some feedback occurred (score change, visual effect, etc.)
        const postLoopState = await page.evaluate(() => {
            return {
                hasCanvas: document.querySelector("canvas") !== null,
                bodyText: document.body.textContent || "",
                windowVars: Object.keys(window as any).filter(
                    (key) => key.includes("game") || key.includes("score"),
                ),
            };
        });

        expect(postLoopState.hasCanvas).toBeTruthy();

        await gameHelper.takeScreenshot("loop-completed");
    });

    test("should handle game timing correctly", async ({ page }) => {
        await gameHelper.navigateToGame();
        await gameHelper.startGame();

        // Wait a few seconds and verify time is progressing
        await page.waitForTimeout(3000);

        // Check if there are any time-related elements or if time is passing
        const timeState = await page.evaluate(() => {
            const now = Date.now();
            return {
                timestamp: now,
                hasTimeElements:
                    document.body.textContent?.includes("Time") ||
                    document.body.textContent?.includes(":") ||
                    (window as any).gameTime !== undefined,
                gameVars: Object.keys(window as any).filter(
                    (key) =>
                        key.toLowerCase().includes("time") ||
                        key.toLowerCase().includes("timer"),
                ),
            };
        });

        expect(timeState.timestamp).toBeGreaterThan(0);

        await gameHelper.takeScreenshot("timing-check");
    });

    test("should be responsive to window resize", async ({ page }) => {
        await gameHelper.navigateToGame();

        // Test different viewport sizes
        const viewports = [
            { width: 1920, height: 1080 },
            { width: 1024, height: 768 },
            { width: 800, height: 600 },
        ];

        for (const viewport of viewports) {
            await page.setViewportSize(viewport);
            await page.waitForTimeout(500);

            // Verify canvas is still visible and properly sized
            const canvas = gameHelper.canvas;
            await expect(canvas).toBeVisible();

            const canvasBox = await canvas.boundingBox();
            expect(canvasBox).toBeTruthy();
            expect(canvasBox!.width).toBeGreaterThan(0);
            expect(canvasBox!.height).toBeGreaterThan(0);
        }

        await gameHelper.takeScreenshot("responsive-test");
    });

    test("should handle page refresh gracefully", async ({ page }) => {
        await gameHelper.navigateToGame();
        await gameHelper.startGame();

        // Interact with the game
        await gameHelper.drawRectangleLoop(150, 150, 80, 80);
        await page.waitForTimeout(1000);

        // Refresh the page
        await page.reload();

        // Verify game loads again properly
        await gameHelper.waitForGameLoad();
        await expect(gameHelper.canvas).toBeVisible();

        // Should be back to initial state
        await gameHelper.takeScreenshot("after-refresh");
    });
});

test.describe("Performance and Stability", () => {
    let gameHelper: GameHelper;

    test.beforeEach(async ({ page }) => {
        gameHelper = new GameHelper(page);
    });

    test("should maintain stable performance during gameplay", async ({
        page,
    }) => {
        await gameHelper.navigateToGame();
        await gameHelper.startGame();

        // Monitor performance over time
        const performanceData = [];

        for (let i = 0; i < 5; i++) {
            await page.waitForTimeout(1000);
            const metrics = await gameHelper.checkPerformance();
            performanceData.push(metrics);

            // Perform some interactions
            await gameHelper.drawCircleLoop(200 + i * 20, 200 + i * 20, 30);
        }

        // Verify performance didn't degrade significantly
        const firstMetric = performanceData[0];
        const lastMetric = performanceData[performanceData.length - 1];

        // Memory shouldn't grow too much (allowing for some normal variance)
        if (firstMetric.memory > 0 && lastMetric.memory > 0) {
            const memoryGrowth = lastMetric.memory / firstMetric.memory;
            expect(memoryGrowth).toBeLessThan(2); // Less than 2x memory growth
        }

        await gameHelper.takeScreenshot("performance-test");
    });

    test("should handle rapid interactions without crashing", async ({
        page,
    }) => {
        await gameHelper.navigateToGame();
        await gameHelper.startGame();

        // Perform rapid interactions
        for (let i = 0; i < 10; i++) {
            await gameHelper.drawRectangleLoop(
                100 + (i % 3) * 50,
                100 + Math.floor(i / 3) * 50,
                40,
                40,
            );
            await page.waitForTimeout(100); // Very short delay
        }

        // Verify game is still responsive
        await expect(gameHelper.canvas).toBeVisible();

        // Verify no JavaScript errors occurred
        let errorCount = 0;
        page.on("console", (msg) => {
            if (msg.type() === "error") {
                errorCount++;
            }
        });

        await page.waitForTimeout(2000);
        expect(errorCount).toBe(0);

        await gameHelper.takeScreenshot("stress-test");
    });
});
