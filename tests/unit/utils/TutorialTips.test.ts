import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getTutorialTipKey } from "../../../src/scripts/utils/TutorialTips";
import {
    t,
    setLang,
    resetLangCache,
} from "../../../src/scripts/utils/Language";

describe("TutorialTips", () => {
    describe("getTutorialTipKey", () => {
        it.each([
            [1, "tip.level1"],
            [2, "tip.level2"],
            [3, "tip.level3"],
            [4, "tip.level4"],
            [5, "tip.level5"],
            [9, "tip.level9"],
        ] as const)(
            "maps level %i to the fixed key %s (not derived from stage-config)",
            (level, expectedKey) => {
                expect(getTutorialTipKey(level)).toBe(expectedKey);
            },
        );

        it.each([0, 6, 7, 8, 10, 15, 25])(
            "returns null for a level without a tip (level %i)",
            (level) => {
                expect(getTutorialTipKey(level)).toBeNull();
            },
        );
    });

    describe("catalog completeness", () => {
        beforeEach(() => {
            resetLangCache();
        });

        afterEach(() => {
            resetLangCache();
        });

        const tipLevels = [1, 2, 3, 4, 5, 9];

        it.each(tipLevels)(
            "level %i's tip has non-empty ja and en text",
            (level) => {
                const key = getTutorialTipKey(level);
                expect(key).not.toBeNull();

                setLang("ja");
                const ja = t(key!);
                setLang("en");
                const en = t(key!);

                expect(ja.length).toBeGreaterThan(0);
                expect(en.length).toBeGreaterThan(0);
                // 未知のキー扱いでキー文字列がそのまま返っていないこと
                expect(ja).not.toBe(key);
                expect(en).not.toBe(key);
            },
        );
    });
});
