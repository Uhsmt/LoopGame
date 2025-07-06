import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    LandscapePrompt,
    type LandscapePromptOptions,
    type LandscapePromptState,
} from "../../../src/scripts/utils/LandscapePrompt";

// Mock DOM APIs for testing
const mockWindow = {
    innerWidth: 375,
    innerHeight: 667,
    navigator: {
        userAgent:
            "Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15",
        maxTouchPoints: 5,
    },
};

const mockElement = {
    style: {},
    classList: {
        add: vi.fn(),
        remove: vi.fn(),
    },
    appendChild: vi.fn(),
    removeChild: vi.fn(),
    textContent: "",
    innerHTML: "",
    querySelector: vi.fn(() => ({
        style: {},
        classList: {
            add: vi.fn(),
            remove: vi.fn(),
        },
    })),
};

const mockDocument = {
    createElement: vi.fn(() => mockElement),
    body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
    },
    getElementById: vi.fn(() => null),
    querySelector: vi.fn(() => null),
    head: {
        appendChild: vi.fn(),
    },
};

describe("Landscape Prompt", () => {
    beforeEach(() => {
        // Reset mocks before each test
        mockWindow.innerWidth = 375;
        mockWindow.innerHeight = 667;
        mockWindow.navigator.userAgent =
            "Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15";
        mockWindow.navigator.maxTouchPoints = 5;

        // Mock timer functions
        const mockTimers = {
            setInterval: vi.fn(() => 123),
            clearInterval: vi.fn(),
            setTimeout: vi.fn((fn, delay) => {
                if (delay === 0) fn(); // Execute immediately for delay 0
                return 456;
            }),
            clearTimeout: vi.fn(),
            addEventListener: vi.fn(),
        };

        vi.stubGlobal("window", { ...mockWindow, ...mockTimers });
        vi.stubGlobal("document", mockDocument);
        vi.stubGlobal("navigator", mockWindow.navigator);
        vi.clearAllMocks();
    });

    describe("LandscapePrompt class", () => {
        it("should create prompt with default options", () => {
            // RED: This test should fail initially

            const prompt = new LandscapePrompt();
            expect(prompt).toBeDefined();
            expect(prompt.options.threshold).toBe(1.2);
            expect(prompt.options.message).toContain("landscape");
        });

        it("should create prompt with custom options", () => {
            const customOptions = {
                threshold: 1.5,
                showDelay: 2000,
                checkInterval: 200,
                message: "Please rotate to landscape mode",
            };

            const prompt = new LandscapePrompt(customOptions);
            expect(prompt.options.threshold).toBe(1.5);
            expect(prompt.options.message).toBe(
                "Please rotate to landscape mode",
            );
        });
    });

    describe("isInPortraitMode", () => {
        it("should return true when height > width", () => {
            const prompt = new LandscapePrompt();
            const result = prompt.isInPortraitMode();
            expect(result).toBe(true);
        });

        it("should return false when width > height", () => {
            mockWindow.innerWidth = 667;
            mockWindow.innerHeight = 375;
            vi.stubGlobal("window", {
                ...mockWindow,
                setInterval: vi.fn(),
                clearInterval: vi.fn(),
                setTimeout: vi.fn(),
                clearTimeout: vi.fn(),
                addEventListener: vi.fn(),
            });

            const prompt = new LandscapePrompt();
            const result = prompt.isInPortraitMode();
            expect(result).toBe(false);
        });

        it("should consider threshold when determining portrait mode", () => {
            mockWindow.innerWidth = 600;
            mockWindow.innerHeight = 500; // ratio = 1.2

            const prompt = new LandscapePrompt({ threshold: 1.5 });
            const result = prompt.isInPortraitMode();
            expect(result).toBe(true); // ratio < threshold, still considered portrait
        });
    });

    describe("shouldShowPrompt", () => {
        it("should return true for mobile devices in portrait mode", () => {
            const prompt = new LandscapePrompt();
            const result = prompt.shouldShowPrompt();
            expect(result).toBe(true);
        });

        it("should return false for mobile devices in landscape mode", () => {
            mockWindow.innerWidth = 667;
            mockWindow.innerHeight = 375;
            vi.stubGlobal("window", {
                ...mockWindow,
                setInterval: vi.fn(),
                clearInterval: vi.fn(),
                setTimeout: vi.fn(),
                clearTimeout: vi.fn(),
                addEventListener: vi.fn(),
            });

            const prompt = new LandscapePrompt();
            const result = prompt.shouldShowPrompt();
            expect(result).toBe(false);
        });

        it("should return false for desktop devices", () => {
            mockWindow.innerWidth = 1200;
            mockWindow.innerHeight = 800;
            mockWindow.navigator.userAgent =
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
            mockWindow.navigator.maxTouchPoints = 0;

            const prompt = new LandscapePrompt();
            const result = prompt.shouldShowPrompt();
            expect(result).toBe(false);
        });
    });

    describe("createPromptElement", () => {
        it("should create a prompt element with correct content", () => {
            const prompt = new LandscapePrompt();
            const element = prompt.createPromptElement();

            expect(mockDocument.createElement).toHaveBeenCalledWith("div");
            expect(element.innerHTML).toContain("landscape");
        });

        it("should apply correct CSS classes", () => {
            const prompt = new LandscapePrompt();
            const element = prompt.createPromptElement();

            expect(mockElement.classList.add).toHaveBeenCalledWith(
                "landscape-prompt",
            );
        });
    });

    describe("show and hide methods", () => {
        it("should show prompt when called", () => {
            const prompt = new LandscapePrompt();
            prompt.show();

            expect(prompt.isVisible()).toBe(true);
            expect(mockDocument.body.appendChild).toHaveBeenCalled();
        });

        it("should hide prompt when called", () => {
            const prompt = new LandscapePrompt();
            prompt.show();
            prompt.hide();

            expect(prompt.isVisible()).toBe(false);
            expect(mockDocument.body.removeChild).toHaveBeenCalled();
        });

        it("should not show prompt twice", () => {
            const prompt = new LandscapePrompt();
            prompt.show();
            prompt.show();

            expect(mockDocument.body.appendChild).toHaveBeenCalledTimes(1);
        });
    });

    describe("init and destroy methods", () => {
        it("should initialize orientation monitoring", () => {
            const prompt = new LandscapePrompt();
            prompt.init();

            expect(prompt.isInitialized()).toBe(true);
        });

        it("should destroy orientation monitoring", () => {
            const prompt = new LandscapePrompt();
            prompt.init();
            prompt.destroy();

            expect(prompt.isInitialized()).toBe(false);
        });

        it("should automatically show prompt on init if in portrait mode", () => {
            const prompt = new LandscapePrompt({ showDelay: 0 });
            prompt.init();

            // Wait for any async operations
            setTimeout(() => {
                expect(prompt.isVisible()).toBe(true);
            }, 10);
        });
    });

    describe("getState method", () => {
        it("should return current prompt state", () => {
            const prompt = new LandscapePrompt();
            const state = prompt.getState();

            expect(state).toEqual({
                isVisible: false,
                isPortrait: true,
                shouldShow: true,
            });
        });
    });
});
