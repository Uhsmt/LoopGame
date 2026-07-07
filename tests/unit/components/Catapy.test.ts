import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock PIXI.js
vi.mock("pixi.js", () => {
    const makeSprite = () => ({
        anchor: { set: vi.fn() },
        scale: {
            x: 1,
            y: 1,
            set(value: number) {
                this.x = value;
                this.y = value;
            },
        },
        visible: true,
        width: 48,
        height: 21,
    });
    return {
        Sprite: {
            from: vi.fn().mockImplementation(() => makeSprite()),
        },
        Point: vi.fn().mockImplementation((x = 0, y = 0) => ({ x, y })),
    };
});

// Mock Utility(方向角/直進フレーム数を呼び出し引数で制御する)
vi.mock("../../../src/scripts/utils/Utility", () => ({
    random: vi.fn().mockImplementation((min: number, max: number) => {
        // turnFrame(180〜300)は常に180を返す
        if (max === 300) return 180;
        // offsetDeg(-20〜20)は0度(オフセットなし)を返す
        if (max === 20) return 0;
        return min;
    }),
    chooseAtRandom: vi
        .fn()
        .mockImplementation(<T>(list: T[], num: number) => list.slice(0, num)),
    getDistance: vi
        .fn()
        .mockImplementation(
            (p1: { x: number; y: number }, p2: { x: number; y: number }) =>
                Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2),
        ),
}));

// Mock Const
vi.mock("../../../src/scripts/utils/Const", () => ({
    MARGIN: 25,
}));

// Mock BaseCaptureableObject
vi.mock("../../../src/scripts/components/BaseCaptureableObject", () => ({
    BaseCaptureableObject: class {
        hitAreaSize = 10;
        hitRate = 0.6;
        alpha = 0;
        x = 0;
        y = 0;
        width = 48;
        height = 21;
        destroyed = false;
        position = { set: vi.fn() };
        addChild = vi.fn();
        removeFromParent = vi.fn();
        destroy = vi.fn();
        delete = vi.fn();
    },
}));

import { Catapy } from "../../../src/scripts/components/Catapy";
import * as Utility from "../../../src/scripts/utils/Utility";
import * as Const from "../../../src/scripts/utils/Const";

describe("Catapy", () => {
    let catapy: Catapy;
    const screenSize = { x: 800, y: 600 };

    beforeEach(() => {
        vi.mocked(Utility.random).mockImplementation(
            (min: number, max: number) => {
                if (max === 300) return 180;
                if (max === 20) return 0;
                return min;
            },
        );
        vi.mocked(Utility.chooseAtRandom).mockImplementation(
            <T>(list: T[], num: number) => list.slice(0, num),
        );
        catapy = new Catapy(screenSize);
        catapy.isActive = true;
        catapy.x = 400;
        catapy.y = 300;
    });

    describe("constructor", () => {
        it("should use two sprites (catapy1/catapy2, walking animation)", () => {
            const sprites = (catapy as unknown as { sprites: unknown[] })
                .sprites;
            expect(sprites).toHaveLength(2);
        });

        it("should set hitAreaSize to 14 (1.2x scale)", () => {
            expect(
                (catapy as unknown as { hitAreaSize: number }).hitAreaSize,
            ).toBe(14);
        });

        it("should set animIntervalMs to 400 (slow walking animation)", () => {
            expect(
                (catapy as unknown as { animIntervalMs: number })
                    .animIntervalMs,
            ).toBe(400);
        });

        it("should not react to line hits (reactsToLine = false)", () => {
            expect(
                (catapy as unknown as { reactsToLine: boolean }).reactsToLine,
            ).toBe(false);
        });
    });

    describe("slow near-horizontal movement", () => {
        it("should move at a slower speed than Spider (0.35px/16ms)", () => {
            const startX = catapy.x;
            catapy.update(16, []);
            const movedDistance = Math.abs(catapy.x - startX);
            expect(movedDistance).toBeCloseTo(0.2, 5);
            expect(movedDistance).toBeLessThan(0.35);
        });

        it("should move nearly horizontally (negligible vertical movement)", () => {
            // baseAngleDeg=0(chooseAtRandomが先頭要素[0]を返す), offsetDeg=0 -> 真右
            const startY = catapy.y;
            catapy.update(16, []);
            expect(catapy.y).toBeCloseTo(startY, 5);
        });

        it("should turn to a new random direction after the turn-frame count", () => {
            // 180フレーム進む間は同じ方向のまま
            for (let i = 0; i < 179; i++) {
                catapy.update(16, []);
            }
            const xBeforeTurn = catapy.x;
            const yBeforeTurn = catapy.y;

            // 180フレーム目の直前に方向を変える(左向き+下寄りオフセット)ようモックを切り替える
            vi.mocked(Utility.chooseAtRandom).mockImplementation(
                <T>(list: T[], _num: number) => [list[1]] as T[],
            );
            vi.mocked(Utility.random).mockImplementation(
                (min: number, max: number) => {
                    if (max === 300) return 180;
                    if (max === 20) return -20;
                    return min;
                },
            );
            catapy.update(16, []);

            expect(catapy.x).toBeLessThan(xBeforeTurn);
            expect(catapy.y).toBeGreaterThan(yBeforeTurn);
        });
    });

    describe("screen edge reflection", () => {
        it("should reflect off the left edge (MARGIN)", () => {
            vi.mocked(Utility.chooseAtRandom).mockImplementation(
                <T>(list: T[], _num: number) => [list[1]] as T[], // 左向き
            );
            catapy = new Catapy(screenSize);
            catapy.isActive = true;
            catapy.x = Const.MARGIN + 0.1;
            catapy.y = 300;

            catapy.update(16, []);
            const xBeforeReflect = catapy.x;
            catapy.update(16, []);

            expect(catapy.x).toBeGreaterThan(xBeforeReflect);
        });

        it("should reflect off the right edge", () => {
            // baseAngleDeg=0(右向き) はデフォルトモックのまま
            catapy = new Catapy(screenSize);
            catapy.isActive = true;
            catapy.x = screenSize.x - Const.MARGIN - 0.1;
            catapy.y = 300;

            catapy.update(16, []);
            const xBeforeReflect = catapy.x;
            catapy.update(16, []);

            expect(catapy.x).toBeLessThan(xBeforeReflect);
        });
    });

    describe("facing direction", () => {
        it("should flip sprite when moving right (positive x direction)", () => {
            const sprites = (
                catapy as unknown as { sprites: { scale: { x: number } }[] }
            ).sprites;
            catapy.update(16, []); // baseAngleDeg=0 -> 右向き
            expect(sprites[0].scale.x).toBeLessThan(0);
        });
    });

    describe("line contact is harmless", () => {
        it("should not start leaving when a line segment overlaps", () => {
            const segments = [{ x: 400, y: 300 }] as never[];
            catapy.update(16, segments);

            expect(catapy.consumeLineHit()).toBe(false);
            expect(catapy.isLeaving).toBe(false);
        });

        it("should keep moving normally even while a line overlaps every frame", () => {
            const startX = catapy.x;
            for (let i = 0; i < 5; i++) {
                catapy.update(16, [{ x: catapy.x, y: catapy.y }] as never[]);
            }
            expect(catapy.isGone).toBe(false);
            expect(catapy.x).not.toBe(startX);
        });
    });
});
