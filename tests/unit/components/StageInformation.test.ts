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

        it("should reuse the last config with needCount increased by 2 beyond the final level", () => {
            const si = new StageInformation();
            while (si.level < 10) {
                si.next();
            }
            const lastStageValues = {
                stageButterflyCount: si.stageButterflyCount,
                butterflySize: si.butterflySize,
            };

            si.next(); // level 11: beyond the last config entry
            const overflowNeedCount = si.needCount;
            expect(si.level).toBe(11);
            expect(si.stageButterflyCount).toBe(
                lastStageValues.stageButterflyCount,
            );
            expect(si.butterflySize).toBe(lastStageValues.butterflySize);

            si.next(); // level 12: +2 every overflow level
            expect(si.needCount).toBe(overflowNeedCount + 2);
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
