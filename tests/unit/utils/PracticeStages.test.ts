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

    it("interleaves bonus entries correctly, sorted ascending with normal before bonus on ties", () => {
        expect(selectDisplayStages(5, [5], 10)).toEqual([
            { level: 1, isBonus: false },
            { level: 2, isBonus: false },
            { level: 3, isBonus: false },
            { level: 4, isBonus: false },
            { level: 5, isBonus: false },
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

    it("dedupes duplicate bonus levels", () => {
        expect(selectDisplayStages(5, [3, 3, 3], 10)).toEqual([
            { level: 1, isBonus: false },
            { level: 2, isBonus: false },
            { level: 3, isBonus: false },
            { level: 3, isBonus: true },
            { level: 4, isBonus: false },
            { level: 5, isBonus: false },
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

    it("keeps both normal and bonus entries for a high level when both fit", () => {
        // levels 1..5, bonus at 5, maxCount 2 -> normal(5) and bonus(5) both fit
        expect(selectDisplayStages(5, [5], 2)).toEqual([
            { level: 5, isBonus: false },
            { level: 5, isBonus: true },
        ]);
    });

    it("prefers normal over bonus when only one slot is available at the cutoff level", () => {
        // levels 1..5, bonus at 5, maxCount 1 -> only normal(5) fits (normal before bonus)
        expect(selectDisplayStages(5, [5], 1)).toEqual([
            { level: 5, isBonus: false },
        ]);
    });

    it("drops low-numbered easy stages first when trimming, keeping bonus stages near the cutoff", () => {
        // levels 1..6, bonus at 3 and 6, maxCount 4
        // priority order (desc by level, normal before bonus): 6,6b,5,4,3,3b,2,1
        // keep first 4: 6,6b,5,4 -> sorted ascending: 4,5,6,6b
        expect(selectDisplayStages(6, [3, 6], 4)).toEqual([
            { level: 4, isBonus: false },
            { level: 5, isBonus: false },
            { level: 6, isBonus: false },
            { level: 6, isBonus: true },
        ]);
    });
});
