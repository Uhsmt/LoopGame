import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    getHighScore,
    getLastScore,
    saveResult,
} from "../../../src/scripts/utils/ScoreStorage";

const HIGH_SCORE_KEY = "loopgame.highScore";
const LAST_SCORE_KEY = "loopgame.lastScore";

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
});
