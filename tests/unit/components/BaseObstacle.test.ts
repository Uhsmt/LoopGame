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

// Mock Utility functions (getDistanceは実距離を計算する)
vi.mock("../../../src/scripts/utils/Utility", () => ({
    random: vi.fn().mockImplementation((min: number, _max: number) => min),
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
        width = 50;
        height = 50;
        destroyed = false;
        position = { set: vi.fn() };
        addChild = vi.fn();
        removeFromParent = vi.fn();
        destroy = vi.fn();
        delete = vi.fn();
    },
}));

import { BaseObstacle } from "../../../src/scripts/components/BaseObstacle";

class MockPoint {
    constructor(
        public x: number = 0,
        public y: number = 0,
    ) {}
}

class TestObstacle extends BaseObstacle {
    moveCallCount = 0;

    constructor(aliases: string[] = ["frame1", "frame2"]) {
        super(aliases, 0.1, { x: 800, y: 600 });
    }

    protected move(_delta: number): void {
        this.moveCallCount++;
    }

    // テスト用に protected メンバーを公開する
    setReactsToLine(value: boolean): void {
        this.reactsToLine = value;
    }

    getSprites() {
        return this.sprites;
    }

    face(xDirection: number): void {
        this.faceDirection(xDirection);
    }
}

describe("BaseObstacle", () => {
    let obstacle: TestObstacle;

    beforeEach(() => {
        obstacle = new TestObstacle();
        obstacle.isActive = true;
    });

    describe("constructor", () => {
        it("should show only the first sprite", () => {
            const sprites = obstacle.getSprites();
            expect(sprites).toHaveLength(2);
            expect(sprites[0].visible).toBe(true);
            expect(sprites[1].visible).toBe(false);
        });

        it("should start transparent (before appear)", () => {
            expect(obstacle.alpha).toBe(0);
        });
    });

    describe("appear", () => {
        it("should activate and become visible without fade", () => {
            const fresh = new TestObstacle();
            fresh.appear(false);
            expect(fresh.isActive).toBe(true);
            expect(fresh.alpha).toBe(1);
        });
    });

    describe("walking animation", () => {
        it("should toggle sprite frames after the animation interval", () => {
            const sprites = obstacle.getSprites();

            obstacle.update(300, []); // animIntervalMs(250)を超過
            expect(sprites[0].visible).toBe(false);
            expect(sprites[1].visible).toBe(true);

            obstacle.update(300, []);
            expect(sprites[0].visible).toBe(true);
            expect(sprites[1].visible).toBe(false);
        });

        it("should not toggle before the interval elapses", () => {
            const sprites = obstacle.getSprites();
            obstacle.update(100, []);
            expect(sprites[0].visible).toBe(true);
            expect(sprites[1].visible).toBe(false);
        });

        it("should keep a single-frame obstacle static", () => {
            const single = new TestObstacle(["frame1"]);
            single.isActive = true;
            single.update(1000, []);
            expect(single.getSprites()[0].visible).toBe(true);
        });
    });

    describe("update", () => {
        it("should not move when inactive", () => {
            obstacle.isActive = false;
            obstacle.update(16, []);
            expect(obstacle.moveCallCount).toBe(0);
        });

        it("should move each frame while active", () => {
            obstacle.update(16, []);
            obstacle.update(16, []);
            expect(obstacle.moveCallCount).toBe(2);
        });
    });

    describe("line hit", () => {
        it("should trigger once when a segment is within hit area", () => {
            obstacle.x = 100;
            obstacle.y = 100;
            const segments = [new MockPoint(100, 105)] as never[];

            obstacle.update(16, segments);

            expect(obstacle.consumeLineHit()).toBe(true);
            expect(obstacle.isLeaving).toBe(true);
            // 2回目以降は発動しない
            expect(obstacle.consumeLineHit()).toBe(false);
        });

        it("should not trigger when segments are far away", () => {
            obstacle.x = 100;
            obstacle.y = 100;
            const segments = [new MockPoint(300, 300)] as never[];

            obstacle.update(16, segments);

            expect(obstacle.consumeLineHit()).toBe(false);
            expect(obstacle.isLeaving).toBe(false);
        });

        it("should not retrigger even if the line hits again while leaving", () => {
            obstacle.x = 100;
            obstacle.y = 100;
            obstacle.update(16, [new MockPoint(100, 100)] as never[]);
            expect(obstacle.consumeLineHit()).toBe(true);

            obstacle.update(16, [new MockPoint(100, 100)] as never[]);
            expect(obstacle.consumeLineHit()).toBe(false);
        });

        it("should ignore lines when reactsToLine is false", () => {
            obstacle.setReactsToLine(false);
            obstacle.x = 100;
            obstacle.y = 100;

            obstacle.update(16, [new MockPoint(100, 100)] as never[]);

            expect(obstacle.consumeLineHit()).toBe(false);
            expect(obstacle.isLeaving).toBe(false);
            // 効果は発動しないが移動は続ける
            expect(obstacle.moveCallCount).toBe(1);
        });
    });

    describe("leaving", () => {
        it("should head to the nearest edge and disappear off screen", () => {
            obstacle.x = 5;
            obstacle.y = 300;
            obstacle.startLeaving();
            expect(obstacle.isLeaving).toBe(true);

            // 左端が最も近いので左へ進む
            obstacle.update(160, []);
            expect(obstacle.x).toBeLessThan(5);

            // 画面外まで出たらisGone
            for (let i = 0; i < 100 && !obstacle.isGone; i++) {
                obstacle.update(160, []);
            }
            expect(obstacle.isGone).toBe(true);
        });

        it("should stop moving via move() while leaving", () => {
            obstacle.x = 5;
            obstacle.y = 300;
            obstacle.startLeaving();
            obstacle.update(16, []);
            expect(obstacle.moveCallCount).toBe(0);
        });
    });

    describe("faceDirection", () => {
        it("should flip sprites horizontally by direction", () => {
            const sprites = obstacle.getSprites();
            obstacle.face(1);
            expect(sprites[0].scale.x).toBeLessThan(0);
            obstacle.face(-1);
            expect(sprites[0].scale.x).toBeGreaterThan(0);
            // 0のときは変えない
            const before = sprites[0].scale.x;
            obstacle.face(0);
            expect(sprites[0].scale.x).toBe(before);
        });
    });

    describe("countLoop (solo-loop counter, common to all obstacles)", () => {
        it("should survive the first two solo loops with a flash reaction", () => {
            obstacle.alpha = 1;

            expect(obstacle.countLoop()).toBe(false);
            // 囲まれた手応えとして一瞬薄くなる
            expect(obstacle.alpha).toBeLessThan(1);

            expect(obstacle.countLoop()).toBe(false);
        });

        it("should report defeat on the third solo loop", () => {
            obstacle.countLoop();
            obstacle.countLoop();
            expect(obstacle.countLoop()).toBe(true);
        });
    });
});
