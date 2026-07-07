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
        // turnFrame(120〜180)は常に120を返す
        if (max === 180) return 120;
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

import { Spider } from "../../../src/scripts/components/Spider";
import * as Utility from "../../../src/scripts/utils/Utility";
import * as Const from "../../../src/scripts/utils/Const";

describe("Spider", () => {
    let spider: Spider;
    const screenSize = { x: 800, y: 600 };

    beforeEach(() => {
        vi.mocked(Utility.random).mockImplementation(
            (min: number, max: number) => {
                if (max === 180) return 120;
                if (max === 359) return 0;
                return min;
            },
        );
        spider = new Spider(screenSize);
        spider.isActive = true;
        spider.x = 400;
        spider.y = 300;
    });

    describe("constructor", () => {
        it("should use two sprites (spider1/spider2, walking animation)", () => {
            const sprites = (spider as unknown as { sprites: unknown[] })
                .sprites;
            expect(sprites).toHaveLength(2);
        });

        it("should set hitAreaSize to 9 (same as the smallest butterfly)", () => {
            expect(
                (spider as unknown as { hitAreaSize: number }).hitAreaSize,
            ).toBe(9);
        });

        it("should set animIntervalMs to 300 (slow walking animation)", () => {
            expect(
                (spider as unknown as { animIntervalMs: number })
                    .animIntervalMs,
            ).toBe(300);
        });
    });

    describe("slow straight movement", () => {
        it("should move in a straight line while under the turn-frame threshold", () => {
            // angleDeg=0 -> directionX=1, directionY=0 (turnFrame=120)
            spider.update(16, []);
            const xAfterFirst = spider.x;
            spider.update(16, []);
            expect(spider.x).toBeGreaterThan(xAfterFirst);
            expect(spider.y).toBeCloseTo(300, 5);
        });

        it("should move at about the speed of the slowest (large) butterfly (~0.35px/16ms)", () => {
            const startX = spider.x;
            spider.update(16, []);
            const movedDistance = spider.x - startX;
            expect(movedDistance).toBeCloseTo(0.35, 5);
        });

        it("should turn to a new random direction after the turn-frame count", () => {
            // 120フレーム進む間は同じ方向(dx=1,dy=0)
            for (let i = 0; i < 119; i++) {
                spider.update(16, []);
            }
            const xBeforeTurn = spider.x;
            const yBeforeTurn = spider.y;

            // 120フレーム目の直前に方向を変える(90度=真下)ようモックを切り替える
            vi.mocked(Utility.random).mockImplementation(
                (min: number, max: number) => {
                    if (max === 180) return 120;
                    if (max === 359) return 90;
                    return min;
                },
            );
            spider.update(16, []);

            expect(spider.x).toBeCloseTo(xBeforeTurn, 5);
            expect(spider.y).toBeGreaterThan(yBeforeTurn);
        });
    });

    describe("screen edge reflection", () => {
        it("should reflect off the left edge (MARGIN)", () => {
            vi.mocked(Utility.random).mockImplementation(
                (min: number, max: number) => {
                    if (max === 180) return 120;
                    if (max === 359) return 180; // 左向き
                    return min;
                },
            );
            spider = new Spider(screenSize);
            spider.isActive = true;
            // 低速(0.35px/frame)なので、1フレームで反射条件に届く位置にする
            spider.x = Const.MARGIN + 0.2;
            spider.y = 300;

            spider.update(16, []);
            const xBeforeReflect = spider.x;
            spider.update(16, []);

            expect(spider.x).toBeGreaterThan(xBeforeReflect);
        });

        it("should reflect off the right edge", () => {
            vi.mocked(Utility.random).mockImplementation(
                (min: number, max: number) => {
                    if (max === 180) return 120;
                    if (max === 359) return 0; // 右向き
                    return min;
                },
            );
            spider = new Spider(screenSize);
            spider.isActive = true;
            spider.x = screenSize.x - Const.MARGIN - 0.2;
            spider.y = 300;

            spider.update(16, []);
            const xBeforeReflect = spider.x;
            spider.update(16, []);

            expect(spider.x).toBeLessThan(xBeforeReflect);
        });

        it("should reflect off the top edge", () => {
            vi.mocked(Utility.random).mockImplementation(
                (min: number, max: number) => {
                    if (max === 180) return 120;
                    if (max === 359) return 270; // 上向き
                    return min;
                },
            );
            spider = new Spider(screenSize);
            spider.isActive = true;
            spider.x = 400;
            spider.y = Const.MARGIN + 0.2;

            spider.update(16, []);
            const yBeforeReflect = spider.y;
            spider.update(16, []);

            expect(spider.y).toBeGreaterThan(yBeforeReflect);
        });

        it("should reflect off the bottom edge", () => {
            vi.mocked(Utility.random).mockImplementation(
                (min: number, max: number) => {
                    if (max === 180) return 120;
                    if (max === 359) return 90; // 下向き
                    return min;
                },
            );
            spider = new Spider(screenSize);
            spider.isActive = true;
            spider.x = 400;
            spider.y = screenSize.y - Const.MARGIN - 0.2;

            spider.update(16, []);
            const yBeforeReflect = spider.y;
            spider.update(16, []);

            expect(spider.y).toBeLessThan(yBeforeReflect);
        });
    });

    describe("facing direction", () => {
        it("should flip sprite when moving right (positive x direction)", () => {
            const sprites = (
                spider as unknown as { sprites: { scale: { x: number } }[] }
            ).sprites;
            spider.update(16, []); // angleDeg=0 -> 右向き
            expect(sprites[0].scale.x).toBeLessThan(0);
        });
    });

    describe("line hit", () => {
        it("should start leaving when a line segment is within hitAreaSize", () => {
            const segments = [{ x: 400, y: 302 }] as never[];
            spider.update(16, segments);
            expect(spider.consumeLineHit()).toBe(true);
            expect(spider.isLeaving).toBe(true);
        });
    });
});
