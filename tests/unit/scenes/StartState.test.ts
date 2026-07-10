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

import { StartState } from "../../../src/scripts/scenes/StartState";
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
): (event: { global: { x: number; y: number } }) => void {
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
    const START_BUTTON = { x: 200, y: 390 };
    const RULE_BUTTON = { x: 600, y: 390 };
    const LANG_BUTTON = { x: 400, y: 90 };
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

    const click = (point: { x: number; y: number }) => {
        const downHandler = getHandler(app.stage, "pointerdown");
        const upHandler = getHandler(app.stage, "pointerup");
        downHandler({ global: point });
        upHandler({ global: point });
    };

    describe("wiring", () => {
        it("registers pointerdown/pointerup handlers on the stage during onEnter", () => {
            startState.onEnter();
            expect(app.stage.addEventListener).toHaveBeenCalledWith(
                "pointerdown",
                expect.any(Function),
            );
            expect(app.stage.addEventListener).toHaveBeenCalledWith(
                "pointerup",
                expect.any(Function),
            );
        });

        it("removes the pointer handlers on onExit", () => {
            startState.onEnter();
            const downHandler = getHandler(app.stage, "pointerdown");
            const upHandler = getHandler(app.stage, "pointerup");

            startState.onExit();

            expect(app.stage.removeEventListener).toHaveBeenCalledWith(
                "pointerdown",
                downHandler,
            );
            expect(app.stage.removeEventListener).toHaveBeenCalledWith(
                "pointerup",
                upHandler,
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

            downHandler({ global: START_BUTTON });
            upHandler({ global: RULE_BUTTON }); // 400px移動

            expect((startState as any).hintMessage.alpha).toBe(0);
        });

        it("does not show the hint when the press is held too long (not a quick tap)", () => {
            vi.useFakeTimers();
            startState.onEnter();
            const downHandler = getHandler(app.stage, "pointerdown");
            const upHandler = getHandler(app.stage, "pointerup");

            downHandler({ global: START_BUTTON });
            vi.advanceTimersByTime(600);
            upHandler({ global: START_BUTTON });

            expect((startState as any).hintMessage.alpha).toBe(0);
        });

        it("does not show the hint if a loop was completed during the gesture", () => {
            startState.onEnter();
            const downHandler = getHandler(app.stage, "pointerdown");
            const upHandler = getHandler(app.stage, "pointerup");

            downHandler({ global: START_BUTTON });
            // ジェスチャーの途中でループが完成したことをシミュレート
            (startState as any).handleLoopAreaCompleted({
                containsPoint: () => false,
            });
            upHandler({ global: START_BUTTON });

            expect((startState as any).hintMessage.alpha).toBe(0);
        });

        it("ignores pointerup without a preceding pointerdown", () => {
            startState.onEnter();
            const upHandler = getHandler(app.stage, "pointerup");

            expect(() => upHandler({ global: START_BUTTON })).not.toThrow();
            expect((startState as any).hintMessage.alpha).toBe(0);
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

            const hintAddChildCalls = (
                container.addChild
            ).mock.calls.filter((args: any[]) => args[0] === hintMessage);
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
