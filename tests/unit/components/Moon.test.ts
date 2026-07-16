import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock PIXI.js (SparkleEmitter.test.tsと同様のローカルモック)
vi.mock("pixi.js", () => {
    class MockTicker {
        static instances: MockTicker[] = [];
        deltaMS = 16;
        started = false;
        destroyed = false;
        private callbacks: Array<() => void> = [];
        constructor() {
            MockTicker.instances.push(this);
        }
        add(fn: () => void) {
            this.callbacks.push(fn);
            return this;
        }
        start() {
            this.started = true;
            return this;
        }
        stop() {
            this.started = false;
            return this;
        }
        destroy() {
            this.destroyed = true;
        }
        tick(deltaMS = 16) {
            this.deltaMS = deltaMS;
            if (this.started) {
                this.callbacks.forEach((fn) => fn());
            }
        }
    }

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
        Ticker: MockTicker,
        Sprite: {
            from: vi.fn().mockImplementation(() => ({
                anchor: { set: vi.fn() },
                alpha: 1,
            })),
        },
    };
});

import * as PIXI from "pixi.js";
import { Moon } from "../../../src/scripts/components/Moon";

type MockTickerLike = {
    instances: {
        started: boolean;
        destroyed: boolean;
        deltaMS: number;
        tick: (deltaMS?: number) => void;
    }[];
};

describe("Moon", () => {
    let moon: Moon;

    beforeEach(() => {
        (PIXI.Ticker as unknown as MockTickerLike).instances.length = 0;
        moon = new Moon();
    });

    it("marks itself as blinking and pulses the sprite alpha over time when blink() is called", () => {
        moon.blink();
        expect(moon.blinking).toBe(true);

        const [ticker] = (PIXI.Ticker as unknown as MockTickerLike).instances;
        expect(ticker.started).toBe(true);

        const sprite = moon.children[0] as { alpha: number };
        const alphaAtStart = sprite.alpha;
        ticker.tick(250);
        expect(sprite.alpha).not.toBe(alphaAtStart);
    });

    it("does not start a second ticker when blink() is called again while already blinking", () => {
        moon.blink();
        moon.blink();
        expect(
            (PIXI.Ticker as unknown as MockTickerLike).instances.length,
        ).toBe(1);
    });

    it("stops pulsing and restores full alpha on stopBlink()", () => {
        moon.blink();
        const [ticker] = (PIXI.Ticker as unknown as MockTickerLike).instances;
        ticker.tick(250);

        moon.stopBlink();

        expect(moon.blinking).toBe(false);
        expect(ticker.started).toBe(false);
        expect(ticker.destroyed).toBe(true);
        const sprite = moon.children[0] as { alpha: number };
        expect(sprite.alpha).toBe(1);
    });

    it("is safe to call stopBlink() before blink() was ever called", () => {
        expect(() => moon.stopBlink()).not.toThrow();
        expect(moon.blinking).toBe(false);
    });
});
