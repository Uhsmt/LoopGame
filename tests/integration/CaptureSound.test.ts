import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * ループ捕獲時の効果音まわりの結線(wiring)を検証する統合テスト。
 *
 * #69: 蝶とヘルプフラワーを同じループで同時に捕獲すると、捕獲音
 * se_capture が同一フレーム内で二重発火していた
 * (captureButterflies内とcaptureFlowers内でそれぞれ再生されるため)。
 *
 * ロジックを再実装して検証するマッチポンプにならないよう、実際の
 * GameplayState.handleLoopAreaCompleted を呼び出し、AudioManagerへの
 * 呼び出し回数を観測点とする。描画が重いor無関係なコンポーネントだけを
 * 軽量なダブルに差し替える(BonusStageFlow.test.tsと同じ方針)。
 */

vi.mock("pixi.js", () => {
    class Container {
        children: unknown[] = [];
        x = 0;
        y = 0;
        alpha = 1;
        rotation = 0;
        interactive = false;
        destroyed = false;
        visible = true;
        sortableChildren = false;
        zIndex = 0;
        width = 100;
        height = 20;
        anchor = { set: vi.fn() };
        position = {
            x: 0,
            y: 0,
            set(x: number, y: number) {
                this.x = x;
                this.y = y;
            },
        };
        scale = {
            x: 1,
            y: 1,
            set(sx: number, sy?: number) {
                this.x = sx;
                this.y = sy ?? sx;
            },
        };
        addChild(c: unknown) {
            this.children.push(c);
            return c;
        }
        addChildAt(c: unknown, index: number) {
            this.children.splice(index, 0, c);
            return c;
        }
        getChildIndex(c: unknown) {
            return this.children.indexOf(c);
        }
        removeChild(c: unknown) {
            this.children = this.children.filter((x) => x !== c);
            return c;
        }
        destroy() {
            this.destroyed = true;
        }
    }
    class Graphics extends Container {
        rect() {
            return this;
        }
        stroke() {
            return this;
        }
        circle() {
            return this;
        }
        poly() {
            return this;
        }
        fill() {
            return this;
        }
        clear() {
            return this;
        }
        moveTo() {
            return this;
        }
        lineTo() {
            return this;
        }
        containsPoint() {
            return false;
        }
    }
    class Sprite extends Container {
        tint = 0xffffff;
        blendMode = "normal";
        texture: unknown;
        constructor(texture?: unknown) {
            super();
            this.texture = texture;
        }
        static from(source: unknown) {
            return new Sprite(source);
        }
    }
    class BitmapText extends Container {
        text: string;
        style: unknown;
        constructor(opts: { text?: string; style?: unknown } = {}) {
            super();
            this.text = opts.text ?? "";
            this.style = opts.style;
        }
    }
    class TextStyle {
        constructor(public opts: unknown) {}
    }
    class Point {
        constructor(
            public x = 0,
            public y = 0,
        ) {}
    }
    class Texture {
        static WHITE = {};
        static from() {
            return {};
        }
    }
    class Ticker {
        deltaMS = 16;
        private cbs: Array<() => void> = [];
        add(cb: () => void) {
            this.cbs.push(cb);
            return this;
        }
        start() {
            let guard = 0;
            while (this.cbs.length > 0 && guard++ < 1_000_000) {
                for (const cb of [...this.cbs]) cb();
            }
        }
        stop() {
            this.cbs = [];
        }
        destroy() {
            this.cbs = [];
        }
    }
    return {
        Container,
        Graphics,
        Sprite,
        BitmapText,
        TextStyle,
        Point,
        Texture,
        Ticker,
    };
});

// 呼び出し検証で unbound-method 警告にならないよう、vi.hoistedで参照を持っておく
const { playSeMock } = vi.hoisted(() => ({
    playSeMock: vi.fn(),
}));
vi.mock("../../src/scripts/utils/AudioManager", () => {
    const shared = {
        playBgm: vi.fn(),
        playSe: playSeMock,
        stopBgm: vi.fn(),
        setMuted: vi.fn(),
        isMuted: () => false,
    };
    return { AudioManager: { shared } };
});

vi.mock("../../src/scripts/components/Sun", () => {
    class Sun {
        move = vi.fn();
        blink = vi.fn();
        stopBlink = vi.fn();
    }
    return { Sun };
});

