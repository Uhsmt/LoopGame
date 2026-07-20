import { describe, it, expect } from "vitest";
import { DreamDeparturePath } from "../../../src/scripts/utils/DreamDeparturePath";

const SCREEN = { screenWidth: 1150, screenHeight: 650 };

function makePath(
    startX: number,
    startY: number,
    overrides: Record<string, number> = {},
) {
    return new DreamDeparturePath({
        startX,
        startY,
        ...SCREEN,
        ...overrides,
    });
}

/** deltaMS刻みでelapsedMsぶんstepする */
function advance(path: DreamDeparturePath, elapsedMs: number, deltaMS = 16) {
    for (let t = 0; t < elapsedMs; t += deltaMS) {
        path.step(deltaMS);
    }
}

describe("DreamDeparturePath", () => {
    it("starts in trembling mode at the pinned position", () => {
        const path = makePath(300, 300);
        expect(path.mode).toBe("trembling");
        expect(path.x).toBe(300);
        expect(path.y).toBe(300);
    });

    it("stays within a small radius of the start while trembling", () => {
        const path = makePath(300, 300, { trembleDurationMs: 700 });
        for (let t = 0; t < 700; t += 16) {
            path.step(16);
            if (path.mode !== "trembling") break;
            const dist = Math.hypot(path.x - 300, path.y - 300);
            // 震え(ブルブル)は微小な揺れで、飛び立ちはしない
            expect(dist).toBeLessThan(10);
        }
    });

    it("switches to departing after the tremble duration", () => {
        const path = makePath(300, 300, { trembleDurationMs: 700 });
        advance(path, 600);
        expect(path.mode).toBe("trembling");
        advance(path, 200);
        expect(path.mode).toBe("departing");
    });

    it("drifts toward the upper-right when pinned on the left half of the screen", () => {
        const path = makePath(300, 400);
        advance(path, 3000);
        expect(path.x).toBeGreaterThan(300 + 100);
        expect(path.y).toBeLessThan(400 - 30);
    });

    it("drifts toward the upper-left when pinned on the right half of the screen", () => {
        const path = makePath(850, 400);
        advance(path, 3000);
        expect(path.x).toBeLessThan(850 - 100);
        expect(path.y).toBeLessThan(400 - 30);
    });

    it("sways rather than flying in a perfectly straight line", () => {
        const path = makePath(300, 400, { trembleDurationMs: 0 });
        // 出発点と十分先の到達点を結ぶ直線から、途中経過が一度は逸れること
        const points: { x: number; y: number }[] = [];
        for (let t = 0; t < 2500; t += 16) {
            path.step(16);
            points.push({ x: path.x, y: path.y });
        }
        const first = points[0];
        const last = points[points.length - 1];
        const lineLen = Math.hypot(last.x - first.x, last.y - first.y);
        const maxDeviation = Math.max(
            ...points.map(
                (p) =>
                    Math.abs(
                        (last.x - first.x) * (first.y - p.y) -
                            (first.x - p.x) * (last.y - first.y),
                    ) / lineLen,
            ),
        );
        expect(maxDeviation).toBeGreaterThan(5);
    });

    it("is not done while still on screen, and completes only after leaving it", () => {
        const path = makePath(300, 400);
        advance(path, 1000);
        expect(path.done).toBe(false);

        // 十分な時間進めれば必ず画面外に抜けて完了する
        advance(path, 30000);
        expect(path.done).toBe(true);
        const margin = 90;
        const offScreen =
            path.x < -margin ||
            path.x > SCREEN.screenWidth + margin ||
            path.y < -margin ||
            path.y > SCREEN.screenHeight + margin;
        expect(offScreen).toBe(true);
    });

    it("stops advancing once done", () => {
        const path = makePath(300, 400);
        advance(path, 40000);
        expect(path.done).toBe(true);
        const { x, y } = path;
        path.step(16);
        expect(path.x).toBe(x);
        expect(path.y).toBe(y);
    });
});
