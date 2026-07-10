import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * GameplayStateとBonusStageEffectの結線(wiring)を検証する統合テスト。
 *
 * 目的:
 * - 導入演出中(isRunning=false)はポーズ操作を挟んでも制限時間
 *   (elapsedTime)が絶対に進まないこと(PR #64レビュー指摘の回帰防止)
 * - endGameで終了演出(outro)がちょうど1回だけ起動すること
 * - startPlay()切り出し後も、通常ステージの「1秒待ってから開始」という
 *   従来のフローが変わっていないこと
 *
 * 実際のGameplayState/StageInformation/BonusStageEffect/LineDrawer/
 * SparkleEmitterはそのまま使い、描画が重いor無関係なコンポーネント
 * (PIXI.js自体・AudioManager・Sun/Moon・Butterfly/SpecialButterfly)
 * だけを軽量なダブルに差し替える。ロジックを再実装して検証する
 * マッチポンプにならないよう、観測点は実オブジェクトの公開プロパティ・
 * 呼び出し回数(スパイ)に限定する
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
    return {
        Container,
        Graphics,
        Sprite,
        BitmapText,
        TextStyle,
        Point,
        Texture,
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

vi.mock("../../src/scripts/components/SpecialButterfly", () => {
    // このテストではhasBonusButterflyが常にfalseなので実際には生成されない。
    // GameplayState側のinstanceof判定が壊れないようクラスだけ用意する
    class SpecialButterfly {}
    return { SpecialButterfly };
});

import { GameplayState } from "../../src/scripts/scenes/GameplayState";
import { StageInformation } from "../../src/scripts/components/StageInformation";
import { BonusStageEffect } from "../../src/scripts/components/BonusStageEffect";
import type { GameStateManager } from "../../src/scripts/scenes/GameStateManager";

function createMockApp() {
    return {
        screen: { width: 1150, height: 650 },
        // renderer.width/height はGameplayState内のメッセージ配置計算で参照される。
        // renderer.generateTextureは意図的に用意しない
        // (SparkleEmitter.createStarTextureが例外を投げ、GameplayState側の
        // フォールバックでTexture.WHITEが使われる経路をそのまま通す)
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

function setupPauseButton(): void {
    document.body.innerHTML = '<button id="pauseButton"><i></i></button>';
}

function clickPauseButton(): void {
    document
        .getElementById("pauseButton")!
        .dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

describe("GameplayState + BonusStageEffect wiring", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        setupPauseButton();
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
        document.body.innerHTML = "";
        vi.restoreAllMocks();
    });

    describe("bonus intro: pause must not consume the bonus timer", () => {
        it("keeps elapsedTime at 0 through the whole intro, even if the pause button is clicked", async () => {
            const stageInfo = new StageInformation();
            stageInfo.bonusStage();
            const manager = createMockManager();
            const state = new GameplayState(manager, stageInfo);

            await state.onEnter();

            const internal = state as any;
            expect(internal.bonusEffect.phase).toBe("intro");

            // 導入演出の途中まで進める(まだ intro のはず)
            for (let i = 0; i < 5; i++) {
                state.update(100); // 合計500ms < INTRO_DURATION_MS(1800ms)
            }
            expect(internal.bonusEffect.phase).toBe("intro");
            expect(internal.isRunning).toBe(false);
            expect(internal.elapsedTime).toBe(0);

            // 演出中にポーズボタンを押しても無視されるべき(#64レビュー指摘)
            clickPauseButton();
            expect(internal.isRunning).toBe(false);
            expect(internal.bonusEffect.phase).toBe("intro");

            // さらに進めても(ポーズを試みても)elapsedTimeは0のまま
            for (let i = 0; i < 5; i++) {
                state.update(100);
                clickPauseButton();
            }
            expect(internal.elapsedTime).toBe(0);
            expect(internal.isRunning).toBe(false);
        });

        it("starts the game (isRunning=true, timer advancing) once the intro finishes", async () => {
            const stageInfo = new StageInformation();
            stageInfo.bonusStage();
            const manager = createMockManager();
            const state = new GameplayState(manager, stageInfo);

            await state.onEnter();

            const internal = state as any;

            // 通常ステージ用のstartMessageは使わないので残っていないこと
            expect(internal.container.children).not.toContain(
                internal.startMessage,
            );

            // INTRO_DURATION_MSを超えるまで細かく進める
            let total = 0;
            while (total < BonusStageEffect.INTRO_DURATION_MS + 50) {
                state.update(100);
                total += 100;
            }

            expect(internal.bonusEffect.phase).toBe("playing");
            expect(internal.isRunning).toBe(true);

            const before = internal.elapsedTime;
            state.update(200);
            expect(internal.elapsedTime).toBeGreaterThan(before);

            // 演出後はポーズ操作が正常に機能する(通常のポーズ挙動は不変)
            clickPauseButton();
            expect(internal.isRunning).toBe(false);
        });
    });

    describe("endGame outro trigger", () => {
        it("starts the outro exactly once when the bonus timer runs out, even if update() is called again", async () => {
            const startOutroSpy = vi.spyOn(
                BonusStageEffect.prototype,
                "startOutro",
            );

            const stageInfo = new StageInformation();
            stageInfo.bonusStage();
            const manager = createMockManager();
            const state = new GameplayState(manager, stageInfo);

            await state.onEnter();

            // 導入演出を終わらせてゲームを開始する
            let total = 0;
            while (total < BonusStageEffect.INTRO_DURATION_MS + 50) {
                state.update(100);
                total += 100;
            }
            expect(startOutroSpy).not.toHaveBeenCalled();

            // 制限時間(60秒)を一気に使い切る = 時間切れでendGame()が呼ばれる
            state.update(stageInfo.stageTime * 1000 + 1000);
            expect(startOutroSpy).toHaveBeenCalledTimes(1);

            // 終了後にupdate()を重ねてもendGame/outroは再発火しない
            // (isRunning=falseで早期returnするため)
            state.update(1000);
            state.update(1000);
            expect(startOutroSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe("normal stage flow (non-bonus) is unaffected by the startPlay() extraction", () => {
        it("shows the start message for 1s, then starts the game and removes it", async () => {
            const stageInfo = new StageInformation(); // level 1, not bonus
            const manager = createMockManager();
            const state = new GameplayState(manager, stageInfo);

            const onEnterPromise = state.onEnter();

            const internal = state as any;
            expect(internal.isRunning).toBe(false);
            expect(internal.startMessage.alpha).toBe(1);
            expect(internal.bonusEffect).toBeNull();

            // 1秒経つまではまだ開始しない
            await vi.advanceTimersByTimeAsync(900);
            expect(internal.isRunning).toBe(false);

            await vi.advanceTimersByTimeAsync(200);
            await onEnterPromise;

            expect(internal.isRunning).toBe(true);
            expect(internal.container.children).not.toContain(
                internal.startMessage,
            );
            expect(internal.butterflies[0].isFlapping).toBe(true);
            expect(internal.butterflies[0].isFlying).toBe(true);
        });
    });
});
