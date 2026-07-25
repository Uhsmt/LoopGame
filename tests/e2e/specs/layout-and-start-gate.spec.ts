import { test, expect } from "@playwright/test";
import { GameHelper } from "../setup/game-helpers";

test.describe("Layout and start gate", () => {
    test("keeps the canvas horizontally centered even with a long caption", async ({
        page,
    }) => {
        const gameHelper = new GameHelper(page);
        await gameHelper.navigateToGame();

        const canvasBox = await gameHelper.canvas.boundingBox();
        expect(canvasBox).toBeTruthy();

        const viewportWidth = page.viewportSize()!.width;
        const canvasCenter = canvasBox!.x + canvasBox!.width / 2;
        // captionが長くなると#mainがゲーム幅を超えて広がり、canvasが左に
        // 寄ってしまっていた(#main の max-width で頭打ちにして修正)
        expect(Math.abs(canvasCenter - viewportWidth / 2)).toBeLessThan(2);
    });

    test("blocks stage input until the start gate is clicked", async ({
        page,
    }) => {
        const gameHelper = new GameHelper(page);
        await gameHelper.navigateToGame();

        const gate = page.locator("#tapToStart");
        await expect(gate).toBeVisible();

        // PIXIはpointermoveをdocumentに張るため、ゲートを被せただけでは
        // マウス移動がstageに届いてしまう。ゲート中はstage側で止める
        const canvasBox = await gameHelper.canvas.boundingBox();
        await page.mouse.move(canvasBox!.x + 100, canvasBox!.y + 100);
        await page.mouse.move(canvasBox!.x + 300, canvasBox!.y + 200);
        await expect(gate).toBeVisible();

        await gate.click();
        await expect(gate).toBeHidden();
    });
});
