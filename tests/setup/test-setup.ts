import { vi } from "vitest";
import { PIXIMock } from "./pixi-mock";

// Mock PIXI.js for testing using our comprehensive mock
vi.mock("pixi.js", () => PIXIMock);

// Mock canvas and WebGL context
Object.defineProperty(window, "HTMLCanvasElement", {
    value: vi.fn().mockImplementation(() => ({
        getContext: vi.fn(() => ({
            fillRect: vi.fn(),
            clearRect: vi.fn(),
            getImageData: vi.fn(() => ({ data: new Array(4) })),
            putImageData: vi.fn(),
            createImageData: vi.fn(() => ({ data: new Array(4) })),
            setTransform: vi.fn(),
            drawImage: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            closePath: vi.fn(),
            stroke: vi.fn(),
            fill: vi.fn(),
        })),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Global test setup
beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
});
