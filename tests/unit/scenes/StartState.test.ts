import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// AudioManagerは実際の再生処理(AudioContext/HTMLAudioElement)を避けるためモックする
vi.mock("../../../src/scripts/utils/AudioManager", () => ({
    AudioManager: {
        shared: {
            playBgm: vi.fn(),
            playSe: vi.fn(),
        },
    },
}));

// LineDrawerは実際のポインタ幾何計算を避け、on/emitだけを持つ最小実装に差し替える
vi.mock("../../../src/scripts/components/LineDrawer", () => {
    class MockLineDrawer {
        private handlers: Record<string, Array<(...args: any[]) => void>> = {};
        cleanup = vi.fn();
        getSegmentPoints = vi.fn().mockReturnValue([]);
        on(event: string, handler: (...args: any[]) => void) {
            (this.handlers[event] ??= []).push(handler);
        }
        emit(event: string, ...args: any[]) {
            (this.handlers[event] || []).forEach((h) => h(...args));
        }
    }
    return { LineDrawer: MockLineDrawer };
});

// デバッグ/ゲーム開始・あそびかたに関わる重い依存はテスト対象外なのでスタブに差し替える
vi.mock("../../../src/scripts/components/Butterfly", () => {
    class MockButterfly {
        isFlying = false;
        isFlapping = false;
        color: number;
        constructor(_size: string, color: number) {
            this.color = color;
        }
        setRandomInitialPoistion() {}
        appear() {}
        update() {}
        delete() {}
        isHit() {
            return false;
        }
    }
    return { Butterfly: MockButterfly };
});

vi.mock("../../../src/scripts/components/SpecialButterfly", () => {
    class MockSpecialButterfly {
        isFlying = false;
        isFlapping = false;
        setRandomInitialPoistion() {}
        appear() {}
    }
    return { SpecialButterfly: MockSpecialButterfly };
});

vi.mock("../../../src/scripts/components/HelpFlower", () => {
    class MockHelpFlower {
        spin() {}
        fall() {}
    }
    return { HelpFlower: MockHelpFlower };
});

vi.mock("../../../src/scripts/components/StageInformation", () => ({
    StageInformation: vi.fn(),
}));

vi.mock("../../../src/scripts/scenes/GameplayState", () => ({
    GameplayState: vi.fn(),
}));

vi.mock("../../../src/scripts/scenes/RuleState", () => ({
    RuleState: vi.fn(),
}));

vi.mock("../../../src/scripts/scenes/PracticeSelectState", () => ({
    PracticeSelectState: vi.fn(),
}));

import { StartState } from "../../../src/scripts/scenes/StartState";
import { PracticeSelectState } from "../../../src/scripts/scenes/PracticeSelectState";
import {
    setLang,
    resetLangCache,
    t,
} from "../../../src/scripts/utils/Language";

// Button/BaseCaptureableObjectは実物を使う(pixi.jsはグローバルモック:tests/setup/pixi-mock.ts)。
// leafSprite.height は MockSprite で常に100固定になるため、
// どのボタンも hitAreaSize(当たり判定の半径) は 40 になる。

function createMockApp() {
    return {
        screen: { width: 800, height: 600 },
        stage: {
            addChild: vi.fn(),
            removeChild: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        },
        ticker: {
            addOnce: vi.fn(),
        },
    };
}

function createMockManager(app: ReturnType<typeof createMockApp>) {
    return {
        app,
        setState: vi.fn(),
    };
}

function getHandler(
    stage: ReturnType<typeof createMockApp>["stage"],
    eventName: string,
): (event: { global: { x: number; y: number }; pointerId: number }) => void {
    const call = (stage.addEventListener as any).mock.calls.find(
        (c: any[]) => c[0] === eventName,
    );
    if (!call) {
        throw new Error(`handler for ${eventName} was not registered`);
    }
    return call[1];
}

