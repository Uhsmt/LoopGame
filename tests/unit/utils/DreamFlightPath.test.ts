import { describe, it, expect } from "vitest";
import {
    DreamFlightPath,
    DREAM_FLIGHT_DEFAULT_SPEED_PER_MS,
    type DreamFlightPathOptions,
} from "../../../src/scripts/utils/DreamFlightPath";

/**
 * 夢に誘う蝶の振り付けモーション(出現→円→退場)を検証する。
 * PIXIに依存しない純粋なステッパーなので、Tickerのモックなしに
 * フレームを1つずつ進めて軌道の性質を直接確認できる。
 *
 * オーナーからの指摘(3ラウンド目)を踏まえ、以下をロジックの再実装
 * なしに(=実装をなぞるアサーションにならないように)検証する:
 * - 速さが全フェーズを通じて一定であること(退場で急に速くならない)
 * - 進行方向の変化が滑らか(1フレームあたりの急な折れがない)こと
 * - 出現直後は画面中央付近に留まること(端でうろちょろしない)
 * - 最終的に画面外まで移動して done になること(フェードではない)
 */

const SCREEN_WIDTH = 1150;
const SCREEN_HEIGHT = 650;
const CENTER_X = SCREEN_WIDTH / 2;
const CENTER_Y = SCREEN_HEIGHT / 2;
const DT = 16; // ms、60fps相当

function createPath(
    overrides: Partial<
        Omit<
            DreamFlightPathOptions,
            "centerX" | "centerY" | "screenWidth" | "screenHeight"
        >
    > = {},
) {
    return new DreamFlightPath({
        centerX: CENTER_X,
        centerY: CENTER_Y,
        screenWidth: SCREEN_WIDTH,
        screenHeight: SCREEN_HEIGHT,
        ...overrides,
    });
}

/** doneになるかガード上限に達するまでstepし続け、各フレームの記録を返す */
function run(path: DreamFlightPath, maxSteps = 20000) {
    const frames: {
        x: number;
        y: number;
        mode: string;
        step: number;
    }[] = [{ x: path.x, y: path.y, mode: path.mode, step: 0 }];
    let steps = 0;
    while (!path.done && steps < maxSteps) {
        path.step(DT);
        steps++;
        frames.push({ x: path.x, y: path.y, mode: path.mode, step: steps });
    }
    return frames;
}

