import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock PIXI.js (LineDrawer.test.tsと同様のローカルモック)
vi.mock("pixi.js", () => ({
    Container: class {
        children: unknown[] = [];
        addChild(c: unknown) {
            this.children.push(c);
            return c;
        }
        removeChild(c: unknown) {
            this.children = this.children.filter((x) => x !== c);
            return c;
        }
    },
    Sprite: class {
        x = 0;
        y = 0;
        alpha = 1;
        rotation = 0;
        tint = 0xffffff;
        blendMode = "normal";
        anchor = { set: vi.fn() };
        scale = {
            _v: 1,
            set(v: number) {
                this._v = v;
            },
        };
        destroyed = false;
        texture: unknown;
        constructor(texture?: unknown) {
            this.texture = texture;
        }
        destroy() {
            this.destroyed = true;
        }
    },
}));

import { SparkleEmitter } from "../../../src/scripts/components/SparkleEmitter";

const fakeTexture = { fake: "star" };

describe("SparkleEmitter", () => {
    let emitter: SparkleEmitter;

    beforeEach(() => {
        emitter = new SparkleEmitter(fakeTexture as never);
    });

    it("should spawn the requested number of particles on burst", () => {
        emitter.burst(100, 200, 30);
        expect(emitter.particleCount).toBe(30);
    });

    it("should spawn a single trail particle near the given position", () => {
        emitter.trail(50, 60);
        expect(emitter.particleCount).toBe(1);
    });

    it("should fade and remove particles after their lifetime", () => {
        emitter.burst(0, 0, 10, { lifeMs: 500 });
        emitter.update(250);
        expect(emitter.particleCount).toBe(10);

        emitter.update(400); // 合計650ms > 500ms
        expect(emitter.particleCount).toBe(0);
    });

    it("should move particles over time", () => {
        emitter.burst(0, 0, 5, { lifeMs: 1000 });
        const before = emitter.children.map((c) => ({
            x: (c as { x: number }).x,
            y: (c as { y: number }).y,
        }));
        emitter.update(300);
        const after = emitter.children.map((c) => ({
            x: (c as { x: number }).x,
            y: (c as { y: number }).y,
        }));
        const moved = after.some(
            (p, i) => p.x !== before[i].x || p.y !== before[i].y,
        );
        expect(moved).toBe(true);
    });

    it("should enforce the particle cap", () => {
        for (let i = 0; i < 10; i++) {
            emitter.burst(0, 0, 100);
        }
        expect(emitter.particleCount).toBeLessThanOrEqual(300);
    });
});