describe("StartState click hint", () => {
    let store: Record<string, string>;
    let app: ReturnType<typeof createMockApp>;
    let manager: ReturnType<typeof createMockManager>;
    let startState: StartState;

    // ボタンの中心座標(app.screen 800x600時のStartStateのレイアウト計算と一致させる)
    // あそびかた(左: width/4)・スタート(中央: width/2)・れんしゅう(右: 3*width/4)
    const RULE_BUTTON = { x: 200, y: 390 };
    const START_BUTTON = { x: 400, y: 390 };
    const PRACTICE_BUTTON = { x: 600, y: 390 };
    // 言語切替ボタンは画面右下すみ(app.screen比 0.92/0.87)に配置される
    const LANG_BUTTON = { x: 800 * 0.92, y: 600 * 0.87 };
    const FAR_AWAY = { x: 10, y: 10 };

    beforeEach(() => {
        store = {};
        vi.stubGlobal("localStorage", {
            getItem: vi.fn((key: string) => store[key] ?? null),
            setItem: vi.fn((key: string, value: string) => {
                store[key] = value;
            }),
        });
        vi.stubGlobal("navigator", { language: "ja-JP" });
        resetLangCache();
        setLang("ja");
        // 練習ボタンの表示条件(到達レベルが2以上)を満たしておく。
        // 非表示ケースは各テスト内でstoreを書き換えて個別に検証する
        store["loopgame.maxLevel"] = "5";

        app = createMockApp();
        manager = createMockManager(app);
        startState = new StartState(manager as any);
    });

    afterEach(() => {
        // 注意: test-setup.ts が DEBUG_MODE/BASE_URL をグローバルにstubしているため、
        // ここで vi.unstubAllGlobals() を呼ぶとそれらも消えて以降のテストが壊れる。
        // localStorage/navigatorのstubはbeforeEachで毎回上書きされるので明示的な復元は不要。
        resetLangCache();
        vi.useRealTimers();
    });

    // ボタン中心の周囲(半径50px)を囲むループ。当たり判定円(半径40)の
    // 全サンプル点を含むため、そのボタンだけがヒットする
    const loopAround = (center: { x: number; y: number }) => ({
        containsPoint: (p: { x: number; y: number }) =>
            (p.x - center.x) ** 2 + (p.y - center.y) ** 2 <= 50 * 50,
    });

    const click = (point: { x: number; y: number }, pointerId: number = 1) => {
        const downHandler = getHandler(app.stage, "pointerdown");
        const upHandler = getHandler(app.stage, "pointerup");
        downHandler({ global: point, pointerId });
        upHandler({ global: point, pointerId });
    };

    describe("wiring", () => {
        it("registers pointerdown/pointerup/pointercancel/pointerupoutside handlers on the stage during onEnter", () => {
            startState.onEnter();
            expect(app.stage.addEventListener).toHaveBeenCalledWith(
                "pointerdown",
                expect.any(Function),
            );
            expect(app.stage.addEventListener).toHaveBeenCalledWith(
                "pointerup",
                expect.any(Function),
            );
            expect(app.stage.addEventListener).toHaveBeenCalledWith(
                "pointercancel",
                expect.any(Function),
            );
            expect(app.stage.addEventListener).toHaveBeenCalledWith(
                "pointerupoutside",
                expect.any(Function),
            );
        });

        it("removes all pointer handlers on onExit, symmetric with onEnter", () => {
            startState.onEnter();
            const downHandler = getHandler(app.stage, "pointerdown");
            const upHandler = getHandler(app.stage, "pointerup");
            const cancelHandler = getHandler(app.stage, "pointercancel");
            const outsideHandler = getHandler(app.stage, "pointerupoutside");

            startState.onExit();

            expect(app.stage.removeEventListener).toHaveBeenCalledWith(
                "pointerdown",
                downHandler,
            );
            expect(app.stage.removeEventListener).toHaveBeenCalledWith(
                "pointerup",
                upHandler,
            );
            expect(app.stage.removeEventListener).toHaveBeenCalledWith(
                "pointercancel",
                cancelHandler,
            );
            expect(app.stage.removeEventListener).toHaveBeenCalledWith(
                "pointerupoutside",
                outsideHandler,
            );
        });
    });

    describe("clicking a button", () => {
        it("shows the hint message when the start button is clicked (not looped)", () => {
            startState.onEnter();
            click(START_BUTTON);

            const hintMessage = (startState as any).hintMessage;
            expect(hintMessage.alpha).toBe(1);
            expect(hintMessage.text).toBe(t("hint.drawLoop"));
        });

        it("shows the hint message when the how-to-play button is clicked", () => {
            startState.onEnter();
            click(RULE_BUTTON);

            expect((startState as any).hintMessage.alpha).toBe(1);
        });

        it("shows the hint message when the practice button is clicked", () => {
            startState.onEnter();
            click(PRACTICE_BUTTON);

            expect((startState as any).hintMessage.alpha).toBe(1);
        });

        it("shows the hint message when the language toggle button is clicked", () => {
            startState.onEnter();
            click(LANG_BUTTON);

            expect((startState as any).hintMessage.alpha).toBe(1);
        });

        it("does not show the hint when clicking empty space", () => {
            startState.onEnter();
            click(FAR_AWAY);

            expect((startState as any).hintMessage.alpha).toBe(0);
        });
    });

    describe("distinguishing clicks from loop drawing", () => {
        it("does not show the hint when the pointer moves far before releasing (drag)", () => {
            startState.onEnter();
            const downHandler = getHandler(app.stage, "pointerdown");
            const upHandler = getHandler(app.stage, "pointerup");

            downHandler({ global: START_BUTTON, pointerId: 1 });
            upHandler({ global: RULE_BUTTON, pointerId: 1 }); // 400px移動

            expect((startState as any).hintMessage.alpha).toBe(0);
        });

        it("does not show the hint when the press is held too long (not a quick tap)", () => {
            vi.useFakeTimers();
            startState.onEnter();
            const downHandler = getHandler(app.stage, "pointerdown");
            const upHandler = getHandler(app.stage, "pointerup");

            downHandler({ global: START_BUTTON, pointerId: 1 });
            vi.advanceTimersByTime(600);
            upHandler({ global: START_BUTTON, pointerId: 1 });

            expect((startState as any).hintMessage.alpha).toBe(0);
        });

        it("does not show the hint if a loop was completed during the gesture", () => {
            startState.onEnter();
            const downHandler = getHandler(app.stage, "pointerdown");
            const upHandler = getHandler(app.stage, "pointerup");

            downHandler({ global: START_BUTTON, pointerId: 1 });
            // ジェスチャーの途中でループが完成したことをシミュレート
            (startState as any).handleLoopAreaCompleted({
                containsPoint: () => false,
            });
            upHandler({ global: START_BUTTON, pointerId: 1 });

            expect((startState as any).hintMessage.alpha).toBe(0);
        });

        it("ignores pointerup without a preceding pointerdown", () => {
            startState.onEnter();
            const upHandler = getHandler(app.stage, "pointerup");

            expect(() =>
                upHandler({ global: START_BUTTON, pointerId: 1 }),
            ).not.toThrow();
            expect((startState as any).hintMessage.alpha).toBe(0);
        });
    });

    describe("multi-touch pointer tracking", () => {
        it("discards the click candidate when a second finger goes down, so the first finger's release does not show a hint (finger A down -> finger B down -> A up)", () => {
            startState.onEnter();
            const downHandler = getHandler(app.stage, "pointerdown");
            const upHandler = getHandler(app.stage, "pointerup");

            // 指A: startButton上でpointerdown
            downHandler({ global: START_BUTTON, pointerId: 1 });
            // 指B: 別の指が(どこでも)pointerdownしてくる = マルチタッチ
            downHandler({ global: RULE_BUTTON, pointerId: 2 });
            // 指Aがボタン上でpointerupしても、マルチタッチだったのでヒントは出ない
            upHandler({ global: START_BUTTON, pointerId: 1 });

            expect((startState as any).hintMessage.alpha).toBe(0);
        });

        it("does not let finger B's release be treated as finger A's click", () => {
            startState.onEnter();
            const downHandler = getHandler(app.stage, "pointerdown");
            const upHandler = getHandler(app.stage, "pointerup");

            downHandler({ global: START_BUTTON, pointerId: 1 });
            downHandler({ global: RULE_BUTTON, pointerId: 2 });
            // 指Bのpointerupも(状態が破棄済みなので)ヒントを出さない
            upHandler({ global: RULE_BUTTON, pointerId: 2 });

            expect((startState as any).hintMessage.alpha).toBe(0);
        });

        it("tracks a fresh click normally after a multi-touch collision has cleared the state", () => {
            startState.onEnter();
            const downHandler = getHandler(app.stage, "pointerdown");
            const upHandler = getHandler(app.stage, "pointerup");

            downHandler({ global: START_BUTTON, pointerId: 1 });
            downHandler({ global: RULE_BUTTON, pointerId: 2 }); // 状態破棄
            upHandler({ global: START_BUTTON, pointerId: 1 });
            expect((startState as any).hintMessage.alpha).toBe(0);

            // 新しく単独のクリックをすれば通常通りヒントが出る
            click(START_BUTTON, 3);
            expect((startState as any).hintMessage.alpha).toBe(1);
        });
    });

    describe("pointercancel / pointerupoutside", () => {
        it("does not show the hint when the gesture is cancelled before pointerup", () => {
            startState.onEnter();
            const downHandler = getHandler(app.stage, "pointerdown");
            const cancelHandler = getHandler(app.stage, "pointercancel");
            const upHandler = getHandler(app.stage, "pointerup");

            downHandler({ global: START_BUTTON, pointerId: 1 });
            cancelHandler({ global: START_BUTTON, pointerId: 1 });
            // キャンセル後にpointerupが来ても(実装上あり得るが)追跡状態は既に破棄済み
            upHandler({ global: START_BUTTON, pointerId: 1 });

            expect((startState as any).hintMessage.alpha).toBe(0);
        });

        it("clears the tracked state on pointerupoutside (release outside the canvas)", () => {
            startState.onEnter();
            const downHandler = getHandler(app.stage, "pointerdown");
            const outsideHandler = getHandler(app.stage, "pointerupoutside");

            downHandler({ global: START_BUTTON, pointerId: 1 });
            outsideHandler({ global: FAR_AWAY, pointerId: 1 });

            expect((startState as any).clickPointerId).toBeNull();
            expect((startState as any).clickDownPoint).toBeNull();
        });

        it("ignores a cancel event for an unrelated pointerId", () => {
            startState.onEnter();
            const downHandler = getHandler(app.stage, "pointerdown");
            const cancelHandler = getHandler(app.stage, "pointercancel");
            const upHandler = getHandler(app.stage, "pointerup");

            downHandler({ global: START_BUTTON, pointerId: 1 });
            cancelHandler({ global: START_BUTTON, pointerId: 99 }); // 無関係なポインタ
            upHandler({ global: START_BUTTON, pointerId: 1 });

            // 無関係なcancelでは状態が破棄されないので、通常通りヒントが出る
            expect((startState as any).hintMessage.alpha).toBe(1);
        });
    });

    describe("no duplicate display", () => {
        it("reuses a single hint Text instance across repeated clicks (no stacking)", () => {
            startState.onEnter();
            const hintMessage = (startState as any).hintMessage;
            const container = (startState as any).container;

            click(START_BUTTON);
            click(START_BUTTON);
            click(START_BUTTON);

            const hintAddChildCalls = container.addChild.mock.calls.filter(
                (args: any[]) => args[0] === hintMessage,
            );
            expect(hintAddChildCalls).toHaveLength(1);
        });

        it("extends the display instead of creating a new message on rapid re-clicks", () => {
            startState.onEnter();
            click(START_BUTTON);
            startState.update(1500); // alpha が下がり始めた状態
            const hintMessage = (startState as any).hintMessage;
            const midAlpha = hintMessage.alpha;
            expect(midAlpha).toBeLessThan(1);

            click(START_BUTTON); // 再クリックで表示がリセットされる
            expect(hintMessage.alpha).toBe(1);
        });
    });

    describe("fade behavior", () => {
        it("fades the hint message out over time via update()", () => {
            startState.onEnter();
            click(START_BUTTON);
            const hintMessage = (startState as any).hintMessage;

            expect(hintMessage.alpha).toBe(1);
            startState.update(1000);
            expect(hintMessage.alpha).toBeCloseTo(0.5);
            startState.update(2000);
            expect(hintMessage.alpha).toBeLessThanOrEqual(0);
        });

        it("does not go negative once fully faded", () => {
            startState.onEnter();
            click(START_BUTTON);
            const hintMessage = (startState as any).hintMessage;

            startState.update(5000);
            const alphaAfterFade = hintMessage.alpha;
            startState.update(1000);
            // fade処理はalpha>0のときだけ発生するため、一度0以下になったら変化しない
            expect(hintMessage.alpha).toBe(alphaAfterFade);
        });
    });

    describe("practice button", () => {
        it("exists and is labeled with the practice catalog text", () => {
            const practiceButton = (startState as any).practiceButton;
            expect(practiceButton).toBeDefined();
            expect(practiceButton.buttonText.text).toBe(t("button.practice"));
        });

        it("refreshes its label when the language is toggled via the lang button", () => {
            startState.onEnter();
            const practiceButton = (startState as any).practiceButton;
            expect(practiceButton.buttonText.text).toBe("れんしゅう");

            (startState as any).lineDrawer.emit(
                "loopAreaCompleted",
                loopAround(LANG_BUTTON),
            );

            expect(practiceButton.buttonText.text).toBe("Practice");
        });

        it("transitions to PracticeSelectState when the practice button is loop-selected", async () => {
            startState.onEnter();
            // fadeOut/waitはPIXI.Tickerと実時間に依存するため、遷移確認用に即時解決に差し替える
            (startState as any).fadeOut = vi.fn().mockResolvedValue(undefined);
            (startState as any).wait = vi.fn().mockResolvedValue(undefined);

            (startState as any).lineDrawer.emit(
                "loopAreaCompleted",
                loopAround(PRACTICE_BUTTON),
            );

            await vi.waitFor(() => {
                expect(manager.setState).toHaveBeenCalledTimes(1);
            });
            expect(PracticeSelectState).toHaveBeenCalledWith(manager);
            expect(manager.setState).toHaveBeenCalledWith(
                expect.any(PracticeSelectState),
            );
        });

        it("does not transition when the loop encloses empty space", async () => {
            startState.onEnter();
            (startState as any).fadeOut = vi.fn().mockResolvedValue(undefined);
            (startState as any).wait = vi.fn().mockResolvedValue(undefined);

            (startState as any).lineDrawer.emit(
                "loopAreaCompleted",
                loopAround(FAR_AWAY),
            );

            await Promise.resolve();
            expect(manager.setState).not.toHaveBeenCalled();
        });
    });

    describe("practice button hidden when there is nothing worth practicing", () => {
        it("is not created when at most level 1 has ever been reached", () => {
            store["loopgame.maxLevel"] = "1";
            const hiddenState = new StartState(manager as any);

            expect((hiddenState as any).practiceButton).toBeNull();
        });

        it("is not created when no stage has ever been reached", () => {
            delete store["loopgame.maxLevel"];
            const hiddenState = new StartState(manager as any);

            expect((hiddenState as any).practiceButton).toBeNull();
        });

        it("falls back to the 2-button layout, with start taking the vacated slot", () => {
            store["loopgame.maxLevel"] = "1";
            const hiddenState = new StartState(manager as any);

            const startButton = (hiddenState as any).startButton;
            const ruleButton = (hiddenState as any).ruleButton;
            expect(ruleButton.x).toBe(RULE_BUTTON.x);
            expect(startButton.x).toBe(PRACTICE_BUTTON.x);
        });

        it("is created again once a second level has been reached", () => {
            store["loopgame.maxLevel"] = "2";
            const shownState = new StartState(manager as any);

            expect((shownState as any).practiceButton).not.toBeNull();
        });

        it("does not throw when navigating away with no practice button present", async () => {
            store["loopgame.maxLevel"] = "1";
            const hiddenState = new StartState(manager as any);
            hiddenState.onEnter();
            (hiddenState as any).fadeOut = vi.fn().mockResolvedValue(undefined);
            (hiddenState as any).wait = vi.fn().mockResolvedValue(undefined);

            // このレイアウトではstartボタンが空いたPRACTICE_BUTTONの位置に来る
            (hiddenState as any).lineDrawer.emit(
                "loopAreaCompleted",
                loopAround(PRACTICE_BUTTON),
            );

            await vi.waitFor(() => {
                expect(manager.setState).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe("language responsiveness", () => {
        it("shows the hint text in English when the language mode is English", () => {
            setLang("en");
            startState.onEnter();
            click(START_BUTTON);

            expect((startState as any).hintMessage.text).toBe(
                t("hint.drawLoop"),
            );
            expect((startState as any).hintMessage.text).toMatch(/loop/i);
        });

        it("shows the hint text in Japanese when the language mode is Japanese", () => {
            setLang("ja");
            startState.onEnter();
            click(START_BUTTON);

            expect((startState as any).hintMessage.text).toBe(
                t("hint.drawLoop"),
            );
        });
    });
});
