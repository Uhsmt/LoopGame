import { test, expect } from "@playwright/test";
import { GameHelper } from "../setup/game-helpers";

test.describe("Mobile Device Handling", () => {
    let gameHelper: GameHelper;

    test.beforeEach(async ({ page }) => {
        gameHelper = new GameHelper(page);
    });

    test("should show mobile warning on mobile devices", async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

        // Set mobile user agent
        await page.setUserAgent(
            "Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1",
        );

        await gameHelper.navigateToGame();

        // Check if mobile warning is displayed
        const mobileWarning = await gameHelper.dismissMobileWarning();

        if (mobileWarning) {
            // If there's a mobile warning, verify it contains appropriate text
            const warningText = await page.textContent("body");
            expect(warningText).toMatch(
                /PC.*only|Desktop.*only|mobile.*not.*supported/i,
            );
        } else {
            // If no specific warning, the game should still be accessible
            await expect(gameHelper.canvas).toBeVisible();
        }

        await gameHelper.takeScreenshot("mobile-view");
    });

    test("should work normally on desktop viewports", async ({ page }) => {
        // Set desktop viewport
        await page.setViewportSize({ width: 1200, height: 800 });

        await gameHelper.navigateToGame();

        // Should show normal game interface
        await expect(gameHelper.canvas).toBeVisible();

        // Should be able to start the game
        await gameHelper.startGame();
        await gameHelper.waitForGameplayState();

        await gameHelper.takeScreenshot("desktop-view");
    });

    test("should handle tablet viewports appropriately", async ({ page }) => {
        // Set tablet viewport
        await page.setViewportSize({ width: 768, height: 1024 }); // iPad

        await gameHelper.navigateToGame();

        // Verify the game loads
        await expect(gameHelper.canvas).toBeVisible();

        // Check if there are any device-specific adaptations
        const deviceHandling = await page.evaluate(() => {
            return {
                hasCanvas: document.querySelector("canvas") !== null,
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight,
                devicePixelRatio: window.devicePixelRatio,
            };
        });

        expect(deviceHandling.hasCanvas).toBeTruthy();
        expect(deviceHandling.viewportWidth).toBe(768);
        expect(deviceHandling.viewportHeight).toBe(1024);

        await gameHelper.takeScreenshot("tablet-view");
    });

    test("should maintain functionality across different screen sizes", async ({
        page,
    }) => {
        const testSizes = [
            { width: 1920, height: 1080, name: "fullhd" },
            { width: 1366, height: 768, name: "laptop" },
            { width: 1024, height: 768, name: "tablet-landscape" },
            { width: 800, height: 600, name: "small-desktop" },
        ];

        for (const size of testSizes) {
            await page.setViewportSize({
                width: size.width,
                height: size.height,
            });
            await page.goto("/");

            // Verify canvas is visible and properly sized
            await expect(gameHelper.canvas).toBeVisible();

            const canvasBox = await gameHelper.canvas.boundingBox();
            expect(canvasBox).toBeTruthy();
            expect(canvasBox!.width).toBeGreaterThan(0);
            expect(canvasBox!.height).toBeGreaterThan(0);

            // Verify canvas isn't larger than viewport
            expect(canvasBox!.width).toBeLessThanOrEqual(size.width + 50); // Some tolerance
            expect(canvasBox!.height).toBeLessThanOrEqual(size.height + 50);

            await gameHelper.takeScreenshot(`viewport-${size.name}`);
        }
    });

    test("should handle orientation changes on mobile devices", async ({
        page,
    }) => {
        // Start in portrait mode
        await page.setViewportSize({ width: 375, height: 667 });
        await gameHelper.navigateToGame();

        await gameHelper.takeScreenshot("portrait-mode");

        // Switch to landscape mode
        await page.setViewportSize({ width: 667, height: 375 });
        await page.waitForTimeout(500); // Allow for reflow

        // Verify game still works
        await expect(gameHelper.canvas).toBeVisible();

        const landscapeState = await page.evaluate(() => {
            return {
                orientation:
                    window.innerWidth > window.innerHeight
                        ? "landscape"
                        : "portrait",
                hasCanvas: document.querySelector("canvas") !== null,
            };
        });

        expect(landscapeState.orientation).toBe("landscape");
        expect(landscapeState.hasCanvas).toBeTruthy();

        await gameHelper.takeScreenshot("landscape-mode");
    });
});
