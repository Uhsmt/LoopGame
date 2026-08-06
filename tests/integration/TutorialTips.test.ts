import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * 序盤ステージのチュートリアルtips表示(#91)の結線(wiring)を検証する
 * 統合テスト。
 *
 * ロジックを再実装して検証するマッチポンプにならないよう、実際の
 * GameplayState.onEnter() を呼び出し、プレイヤーから見える状態
 * (tipMessageの表示/非表示・蝶が飛び始めるタイミング)だけを観測点とする。
 * 描画が重いor無関係なコンポーネントだけを軽量なダブルに差し替える
 * (CaptureSound.test.tsと同じ方針)。
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

vi.mock("../../src/scripts/utils/AudioManager", () => {
    const shared = {
        playBgm: vi.fn(),
        playSe: vi.fn(),
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
        isHit = () => false;
        switchColor = vi.fn();
        setGatherPoint = vi.fn();
        deleteGatherPoint = vi.fn();
        delete = vi.fn();
    }
    return { Butterfly };
});

import { GameplayState } from "../../src/scripts/scenes/GameplayState";
import { StageInformation } from "../../src/scripts/components/StageInformation";
import * as Const from "../../src/scripts/utils/Const";
import { t, setLang, resetLangCache } from "../../src/scripts/utils/Language";
import { getTutorialTipKey } from "../../src/scripts/utils/TutorialTips";
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

describe("Tutorial tips on early stages (#91)", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        setLang("ja");
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
        resetLangCache();
    });

    it("shows the level's tip after the start message, then removes both and starts play", async () => {
        // level 1 は tip.level1 を持つ
        expect(getTutorialTipKey(1)).toBe("tip.level1");

        const stageInfo = new StageInformation(1);
        const manager = createMockManager();
        const state = new GameplayState(manager, stageInfo);
        const internal = state as any;

        const entered = state.onEnter();

        // 基本のstartMessage表示時間(1000ms)経過時点では、まだtipsは
        // 表示されておらず、蝶もまだ飛んでいない
        await vi.advanceTimersByTimeAsync(999);
        expect(internal.tipMessage.alpha).toBe(0);
        expect(internal.butterflies[0].isFlying).toBe(false);

        // 1000ms経過した瞬間からtipsが表示される
        await vi.advanceTimersByTimeAsync(1);
        expect(internal.tipMessage.alpha).toBe(1);
        expect(internal.tipMessage.text).toBe(t("tip.level1"));
        expect(internal.container.children).toContain(internal.tipMessage);
        // このタイミングではまだゲームは始まっていない
        expect(internal.butterflies[0].isFlying).toBe(false);

        // tips表示時間が終わるまではまだ始まらない
        await vi.advanceTimersByTimeAsync(Const.TUTORIAL_TIP_DISPLAY_MS - 1);
        expect(internal.butterflies[0].isFlying).toBe(false);

        // tips表示時間を使い切ったら、両方のメッセージが消えてゲームが始まる
        await vi.advanceTimersByTimeAsync(1);
        await entered;
        expect(internal.container.children).not.toContain(
            internal.startMessage,
        );
        expect(internal.container.children).not.toContain(internal.tipMessage);
        expect(internal.butterflies[0].isFlying).toBe(true);
    });

    it("skips the tip entirely on a level with none, starting play at the original 1000ms", async () => {
        // level 6 はどのtipsにも対応しない
        expect(getTutorialTipKey(6)).toBeNull();

        const stageInfo = new StageInformation(6);
        const manager = createMockManager();
        const state = new GameplayState(manager, stageInfo);
        const internal = state as any;

        expect(internal.tipMessage.text).toBe("");

        const entered = state.onEnter();
        await vi.advanceTimersByTimeAsync(1000);
        await entered;

        // tipsは一度もalpha=1にならず、既存どおり1000msちょうどで開始する
        expect(internal.container.children).not.toContain(internal.tipMessage);
        expect(internal.butterflies[0].isFlying).toBe(true);
    });
});
