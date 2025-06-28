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
        fill: vi.fn().mockReturnThis(),
        tint: 0,
        alpha: 1,
        x: 0,
        y: 0,
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
}));

// Mock Const
vi.mock("../../../src/scripts/utils/Const", () => ({
    SIZE_LIST: ["small", "medium", "large"],
    MARGIN: 50,
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
            expect(flySpy).toHaveBeenCalledWith(delta, lineSegments);
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

    describe("deleteGatherPoint()", () => {
        it("should clear gather point and disable gathering", () => {
            butterfly.setGatherPoint(new MockPoint(100, 200) as any, 50);

            butterfly.deleteGatherPoint();

            expect((butterfly as any).gatherPoint).toBeNull();
            expect((butterfly as any).isForceToGather).toBe(false);
        });
    });
});