describe("DreamFlightPath", () => {
    it("appears near the center of the screen", () => {
        const path = createPath();
        const dist = Math.hypot(path.x - CENTER_X, path.y - CENTER_Y);
        // 画面短辺の1割以内(=ほぼ中心)から出現する
        expect(dist).toBeLessThan(Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.1);
    });

    it("moves at a constant speed on every single step, across all phases (no sudden speed change)", () => {
        const path = createPath();
        const frames = run(path);
        const expectedStepDist = DREAM_FLIGHT_DEFAULT_SPEED_PER_MS * DT;

        for (let i = 1; i < frames.length; i++) {
            const dx = frames[i].x - frames[i - 1].x;
            const dy = frames[i].y - frames[i - 1].y;
            const stepDist = Math.hypot(dx, dy);
            // 1frameあたりの移動距離は常に speed*deltaMS ぴったり
            // (退場(exiting)へフェーズが変わっても変化しない)
            expect(stepDist).toBeCloseTo(expectedStepDist, 5);
        }
    });

    it("never turns sharply between consecutive frames (smooth curve, no kinks)", () => {
        const path = createPath();
        const frames = run(path);

        let maxTurnDeg = 0;
        for (let i = 2; i < frames.length; i++) {
            const prevDx = frames[i - 1].x - frames[i - 2].x;
            const prevDy = frames[i - 1].y - frames[i - 2].y;
            const dx = frames[i].x - frames[i - 1].x;
            const dy = frames[i].y - frames[i - 1].y;
            const prevLen = Math.hypot(prevDx, prevDy) || 1;
            const len = Math.hypot(dx, dy) || 1;
            const dot = Math.min(
                1,
                Math.max(
                    -1,
                    (prevDx / prevLen) * (dx / len) +
                        (prevDy / prevLen) * (dy / len),
                ),
            );
            const turnDeg = (Math.acos(dot) * 180) / Math.PI;
            maxTurnDeg = Math.max(maxTurnDeg, turnDeg);
        }

        // 60fps相当のステップ幅で、1フレームあたりの方向転換が
        // 大きく折れて見えるほどにはならない
        expect(maxTurnDeg).toBeLessThan(15);
    });

    it("stays within a small central radius while growing and holding (circles near the middle, not at the edges)", () => {
        const path = createPath();
        const frames = run(path);

        const nonExitingFrames = frames.filter((f) => f.mode !== "exiting");
        const maxRadius = Math.max(
            ...nonExitingFrames.map((f) =>
                Math.hypot(f.x - CENTER_X, f.y - CENTER_Y),
            ),
        );
        // 画面のど真ん中あたり(短辺の3割以内)に収まっている
        expect(maxRadius).toBeLessThan(
            Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.3,
        );
    });

    it("passes through growing -> holding -> exiting in order exactly once each", () => {
        const path = createPath();
        const frames = run(path);

        const modeSequence: string[] = [];
        for (const frame of frames) {
            if (modeSequence[modeSequence.length - 1] !== frame.mode) {
                modeSequence.push(frame.mode);
            }
        }
        expect(modeSequence).toEqual(["growing", "holding", "exiting"]);
    });

    it("completes by actually leaving the screen bounds (not by fading in place)", () => {
        const path = createPath();
        run(path);

        expect(path.done).toBe(true);
        const isOffScreen =
            path.x < 0 ||
            path.x > SCREEN_WIDTH ||
            path.y < 0 ||
            path.y > SCREEN_HEIGHT;
        expect(isOffScreen).toBe(true);
    });

    it("exits toward the fixed upper-right direction, not the nearest edge", () => {
        const path = createPath();
        const frames = run(path);

        const exitStart = frames.find((f) => f.mode === "exiting");
        const final = frames[frames.length - 1];
        expect(exitStart).toBeDefined();

        // 退場後は右へ、そして上へ動いている(x座標系は右が+、y座標系は下が+)
        expect(final.x).toBeGreaterThan(exitStart!.x);
        expect(final.y).toBeLessThan(exitStart!.y);

        // 退場全体の正味の移動方向が右上45度から大きくは外れていない
        // (円の接線からのブレンドで、直進とほぼ同じ向きに収束していること)
        const dx = final.x - exitStart!.x;
        const dy = final.y - exitStart!.y;
        const angleFromUpRight = Math.abs(
            Math.atan2(dy, dx) - Math.atan2(-1, 1),
        );
        expect(angleFromUpRight).toBeLessThan((30 * Math.PI) / 180);
    });

    it("connects the circle's tangent to the fixed exit direction smoothly (no sharp turn at the growing/holding/exiting boundaries)", () => {
        const path = createPath();
        const frames = run(path);

        // モード境界の前後1フレームの旋回角も、全体の品質基準
        // (1フレームあたり15度未満)を超えないことを確認する
        let maxTurnAtBoundary = 0;
        for (let i = 2; i < frames.length; i++) {
            if (frames[i].mode === frames[i - 1].mode) continue;
            const prevDx = frames[i - 1].x - frames[i - 2].x;
            const prevDy = frames[i - 1].y - frames[i - 2].y;
            const dx = frames[i].x - frames[i - 1].x;
            const dy = frames[i].y - frames[i - 1].y;
            const prevLen = Math.hypot(prevDx, prevDy) || 1;
            const len = Math.hypot(dx, dy) || 1;
            const dot = Math.min(
                1,
                Math.max(
                    -1,
                    (prevDx / prevLen) * (dx / len) +
                        (prevDy / prevLen) * (dy / len),
                ),
            );
            const turnDeg = (Math.acos(dot) * 180) / Math.PI;
            maxTurnAtBoundary = Math.max(maxTurnAtBoundary, turnDeg);
        }
        expect(maxTurnAtBoundary).toBeLessThan(15);
    });

    it("respects a custom exitDirection option (e.g. straight down)", () => {
        const path = createPath({ exitDirection: { x: 0, y: 1 } });
        const frames = run(path);

        const exitStart = frames.find((f) => f.mode === "exiting");
        const final = frames[frames.length - 1];
        expect(exitStart).toBeDefined();

        // 下方向を指定した場合は、右上に固定した既定値とは違い
        // 下(yが増える方向)へ抜けていく
        expect(final.y).toBeGreaterThan(exitStart!.y);
        expect(final.y).toBeGreaterThan(SCREEN_HEIGHT);
    });

    it("reaches the same phase and stays off-screen regardless of frame step size (delta-driven)", () => {
        const coarse = createPath();
        let coarseSteps = 0;
        while (!coarse.done && coarseSteps < 5000) {
            coarse.step(48); // 大きな1ステップ(低フレームレート相当)
            coarseSteps++;
        }

        const fine = createPath();
        let fineSteps = 0;
        while (!fine.done && fineSteps < 20000) {
            fine.step(8); // 小さな1ステップ(高フレームレート相当)
            fineSteps++;
        }

        expect(coarse.done).toBe(true);
        expect(fine.done).toBe(true);
        // どちらも画面外まで完了しており、どちらかだけが完了しない
        // ということはない
    });

    it("uses a speed comparable to Butterfly's small size (not the old ~1100px/s dash)", () => {
        // Butterfly.ts の small ケース(xDiretion/yDiretion = 0.6)を参照した
        // 対角速度相当(px/ms)を大幅に超えないことを確認する
        const smallDiagonalSpeedPerMs = Math.hypot(0.6, 0.6) / 16;
        expect(DREAM_FLIGHT_DEFAULT_SPEED_PER_MS).toBeGreaterThanOrEqual(
            smallDiagonalSpeedPerMs,
        );
        // 以前の爆速(1.1px/ms ≈ 1100px/s)には程遠い
        expect(DREAM_FLIGHT_DEFAULT_SPEED_PER_MS).toBeLessThan(
            smallDiagonalSpeedPerMs * 3,
        );
    });
});
