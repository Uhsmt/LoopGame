import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// AudioManagerは実際の再生処理を避けるためモックする
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

const { saveResultMock } = vi.hoisted(() => ({ saveResultMock: vi.fn() }));
vi.mock("../../../src/scripts/utils/ScoreStorage", () => ({
    saveResult: saveResultMock,
}));

// DreamFlightPathは軌道計算そのものは検証済み(DreamFlightPath.test.ts)なので、
// ここではコンストラクタに渡された引数(出発座標)だけを捕捉できるスタブにする
const { dreamFlightPathCtorMock } = vi.hoisted(() => ({
    dreamFlightPathCtorMock: vi.fn(),
}));
vi.mock("../../../src/scripts/utils/DreamFlightPath", () => ({
    DreamFlightPath: class {
        x = 0;
        y = 0;
        done = false;
        constructor(options: unknown) {
            dreamFlightPathCtorMock(options);
        }
        step() {
            /* noop */
        }
    },
}));

// 遷移先のシーンは重い依存を持つため、コンストラクタだけを検証できるスタブにする
vi.mock("../../../src/scripts/scenes/GameplayState", () => ({
    GameplayState: vi.fn(),
}));
vi.mock("../../../src/scripts/scenes/StartState", () => ({
    StartState: vi.fn(),
}));
vi.mock("../../../src/scripts/scenes/PracticeSelectState", () => ({
    PracticeSelectState: vi.fn(),
}));

import { ResultState } from "../../../src/scripts/scenes/ResultState";
import { StageInformation } from "../../../src/scripts/components/StageInformation";
import { GameplayState } from "../../../src/scripts/scenes/GameplayState";
import { StartState } from "../../../src/scripts/scenes/StartState";
import { PracticeSelectState } from "../../../src/scripts/scenes/PracticeSelectState";
import { t } from "../../../src/scripts/utils/Language";
import * as Utility from "../../../src/scripts/utils/Utility";

// Button/BaseCaptureableObject/StageInformationは実物を使う
// (pixi.jsはグローバルモック: tests/setup/pixi-mock.ts)。

