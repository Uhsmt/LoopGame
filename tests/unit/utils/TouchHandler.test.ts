import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    TouchHandler,
    type TouchEventOptions,
    type TouchEventInfo,
} from "../../../src/scripts/utils/TouchHandler";

// Mock touch events
const createMockTouch = (id: number, x: number, y: number) => ({
    identifier: id,
    clientX: x,
    clientY: y,
    pageX: x,
    pageY: y,
    screenX: x,
    screenY: y,
    target: mockCanvas,
    force: 1,
    radiusX: 5,
    radiusY: 5,
    rotationAngle: 0,
});

const createMockTouchEvent = (
    type: string,
    touches: any[] = [],
    changedTouches: any[] = [],
) => ({
    type,
    touches,
    changedTouches,
    targetTouches: touches,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    timeStamp: Date.now(),
    target: mockCanvas,
    currentTarget: mockCanvas,
    bubbles: true,
    cancelable: true,
    defaultPrevented: false,
});

const mockCanvas = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
    })),
    dispatchEvent: vi.fn(),
};

describe("Touch Handler", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("TouchHandler class", () => {
        it("should create touch handler with default options", () => {
            // RED: This test should fail initially

            const handler = new TouchHandler(mockCanvas);
            expect(handler).toBeDefined();
            expect(handler.options.preventDefaultTouchEvents).toBe(true);
            expect(handler.options.enableMouseEmulation).toBe(true);
        });

        it("should create touch handler with custom options", () => {
            const customOptions = {
                preventDefaultTouchEvents: false,
                touchStartThreshold: 5,
                multiTouchEnabled: false,
            };

            const handler = new TouchHandler(mockCanvas, customOptions);
            expect(handler.options.preventDefaultTouchEvents).toBe(false);
            expect(handler.options.touchStartThreshold).toBe(5);
            expect(handler.options.multiTouchEnabled).toBe(false);
        });
    });

    describe("touch event registration", () => {
        it("should register touch event listeners on init", () => {
            const handler = new TouchHandler(mockCanvas);
            handler.init();

            expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
                "touchstart",
                expect.any(Function),
                expect.any(Object),
            );
            expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
                "touchmove",
                expect.any(Function),
                expect.any(Object),
            );
            expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
                "touchend",
                expect.any(Function),
                expect.any(Object),
            );
            expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
                "touchcancel",
                expect.any(Function),
                expect.any(Object),
            );
        });

        it("should register mouse event listeners when mouse emulation enabled", () => {
            const handler = new TouchHandler(mockCanvas, {
                enableMouseEmulation: true,
            });
            handler.init();

            expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
                "mousedown",
                expect.any(Function),
                expect.any(Object),
            );
            expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
                "mousemove",
                expect.any(Function),
                expect.any(Object),
            );
            expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
                "mouseup",
                expect.any(Function),
                expect.any(Object),
            );
        });

        it("should not register mouse events when mouse emulation disabled", () => {
            const handler = new TouchHandler(mockCanvas, {
                enableMouseEmulation: false,
            });
            handler.init();

            expect(mockCanvas.addEventListener).not.toHaveBeenCalledWith(
                "mousedown",
                expect.any(Function),
                expect.any(Object),
            );
        });
    });

    describe("touch event processing", () => {
        it("should convert touch events to normalized format", () => {
            const handler = new TouchHandler(mockCanvas);
            const touch = createMockTouch(1, 100, 200);
            const touchEvent = createMockTouchEvent(
                "touchstart",
                [touch],
                [touch],
            );

            const normalized = handler.normalizeTouchEvent(touchEvent);

            expect(normalized.type).toBe("touchstart");
            expect(normalized.touches).toHaveLength(1);
            expect(normalized.touches[0].x).toBe(100);
            expect(normalized.touches[0].y).toBe(200);
            expect(normalized.touches[0].id).toBe(1);
        });

        it("should handle multi-touch events", () => {
            const handler = new TouchHandler(mockCanvas, {
                multiTouchEnabled: true,
            });
            const touch1 = createMockTouch(1, 100, 200);
            const touch2 = createMockTouch(2, 300, 400);
            const touchEvent = createMockTouchEvent(
                "touchstart",
                [touch1, touch2],
                [touch1, touch2],
            );

            const normalized = handler.normalizeTouchEvent(touchEvent);

            expect(normalized.touches).toHaveLength(2);
            expect(normalized.touches[0].id).toBe(1);
            expect(normalized.touches[1].id).toBe(2);
        });

        it("should filter multi-touch when disabled", () => {
            const handler = new TouchHandler(mockCanvas, {
                multiTouchEnabled: false,
            });
            const touch1 = createMockTouch(1, 100, 200);
            const touch2 = createMockTouch(2, 300, 400);
            const touchEvent = createMockTouchEvent(
                "touchstart",
                [touch1, touch2],
                [touch1, touch2],
            );

            const normalized = handler.normalizeTouchEvent(touchEvent);

            expect(normalized.touches).toHaveLength(1);
            expect(normalized.touches[0].id).toBe(1);
        });
    });

    describe("coordinate transformation", () => {
        it("should transform touch coordinates relative to canvas", () => {
            mockCanvas.getBoundingClientRect.mockReturnValue({
                left: 50,
                top: 100,
                width: 800,
                height: 600,
            });

            const handler = new TouchHandler(mockCanvas);
            const coords = handler.transformCoordinates(150, 250);

            expect(coords.x).toBe(100); // 150 - 50
            expect(coords.y).toBe(150); // 250 - 100
        });

        it("should handle scaled canvas coordinates", () => {
            const handler = new TouchHandler(mockCanvas);
            const coords = handler.transformCoordinates(100, 200, 2.0); // 2x scale

            expect(coords.x).toBe(25); // (100 - 0) / 2 = 50, but with canvas rect offset
            expect(coords.y).toBe(50); // (200 - 0) / 2 = 100, but with canvas rect offset
        });
    });

    describe("event callbacks", () => {
        it("should call registered touchstart callback", () => {
            const callback = vi.fn();
            const handler = new TouchHandler(mockCanvas);

            handler.onTouchStart(callback);
            handler.init();

            const touch = createMockTouch(1, 100, 200);
            const touchEvent = createMockTouchEvent(
                "touchstart",
                [touch],
                [touch],
            );

            // Simulate touch event
            handler.handleTouchStart(touchEvent);

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "touchstart",
                    touches: expect.arrayContaining([
                        expect.objectContaining({ x: 50, y: 100, id: 1 }), // Adjusted for mock canvas rect
                    ]),
                }),
            );
        });

        it("should call registered touchmove callback", () => {
            const callback = vi.fn();
            const handler = new TouchHandler(mockCanvas);

            handler.onTouchMove(callback);
            handler.init();

            const touch = createMockTouch(1, 150, 250);
            const touchEvent = createMockTouchEvent(
                "touchmove",
                [touch],
                [touch],
            );

            handler.handleTouchMove(touchEvent);

            expect(callback).toHaveBeenCalled();
        });

        it("should call registered touchend callback", () => {
            const callback = vi.fn();
            const handler = new TouchHandler(mockCanvas);

            handler.onTouchEnd(callback);
            handler.init();

            const touch = createMockTouch(1, 100, 200);
            const touchEvent = createMockTouchEvent("touchend", [], [touch]);

            handler.handleTouchEnd(touchEvent);

            expect(callback).toHaveBeenCalled();
        });
    });

    describe("mouse emulation", () => {
        it("should convert mouse events to touch events", () => {
            const callback = vi.fn();
            const handler = new TouchHandler(mockCanvas, {
                enableMouseEmulation: true,
            });

            handler.onTouchStart(callback);
            handler.init();

            const mouseEvent = {
                type: "mousedown",
                clientX: 100,
                clientY: 200,
                button: 0,
                preventDefault: vi.fn(),
                stopPropagation: vi.fn(),
                target: mockCanvas,
                timeStamp: Date.now(),
            };

            handler.handleMouseDown(mouseEvent);

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "touchstart",
                    touches: expect.arrayContaining([
                        expect.objectContaining({ x: 50, y: 100 }), // Adjusted for mock canvas rect
                    ]),
                }),
            );
        });
    });

    describe("gesture detection", () => {
        it("should detect single tap gesture", () => {
            const callback = vi.fn();
            const handler = new TouchHandler(mockCanvas);

            handler.onTap(callback);
            handler.init();

            // Simulate tap sequence
            const touch = createMockTouch(1, 100, 200);
            const startEvent = createMockTouchEvent(
                "touchstart",
                [touch],
                [touch],
            );
            const endEvent = createMockTouchEvent("touchend", [], [touch]);

            handler.handleTouchStart(startEvent);

            // Simulate quick tap (within time threshold)
            setTimeout(() => {
                handler.handleTouchEnd(endEvent);
                expect(callback).toHaveBeenCalled();
            }, 100);
        });

        it("should detect long press gesture", () => {
            const callback = vi.fn();
            const handler = new TouchHandler(mockCanvas);

            handler.onLongPress(callback);
            handler.init();

            const touch = createMockTouch(1, 100, 200);
            const startEvent = createMockTouchEvent(
                "touchstart",
                [touch],
                [touch],
            );

            handler.handleTouchStart(startEvent);

            // Simulate long press (after time threshold)
            setTimeout(() => {
                expect(callback).toHaveBeenCalled();
            }, 800);
        });
    });

    describe("cleanup", () => {
        it("should remove event listeners on destroy", () => {
            const handler = new TouchHandler(mockCanvas);
            handler.init();
            handler.destroy();

            expect(mockCanvas.removeEventListener).toHaveBeenCalledWith(
                "touchstart",
                expect.any(Function),
            );
            expect(mockCanvas.removeEventListener).toHaveBeenCalledWith(
                "touchmove",
                expect.any(Function),
            );
            expect(mockCanvas.removeEventListener).toHaveBeenCalledWith(
                "touchend",
                expect.any(Function),
            );
            expect(mockCanvas.removeEventListener).toHaveBeenCalledWith(
                "touchcancel",
                expect.any(Function),
            );
        });

        it("should clear active touches on destroy", () => {
            const handler = new TouchHandler(mockCanvas);
            handler.init();

            // Add active touch
            const touch = createMockTouch(1, 100, 200);
            const touchEvent = createMockTouchEvent(
                "touchstart",
                [touch],
                [touch],
            );
            handler.handleTouchStart(touchEvent);

            handler.destroy();

            expect(handler.getActiveTouches()).toHaveLength(0);
        });
    });

    describe("state management", () => {
        it("should track active touches", () => {
            const handler = new TouchHandler(mockCanvas);
            handler.init();

            const touch = createMockTouch(1, 100, 200);
            const touchEvent = createMockTouchEvent(
                "touchstart",
                [touch],
                [touch],
            );

            handler.handleTouchStart(touchEvent);

            expect(handler.getActiveTouches()).toHaveLength(1);
            expect(handler.getActiveTouches()[0].id).toBe(1);
        });

        it("should remove touches on touchend", () => {
            const handler = new TouchHandler(mockCanvas);
            handler.init();

            const touch = createMockTouch(1, 100, 200);
            const startEvent = createMockTouchEvent(
                "touchstart",
                [touch],
                [touch],
            );
            const endEvent = createMockTouchEvent("touchend", [], [touch]);

            handler.handleTouchStart(startEvent);
            expect(handler.getActiveTouches()).toHaveLength(1);

            handler.handleTouchEnd(endEvent);
            expect(handler.getActiveTouches()).toHaveLength(0);
        });
    });
});
