import { describe, it, expect } from "vitest";
import { selectDisplayStages } from "../../../src/scripts/utils/PracticeStages";

describe("selectDisplayStages", () => {
    it("returns an empty array when maxLevel is 0", () => {
        expect(selectDisplayStages(0, [], 10)).toEqual([]);
    });

    it("returns an empty array when maxLevel is negative/garbage", () => {
        expect(selectDisplayStages(-5, [], 10)).toEqual([]);
    });

    it("returns an empty array when maxCount is 0", () => {
        expect(selectDisplayStages(10, [], 0)).toEqual([]);
    });

    it("returns an empty array when maxCount is negative", () => {
        expect(selectDisplayStages(10, [], -3)).toEqual([]);
    });

    it("returns all normal-stage entries when under the limit and no bonus levels", () => {
        expect(selectDisplayStages(3, [], 10)).toEqual([
            { level: 1, isBonus: false },
            { level: 2, isBonus: false },
            { level: 3, isBonus: false },
        ]);
    });

    it("appends a single bonus entry after all normal entries when a bonus level exists", () => {
        expect(selectDisplayStages(5, [5], 10)).toEqual([
            { level: 1, isBonus: false },
            { level: 2, isBonus: false },
            { level: 3, isBonus: false },
            { level: 4, isBonus: false },
            { level: 5, isBonus: false },
            { level: 5, isBonus: true },
        ]);
    });

    it("places the bonus entry at the very end, even when its level is well below maxLevel", () => {
        // 5面クリア時点でボーナスを解放しても、16面まで進んだあとの表示では
        // 5面の直後ではなく、常に一覧の一番最後(16面の次)に置かれる
        expect(selectDisplayStages(16, [5], 20)).toEqual([
            { level: 1, isBonus: false },
            { level: 2, isBonus: false },
            { level: 3, isBonus: false },
            { level: 4, isBonus: false },
            { level: 5, isBonus: false },
            { level: 6, isBonus: false },
            { level: 7, isBonus: false },
            { level: 8, isBonus: false },
            { level: 9, isBonus: false },
            { level: 10, isBonus: false },
            { level: 11, isBonus: false },
            { level: 12, isBonus: false },
            { level: 13, isBonus: false },
            { level: 14, isBonus: false },
            { level: 15, isBonus: false },
            { level: 16, isBonus: false },
            { level: 5, isBonus: true },
        ]);
    });

    it("ignores bonus levels greater than maxLevel", () => {
        expect(selectDisplayStages(3, [5], 10)).toEqual([
            { level: 1, isBonus: false },
            { level: 2, isBonus: false },
            { level: 3, isBonus: false },
        ]);
    });

    it("consolidates multiple reached bonus levels into a single entry for the latest (highest) one", () => {
        // 5, 10, 15面でそれぞれボーナスに到達していても、選択画面には
        // 最新(最も高いレベル)の1つだけをまとめて表示する
        expect(selectDisplayStages(16, [5, 10, 15], 20)).toEqual([
            { level: 1, isBonus: false },
            { level: 2, isBonus: false },
            { level: 3, isBonus: false },
            { level: 4, isBonus: false },
            { level: 5, isBonus: false },
            { level: 6, isBonus: false },
            { level: 7, isBonus: false },
            { level: 8, isBonus: false },
            { level: 9, isBonus: false },
            { level: 10, isBonus: false },
            { level: 11, isBonus: false },
            { level: 12, isBonus: false },
            { level: 13, isBonus: false },
            { level: 14, isBonus: false },
            { level: 15, isBonus: false },
            { level: 16, isBonus: false },
            { level: 15, isBonus: true },
        ]);
    });

    it("dedupes duplicate bonus levels", () => {
        expect(selectDisplayStages(5, [3, 3, 3], 10)).toEqual([
            { level: 1, isBonus: false },
            { level: 2, isBonus: false },
            { level: 3, isBonus: false },
            { level: 4, isBonus: false },
            { level: 5, isBonus: false },
            { level: 3, isBonus: true },
        ]);
    });

    it("prioritizes the highest levels when the candidate count exceeds maxCount", () => {
        // levels 1..10, no bonus, but only 3 slots -> should keep 8, 9, 10
        expect(selectDisplayStages(10, [], 3)).toEqual([
            { level: 8, isBonus: false },
            { level: 9, isBonus: false },
            { level: 10, isBonus: false },
        ]);
    });

    it("reserves one slot for the bonus entry when trimming, keeping the highest normal levels for the rest", () => {
        // levels 1..5, bonus at 5, maxCount 2 -> 1 normal slot + the bonus slot
        expect(selectDisplayStages(5, [5], 2)).toEqual([
            { level: 5, isBonus: false },
            { level: 5, isBonus: true },
        ]);
    });

    it("always keeps the bonus entry, even if it means showing no normal stages", () => {
        // levels 1..5, bonus at 5, maxCount 1 -> the single consolidated bonus
        // entry always gets its reserved slot
        expect(selectDisplayStages(5, [5], 1)).toEqual([
            { level: 5, isBonus: true },
        ]);
    });

    it("drops low-numbered easy stages first when trimming, keeping the bonus entry at the end", () => {
        // levels 1..6, bonus at 3 and 6 -> consolidated to the latest (6),
        // maxCount 4 -> 3 normal slots (4,5,6) + the bonus slot
        expect(selectDisplayStages(6, [3, 6], 4)).toEqual([
            { level: 4, isBonus: false },
            { level: 5, isBonus: false },
            { level: 6, isBonus: false },
            { level: 6, isBonus: true },
        ]);
    });
});
