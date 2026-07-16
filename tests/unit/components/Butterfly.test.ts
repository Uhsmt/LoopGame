import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock PIXI.js
vi.mock("pixi.js", () => ({
    Sprite: {
        from: vi.fn().mockImplementation(() => ({
            scale: { set: vi.fn() },
            tint: 0,
            anchor: { set: vi.fn() },
            width: 50,
            height: 50,
        })),
    },
    Graphics: vi.fn().mockImplementation(() => ({
        ellipse: vi.fn().mockReturnThis(),
        circle: vi.fn().mockReturnThis(),
        poly: vi.fn().mockReturnThis(),
        clear: vi.fn().mockReturnThis(),
        fill: vi.fn().mockReturnThis(),
        tint: 0,
        alpha: 1,
        x: 0,
        y: 0,
        scale: { x: 1 },
    })),
    Point: vi.fn().mockImplementation((x = 0, y = 0) => ({ x, y })),
    Container: vi.fn().mockImplementation(() => ({
        addChild: vi.fn(),
        alpha: 1,
        x: 0,
        y: 0,
        width: 50,
        height: 50,
        pivot: { set: vi.fn() },
        position: { set: vi.fn() },
    })),
    BitmapText: vi.fn().mockImplementation(() => ({
        anchor: { set: vi.fn() },
        x: 0,
        y: 0,
    })),
}));

// Mock Utility functions
vi.mock("../../../src/scripts/utils/Utility", () => ({
    random: vi.fn().mockReturnValue(100),
    chooseAtRandom: vi.fn().mockReturnValue(["small"]),
    getDistance: vi.fn().mockReturnValue(5),
    getColorMarkShape: vi.fn().mockReturnValue("circle"),
}));

// Mock Const
vi.mock("../../../src/scripts/utils/Const", () => ({
    SIZE_LIST: ["small", "medium", "large"],
    MARGIN: 50,
    AVOID_PENCIL_SPEED: 0.6,
}));

// Mock BaseCaptureableObject
vi.mock("../../../src/scripts/components/BaseCaptureableObject", () => ({
    BaseCaptureableObject: class {
        hitAreaSize = 10;
        addChild = vi.fn();
        alpha = 0;
        x = 0;
        y = 0;
        width = 50;
        height = 50;
        pivot = { set: vi.fn() };
        position = { set: vi.fn() };
    },
}));

import { Butterfly } from "../../../src/scripts/components/Butterfly";
import * as Utility from "../../../src/scripts/utils/Utility";

// Create simple Point-like objects for testing
class MockPoint {
    x: number;
    y: number;
    constructor(x: number = 0, y: number = 0) {
        this.x = x;
        this.y = y;
    }
}

