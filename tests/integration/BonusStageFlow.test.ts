import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * ボーナスステージ(=夢)の演出フローの結線(wiring)を検証する統合テスト。
 *
 * 新コンセプト「夢の中に入っていく、そして夢から覚める」に沿って、
 * 状態遷移を実オブジェクトの公開プロパティ・呼び出し回数で観測する。
 *
 * 検証する遷移:
 * - 夢への誘い(導入)中は isRunning=false のまま制限時間(elapsedTime)が
 *   絶対に進まないこと。ポーズ操作を挟んでも同じ(#64レビュー指摘の回帰防止)
 * - 導入が終わるとゲーム本編が始まり、時間切れで一度だけリザルトへ遷移すること
 * - 夢に入るリザルト(スペシャル蝶捕獲)は、暗転してからボーナスへ入ること
 * - 夢から覚めるリザルト(ボーナス)は、夜のまま見せてから明転し通常ステージへ戻ること
 *
 * ロジックを再実装して検証するマッチポンプにならないよう、観測点は実
 * オブジェクトの公開プロパティ・スパイに限定する。描画が重いor無関係な
 * コンポーネントだけを軽量なダブルに差し替える。
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
    // フェード/スライド用の Ticker。start() で完了まで同期的に回し、
    // コールバック自身が stop()/destroy() を呼んだ時点でループを抜ける。
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

vi.mock("../../src/scripts/components/SpecialButterfly", () => {
    // GameplayState側の instanceof 判定に加え、ResultStateが「夢に誘う蝶」
    // として生成・徘徊・飛び去りに使うため、必要な公開メンバを備える
    class SpecialButterfly {
        x = 500;
        y = 300;
        width = 20;
        height = 20;
        alpha = 1;
        destroyed = false;
        isFlapping = false;
        isFlying = false;
        zIndex = 0;
        constructor(
            public color?: number,
            public screenSize?: unknown,
        ) {}
        setRandomInitialPoistion = vi.fn();
        appear = vi.fn();
        update = vi.fn();
        delete = vi.fn(() => {
            this.destroyed = true;
        });
        isHit = () => false;
        switchColor = vi.fn();
        setGatherPoint = vi.fn();
        deleteGatherPoint = vi.fn();
    }
    return { SpecialButterfly };
});

import { GameplayState } from "../../src/scripts/scenes/GameplayState";
import { ResultState } from "../../src/scripts/scenes/ResultState";
import { StageInformation } from "../../src/scripts/components/StageInformation";
import { BonusStageEffect } from "../../src/scripts/components/BonusStageEffect";
import { SpecialButterfly } from "../../src/scripts/components/SpecialButterfly";
import { AudioManager } from "../../src/scripts/utils/AudioManager";
import * as Const from "../../src/scripts/utils/Const";
import type { GameStateManager } from "../../src/scripts/scenes/GameStateManager";

function createMockApp() {
    return {
        screen: { width: 1150, height: 650 },
        // renderer.width/height はメッセージ配置計算で参照される。
        // renderer.generateTextureは意図的に用意しない
        // (SparkleEmitter.createStarTextureが例外を投げ、フォールバックで
        // Texture.WHITEが使われる経路をそのまま通す)
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

describe("Bonus (dream) stage flow", () => {
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

    describe("dream invitation (intro): pause must not consume the bonus timer", () => {
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
                state.update(100);
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

    describe("bonus timeout transitions to the result exactly once", () => {
        it("moves to a ResultState 3s after time runs out, and does not re-fire on further updates", async () => {
            const stageInfo = new StageInformation();
            stageInfo.bonusStage();
            const manager = createMockManager();
            const setStateSpy = vi.spyOn(manager, "setState");
            const state = new GameplayState(manager, stageInfo);

            await state.onEnter();

            // 導入演出を終わらせてゲームを開始する
            let total = 0;
            while (total < BonusStageEffect.INTRO_DURATION_MS + 50) {
                state.update(100);
                total += 100;
            }
            expect(setStateSpy).not.toHaveBeenCalled();

            // 制限時間(60秒)を一気に使い切る = 時間切れでendGame()が走る
            state.update(stageInfo.stageTime * 1000 + 1000);
            // リザルト遷移は3秒後
            await vi.advanceTimersByTimeAsync(3000);
            expect(setStateSpy).toHaveBeenCalledTimes(1);
            expect(setStateSpy).toHaveBeenCalledWith(expect.any(ResultState));

            // 終了後にupdate()を重ねても再遷移しない
            state.update(1000);
            state.update(1000);
            await vi.advanceTimersByTimeAsync(3000);
            expect(setStateSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe("practice mode never invites into the dream/bonus stage", () => {
        it("does not spawn the special butterfly on a level that normally has one", async () => {
            // level 5 は本来 hasBonusButterfly=true (5の倍数) だが、
            // プラクティスモードでは「そのステージだけで完結させる」ため
            // スペシャル蝶を出さない
            const stageInfo = new StageInformation(5);
            stageInfo.isPractice = true;
            expect(stageInfo.hasBonusButterfly).toBe(true);

            const manager = createMockManager();
            const state = new GameplayState(manager, stageInfo);

            const entered = state.onEnter();
            await vi.advanceTimersByTimeAsync(1000);
            await entered;

            const internal = state as any;
            // スペシャル蝶が出るタイミング(10秒経過)を大きく超えて進める
            let total = 0;
            while (total < 15000) {
                state.update(200);
                total += 200;
            }

            expect(internal.isAddBonusButterfly).toBe(false);
            expect(
                internal.butterflies.some(
                    (b: unknown) => b instanceof SpecialButterfly,
                ),
            ).toBe(false);
        });
    });

    describe("dream invitation already shown during the result: bonus starts without re-displaying it", () => {
        it("skips the intro and starts the game on the first update", async () => {
            const stageInfo = new StageInformation();
            stageInfo.bonusStage();
            stageInfo.bonusIntroShown = true;
            const manager = createMockManager();
            const state = new GameplayState(manager, stageInfo);

            await state.onEnter();

            const internal = state as any;
            // 案内(bonus.invitation)はリザルト側で見せているため再表示しない
            expect(internal.bonusEffect.phase).toBe("playing");
            expect(internal.bonusEffect.message.alpha).toBe(0);

            // 最初のupdateでゲーム本編がすぐ始まる
            state.update(16);
            expect(internal.isRunning).toBe(true);
        });
    });

    describe("entering the dream: special-butterfly result darkens, then leads into the bonus", () => {
        it("trembles free of its pin, flies off-screen, fades to night, and starts the bonus only after the butterfly has left the screen", async () => {
            const stageInfo = new StageInformation();
            // スペシャル蝶を捕まえてクリアした通常ステージのリザルト。
            // ノート型リザルトは実際に捕まえた標本(capturedSpecimens)を
            // 見て「どれが夢へ誘う個体か」を決めるため、ここで用意しておく
            stageInfo.captureCount = stageInfo.needCount;
            stageInfo.capturedSpecimens = [
                { color: 0xff69b4, sizeCategory: "small", isSpecial: false },
                { color: 0xdc143c, sizeCategory: "special", isSpecial: true },
            ];
            stageInfo.calcScore();
            expect(stageInfo.isClear).toBe(true);
            expect(stageInfo.bonusFlag).toBe(false);

            const manager = createMockManager();
            const setStateSpy = vi.spyOn(manager, "setState");
            const playBgmSpy = vi.spyOn(AudioManager.shared, "playBgm");
            const state = new ResultState(manager, stageInfo, true);
            const internal = state as any;

            const done = state.onEnter();
            // displayNotebookResult()自体はPIXI.Tickerベースのフェードを
            // 挟むが、このファイルのTickerモックはstart()が同期的に完走する。
            // 着地音→ジングルの間に1300msの間があるため、その分だけ進めれば
            // ノート描画が完了する
            await vi.advanceTimersByTimeAsync(1300);

            // リザルト中(まだピン留めされたまま)はスペシャル個体の旅立ち
            // モーション(震え→退場)はまだ始まっていない。Butterfly.fly()側の
            // 壁バウンド徘徊(isFlying)は最初から使わない設計
            expect(internal.dreamSpecimen).toBeDefined();
            expect(internal.dreamSpecimen.butterfly.isFlying).toBe(false);
            expect(internal.container.sortableChildren).toBe(true);
            // クリーンアップ後の状態を見るため、同じ参照を保持しておく
            // (dreamSpecimenフィールド自体はクリーンアップ時にundefinedへ戻る)
            const dreamSpecimen = internal.dreamSpecimen as {
                x: number;
                y: number;
                destroyed: boolean;
                zIndex: number;
                butterfly: {
                    isFlapping: boolean;
                    update: (...a: unknown[]) => void;
                };
                pinSprite: unknown;
            };
            state.update(16);
            expect(dreamSpecimen.butterfly.update).toHaveBeenCalled();

            // 夜への暗転はリザルト表示中から先行して始まる(実機では
            // 「気づいたら夜」くらいゆっくりだが、このファイルの同期Ticker
            // では開始と同時に完了する)
            expect(internal.nightBackground.alpha).toBeCloseTo(1, 1);
            // ノート一式(ノート・テキスト・標本のグループ)はまだ表示されている
            expect(internal.notebookGroup.alpha).toBe(1);

            await vi.advanceTimersByTimeAsync(30000);
            await done;

            // 背景の切り替わり(暗転)が始まる時点で、ボーナスBGMが先出しされている
            expect(playBgmSpy).toHaveBeenCalledWith(Const.bgmSrcs.bonus);

            // だんだん暗くなって夜になった
            expect(internal.nightBackground.alpha).toBeCloseTo(1, 1);
            // ノート一式(テキスト・標本ごと)は、蝶がピンから外れたあとに
            // ゆっくりフェードアウトして消えている
            expect(internal.notebookGroup.alpha).toBeCloseTo(0, 1);
            // 旅立ちを始める時点で、スコアの紙・テキストより手前(最前面)に
            // 描画されるよう高いzIndexが付く
            expect(dreamSpecimen.zIndex).toBeGreaterThan(0);
            // 震え終わりにピンが外れ(pinSprite=null)、羽ばたいて飛び去った
            expect(dreamSpecimen.pinSprite).toBeNull();
            expect(dreamSpecimen.butterfly.isFlapping).toBe(true);
            // 遷移のゲートは「蝶が画面外へ抜けきる」こと。フェードアウトでは
            // なく、実際に画面外(余白込み)の座標まで飛んでから破棄されている
            const margin = 90;
            const offScreen =
                dreamSpecimen.x < -margin ||
                dreamSpecimen.x > 1150 + margin ||
                dreamSpecimen.y < -margin ||
                dreamSpecimen.y > 650 + margin;
            expect(offScreen).toBe(true);
            expect(dreamSpecimen.destroyed).toBe(true);
            expect(internal.dreamSpecimen).toBeUndefined();
            // 夢(ボーナス)へ入る: bonusStageが呼ばれ、次のステートへ一度だけ遷移。
            // 案内メッセージ(bonus.invitation)はリザルト側で既に見せたので、
            // ボーナス側の導入をスキップするためのフラグが立っている
            expect(stageInfo.bonusFlag).toBe(true);
            expect(stageInfo.bonusIntroShown).toBe(true);
            expect(setStateSpy).toHaveBeenCalledTimes(1);
            expect(setStateSpy).toHaveBeenCalledWith(expect.any(GameplayState));
        });
    });

    describe("waking from the dream: bonus result stays night, then brightens to day", () => {
        it("shows the result on the night background, then fades back to day and advances to the next stage", async () => {
            const stageInfo = new StageInformation();
            stageInfo.bonusStage(); // 夢(ボーナス)ステージ
            stageInfo.calcScore(); // bonusFlag により isClear
            const levelBefore = stageInfo.level;

            const manager = createMockManager();
            const setStateSpy = vi.spyOn(manager, "setState");
            const state = new ResultState(manager, stageInfo, false);
            const internal = state as any;

            // 夢から覚めるリザルトは夜のまま見せる
            expect(internal.nightBackground.alpha).toBe(1);
            // 夢に誘う蝶は出さない(入るときだけの演出)
            expect(internal.dreamSpecimen).toBeUndefined();

            const done = state.onEnter();
            await vi.advanceTimersByTimeAsync(30000);
            await done;

            // じわじわ明るくなって昼へ戻った
            expect(internal.nightBackground.alpha).toBeCloseTo(0, 1);
            // 通常ステージへ: 次のレベルへ進み、一度だけ遷移
            expect(stageInfo.level).toBe(levelBefore + 1);
            expect(stageInfo.bonusFlag).toBe(false);
            expect(setStateSpy).toHaveBeenCalledTimes(1);
            expect(setStateSpy).toHaveBeenCalledWith(expect.any(GameplayState));
        });
    });
});
