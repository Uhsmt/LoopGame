import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    isMobileDevice,
    isTabletDevice,
    isTouchDevice,
    getScreenSize,
    getOrientation,
    getMobileDetectionResult,
    type MobileDetectionResult,
} from "../../../src/scripts/utils/MobileDetection";

// Mock DOM APIs for testing
const mockWindow = {
    innerWidth: 1200,
    innerHeight: 800,
    navigator: {
        userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        maxTouchPoints: 0,
    },
    screen: {
        orientation: {
            type: "landscape-primary",
        },
    },
};

describe("Mobile Detection", () => {
    beforeEach(() => {
        // Reset window mock before each test
        mockWindow.innerWidth = 1200;
        mockWindow.innerHeight = 800;
        mockWindow.navigator.userAgent =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
        mockWindow.navigator.maxTouchPoints = 0;

        vi.stubGlobal("window", mockWindow);
        vi.stubGlobal("navigator", mockWindow.navigator);
    });

    describe("isMobileDevice", () => {
        it("should return false for desktop user agents", () => {
            // RED: This test should fail initially
            const result = isMobileDevice();
            expect(result).toBe(false);
        });

        it("should return true for iPhone user agents", () => {
            mockWindow.navigator.userAgent =
                "Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15";

            const result = isMobileDevice();
            expect(result).toBe(true);
        });

        it("should return true for Android user agents", () => {
            mockWindow.navigator.userAgent =
                "Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36";

            const result = isMobileDevice();
            expect(result).toBe(true);
        });
    });

    describe("isTabletDevice", () => {
        it("should return false for desktop devices", () => {
            const result = isTabletDevice();
            expect(result).toBe(false);
        });

        it("should return true for iPad user agents", () => {
            mockWindow.navigator.userAgent =
                "Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15";
            mockWindow.innerWidth = 768;
            mockWindow.innerHeight = 1024;

            const result = isTabletDevice();
            expect(result).toBe(true);
        });
    });

    describe("isTouchDevice", () => {
        it("should return false when no touch points available", () => {
            const result = isTouchDevice();
            expect(result).toBe(false);
        });

        it("should return true when touch points are available", () => {
            mockWindow.navigator.maxTouchPoints = 5;

            const result = isTouchDevice();
            expect(result).toBe(true);
        });
    });

    describe("getScreenSize", () => {
        it('should return "large" for desktop screens', () => {
            const result = getScreenSize();
            expect(result).toBe("large");
        });

        it('should return "small" for mobile screens', () => {
            mockWindow.innerWidth = 375;
            mockWindow.innerHeight = 667;

            const result = getScreenSize();
            expect(result).toBe("small");
        });

        it('should return "medium" for tablet screens', () => {
            mockWindow.innerWidth = 768;
            mockWindow.innerHeight = 1024;

            const result = getScreenSize();
            expect(result).toBe("medium");
        });
    });

    describe("getOrientation", () => {
        it('should return "landscape" when width > height', () => {
            const result = getOrientation();
            expect(result).toBe("landscape");
        });

        it('should return "portrait" when height > width', () => {
            mockWindow.innerWidth = 375;
            mockWindow.innerHeight = 667;

            const result = getOrientation();
            expect(result).toBe("portrait");
        });
    });

    describe("getMobileDetectionResult", () => {
        it("should return complete detection result for desktop", () => {
            const result = getMobileDetectionResult();

            expect(result).toEqual({
                isMobile: false,
                isTablet: false,
                isTouchDevice: false,
                screenSize: "large",
                orientation: "landscape",
            });
        });

        it("should return complete detection result for mobile", () => {
            mockWindow.navigator.userAgent =
                "Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15";
            mockWindow.navigator.maxTouchPoints = 5;
            mockWindow.innerWidth = 375;
            mockWindow.innerHeight = 667;

            const result = getMobileDetectionResult();

            expect(result).toEqual({
                isMobile: true,
                isTablet: false,
                isTouchDevice: true,
                screenSize: "small",
                orientation: "portrait",
            });
        });
    });
});