vi.mock("../../src/scripts/components/Moon", () => {
    class Moon {
        move = vi.fn();
        blink = vi.fn();
        stopBlink = vi.fn();
    }
    return { Moon };
});

vi.mock("../../src/scripts/components/Butterfly", () => {
    class Butterfly {
        x = 0;
        y = 0;
        width = 20;
        height = 20;
        alpha = 1;
        destroyed = false;
        color: number;
        multiplicationRate = 1;
        isFlapping = false;
        isFlying = false;
        constructor(_size: string, color: number) {
            this.color = color;
        }
        setRandomInitialPoistion = vi.fn();
        appear = vi.fn();
        update = vi.fn();
        isHit = vi.fn(() => true);
        switchColor = vi.fn();
        setGatherPoint = vi.fn();
        deleteGatherPoint = vi.fn();
        delete = vi.fn();
    }
    return { Butterfly };
});

vi.mock("../../src/scripts/components/HelpFlower", () => {
    class HelpFlower {
        x = 0;
        y = 0;
        width = 20;
        height = 20;
        destroyed = false;
        message = "help!";
        constructor(private type: string) {}
        isHit = vi.fn(() => true);
        stop = vi.fn();
        delete = vi.fn();
        getType = vi.fn(() => this.type);
    }
    return { HelpFlower };
});

import { GameplayState } from "../../src/scripts/scenes/GameplayState";
import { StageInformation } from "../../src/scripts/components/StageInformation";
import { Butterfly } from "../../src/scripts/components/Butterfly";
import { HelpFlower } from "../../src/scripts/components/HelpFlower";
import type { GameStateManager } from "../../src/scripts/scenes/GameStateManager";

function createMockApp() {
    return {
        screen: { width: 1150, height: 650 },
        renderer: { width: 1150, height: 650 },
        stage: {
            addChild: vi.fn(),
            removeChild: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        },
        ticker: { addOnce: vi.fn() },
    };
}

function createMockManager() {
    return {
        app: createMockApp(),
        setState: vi.fn(),
    } as unknown as GameStateManager;
}

describe("Capture sound wiring (loop containing both butterflies and a flower)", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("plays se_capture only once when a loop captures 2 same-color butterflies together with a flower", async () => {
        const stageInfo = new StageInformation();
        const manager = createMockManager();
        const state = new GameplayState(manager, stageInfo);
        const enterPromise = state.onEnter();
        await vi.advanceTimersByTimeAsync(1000);
        await enterPromise;

        const butterflies = [
            new Butterfly("small", 0xff69b4),
            new Butterfly("small", 0xff69b4),
        ];
        const flower = new HelpFlower("freeze");
        state.butterflies = butterflies;
        state.flowers = [flower];

        playSeMock.mockClear();

        const loopArea = {} as never;
        (
            state as unknown as {
                handleLoopAreaCompleted: (loopArea: never) => void;
            }
        ).handleLoopAreaCompleted(loopArea);

        const captureCalls = playSeMock.mock.calls.filter(
            ([se]) => se === "se_capture",
        );
        expect(captureCalls.length).toBe(1);
        // 花の捕獲処理自体は行われている(音だけが統合された)ことを確認
        // (delete/stopはHelpFlower実装上メソッドのため、unbound-method対策でanyを介して参照する)
        const flowerSpy = flower as any;
        expect(flowerSpy.delete).toHaveBeenCalled();
        expect(flowerSpy.stop).toHaveBeenCalled();
    });

    it("still plays se_capture for a flower-only loop (no butterflies involved)", async () => {
        const stageInfo = new StageInformation();
        const manager = createMockManager();
        const state = new GameplayState(manager, stageInfo);
        const enterPromise = state.onEnter();
        await vi.advanceTimersByTimeAsync(1000);
        await enterPromise;

        const flower = new HelpFlower("freeze");
        state.butterflies = [];
        state.flowers = [flower];

        playSeMock.mockClear();

        const loopArea = {} as never;
        (
            state as unknown as {
                handleLoopAreaCompleted: (loopArea: never) => void;
            }
        ).handleLoopAreaCompleted(loopArea);

        const captureCalls = playSeMock.mock.calls.filter(
            ([se]) => se === "se_capture",
        );
        expect(captureCalls.length).toBe(1);
    });
});