function createMockApp() {
    return {
        screen: { width: 800, height: 600 },
        stage: {
            addChild: vi.fn(),
            removeChild: vi.fn(),
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

function makeClearStageInfo(
    overrides: Partial<StageInformation> = {},
): StageInformation {
    const info = new StageInformation(3);
    info.isClear = true;
    info.captureCount = info.needCount;
    info.totalScore = 1234;
    Object.assign(info, overrides);
    return info;
}

function makeSpecimen(
    overrides: Partial<{
        color: number;
        sizeCategory: "small" | "medium" | "large" | "special";
        isSpecial: boolean;
    }> = {},
) {
    return {
        color: 0xff69b4,
        sizeCategory: "small" as const,
        isSpecial: false,
        ...overrides,
    };
}

function makeGameOverStageInfo(
    overrides: Partial<StageInformation> = {},
): StageInformation {
    const info = new StageInformation(3);
    info.isClear = false;
    info.totalScore = 500;
    Object.assign(info, overrides);
    return info;
}

// ループが画面全体を囲んだ状態を再現する(唯一のボタンだけが対象になる)
const hitEverything = { containsPoint: () => true } as any;

describe("ResultState", () => {
    let app: ReturnType<typeof createMockApp>;
    let manager: ReturnType<typeof createMockManager>;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        saveResultMock.mockReturnValue({
            isNewRecord: false,
            previousBest: null,
        });
        app = createMockApp();
        manager = createMockManager(app);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // displayStageResult()はPIXI.Tickerの実アニメーション完了を待つため、
    // このテストではその部分を検証対象外として即時解決に差し替える
    function stubResultDisplay(state: ResultState): void {
        (state as any).displayStageResult = vi
            .fn()
            .mockResolvedValue(undefined);
    }

    async function runOnEnter(state: ResultState): Promise<void> {
        const promise = state.onEnter();
        // ノート型は結果表示が2秒長い(7000ms)ため、両方のパスをまかなえる
        // 長さまで進める(displayStageResultはstubResultDisplayでモック
        // 済みなので、余分に進めても後続の状態遷移には影響しない)
        await vi.advanceTimersByTimeAsync(7000 + 2000);
        await promise;
    }

    describe("clearing a stage in normal play", () => {
        it("advances to the next stage without saving a score", async () => {
            const stageInfo = makeClearStageInfo({ isPractice: false });
            const state = new ResultState(manager as any, stageInfo, false);
            stubResultDisplay(state);

            await runOnEnter(state);

            expect(saveResultMock).not.toHaveBeenCalled();
            expect(stageInfo.level).toBe(4);
            expect(GameplayState).toHaveBeenCalledWith(manager, stageInfo);
            expect(manager.setState).toHaveBeenCalledWith(
                expect.any(GameplayState),
            );
        });

        it("enters the dream/bonus sequence instead when a special butterfly was captured", async () => {
            const stageInfo = makeClearStageInfo({ isPractice: false });
            const state = new ResultState(manager as any, stageInfo, true);
            stubResultDisplay(state);
            // enterDreamSequence()はPIXI.Tickerの実アニメーション(暗転・蝶のフェード)
            // を経由するため、この検証範囲外として即時解決に差し替える
            (state as any).wait = vi.fn().mockResolvedValue(undefined);
            (state as any).fadeIn = vi.fn().mockResolvedValue(undefined);
            (state as any).fadeOut = vi.fn().mockResolvedValue(undefined);

            const promise = state.onEnter();
            // ノート型は結果表示が2秒長い(7000ms)
            await vi.advanceTimersByTimeAsync(7000);
            await promise;

            expect(stageInfo.bonusFlag).toBe(true);
            expect(GameplayState).toHaveBeenCalledWith(manager, stageInfo);
        });
    });

    describe("clearing a stage in practice mode", () => {
        it("does not advance to the next stage or save a score", async () => {
            const stageInfo = makeClearStageInfo({ isPractice: true });
            const state = new ResultState(manager as any, stageInfo, false);
            stubResultDisplay(state);

            await runOnEnter(state);

            expect(saveResultMock).not.toHaveBeenCalled();
            expect(GameplayState).not.toHaveBeenCalled();
            expect(manager.setState).not.toHaveBeenCalled();
            // next()が呼ばれていないのでレベルはそのまま
            expect(stageInfo.level).toBe(3);
            expect((state as any).backToStartButton).toBeDefined();
        });

        it("shows the score message instead of a misleading 'next level' announcement", async () => {
            const stageInfo = makeClearStageInfo({ isPractice: true });
            const state = new ResultState(manager as any, stageInfo, false);
            stubResultDisplay(state);

            await runOnEnter(state);

            const nextMessage = (state as any).nextMessage;
            expect(nextMessage.text).not.toBe(
                t("result.level", { n: stageInfo.level + 1 }),
            );
            expect(nextMessage.text).toBe(
                t("result.yourTotalScore", {
                    score: Utility.formatNumberWithCommas(stageInfo.totalScore),
                }),
            );
        });

        it("returns to the practice select screen (not the start menu) via the back button", async () => {
            const stageInfo = makeClearStageInfo({ isPractice: true });
            const state = new ResultState(manager as any, stageInfo, false);
            stubResultDisplay(state);
            await runOnEnter(state);

            (state as any).fadeOut = vi.fn().mockResolvedValue(undefined);
            (state as any).wait = vi.fn().mockResolvedValue(undefined);
            await (state as any).handleLoopAreaCompleted(hitEverything);

            expect(PracticeSelectState).toHaveBeenCalledWith(manager);
            expect(StartState).not.toHaveBeenCalled();
            expect(manager.setState).toHaveBeenCalledWith(
                expect.any(PracticeSelectState),
            );
        });

        it("never enters the dream/bonus sequence even if a special butterfly was captured", async () => {
            // GameplayState側でスペシャル蝶の出現自体を止めているため通常は
            // 起こらないが、万一isGotBonusButterfly=trueで渡ってきても
            // プラクティスモードでは夢演出・ボーナス突入をしないことを保証する
            const stageInfo = makeClearStageInfo({ isPractice: true });
            const state = new ResultState(manager as any, stageInfo, true);
            stubResultDisplay(state);

            await runOnEnter(state);

            expect(stageInfo.bonusFlag).toBe(false);
            expect(GameplayState).not.toHaveBeenCalled();
            expect(manager.setState).not.toHaveBeenCalled();
            expect((state as any).backToStartButton).toBeDefined();
        });
    });

    describe("game over (retry already used)", () => {
        it("saves the score and returns to the start menu in normal play", async () => {
            const stageInfo = makeGameOverStageInfo({
                isPractice: false,
                retryUsed: true,
            });
            const state = new ResultState(manager as any, stageInfo, false);
            stubResultDisplay(state);
            await runOnEnter(state);

            expect(saveResultMock).toHaveBeenCalledWith(stageInfo.totalScore);
            expect((state as any).retryButton).toBeUndefined();
            expect((state as any).retryHintMessage).toBeUndefined();

            (state as any).fadeOut = vi.fn().mockResolvedValue(undefined);
            (state as any).wait = vi.fn().mockResolvedValue(undefined);
            await (state as any).handleLoopAreaCompleted(hitEverything);

            expect(StartState).toHaveBeenCalledWith(manager);
            expect(PracticeSelectState).not.toHaveBeenCalled();
        });

        it("does not save the score in practice mode and returns to the practice select screen", async () => {
            const stageInfo = makeGameOverStageInfo({
                isPractice: true,
                retryUsed: true,
            });
            const state = new ResultState(manager as any, stageInfo, false);
            stubResultDisplay(state);
            await runOnEnter(state);

            expect(saveResultMock).not.toHaveBeenCalled();

            (state as any).fadeOut = vi.fn().mockResolvedValue(undefined);
            (state as any).wait = vi.fn().mockResolvedValue(undefined);
            await (state as any).handleLoopAreaCompleted(hitEverything);

            expect(PracticeSelectState).toHaveBeenCalledWith(manager);
            expect(StartState).not.toHaveBeenCalled();
        });
    });

    describe("game over (first failure, retry available)", () => {
        it("offers a retry and does not save the score yet in normal play", async () => {
            const stageInfo = makeGameOverStageInfo({ isPractice: false });
            const state = new ResultState(manager as any, stageInfo, false);
            stubResultDisplay(state);
            await runOnEnter(state);

            expect(saveResultMock).not.toHaveBeenCalled();
            expect((state as any).retryButton).toBeDefined();
            expect((state as any).backToStartButton).toBeDefined();
            // 「1回だけ」であることが伝わるヒントを添える
            expect((state as any).retryHintMessage).toBeDefined();
            expect((state as any).retryHintMessage.text).toBe(
                t("result.retryHint"),
            );
        });

        it("never offers a retry in practice mode, even before retryUsed is set", async () => {
            const stageInfo = makeGameOverStageInfo({ isPractice: true });
            const state = new ResultState(manager as any, stageInfo, false);
            stubResultDisplay(state);
            await runOnEnter(state);

            expect((state as any).retryButton).toBeUndefined();
            expect((state as any).backToStartButton).toBeDefined();
            expect((state as any).retryHintMessage).toBeUndefined();
        });

        it("restarts the same level and does not save the score when retry is chosen", async () => {
            const stageInfo = makeGameOverStageInfo({ isPractice: false });
            const totalScoreBeforeRetry = stageInfo.totalScore;
            const state = new ResultState(manager as any, stageInfo, false);
            stubResultDisplay(state);
            await runOnEnter(state);

            (state as any).fadeOut = vi.fn().mockResolvedValue(undefined);
            (state as any).wait = vi.fn().mockResolvedValue(undefined);
            await (state as any).handleLoopAreaCompleted(hitEverything);

            expect(saveResultMock).not.toHaveBeenCalled();
            expect(stageInfo.retryUsed).toBe(true);
            expect(stageInfo.captureCount).toBe(0);
            expect(GameplayState).toHaveBeenCalledWith(manager, stageInfo);
            expect(manager.setState).toHaveBeenCalledWith(
                expect.any(GameplayState),
            );
            // リトライは同じレベルのやり直しなので、失敗分のスコアは
            // 一旦取り消され、totalScoreはリトライ前の水準に戻る
            expect(stageInfo.totalScore).toBeLessThanOrEqual(
                totalScoreBeforeRetry,
            );
        });

        it("saves the final score and returns to the menu when retry is declined", async () => {
            const stageInfo = makeGameOverStageInfo({ isPractice: false });
            const state = new ResultState(manager as any, stageInfo, false);
            stubResultDisplay(state);
            await runOnEnter(state);

            expect(saveResultMock).not.toHaveBeenCalled();

            (state as any).fadeOut = vi.fn().mockResolvedValue(undefined);
            (state as any).wait = vi.fn().mockResolvedValue(undefined);
            // retryButton(画面左寄り)とbackToStartButton(画面右寄り)を
            // 画面中央のx座標で区別し、右側だけを囲んだループを再現する
            const hitRightSideOnly = {
                containsPoint: (p: { x: number }) => p.x > app.screen.width / 2,
            } as any;
            await (state as any).handleLoopAreaCompleted(hitRightSideOnly);

            expect(saveResultMock).toHaveBeenCalledWith(stageInfo.totalScore);
            expect(StartState).toHaveBeenCalledWith(manager);
        });
    });

    describe("notebook-style result (level clear only)", () => {
        // displayLegacyResultと同じ理由(PIXI.Tickerの実アニメーション完了を
        // 待ってしまう)で、displayNotebookResult/enterDreamSequence内の
        // fadeIn/fadeOut/waitは即時解決に差し替える
        function stubAnimations(state: ResultState): void {
            (state as any).fadeIn = vi.fn().mockResolvedValue(undefined);
            (state as any).fadeOut = vi.fn().mockResolvedValue(undefined);
            (state as any).wait = vi.fn().mockResolvedValue(undefined);
            (state as any).slideY = vi.fn().mockResolvedValue(undefined);
        }

        it("routes to displayNotebookResult only when clearing a normal (non-bonus) stage", () => {
            const notebookCase = makeClearStageInfo({
                isPractice: false,
                bonusFlag: false,
            });
            const legacyCases = [
                makeClearStageInfo({ isPractice: true }), // practice clear
                makeClearStageInfo({ bonusFlag: true }), // bonus stage result
                makeGameOverStageInfo({ isPractice: false }), // game over
            ];

            expect(
                (new ResultState(manager as any, notebookCase, false) as any)
                    .isNotebookResult,
            ).toBe(true);

            legacyCases.forEach((stageInfo) => {
                expect(
                    (new ResultState(manager as any, stageInfo, false) as any)
                        .isNotebookResult,
                ).toBe(false);
            });
        });

        it("pins one specimen per captured butterfly", async () => {
            const stageInfo = makeClearStageInfo({
                isPractice: false,
                bonusFlag: false,
                capturedSpecimens: [
                    makeSpecimen({ color: 0xdc143c }),
                    makeSpecimen({ color: 0x6a5acd }),
                ],
            });
            const state = new ResultState(manager as any, stageInfo, false);
            stubAnimations(state);

            await (state as any).displayNotebookResult();

            const pinnedCount = (state as any).notebookChildren.filter(
                (child: any) => "butterfly" in child,
            ).length;
            expect(pinnedCount).toBe(2);
            expect((state as any).dreamSpecimen).toBeUndefined();
        });

        it("keeps the special specimen out of notebookChildren and tracks it as dreamSpecimen", async () => {
            const stageInfo = makeClearStageInfo({
                isPractice: false,
                bonusFlag: false,
                capturedSpecimens: [
                    makeSpecimen({}),
                    makeSpecimen({ isSpecial: true }),
                ],
            });
            const state = new ResultState(manager as any, stageInfo, true);
            stubAnimations(state);

            await (state as any).displayNotebookResult();

            expect((state as any).dreamSpecimen).toBeDefined();
            const pinnedInChildren = (state as any).notebookChildren.filter(
                (child: any) => "butterfly" in child,
            );
            expect(pinnedInChildren).toHaveLength(1);
        });

        it("starts the dream flight from the pinned specimen's position, not the screen center", async () => {
            const stageInfo = makeClearStageInfo({
                isPractice: false,
                bonusFlag: false,
                capturedSpecimens: [makeSpecimen({ isSpecial: true })],
            });
            const state = new ResultState(manager as any, stageInfo, true);
            stubAnimations(state);

            await (state as any).displayNotebookResult();
            const dreamSpecimen = (state as any).dreamSpecimen;
            expect(dreamSpecimen).toBeDefined();

            await (state as any).enterDreamSequence();

            expect(dreamFlightPathCtorMock).toHaveBeenCalledTimes(1);
            const options = dreamFlightPathCtorMock.mock.calls[0][0];
            // 旧仕様は常に画面中央(width/2, height/2)から出現していた。
            // 今は捕まえたスペシャル個体のピン留め位置から出発するため、
            // 一致しないはず(ピン留め位置がたまたま中央と重なることはない)
            expect(
                options.centerX === app.screen.width / 2 &&
                    options.centerY === app.screen.height / 2,
            ).toBe(false);
        });
    });
});
