import { describe, it, expect } from "vitest";
import { StageInformation } from "../../../src/scripts/components/StageInformation";

describe("StageInformation", () => {
    describe("constructor", () => {
        it("should load level 1 config from stage-config.json", () => {
            const si = new StageInformation();

            expect(si.level).toBe(1);
            expect(si.stageTime).toBe(60);
            expect(si.needCount).toBe(8);
            expect(si.stageButterflyCount).toBe(8);
            expect(si.butterflySize).toBe("large");
            expect(si.isButterflyColorChange).toBe(false);
            expect(si.butterflyColors).toHaveLength(2);
            expect(si.captureCount).toBe(0);
            expect(si.stagePoint).toBe(0);
        });

        it("should keep defaults for keys absent in early stage configs", () => {
            const si = new StageInformation();

            expect(si.multipleButterflyRate).toBe(0);
            expect(si.maxMultipleRate).toBe(1);
            expect(si.helpObjectNum).toBe(0);
        });
    });

    describe("next", () => {
        it("should advance to the next level config", () => {
            const si = new StageInformation();
            si.next();

            expect(si.level).toBe(2);
            expect(si.needCount).toBe(10);
            expect(si.butterflySize).toBe("medium");
            expect(si.butterflyColors).toHaveLength(3);
        });

        it("should apply multi-butterfly keys once configs define them (level 6)", () => {
            const si = new StageInformation();
            while (si.level < 6) {
                si.next();
            }

            expect(si.multipleButterflyRate).toBeCloseTo(0.15);
            expect(si.maxMultipleRate).toBe(2);
            expect(si.helpObjectNum).toBe(2);
        });

        it("should set hasBonusButterfly on every 5th level", () => {
            const si = new StageInformation();
            while (si.level < 5) {
                si.next();
            }
            expect(si.hasBonusButterfly).toBe(true);

            si.next();
            expect(si.hasBonusButterfly).toBe(false);
        });

        it("should keep stages up to the final configured level obstacle-free", () => {
            const si = new StageInformation();
            expect(si.obstacles).toEqual([]);

            while (si.level < 10) {
                si.next();
                expect(si.obstacles).toEqual([]);
            }
        });

        it("should add obstacle types progressively from level 11", () => {
            const si = new StageInformation();
            while (si.level < 11) {
                si.next();
            }
            expect(si.obstacles).toEqual(["bee"]);

            si.next(); // level 12
            expect(si.obstacles).toEqual(["bee"]);

            si.next(); // level 13
            expect(si.obstacles).toEqual(["bee", "spider"]);

            si.next(); // level 14
            expect(si.obstacles).toEqual(["bee", "spider"]);

            si.next(); // level 15
            expect(si.obstacles).toEqual(["bee", "spider", "catapy"]);

            while (si.level < 20) {
                si.next();
            }
            expect(si.obstacles).toEqual(["bee", "spider", "catapy"]);
        });

        it("should keep obstacles through a bonus stage for the next stage", () => {
            const si = new StageInformation();
            while (si.level < 11) {
                si.next();
            }
            si.bonusStage();
            expect(si.obstacles).toEqual(["bee"]);

            si.next();
            expect(si.obstacles).toEqual(["bee"]);
        });

        it("should keep escalating needCount by 2 beyond the final level", () => {
            const si = new StageInformation();
            while (si.level < 11) {
                si.next();
            }
            const overflowNeedCount = si.needCount;

            si.next(); // level 12: +2 every overflow level
            expect(si.needCount).toBe(overflowNeedCount + 2);
        });

        it("should generate varied but valid stage setups beyond the final level", () => {
            const si = new StageInformation();
            const setups: string[] = [];
            while (si.level < 30) {
                si.next();
                if (si.level > 10) {
                    expect(si.butterflyColors.length).toBeGreaterThanOrEqual(2);
                    expect(si.butterflyColors.length).toBeLessThanOrEqual(5);
                    expect(si.stageButterflyCount).toBeGreaterThanOrEqual(8);
                    expect(si.stageButterflyCount).toBeLessThanOrEqual(20);
                    expect(si.multipleButterflyRate).toBeGreaterThanOrEqual(
                        0.05,
                    );
                    expect(si.multipleButterflyRate).toBeLessThanOrEqual(0.3);
                    expect(si.maxMultipleRate).toBeGreaterThanOrEqual(2);
                    expect(si.maxMultipleRate).toBeLessThanOrEqual(3);
                    expect(si.helpObjectNum).toBeGreaterThanOrEqual(2);
                    expect(si.helpObjectNum).toBeLessThanOrEqual(6);
                    setups.push(
                        [
                            si.butterflyColors.length,
                            si.stageButterflyCount,
                            si.butterflySize,
                            si.isButterflyColorChange,
                        ].join("/"),
                    );
                }
            }
            // 全レベルが同じ構成にならないこと(散らばり)
            expect(new Set(setups).size).toBeGreaterThanOrEqual(4);
        });

        it("should generate the same setup for the same level every run", () => {
            const first = new StageInformation();
            while (first.level < 13) {
                first.next();
            }
            const second = new StageInformation();
            while (second.level < 13) {
                second.next();
            }
            expect(second.stageButterflyCount).toBe(first.stageButterflyCount);
            expect(second.butterflySize).toBe(first.butterflySize);
            expect(second.isButterflyColorChange).toBe(
                first.isButterflyColorChange,
            );
            expect(second.multipleButterflyRate).toBe(
                first.multipleButterflyRate,
            );
            expect(second.needCount).toBe(first.needCount);
        });

        it("should not mutate the shared config across game runs", () => {
            // 1周目でレベル上限を超えても、2周目(新インスタンス)の同レベルの
            // 必要数が変わってはいけない
            const firstRun = new StageInformation();
            while (firstRun.level < 11) {
                firstRun.next();
            }
            const firstRunNeedCount = firstRun.needCount;

            const secondRun = new StageInformation();
            while (secondRun.level < 11) {
                secondRun.next();
            }
            expect(secondRun.needCount).toBe(firstRunNeedCount);
        });
    });

    describe("calcScore", () => {
        it("should mark clear and add bonus when captureCount exceeds needCount", () => {
            const si = new StageInformation();
            si.captureCount = si.needCount + 3;
            si.stagePoint = 500;

            si.calcScore();

            expect(si.isClear).toBe(true);
            expect(si.bonusCount).toBe(3);
            expect(si.bonusPoint).toBe(300);
            expect(si.stageTotalScore).toBe(800);
            expect(si.totalScore).toBe(800);
        });

        it("should not clear nor add bonus when captureCount is short", () => {
            const si = new StageInformation();
            si.captureCount = si.needCount - 1;
            si.stagePoint = 200;

            si.calcScore();

            expect(si.isClear).toBe(false);
            expect(si.bonusCount).toBe(0);
            expect(si.stageTotalScore).toBe(200);
        });
    });

    describe("bonusStage", () => {
        it("should enter bonus mode with randomized settings in expected ranges", () => {
            const si = new StageInformation();
            si.bonusStage();

            expect(si.bonusFlag).toBe(true);
            expect(si.isClear).toBe(false);
            expect(si.captureCount).toBe(0);
            expect(si.needCount).toBe(-1);
            expect(si.stageTime).toBe(60);
            expect(si.butterflyColors.length).toBeGreaterThanOrEqual(3);
            expect(si.butterflyColors.length).toBeLessThanOrEqual(4);
            expect(si.stageButterflyCount).toBeGreaterThanOrEqual(12);
            expect(si.stageButterflyCount).toBeLessThanOrEqual(18);
            expect(si.multipleButterflyRate).toBeGreaterThanOrEqual(0.15);
            expect(si.multipleButterflyRate).toBeLessThanOrEqual(0.2);
            expect(si.maxMultipleRate).toBe(3);
            expect(si.hasBonusButterfly).toBe(false);
        });
    });
});
