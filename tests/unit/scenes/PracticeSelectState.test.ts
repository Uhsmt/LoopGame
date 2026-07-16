import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// AudioManagerは実際の再生処理(AudioContext/HTMLAudioElement)を避けるためモックする。
// 呼び出し検証で unbound-method 警告にならないよう、vi.hoistedで参照を持っておく
const { playBgmMock, playSeMock } = vi.hoisted(() => ({
    playBgmMock: vi.fn(),
    playSeMock: vi.fn(),
}));
vi.mock("../../../src/scripts/utils/AudioManager", () => ({
    AudioManager: {
        shared: {
            playBgm: playBgmMock,
            playSe: playSeMock,
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

// 遷移先のシーンは重い依存を持つため、コンストラクタだけを検証できるスタブにする
vi.mock("../../../src/scripts/scenes/StartState", () => ({
    StartState: vi.fn(),
}));

vi.mock("../../../src/scripts/scenes/GameplayState", () => ({
    GameplayState: vi.fn(),
}));

// 進行状況の読み出しをテストごとに制御する
vi.mock("../../../src/scripts/utils/ScoreStorage", () => ({
    getMaxLevel: vi.fn(),
    getReachedBonusLevels: vi.fn(),
}));

import { PracticeSelectState } from "../../../src/scripts/scenes/PracticeSelectState";
import { StartState } from "../../../src/scripts/scenes/StartState";
import { GameplayState } from "../../../src/scripts/scenes/GameplayState";
import { StageInformation } from "../../../src/scripts/components/StageInformation";
import {
    getMaxLevel,
    getReachedBonusLevels,
} from "../../../src/scripts/utils/ScoreStorage";
import * as Const from "../../../src/scripts/utils/Const";
import {
    setLang,
    resetLangCache,
    t,
} from "../../../src/scripts/utils/Language";

// Button/BaseCaptureableObject/StageInformation/PracticeStagesは実物を使う
// (pixi.jsはグローバルモック: tests/setup/pixi-mock.ts)。
// leafSprite.height は MockSprite で常に100固定になるため、
// どのボタンも hitAreaSize(当たり判定の半径) は 40 になる
// (MockのscaleはsetがNoopなのでscale値によらず40のまま)。

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

// ボタン中心の周囲(半径50px)を囲むループ。当たり判定円(半径40)の
// 全サンプル点を含み、隣のボタン(125px間隔)の判定点は含まない
const loopAround = (center: { x: number; y: number }) => ({
    containsPoint: (p: { x: number; y: number }) =>
        (p.x - center.x) ** 2 + (p.y - center.y) ** 2 <= 50 * 50,
});

// 800x600のapp.screenでのレイアウト計算と一致させた座標
// グリッド: 列間隔 = (800 - 25*2) / 6 = 125, 1行目のy = 600 * 0.32 = 192
// 行は中央寄せ: x = 400 + (col - (rowCount - 1) / 2) * 125
const BACK_BUTTON = { x: 400, y: 522 }; // (width/2, height*0.87)
const GRID_ROW_Y = 192;

describe("PracticeSelectState", () => {
    let store: Record<string, string>;
    let app: ReturnType<typeof createMockApp>;
    let manager: ReturnType<typeof createMockManager>;

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

        vi.mocked(getMaxLevel).mockReturnValue(0);
        vi.mocked(getReachedBonusLevels).mockReturnValue([]);

        app = createMockApp();
        manager = createMockManager(app);
    });

    afterEach(() => {
        // 注意: test-setup.ts が DEBUG_MODE/BASE_URL をグローバルにstubしているため、
        // vi.unstubAllGlobals() は呼ばない(以降のテストが壊れる)。
        resetLangCache();
    });

    function createState(): PracticeSelectState {
        return new PracticeSelectState(manager as any);
    }

    /** 遷移確認用: PIXI.Tickerと実時間に依存するfadeOut/waitを即時解決に差し替える */
    function stubTransitions(state: PracticeSelectState): void {
        (state as any).fadeOut = vi.fn().mockResolvedValue(undefined);
        (state as any).wait = vi.fn().mockResolvedValue(undefined);
    }

    describe("onEnter", () => {
        it("plays the title BGM", () => {
            const state = createState();
            state.onEnter();
            expect(playBgmMock).toHaveBeenCalledWith(Const.bgmSrcs.title);
        });

        it("renders one button per reached stage, labeled with the level number", () => {
            vi.mocked(getMaxLevel).mockReturnValue(3);
            const state = createState();
            state.onEnter();

            const stageButtons = (state as any).stageButtons;
            expect(stageButtons).toHaveLength(3);
            expect(
                stageButtons.map((sb: any) => sb.button.buttonText.text),
            ).toEqual(["1", "2", "3"]);
            // すべて通常ステージなので葉の色は既定のまま(ボーナス色に変更されていない)
            expect(
                stageButtons.every(
                    (sb: any) => sb.button.leafSprite.tint === 0xffffff,
                ),
            ).toBe(true);
            // ボタンはコンテナに追加されている
            const container = (state as any).container;
            stageButtons.forEach((sb: any) => {
                expect(container.children).toContain(sb.button);
            });
        });

        it("marks reached bonus stages with a distinct label and leaf color", () => {
            vi.mocked(getMaxLevel).mockReturnValue(5);
            vi.mocked(getReachedBonusLevels).mockReturnValue([3]);
            const state = createState();
            state.onEnter();

            const stageButtons = (state as any).stageButtons;
            // 1, 2, 3, 3(ボーナス), 4, 5
            expect(stageButtons).toHaveLength(6);
            const bonusEntries = stageButtons.filter(
                (sb: any) => sb.entry.isBonus,
            );
            expect(bonusEntries).toHaveLength(1);
            expect(bonusEntries[0].entry.level).toBe(3);
            // ラベルは数字ではなく「ボーナス」、葉の色は既定(白=無着色)から変わる
            expect(bonusEntries[0].button.buttonText.text).toBe(
                t("practice.bonusLabel"),
            );
            expect(bonusEntries[0].button.leafSprite.tint).not.toBe(0xffffff);

            // 同じレベルの通常ステージボタンは数字のまま・既定の葉の色のまま
            const normalLevel3 = stageButtons.find(
                (sb: any) => sb.entry.level === 3 && !sb.entry.isBonus,
            );
            expect(normalLevel3.button.buttonText.text).toBe("3");
            expect(normalLevel3.button.leafSprite.tint).toBe(0xffffff);
        });

        it("trims to MAX_STAGE_COUNT by dropping the lowest levels", () => {
            vi.mocked(getMaxLevel).mockReturnValue(30);
            const state = createState();
            state.onEnter();

            const stageButtons = (state as any).stageButtons;
            expect(stageButtons).toHaveLength(
                PracticeSelectState.MAX_STAGE_COUNT,
            );
            expect(stageButtons[0].button.buttonText.text).toBe("13");
            expect(
                stageButtons[stageButtons.length - 1].button.buttonText.text,
            ).toBe("30");
        });

        it("shows only the empty message (and back button) when the player has never played", () => {
            vi.mocked(getMaxLevel).mockReturnValue(0);
            const state = createState();
            expect(() => state.onEnter()).not.toThrow();

            expect((state as any).stageButtons).toHaveLength(0);
            const emptyMessage = (state as any).emptyMessage;
            expect(emptyMessage).not.toBeNull();
            expect(emptyMessage.text).toBe(t("practice.empty"));
            expect((state as any).backButton).toBeDefined();
        });
    });

    describe("loop selection", () => {
        it("returns to StartState when the back button is loop-selected", async () => {
            vi.mocked(getMaxLevel).mockReturnValue(3);
            const state = createState();
            state.onEnter();
            stubTransitions(state);

            (state as any).lineDrawer.emit(
                "loopAreaCompleted",
                loopAround(BACK_BUTTON),
            );

            await vi.waitFor(() => {
                expect(manager.setState).toHaveBeenCalledTimes(1);
            });
            expect(playSeMock).toHaveBeenCalledWith("se_select");
            expect(StartState).toHaveBeenCalledWith(manager);
            expect(manager.setState).toHaveBeenCalledWith(
                expect.any(StartState),
            );
        });

        it("starts a practice run at the selected level (isPractice = true, progress not persisted)", async () => {
            vi.mocked(getMaxLevel).mockReturnValue(3);
            const state = createState();
            state.onEnter();
            stubTransitions(state);

            // 3個のボタンは1行に中央寄せ: x = 275, 400, 525 / y = 192
            // level 2 のボタン(中央)を囲む
            (state as any).lineDrawer.emit(
                "loopAreaCompleted",
                loopAround({ x: 400, y: GRID_ROW_Y }),
            );

            await vi.waitFor(() => {
                expect(manager.setState).toHaveBeenCalledTimes(1);
            });
            expect(playSeMock).toHaveBeenCalledWith("se_select");
            expect(GameplayState).toHaveBeenCalledTimes(1);
            const [passedManager, stageInfo] =
                vi.mocked(GameplayState).mock.calls[0];
            expect(passedManager).toBe(manager);
            expect(stageInfo).toBeInstanceOf(StageInformation);
            expect(stageInfo.level).toBe(2);
            expect(stageInfo.isPractice).toBe(true);
            expect(stageInfo.bonusFlag).toBe(false);
            expect(manager.setState).toHaveBeenCalledWith(
                expect.any(GameplayState),
            );
        });

        it("invokes bonusStage() before entering GameplayState when a bonus entry is selected", async () => {
            vi.mocked(getMaxLevel).mockReturnValue(5);
            vi.mocked(getReachedBonusLevels).mockReturnValue([3]);
            const bonusStageSpy = vi.spyOn(
                StageInformation.prototype,
                "bonusStage",
            );
            const state = createState();
            state.onEnter();
            stubTransitions(state);

            // 6個のボタンは1行に並ぶ: x = 87.5, 212.5, 337.5, 462.5, 587.5, 712.5
            // index 3 = level 3 のボーナスステージ
            (state as any).lineDrawer.emit(
                "loopAreaCompleted",
                loopAround({ x: 462.5, y: GRID_ROW_Y }),
            );

            await vi.waitFor(() => {
                expect(manager.setState).toHaveBeenCalledTimes(1);
            });
            expect(bonusStageSpy).toHaveBeenCalledTimes(1);
            const [, stageInfo] = vi.mocked(GameplayState).mock.calls[0];
            expect(stageInfo.level).toBe(3);
            expect(stageInfo.isPractice).toBe(true);
            expect(stageInfo.bonusFlag).toBe(true);
            expect(stageInfo.needCount).toBe(-1);
        });

        it("does nothing when the loop encloses empty space", async () => {
            vi.mocked(getMaxLevel).mockReturnValue(3);
            const state = createState();
            state.onEnter();
            stubTransitions(state);

            (state as any).lineDrawer.emit(
                "loopAreaCompleted",
                loopAround({ x: 700, y: 400 }),
            );

            await Promise.resolve();
            expect(manager.setState).not.toHaveBeenCalled();
            expect(playSeMock).not.toHaveBeenCalled();
        });

        it("ignores further selections once a transition has started", async () => {
            vi.mocked(getMaxLevel).mockReturnValue(3);
            const state = createState();
            state.onEnter();
            stubTransitions(state);

            (state as any).lineDrawer.emit(
                "loopAreaCompleted",
                loopAround({ x: 400, y: GRID_ROW_Y }),
            );
            (state as any).lineDrawer.emit(
                "loopAreaCompleted",
                loopAround(BACK_BUTTON),
            );

            await vi.waitFor(() => {
                expect(manager.setState).toHaveBeenCalledTimes(1);
            });
            expect(GameplayState).toHaveBeenCalledTimes(1);
            expect(StartState).not.toHaveBeenCalled();
        });
    });

    describe("onExit", () => {
        it("removes and destroys the container and schedules LineDrawer cleanup", () => {
            const state = createState();
            state.onEnter();
            state.onExit();

            expect(app.stage.removeChild).toHaveBeenCalledWith(
                (state as any).container,
            );
            expect((state as any).container.destroyed).toBe(true);
            expect(app.ticker.addOnce).toHaveBeenCalledWith(
                expect.any(Function),
            );

            // addOnceに渡したコールバックがLineDrawerのcleanupを呼ぶ
            const callback = app.ticker.addOnce.mock.calls[0][0];
            callback();
            expect((state as any).lineDrawer.cleanup).toHaveBeenCalled();
        });
    });
});
