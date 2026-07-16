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
        await vi.advanceTimersByTimeAsync(5000 + 2000);
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

        it("enters the bonus stage instead when a special butterfly was captured", async () => {
            const stageInfo = makeClearStageInfo({ isPractice: false });
            const state = new ResultState(manager as any, stageInfo, true);
            stubResultDisplay(state);

            await runOnEnter(state);

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
    });

    describe("game over", () => {
        it("saves the score and returns to the start menu in normal play", async () => {
            const stageInfo = makeGameOverStageInfo({ isPractice: false });
            const state = new ResultState(manager as any, stageInfo, false);
            stubResultDisplay(state);
            await runOnEnter(state);

            expect(saveResultMock).toHaveBeenCalledWith(stageInfo.totalScore);

            (state as any).fadeOut = vi.fn().mockResolvedValue(undefined);
            (state as any).wait = vi.fn().mockResolvedValue(undefined);
            await (state as any).handleLoopAreaCompleted(hitEverything);

            expect(StartState).toHaveBeenCalledWith(manager);
            expect(PracticeSelectState).not.toHaveBeenCalled();
        });

        it("does not save the score in practice mode and returns to the practice select screen", async () => {
            const stageInfo = makeGameOverStageInfo({ isPractice: true });
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
});
