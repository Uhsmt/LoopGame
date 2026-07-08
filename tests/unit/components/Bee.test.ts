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
        width: 20,
        height: 20,
    });
    return {
        Sprite: {
            from: vi.fn().mockImplementation(() => makeSprite()),
        },
        Point: vi.fn().mockImplementation((x = 0, y = 0) => ({ x, y })),
    };
});

// Mock Utility(角度/直進フレーム数を呼び出し引数で制御する)
vi.mock("../../../src/scripts/utils/Utility", () => ({
    random: vi.fn().mockImplementation((min: number, max: number) => {
        // turnFrame(120〜240)は常に120を返す
        if (max === 240) return 120;
        // angleDeg(0〜359)は0度(=x軸正方向)を返す
        if (max === 359) return 0;
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
        width = 20;
        height = 20;
        destroyed = false;
        position = { set: vi.fn() };
        addChild = vi.fn();
        removeFromParent = vi.fn();
        destroy = vi.fn();
        delete = vi.fn();
    },
}));

import { Bee } from "../../../src/scripts/components/Bee";
import * as Utility from "../../../src/scripts/utils/Utility";

describe("Bee", () => {
    let bee: Bee;
    const screenSize = { x: 800, y: 600 };

    beforeEach(() => {
        vi.mocked(Utility.random).mockImplementation(
            (min: number, max: number) => {
                if (max === 240) return 120;
                if (max === 359) return 0;
                return min;
            },
        );
        bee = new Bee(screenSize);
        bee.isActive = true;
        bee.x = 400;
        bee.y = 300;
    });

    describe("constructor", () => {
        it("should use a single sprite (bee alias, no walking animation)", () => {
            const sprites = (bee as unknown as { sprites: unknown[] }).sprites;
            expect(sprites).toHaveLength(1);
        });

        it("should set hitAreaSize to 16 (2x scale)", () => {
            expect(
                (bee as unknown as { hitAreaSize: number }).hitAreaSize,
            ).toBe(16);
        });

        it("should set leaveSpeed to 3 (faster than default)", () => {
            expect((bee as unknown as { leaveSpeed: number }).leaveSpeed).toBe(
                3,
            );
        });
    });

    describe("zigzag movement", () => {
        it("should move in a straight line while under the turn-frame threshold", () => {
            // angleDeg=0 -> directionX=1, directionY=0 (turnFrame=120)
            bee.update(16, []);
            const xAfterFirst = bee.x;
            bee.update(16, []);
            // x方向へ直進し続けている(同じ向き)
            expect(bee.x).toBeGreaterThan(xAfterFirst);
            expect(bee.y).toBeCloseTo(300, 5);
        });

        it("should move faster than the smallest butterfly (0.6px/16ms)", () => {
            const startX = bee.x;
            bee.update(16, []);
            const movedDistance = bee.x - startX;
            expect(movedDistance).toBeCloseTo(4.8, 5);
            expect(movedDistance).toBeGreaterThan(0.6);
        });

        it("should turn to a new random direction after the turn-frame count", () => {
            // 120フレーム進む間は同じ方向(dx=1,dy=0)
            for (let i = 0; i < 119; i++) {
                bee.update(16, []);
            }
            const xBeforeTurn = bee.x;
            const yBeforeTurn = bee.y;

            // 120フレーム目の直前に方向を変える(90度=真下)ようモックを切り替える
            vi.mocked(Utility.random).mockImplementation(
                (min: number, max: number) => {
                    if (max === 240) return 120;
                    if (max === 359) return 90;
                    return min;
                },
            );
            bee.update(16, []);

            // x方向にはほぼ進まず、y方向に進むようになる
            expect(bee.x).toBeCloseTo(xBeforeTurn, 5);
            expect(bee.y).toBeGreaterThan(yBeforeTurn);
        });
    });

    describe("screen edge reflection", () => {
        it("should reflect off the left edge (MARGIN)", () => {
            // 左向きに直進させる(180度)
            vi.mocked(Utility.random).mockImplementation(
                (min: number, max: number) => {
                    if (max === 240) return 120;
                    if (max === 359) return 180;
                    return min;
                },
            );
            bee = new Bee(screenSize);
            bee.isActive = true;
            bee.x = 26; // MARGIN(25)のすぐ内側
            bee.y = 300;

            bee.update(16, []);
            const xBeforeReflect = bee.x;
            bee.update(16, []);

            // 反射後は右へ進む(xが増える)
            expect(bee.x).toBeGreaterThan(xBeforeReflect);
        });

        it("should reflect off the right edge", () => {
            vi.mocked(Utility.random).mockImplementation(
                (min: number, max: number) => {
                    if (max === 240) return 120;
                    if (max === 359) return 0; // 右向き
                    return min;
                },
            );
            bee = new Bee(screenSize);
            bee.isActive = true;
            bee.x = screenSize.x - 26; // 右端MARGINのすぐ内側
            bee.y = 300;

            bee.update(16, []);
            const xBeforeReflect = bee.x;
            bee.update(16, []);

            expect(bee.x).toBeLessThan(xBeforeReflect);
        });

        it("should reflect off the top edge", () => {
            vi.mocked(Utility.random).mockImplementation(
                (min: number, max: number) => {
                    if (max === 240) return 120;
                    if (max === 359) return 270; // 上向き
                    return min;
                },
            );
            bee = new Bee(screenSize);
            bee.isActive = true;
            bee.x = 400;
            bee.y = 26;

            bee.update(16, []);
            const yBeforeReflect = bee.y;
            bee.update(16, []);

            expect(bee.y).toBeGreaterThan(yBeforeReflect);
        });

        it("should reflect off the bottom edge", () => {
            vi.mocked(Utility.random).mockImplementation(
                (min: number, max: number) => {
                    if (max === 240) return 120;
                    if (max === 359) return 90; // 下向き
                    return min;
                },
            );
            bee = new Bee(screenSize);
            bee.isActive = true;
            bee.x = 400;
            bee.y = screenSize.y - 26;

            bee.update(16, []);
            const yBeforeReflect = bee.y;
            bee.update(16, []);

            expect(bee.y).toBeLessThan(yBeforeReflect);
        });
    });

    describe("facing direction", () => {
        it("should flip sprite when moving right (positive x direction)", () => {
            const sprites = (
                bee as unknown as { sprites: { scale: { x: number } }[] }
            ).sprites;
            bee.update(16, []); // angleDeg=0 -> 右向き
            expect(sprites[0].scale.x).toBeLessThan(0);
        });
    });

    describe("line hit", () => {
        it("should start leaving when a line segment is within hitAreaSize", () => {
            const segments = [{ x: 400, y: 302 }] as never[];
            bee.update(16, segments);
            expect(bee.consumeLineHit()).toBe(true);
            expect(bee.isLeaving).toBe(true);
        });
    });
});
