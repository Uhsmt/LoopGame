import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    getHighScore,
    getLastScore,
    saveResult,
    getMaxLevel,
    getReachedBonusLevels,
    recordProgress,
} from "../../../src/scripts/utils/ScoreStorage";

const HIGH_SCORE_KEY = "loopgame.highScore";
const LAST_SCORE_KEY = "loopgame.lastScore";
const MAX_LEVEL_KEY = "loopgame.maxLevel";
const MAX_BONUS_LEVELS_KEY = "loopgame.maxBonusLevels";

describe("ScoreStorage", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe("getHighScore()", () => {
        it("returns null when no high score has been saved", () => {
            expect(getHighScore()).toBeNull();
        });

        it("returns the stored high score as a number", () => {
            localStorage.setItem(HIGH_SCORE_KEY, "1200");
            expect(getHighScore()).toBe(1200);
        });

        it("returns null when the stored value is not a valid number", () => {
            localStorage.setItem(HIGH_SCORE_KEY, "not-a-number");
            expect(getHighScore()).toBeNull();
        });

        it("returns null when localStorage access throws", () => {
            const spy = vi
                .spyOn(Storage.prototype, "getItem")
                .mockImplementation(() => {
                    throw new Error("blocked (private mode)");
                });

            expect(getHighScore()).toBeNull();

            spy.mockRestore();
        });
    });

    describe("getLastScore()", () => {
        it("returns null when no last score has been saved", () => {
            expect(getLastScore()).toBeNull();
        });

        it("returns the stored last score as a number", () => {
            localStorage.setItem(LAST_SCORE_KEY, "500");
            expect(getLastScore()).toBe(500);
        });

        it("returns null when localStorage access throws", () => {
            const spy = vi
                .spyOn(Storage.prototype, "getItem")
                .mockImplementation(() => {
                    throw new Error("blocked (private mode)");
                });

            expect(getLastScore()).toBeNull();

            spy.mockRestore();
        });
    });

    describe("saveResult()", () => {
        it("treats the first ever score as a new record with no previous best", () => {
            const result = saveResult(1000);

            expect(result).toEqual({ isNewRecord: true, previousBest: null });
            expect(getHighScore()).toBe(1000);
            expect(getLastScore()).toBe(1000);
        });

        it("reports a new record and updates the high score when beaten", () => {
            saveResult(1000);

            const result = saveResult(1500);

            expect(result).toEqual({ isNewRecord: true, previousBest: 1000 });
            expect(getHighScore()).toBe(1500);
            expect(getLastScore()).toBe(1500);
        });

        it("does not overwrite the high score when the new score is lower", () => {
            saveResult(1000);

            const result = saveResult(400);

            expect(result).toEqual({
                isNewRecord: false,
                previousBest: 1000,
            });
            expect(getHighScore()).toBe(1000);
            expect(getLastScore()).toBe(400);
        });

        it("does not treat an equal score as a new record", () => {
            saveResult(1000);

            const result = saveResult(1000);

            expect(result).toEqual({
                isNewRecord: false,
                previousBest: 1000,
            });
            expect(getHighScore()).toBe(1000);
        });

        it("always updates the last score, even when it is not a record", () => {
            saveResult(1000);
            saveResult(300);

            expect(getLastScore()).toBe(300);
            expect(getHighScore()).toBe(1000);
        });

        it("returns a not-new-record result and skips saving when localStorage throws", () => {
            const getSpy = vi
                .spyOn(Storage.prototype, "getItem")
                .mockImplementation(() => {
                    throw new Error("blocked (private mode)");
                });
            const setSpy = vi
                .spyOn(Storage.prototype, "setItem")
                .mockImplementation(() => {
                    throw new Error("blocked (private mode)");
                });

            const result = saveResult(1000);

            expect(result).toEqual({ isNewRecord: false, previousBest: null });

            getSpy.mockRestore();
            setSpy.mockRestore();
        });

        it("does not partially save when setItem throws after a successful read", () => {
            const setSpy = vi
                .spyOn(Storage.prototype, "setItem")
                .mockImplementation(() => {
                    throw new Error("quota exceeded");
                });

            expect(() => saveResult(1000)).not.toThrow();

            setSpy.mockRestore();

            // Nothing should have been persisted because the write failed.
            expect(getHighScore()).toBeNull();
            expect(getLastScore()).toBeNull();
        });
    });

    describe("getMaxLevel()", () => {
        it("returns 0 when no max level has been recorded", () => {
            expect(getMaxLevel()).toBe(0);
        });

        it("returns the stored max level as a number", () => {
            localStorage.setItem(MAX_LEVEL_KEY, "7");
            expect(getMaxLevel()).toBe(7);
        });

        it("returns 0 when the stored value is not a valid number", () => {
            localStorage.setItem(MAX_LEVEL_KEY, "not-a-number");
            expect(getMaxLevel()).toBe(0);
        });

        it("returns 0 when localStorage access throws", () => {
            const spy = vi
                .spyOn(Storage.prototype, "getItem")
                .mockImplementation(() => {
                    throw new Error("blocked (private mode)");
                });

            expect(getMaxLevel()).toBe(0);

            spy.mockRestore();
        });
    });

    describe("getReachedBonusLevels()", () => {
        it("returns an empty array when nothing has been recorded", () => {
            expect(getReachedBonusLevels()).toEqual([]);
        });

        it("returns the stored levels sorted ascending", () => {
            localStorage.setItem(
                MAX_BONUS_LEVELS_KEY,
                JSON.stringify([10, 5, 15]),
            );
            expect(getReachedBonusLevels()).toEqual([5, 10, 15]);
        });

        it("dedupes stored levels", () => {
            localStorage.setItem(
                MAX_BONUS_LEVELS_KEY,
                JSON.stringify([5, 10, 5, 10, 15]),
            );
            expect(getReachedBonusLevels()).toEqual([5, 10, 15]);
        });

        it("returns an empty array when the stored value is malformed JSON", () => {
            localStorage.setItem(MAX_BONUS_LEVELS_KEY, "{not valid json");
            expect(getReachedBonusLevels()).toEqual([]);
        });

        it("returns an empty array when the stored value is valid JSON but not an array", () => {
            localStorage.setItem(
                MAX_BONUS_LEVELS_KEY,
                JSON.stringify({ a: 1 }),
            );
            expect(getReachedBonusLevels()).toEqual([]);
        });

        it("returns an empty array when localStorage access throws", () => {
            const spy = vi
                .spyOn(Storage.prototype, "getItem")
                .mockImplementation(() => {
                    throw new Error("blocked (private mode)");
                });

            expect(getReachedBonusLevels()).toEqual([]);

            spy.mockRestore();
        });
    });

    describe("recordProgress()", () => {
        it("sets the max level on first record", () => {
            recordProgress(3, false);
            expect(getMaxLevel()).toBe(3);
        });

        it("is monotonic: never regresses the max level", () => {
            recordProgress(5, false);
            recordProgress(2, false);
            expect(getMaxLevel()).toBe(5);
        });

        it("updates the max level when the new level is higher", () => {
            recordProgress(5, false);
            recordProgress(9, false);
            expect(getMaxLevel()).toBe(9);
        });

        it("does not affect the max level when isBonus is true", () => {
            recordProgress(5, false);
            recordProgress(20, true);
            expect(getMaxLevel()).toBe(5);
        });

        it("adds the level to the reached bonus levels when isBonus is true", () => {
            recordProgress(5, true);
            expect(getReachedBonusLevels()).toEqual([5]);
        });

        it("dedupes when the same bonus level is recorded multiple times", () => {
            recordProgress(5, true);
            recordProgress(5, true);
            recordProgress(10, true);
            expect(getReachedBonusLevels()).toEqual([5, 10]);
        });

        it("keeps the reached bonus levels sorted ascending", () => {
            recordProgress(10, true);
            recordProgress(5, true);
            expect(getReachedBonusLevels()).toEqual([5, 10]);
        });

        it("does not throw when localStorage access throws", () => {
            const getSpy = vi
                .spyOn(Storage.prototype, "getItem")
                .mockImplementation(() => {
                    throw new Error("blocked (private mode)");
                });
            const setSpy = vi
                .spyOn(Storage.prototype, "setItem")
                .mockImplementation(() => {
                    throw new Error("blocked (private mode)");
                });

            expect(() => recordProgress(5, false)).not.toThrow();
            expect(() => recordProgress(5, true)).not.toThrow();

            getSpy.mockRestore();
            setSpy.mockRestore();
        });
    });
});
