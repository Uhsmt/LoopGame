import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock PIXI.js (SparkleEmitter.test.tsと同様のローカルモック)
vi.mock("pixi.js", () => {
    class MockContainer {
        children: unknown[] = [];
        alpha = 1;
        angle = 0;
        scale = { set: vi.fn() };
        addChild(c: unknown) {
            this.children.push(c);
            return c;
        }
    }

    return {
        Container: MockContainer,
        Sprite: {
            from: vi.fn().mockImplementation(() => ({
                anchor: { set: vi.fn() },
                alpha: 1,
            })),
        },
    };
});

import { Moon } from "../../../src/scripts/components/Moon";

describe("Moon", () => {
    let moon: Moon;

    beforeEach(() => {
        moon = new Moon();
    });

    it("does nothing on blink() (intentionally no visual effect for the moon, see #68)", () => {
        const angleBefore = moon.angle;
        const alphaBefore = moon.alpha;

        expect(() => moon.blink()).not.toThrow();

        expect(moon.angle).toBe(angleBefore);
        expect(moon.alpha).toBe(alphaBefore);
    });

    it("does nothing on stopBlink() regardless of prior blink() calls", () => {
        moon.blink();
        const angleBefore = moon.angle;
        const alphaBefore = moon.alpha;

        expect(() => moon.stopBlink()).not.toThrow();

        expect(moon.angle).toBe(angleBefore);
        expect(moon.alpha).toBe(alphaBefore);
    });
});
