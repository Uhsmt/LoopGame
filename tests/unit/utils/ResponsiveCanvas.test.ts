import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    ResponsiveCanvas,
    type CanvasResizeOptions,
    type CanvasResizeResult,
} from "../../../src/scripts/utils/ResponsiveCanvas";

// Mock PIXI Application
const mockPixiApp = {
    renderer: {
        resize: vi.fn(),
        view: {
            style: {},
        },
    },
    stage: {
        scale: { x: 1, y: 1 },
        position: { x: 0, y: 0 },
    },
};

// Mock DOM APIs
const mockWindow = {
    innerWidth: 1200,
    innerHeight: 800,
    devicePixelRatio: 1,
};

const mockCanvas = {
    width: 800,
    height: 600,
    style: {},
    getBoundingClientRect: vi.fn(() => ({
        width: 800,
        height: 600,
        left: 0,
        top: 0,
    })),
};

describe("Responsive Canvas", () => {
    beforeEach(() => {
        // Reset mocks before each test
        mockWindow.innerWidth = 1200;
        mockWindow.innerHeight = 800;
        mockWindow.devicePixelRatio = 1;

        // Mock event listener functions
        const mockEventListeners = {
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        };

        vi.stubGlobal("window", { ...mockWindow, ...mockEventListeners });
        vi.clearAllMocks();
    });

    describe("ResponsiveCanvas class", () => {
        it("should create canvas manager with default options", () => {
            // RED: This test should fail initially

            const manager = new ResponsiveCanvas(mockPixiApp, mockCanvas);
            expect(manager).toBeDefined();
            expect(manager.options.maintainAspectRatio).toBe(true);
            expect(manager.options.targetAspectRatio).toBe(16 / 9);
        });

        it("should create canvas manager with custom options", () => {
            const customOptions = {
                maintainAspectRatio: false,
                minWidth: 400,
                minHeight: 300,
                targetAspectRatio: 4 / 3,
                scaleMode: "fill" as const,
            };

            const manager = new ResponsiveCanvas(
                mockPixiApp,
                mockCanvas,
                customOptions,
            );
            expect(manager.options.maintainAspectRatio).toBe(false);
            expect(manager.options.targetAspectRatio).toBe(4 / 3);
            expect(manager.options.scaleMode).toBe("fill");
        });
    });

    describe("calculateCanvasSize", () => {
        it("should calculate size for desktop viewport", () => {
            const manager = new ResponsiveCanvas(mockPixiApp, mockCanvas);
            const result = manager.calculateCanvasSize();

            expect(result.width).toBeGreaterThan(0);
            expect(result.height).toBeGreaterThan(0);
            expect(result.scale).toBeGreaterThan(0);
        });

        it("should maintain aspect ratio when enabled", () => {
            const manager = new ResponsiveCanvas(mockPixiApp, mockCanvas, {
                maintainAspectRatio: true,
                targetAspectRatio: 16 / 9,
            });

            const result = manager.calculateCanvasSize();
            const actualRatio = result.width / result.height;
            expect(Math.abs(actualRatio - 16 / 9)).toBeLessThan(0.1);
        });

        it("should respect minimum dimensions", () => {
            mockWindow.innerWidth = 300;
            mockWindow.innerHeight = 200;

            const manager = new ResponsiveCanvas(mockPixiApp, mockCanvas, {
                minWidth: 600,
                minHeight: 400,
            });

            const result = manager.calculateCanvasSize();
            expect(result.width).toBeGreaterThanOrEqual(600);
            expect(result.height).toBeGreaterThanOrEqual(400);
        });

        it("should respect maximum dimensions", () => {
            mockWindow.innerWidth = 2000;
            mockWindow.innerHeight = 1500;

            const manager = new ResponsiveCanvas(mockPixiApp, mockCanvas, {
                maxWidth: 1200,
                maxHeight: 800,
            });

            const result = manager.calculateCanvasSize();
            expect(result.width).toBeLessThanOrEqual(1200);
            expect(result.height).toBeLessThanOrEqual(800);
        });

        it("should handle mobile viewport correctly", () => {
            mockWindow.innerWidth = 375;
            mockWindow.innerHeight = 667;
            vi.stubGlobal("window", {
                ...mockWindow,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            });

            const manager = new ResponsiveCanvas(mockPixiApp, mockCanvas);
            const result = manager.calculateCanvasSize();

            expect(result.width).toBeLessThanOrEqual(375);
            expect(result.height).toBeLessThanOrEqual(667);
        });
    });

    describe("scale modes", () => {
        it("should fit canvas within viewport (fit mode)", () => {
            mockWindow.innerWidth = 800;
            mockWindow.innerHeight = 600;
            vi.stubGlobal("window", {
                ...mockWindow,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            });

            const manager = new ResponsiveCanvas(mockPixiApp, mockCanvas, {
                scaleMode: "fit",
                targetAspectRatio: 16 / 9,
            });

            const result = manager.calculateCanvasSize();
            expect(result.width).toBeLessThanOrEqual(800);
            expect(result.height).toBeLessThanOrEqual(600);
        });

        it("should fill viewport (fill mode)", () => {
            mockWindow.innerWidth = 800;
            mockWindow.innerHeight = 600;
            vi.stubGlobal("window", {
                ...mockWindow,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            });

            const manager = new ResponsiveCanvas(mockPixiApp, mockCanvas, {
                scaleMode: "fill",
                targetAspectRatio: 16 / 9,
            });

            const result = manager.calculateCanvasSize();
            // In fill mode, at least one dimension should match viewport
            expect(result.width === 800 || result.height === 600).toBe(true);
        });

        it("should stretch to exact viewport (stretch mode)", () => {
            mockWindow.innerWidth = 800;
            mockWindow.innerHeight = 600;
            vi.stubGlobal("window", {
                ...mockWindow,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            });

            const manager = new ResponsiveCanvas(mockPixiApp, mockCanvas, {
                scaleMode: "stretch",
                maintainAspectRatio: false,
            });

            const result = manager.calculateCanvasSize();
            expect(result.width).toBe(800);
            expect(result.height).toBe(600);
        });
    });

    describe("applyCanvasSize", () => {
        it("should apply calculated size to canvas", () => {
            const manager = new ResponsiveCanvas(mockPixiApp, mockCanvas);
            const size = {
                width: 800,
                height: 600,
                scale: 1,
                offsetX: 0,
                offsetY: 0,
            };

            manager.applyCanvasSize(size);

            expect(mockCanvas.width).toBe(800);
            expect(mockCanvas.height).toBe(600);
        });

        it("should apply size to PIXI renderer", () => {
            const manager = new ResponsiveCanvas(mockPixiApp, mockCanvas);
            const size = {
                width: 800,
                height: 600,
                scale: 1,
                offsetX: 0,
                offsetY: 0,
            };

            manager.applyCanvasSize(size);

            expect(mockPixiApp.renderer.resize).toHaveBeenCalledWith(800, 600);
        });

        it("should apply scale and offset to stage", () => {
            const manager = new ResponsiveCanvas(mockPixiApp, mockCanvas);
            const size = {
                width: 800,
                height: 600,
                scale: 1.5,
                offsetX: 100,
                offsetY: 50,
            };

            manager.applyCanvasSize(size);

            expect(mockPixiApp.stage.scale.x).toBe(1.5);
            expect(mockPixiApp.stage.scale.y).toBe(1.5);
            expect(mockPixiApp.stage.position.x).toBe(100);
            expect(mockPixiApp.stage.position.y).toBe(50);
        });
    });

    describe("resize method", () => {
        it("should calculate and apply new size", () => {
            const manager = new ResponsiveCanvas(mockPixiApp, mockCanvas);
            const resizeSpy = vi.spyOn(manager, "applyCanvasSize");

            manager.resize();

            expect(resizeSpy).toHaveBeenCalled();
        });

        it("should handle device pixel ratio", () => {
            mockWindow.devicePixelRatio = 2;

            const manager = new ResponsiveCanvas(mockPixiApp, mockCanvas);
            const result = manager.calculateCanvasSize();

            // Should account for device pixel ratio in calculations
            expect(result.scale).toBeGreaterThan(0);
        });
    });

    describe("initialization and cleanup", () => {
        it("should initialize resize listeners", () => {
            const addEventListenerSpy = vi.spyOn(window, "addEventListener");

            const manager = new ResponsiveCanvas(mockPixiApp, mockCanvas);
            manager.init();

            expect(addEventListenerSpy).toHaveBeenCalledWith(
                "resize",
                expect.any(Function),
            );
        });

        it("should remove resize listeners on destroy", () => {
            const removeEventListenerSpy = vi.spyOn(
                window,
                "removeEventListener",
            );

            const manager = new ResponsiveCanvas(mockPixiApp, mockCanvas);
            manager.init();
            manager.destroy();

            expect(removeEventListenerSpy).toHaveBeenCalledWith(
                "resize",
                expect.any(Function),
            );
        });

        it("should perform initial resize on init", () => {
            const manager = new ResponsiveCanvas(mockPixiApp, mockCanvas);
            const resizeSpy = vi.spyOn(manager, "resize");

            manager.init();

            expect(resizeSpy).toHaveBeenCalled();
        });
    });

    describe("getCanvasInfo", () => {
        it("should return current canvas information", () => {
            const manager = new ResponsiveCanvas(mockPixiApp, mockCanvas);
            const info = manager.getCanvasInfo();

            expect(info).toHaveProperty("width");
            expect(info).toHaveProperty("height");
            expect(info).toHaveProperty("scale");
            expect(info).toHaveProperty("aspectRatio");
            expect(info).toHaveProperty("devicePixelRatio");
        });
    });
});