describe("Butterfly", () => {
    let butterfly: Butterfly;
    const mockScreenSize = { x: 800, y: 600 };

    beforeEach(() => {
        vi.clearAllMocks();
        butterfly = new Butterfly(
            "small",
            0xff0000,
            0x00ff00,
            1,
            mockScreenSize,
        );
    });

    describe("Constructor", () => {
        it("should initialize small butterfly with correct properties", () => {
            expect(butterfly.color).toBe(0xff0000);
            expect(butterfly.multiplicationRate).toBe(1);
            expect(butterfly.screenSize).toEqual(mockScreenSize);
            expect(butterfly.isFlying).toBe(false);
            expect(butterfly.isFlapping).toBe(false);
        });

        it("should initialize large butterfly with different speed", () => {
            const largeButterly = new Butterfly(
                "large",
                0xff0000,
                0x00ff00,
                1,
                mockScreenSize,
            );
            // We can't easily test private properties, but we can test that construction doesn't throw
            expect(largeButterly).toBeDefined();
            expect(largeButterly.multiplicationRate).toBe(1);
        });

        it("should initialize medium butterfly", () => {
            const mediumButterfly = new Butterfly(
                "medium",
                0xff0000,
                0x00ff00,
                1,
                mockScreenSize,
            );
            expect(mediumButterfly).toBeDefined();
        });

        it("should initialize special butterfly", () => {
            const specialButterfly = new Butterfly(
                "special",
                0xff0000,
                0x00ff00,
                1,
                mockScreenSize,
            );
            expect(specialButterfly).toBeDefined();
        });

        it("should handle random size selection", () => {
            const randomButterfly = new Butterfly(
                "random",
                0xff0000,
                0x00ff00,
                1,
                mockScreenSize,
            );
            expect(randomButterfly).toBeDefined();
        });

        it("should handle multiplication rate >= 2", () => {
            const multiButterfly = new Butterfly(
                "small",
                0xff0000,
                0x00ff00,
                3,
                mockScreenSize,
            );
            expect(multiButterfly.multiplicationRate).toBe(3);
        });
    });

    describe("getObjectCenter()", () => {
        it("should return correct center coordinates", () => {
            butterfly.x = 100;
            butterfly.y = 200;

            const center = (butterfly as any).getObjectCenter();

            // Expected: x - spriteWidth/2, y - height/2
            expect(center.x).toBe(75); // 100 - 50/2
            expect(center.y).toBe(175); // 200 - 50/2
        });

        it("should handle different positions", () => {
            butterfly.x = 0;
            butterfly.y = 0;

            const center = (butterfly as any).getObjectCenter();

            expect(center.x).toBe(-25); // 0 - 50/2
            expect(center.y).toBe(-25); // 0 - 50/2
        });
    });

    describe("appear()", () => {
        it("should set alpha to 1 when fadeIn is false", () => {
            butterfly.appear(false);
            expect(butterfly.alpha).toBe(1);
        });

        it("should start fade in animation when fadeIn is true", () => {
            butterfly.alpha = 0;
            butterfly.appear(true);
            // Since we can't easily test requestAnimationFrame, we just verify it doesn't throw
            expect(butterfly.alpha).toBeGreaterThanOrEqual(0);
        });

        it("should use fadeIn true as default", () => {
            butterfly.alpha = 0;
            butterfly.appear();
            expect(butterfly.alpha).toBeGreaterThanOrEqual(0);
        });
    });

    describe("switchColor()", () => {
        it("should switch sprite and ellipse colors", () => {
            const originalSpriteColor = (butterfly as any).sprite.tint;
            const originalEllipseColor = (butterfly as any).ellipse.tint;

            butterfly.switchColor();

            expect((butterfly as any).sprite.tint).toBe(originalEllipseColor);
            expect((butterfly as any).ellipse.tint).toBe(originalSpriteColor);
            expect(butterfly.color).toBe(originalEllipseColor);
        });

        it("should handle missing ellipse gracefully", () => {
            (butterfly as any).ellipse = null;

            expect(() => butterfly.switchColor()).not.toThrow();
        });

        it("should redraw the color mark for the new color (#70 colorblind-safe mark)", () => {
            vi.mocked(Utility.getColorMarkShape).mockClear();

            butterfly.switchColor();

            // 新しい色(切替後のcolor)で形状マークを引き直していること
            expect(Utility.getColorMarkShape).toHaveBeenCalledWith(
                butterfly.color,
            );
            expect((butterfly as any).mark.clear).toHaveBeenCalled();
        });
    });

    describe("color mark (#70 colorblind accessibility)", () => {
        it("should draw a mark based on getColorMarkShape() on construction", () => {
            expect(Utility.getColorMarkShape).toHaveBeenCalledWith(0xff0000);
            expect((butterfly as any).mark).toBeDefined();
            expect((butterfly as any).mark.clear).toHaveBeenCalled();
            // 黒縁取り+白地の二重塗りで、どの羽色の上でも視認できるようにする
            expect((butterfly as any).mark.fill).toHaveBeenCalledWith(0x000000);
            expect((butterfly as any).mark.fill).toHaveBeenCalledWith(0xffffff);
        });
    });

    describe("setGatherPoint()", () => {
        it("should set gather point and enable gathering", () => {
            const point = new MockPoint(100, 200);
            const distance = 50;

            butterfly.setGatherPoint(point as any, distance);

            expect((butterfly as any).gatherPoint).toBe(point);
            expect((butterfly as any).gatherDistance).toBe(distance);
            expect((butterfly as any).isForceToGather).toBe(true);
        });

        it("should override existing gather point", () => {
            const point1 = new MockPoint(100, 200);
            const point2 = new MockPoint(300, 400);

            butterfly.setGatherPoint(point1 as any, 50);
            butterfly.setGatherPoint(point2 as any, 75);

            expect((butterfly as any).gatherPoint).toBe(point2);
            expect((butterfly as any).gatherDistance).toBe(75);
        });
    });

    describe("setRandomInitialPosition()", () => {
        it("should set position within screen bounds", () => {
            const setPositionSpy = vi.spyOn((butterfly as any).position, "set");

            butterfly.setRandomInitialPoistion(800, 600);

            expect(setPositionSpy).toHaveBeenCalled();
            // Just verify the method was called
            expect(setPositionSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe("update()", () => {
        it("should call flap and fly methods", () => {
            const flapSpy = vi
                .spyOn(butterfly as any, "flap")
                .mockImplementation(() => {});
            const flySpy = vi
                .spyOn(butterfly as any, "fly")
                .mockImplementation(() => {});

            const delta = 1.0;
            const lineSegments = [new MockPoint(100, 100)];

            butterfly.update(delta, lineSegments as any);

            expect(flapSpy).toHaveBeenCalledWith(delta);
            expect(flySpy).toHaveBeenCalledWith(delta, lineSegments, null);
        });

        it("should pass avoidPoint through to fly()", () => {
            const flySpy = vi
                .spyOn(butterfly as any, "fly")
                .mockImplementation(() => {});

            const avoidPoint = new MockPoint(100, 100);
            butterfly.update(16, [], avoidPoint as any);

            expect(flySpy).toHaveBeenCalledWith(16, [], avoidPoint);
        });
    });

    describe("fly() method behavior", () => {
        beforeEach(() => {
            // Set butterfly as flying for these tests
            butterfly.isFlying = true;
            butterfly.x = 400; // Center of screen
            butterfly.y = 300;
        });

        it("should not move when not flying", () => {
            butterfly.isFlying = false;
            const originalX = butterfly.x;
            const originalY = butterfly.y;

            (butterfly as any).fly(1.0, []);

            expect(butterfly.x).toBe(originalX);
            expect(butterfly.y).toBe(originalY);
        });

        it("should move toward gather point when force gathering", () => {
            const gatherPoint = new MockPoint(500, 400);
            butterfly.setGatherPoint(gatherPoint as any, 50);

            const originalX = butterfly.x;
            const originalY = butterfly.y;

            (butterfly as any).fly(16, []);

            // Should move toward gather point (500, 400) from (400, 300)
            expect(butterfly.x).not.toBe(originalX);
            expect(butterfly.y).not.toBe(originalY);
        });

        it("should avoid line segments", async () => {
            // Import the mock module and modify its behavior
            const UtilityMock = vi.mocked(
                await import("../../../src/scripts/utils/Utility"),
            );
            UtilityMock.getDistance.mockReturnValue(5); // Less than hitAreaSize

            const lineSegments = [new MockPoint(400, 300)];
            const originalXDirection = (butterfly as any).xDiretion;
            const originalYDirection = (butterfly as any).yDiretion;

            (butterfly as any).fly(16, lineSegments);

            // Should reverse direction when hitting line
            expect((butterfly as any).xDiretion).toBe(-originalXDirection);
            expect((butterfly as any).yDiretion).toBe(-originalYDirection);
        });

        it("should reverse direction at screen boundaries", () => {
            // Position butterfly at left edge
            butterfly.x = 30; // Less than MARGIN (50)
            (butterfly as any).xDiretion = -0.5; // Moving left
            (butterfly as any).fly(16, []);

            // Should reverse to positive direction
            expect((butterfly as any).xDiretion).toBeGreaterThan(0);
        });

        it("should handle random direction changes", () => {
            // Set frames to trigger direction change
            (butterfly as any).xFrame = (butterfly as any).xTernFrame;

            const originalDirection = (butterfly as any).xDiretion;

            (butterfly as any).fly(16, []);

            // Direction might change (could be same if random returns 1)
            expect((butterfly as any).xFrame).toBe(0); // Frame counter should reset
        });
    });

    describe("fly() avoid-pencil mode (avoidPoint)", () => {
        beforeEach(() => {
            butterfly.isFlying = true;
            butterfly.x = 400;
            butterfly.y = 300;
        });

        it("should move away from a nearby avoidPoint", async () => {
            const UtilityMock = vi.mocked(
                await import("../../../src/scripts/utils/Utility"),
            );
            UtilityMock.getDistance.mockReturnValue(50); // AVOID_PENCIL_RADIUS(200)以内

            // avoidPointは蝶(400,300)の右下
            const avoidPoint = new MockPoint(500, 400);

            (butterfly as any).fly(16, [], avoidPoint);

            // avoidPointから遠ざかる(左上)方向に符号が設定される
            expect((butterfly as any).xDiretion).toBeLessThan(0);
            expect((butterfly as any).yDiretion).toBeLessThan(0);
        });

        it("should flee at the small-butterfly speed (0.6) x1.7 regardless of size", async () => {
            const UtilityMock = vi.mocked(
                await import("../../../src/scripts/utils/Utility"),
            );
            UtilityMock.getDistance.mockReturnValue(50);

            // 一番遅いlargeサイズでも小蝶(0.6)と同じ速さで逃げる
            const largeButterfly = new Butterfly(
                "large",
                0xff0000,
                0x00ff00,
                1,
                mockScreenSize,
            );
            largeButterfly.isFlying = true;
            largeButterfly.x = 400;
            largeButterfly.y = 300;

            (largeButterfly as any).fly(16, [], new MockPoint(0, 0));

            // avoidPoint(0,0)より右下にいるので正方向へ、速度は0.6の1.7倍
            expect(largeButterfly.x).toBeCloseTo(400 + 0.6 * 1.7, 5);
        });

        it("should not permanently change the butterfly's own speed after avoiding", async () => {
            const UtilityMock = vi.mocked(
                await import("../../../src/scripts/utils/Utility"),
            );
            UtilityMock.getDistance.mockReturnValue(50);
            const baseXDiretion = Math.abs((butterfly as any).xDiretion);

            (butterfly as any).fly(16, [], new MockPoint(0, 0));

            // xDiretion自体の大きさは書き換えない(向きだけ変わる)
            expect(Math.abs((butterfly as any).xDiretion)).toBeCloseTo(
                baseXDiretion,
                5,
            );
        });

        it("should prioritize avoiding over the gather point when both apply", async () => {
            const UtilityMock = vi.mocked(
                await import("../../../src/scripts/utils/Utility"),
            );
            UtilityMock.getDistance.mockReturnValue(50); // avoidPointの半径内

            // gatherPointとavoidPointを同じ点(蝶の右下)に設定する
            const point = new MockPoint(500, 400);
            butterfly.setGatherPoint(point as any, 50);

            (butterfly as any).fly(16, [], point);

            // gather優先なら近づく(正)方向になるはずだが、avoid優先のため遠ざかる(負)方向になる
            expect((butterfly as any).xDiretion).toBeLessThan(0);
            expect((butterfly as any).yDiretion).toBeLessThan(0);
        });

        it("should flee even when the avoidPoint is far away (no radius limit)", async () => {
            const UtilityMock = vi.mocked(
                await import("../../../src/scripts/utils/Utility"),
            );
            UtilityMock.getDistance.mockReturnValue(300); // 遠くてもスクリーン上の全蝶が逃げる

            const avoidPoint = new MockPoint(120, 100); // 蝶(400,300)の左上

            (butterfly as any).fly(16, [], avoidPoint);

            // avoidPointから遠ざかる(右下)方向に符号が設定される
            expect((butterfly as any).xDiretion).toBeGreaterThan(0);
            expect((butterfly as any).yDiretion).toBeGreaterThan(0);
        });

        it("should not be pushed beyond the screen edge while avoiding", async () => {
            const UtilityMock = vi.mocked(
                await import("../../../src/scripts/utils/Utility"),
            );
            UtilityMock.getDistance.mockReturnValue(50);

            // 左端付近(left + spriteWith 以下)で、鉛筆が右側にある
            butterfly.x = 60;
            butterfly.y = 300;
            (butterfly as any).fly(16, [], new MockPoint(150, 300));
            // 遠ざかる方向は左(負)だが、画面端なので内側(正)方向を維持する
            expect((butterfly as any).xDiretion).toBeGreaterThan(0);

            // 下端付近で、鉛筆が上側にある
            butterfly.x = 400;
            butterfly.y = 580; // bottom(600 - MARGIN(50) = 550)以上
            (butterfly as any).fly(16, [], new MockPoint(400, 500));
            // 遠ざかる方向は下(正)だが、画面端なので内側(負)方向を維持する
            expect((butterfly as any).yDiretion).toBeLessThan(0);
        });

        it("should behave exactly as before when avoidPoint is null (default)", async () => {
            const UtilityMock = vi.mocked(
                await import("../../../src/scripts/utils/Utility"),
            );
            UtilityMock.getDistance.mockReturnValue(50);
            // xFrame/yFrameのランダム方向転換分岐(モックの都合でNaN化する)を避ける
            (butterfly as any).xFrame = 0;
            (butterfly as any).yFrame = 0;

            const originalXDirection = (butterfly as any).xDiretion;
            const originalYDirection = (butterfly as any).yDiretion;

            // avoidPointを渡さない(=null)場合は従来の通常飛行ロジックのまま
            (butterfly as any).fly(16, []);

            expect((butterfly as any).xDiretion).toBe(originalXDirection);
            expect((butterfly as any).yDiretion).toBe(originalYDirection);
        });
    });

    describe("deleteGatherPoint()", () => {
        it("should clear gather point and disable gathering", () => {
            butterfly.setGatherPoint(new MockPoint(100, 200) as any, 50);

            butterfly.deleteGatherPoint();

            expect((butterfly as any).gatherPoint).toBeNull();
            expect((butterfly as any).isForceToGather).toBe(false);
        });
    });
});
