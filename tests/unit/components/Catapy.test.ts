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

        it("should set hitAreaSize to 28 (enlarged from playtest feedback)", () => {
            expect(
                (catapy as unknown as { hitAreaSize: number }).hitAreaSize,
            ).toBe(28);
        });

        it("should treat any partial overlap with a loop as a hit (hitRate 0)", () => {
            expect((catapy as unknown as { hitRate: number }).hitRate).toBe(0);
        });

        it("should sample hit points along the elongated body (ellipse)", () => {
            catapy.x = 100;
            catapy.y = 50;
            (catapy as unknown as { width: number }).width = 120;
            (catapy as unknown as { height: number }).height = 40;

            const points = (
                catapy as unknown as {
                    hitAreaPoints(): { x: number; y: number }[];
                }
            ).hitAreaPoints();

            const xs = points.map((p) => p.x);
            const ys = points.map((p) => p.y);
            // 横は体の幅(±60)、縦は体の高さ(±20)までサンプリングされる
            expect(Math.max(...xs)).toBeCloseTo(160, 5);
            expect(Math.min(...xs)).toBeCloseTo(40, 5);
            expect(Math.max(...ys)).toBeCloseTo(70, 5);
            expect(Math.min(...ys)).toBeCloseTo(30, 5);
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

    describe("countLoop (solo-loop counter)", () => {
        it("should survive the first two solo loops with a flash reaction", () => {
            catapy.alpha = 1;

            expect(catapy.countLoop()).toBe(false);
            // 囲まれた手応えとして一瞬薄くなる
            expect(catapy.alpha).toBeLessThan(1);

            expect(catapy.countLoop()).toBe(false);
        });

        it("should report defeat on the third solo loop", () => {
            catapy.countLoop();
            catapy.countLoop();
            expect(catapy.countLoop()).toBe(true);
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
