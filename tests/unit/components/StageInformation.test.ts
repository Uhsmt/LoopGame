import { describe, it, expect } from "vitest";
import { StageInformation } from "../../../src/scripts/components/StageInformation";

describe("StageInformation", () => {
    describe("constructor", () => {
        it("should load level 1 config from stage-config.json", () => {
            const si = new StageInformation();

            expect(si.level).toBe(1);
            expect(si.stageTime).toBe(60);
            expect(si.needCount).toBe(6);
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
            expect(si.obstacles).toEqual([]);
        });
    });

    describe("next", () => {
        it("should advance to the next level config", () => {
            const si = new StageInformation();
            si.next();

            expect(si.level).toBe(2);
            expect(si.needCount).toBe(8);
            expect(si.butterflySize).toBe("small");
            expect(si.butterflyColors).toHaveLength(2);
            expect(si.helpObjectNum).toBe(1);
        });

        it("should apply multi-butterfly keys once configs define them (level 5)", () => {
            const si = new StageInformation();
            while (si.level < 5) {
                si.next();
            }

            expect(si.multipleButterflyRate).toBeCloseTo(0.1);
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

        it("should follow the needCount progression defined for Lv1-20", () => {
            // 設計書§5.1: 6,8,10,10,12,14,14,16,16,18,18,20,20,22,22,22,24,24,24,24
            const expectedNeedCounts = [
                6, 8, 10, 10, 12, 14, 14, 16, 16, 18, 18, 20, 20, 22, 22, 22,
                24, 24, 24, 24,
            ];
            const si = new StageInformation();
            const actual: number[] = [si.needCount];
            while (si.level < 20) {
                si.next();
                actual.push(si.needCount);
            }
            expect(actual).toEqual(expectedNeedCounts);
        });

        it("should stay obstacle-free through the pre-catapy stages (Lv1-8)", () => {
            const si = new StageInformation();
            expect(si.obstacles).toEqual([]);

            while (si.level < 8) {
                si.next();
                expect(si.obstacles).toEqual([]);
            }
        });

        it("should follow the per-level obstacle set defined for Lv9-20 (not cumulative)", () => {
            // 設計書§5.1のお邪魔列。レベルが上がるほど種類が増える単調増加ではなく、
            // ステージごとに指定された組み合わせに切り替わる
            const expectedObstacles: Record<number, string[]> = {
                9: ["catapy"],
                10: ["catapy"],
                11: ["bee"],
                12: ["catapy", "bee"],
                13: ["spider"],
                14: ["bee", "spider"],
                15: ["catapy"],
                16: ["bee"],
                17: ["spider"],
                18: ["catapy", "bee"],
                19: ["bee", "spider"],
                20: ["catapy", "bee"],
            };
            const si = new StageInformation();
            while (si.level < 20) {
                si.next();
                expect(si.obstacles).toEqual(expectedObstacles[si.level] ?? []);
            }
        });

        it("should keep obstacles through a bonus stage for the next stage", () => {
            const si = new StageInformation();
            while (si.level < 9) {
                si.next();
            }
            si.bonusStage();
            expect(si.obstacles).toEqual(["catapy"]);

            si.next();
            expect(si.obstacles).toEqual(["catapy"]);
        });

        it("should keep the extra band's base setup identical to Lv20 across levels", () => {
            // 設計書§5.3: Lv21以降はLv20の構成を引き継ぎ、needCountとobstaclesのみ変わる
            const si = new StageInformation();
            while (si.level < 20) {
                si.next();
            }
            const lv20 = {
                butterflyColorNumCount: si.butterflyColors.length,
                stageButterflyCount: si.stageButterflyCount,
                butterflySize: si.butterflySize,
                isButterflyColorChange: si.isButterflyColorChange,
                multipleButterflyRate: si.multipleButterflyRate,
                maxMultipleRate: si.maxMultipleRate,
                helpObjectNum: si.helpObjectNum,
            };

            while (si.level < 25) {
                si.next();
                expect(si.butterflyColors.length).toBe(
                    lv20.butterflyColorNumCount,
                );
                expect(si.stageButterflyCount).toBe(lv20.stageButterflyCount);
                expect(si.butterflySize).toBe(lv20.butterflySize);
                expect(si.isButterflyColorChange).toBe(
                    lv20.isButterflyColorChange,
                );
                expect(si.multipleButterflyRate).toBe(
                    lv20.multipleButterflyRate,
                );
                expect(si.maxMultipleRate).toBe(lv20.maxMultipleRate);
                expect(si.helpObjectNum).toBe(lv20.helpObjectNum);
            }
        });

        it("should switch to 3 simultaneous obstacle types from Lv21 (extra band)", () => {
            const si = new StageInformation();
            while (si.level < 21) {
                si.next();
            }
            expect(si.level).toBe(21);
            expect(si.obstacles).toEqual(["catapy", "bee", "spider"]);
        });

        it("should escalate needCount by 24 + 2*(level-20) in the extra band (Lv21, Lv22)", () => {
            const si = new StageInformation();
            while (si.level < 21) {
                si.next();
            }
            expect(si.needCount).toBe(26); // 24 + 2*(21-20)

            si.next();
            expect(si.level).toBe(22);
            expect(si.needCount).toBe(28); // 24 + 2*(22-20)
        });

        it("should still spawn the special butterfly at Lv25 (level % 5 === 0 boundary in the extra band)", () => {
            const si = new StageInformation();
            while (si.level < 25) {
                si.next();
            }
            expect(si.level).toBe(25);
            expect(si.needCount).toBe(34); // 24 + 2*(25-20)
            expect(si.obstacles).toEqual(["catapy", "bee", "spider"]);
            expect(si.hasBonusButterfly).toBe(true);
        });

        it("should generate the same setup for the same level every run", () => {
            const first = new StageInformation();
            while (first.level < 22) {
                first.next();
            }
            const second = new StageInformation();
            while (second.level < 22) {
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
            while (firstRun.level < 21) {
                firstRun.next();
            }
            const firstRunNeedCount = firstRun.needCount;

            const secondRun = new StageInformation();
            while (secondRun.level < 21) {
                secondRun.next();
            }
            expect(secondRun.needCount).toBe(firstRunNeedCount);
        });
    });

    describe("isFirstAppearanceStage", () => {
        it("should be true for catapy at Lv9 (its first stage-config appearance)", () => {
            const si = new StageInformation();
            while (si.level < 9) {
                si.next();
            }
            expect(si.level).toBe(9);
            expect(si.isFirstAppearanceStage("catapy")).toBe(true);
        });

        it("should be true for bee at Lv11 and spider at Lv13 (their first appearances)", () => {
            const si = new StageInformation();
            while (si.level < 11) {
                si.next();
            }
            expect(si.isFirstAppearanceStage("bee")).toBe(true);

            while (si.level < 13) {
                si.next();
            }
            expect(si.isFirstAppearanceStage("spider")).toBe(true);
        });

        it("should be false for catapy at Lv12, even though catapy is present again", () => {
            const si = new StageInformation();
            while (si.level < 12) {
                si.next();
            }
            expect(si.obstacles).toContain("catapy");
            expect(si.isFirstAppearanceStage("catapy")).toBe(false);
        });

        it("should be false for every obstacle type in the extra band (Lv21+)", () => {
            const si = new StageInformation();
            while (si.level < 21) {
                si.next();
            }
            expect(si.level).toBe(21);
            expect(si.obstacles).toEqual(["catapy", "bee", "spider"]);
            expect(si.isFirstAppearanceStage("catapy")).toBe(false);
            expect(si.isFirstAppearanceStage("bee")).toBe(false);
            expect(si.isFirstAppearanceStage("spider")).toBe(false);
        });

        it("should be false for a type not present in the stage's obstacles at all", () => {
            const si = new StageInformation();
            while (si.level < 9) {
                si.next();
            }
            expect(si.isFirstAppearanceStage("bee")).toBe(false);
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
