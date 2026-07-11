import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    detectLang,
    getLang,
    setLang,
    toggleLang,
    resetLangCache,
    isJapaneseText,
    pick,
    t,
} from "../../../src/scripts/utils/Language";

describe("Language", () => {
    let store: Record<string, string>;

    beforeEach(() => {
        store = {};
        vi.stubGlobal("localStorage", {
            getItem: vi.fn((key: string) => store[key] ?? null),
            setItem: vi.fn((key: string, value: string) => {
                store[key] = value;
            }),
        });
        resetLangCache();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        resetLangCache();
    });

    const stubNavigatorLanguage = (language: string) => {
        vi.stubGlobal("navigator", { language });
    };

    describe("detectLang", () => {
        it("returns ja when navigator language starts with ja", () => {
            stubNavigatorLanguage("ja-JP");
            expect(detectLang()).toBe("ja");
        });

        it("returns ja for a bare ja tag", () => {
            stubNavigatorLanguage("ja");
            expect(detectLang()).toBe("ja");
        });

        it("returns en for non-japanese locales", () => {
            stubNavigatorLanguage("en-US");
            expect(detectLang()).toBe("en");
            stubNavigatorLanguage("fr-FR");
            expect(detectLang()).toBe("en");
        });
    });

    describe("getLang", () => {
        it("falls back to auto detection when nothing is stored", () => {
            stubNavigatorLanguage("ja-JP");
            expect(getLang()).toBe("ja");
        });

        it("prefers the stored value over auto detection", () => {
            store["loopgame.lang"] = "en";
            stubNavigatorLanguage("ja-JP");
            expect(getLang()).toBe("en");
        });

        it("ignores an invalid stored value", () => {
            store["loopgame.lang"] = "zz";
            stubNavigatorLanguage("ja-JP");
            expect(getLang()).toBe("ja");
        });
    });

    describe("setLang / toggleLang", () => {
        it("persists the chosen language under a namespaced key", () => {
            setLang("ja");
            expect(store["loopgame.lang"]).toBe("ja");
            expect(getLang()).toBe("ja");
        });

        it("toggles between the two languages", () => {
            setLang("en");
            expect(toggleLang()).toBe("ja");
            expect(getLang()).toBe("ja");
            expect(toggleLang()).toBe("en");
            expect(getLang()).toBe("en");
        });

        it("does not throw when localStorage is unavailable", () => {
            vi.stubGlobal("localStorage", {
                getItem: vi.fn(() => {
                    throw new Error("denied");
                }),
                setItem: vi.fn(() => {
                    throw new Error("denied");
                }),
            });
            resetLangCache();
            expect(() => setLang("ja")).not.toThrow();
            // in-memory cache still reflects the choice even without storage
            expect(getLang()).toBe("ja");
        });
    });

    describe("pick", () => {
        it("returns the value for the requested language", () => {
            expect(pick({ ja: "あ", en: "a" }, "ja")).toBe("あ");
            expect(pick({ ja: "あ", en: "a" }, "en")).toBe("a");
        });

        it("falls back to english when the requested language is missing", () => {
            expect(pick({ en: "only-en" }, "ja")).toBe("only-en");
        });

        it("falls back to japanese when english is also missing", () => {
            expect(pick({ ja: "only-ja" }, "en")).toBe("only-ja");
        });
    });

    describe("t", () => {
        it("returns the catalog value for the current language", () => {
            setLang("en");
            expect(t("button.start")).toBe("Start");
            setLang("ja");
            expect(t("button.start")).toBe("スタート");
        });

        it("interpolates named parameters", () => {
            setLang("en");
            expect(t("result.level", { n: 3 })).toBe("Level 3");
        });

        it("returns the key itself for an unknown key", () => {
            // @ts-expect-error deliberately passing an unknown key
            expect(t("does.not.exist")).toBe("does.not.exist");
        });
    });

    describe("isJapaneseText", () => {
        it("detects hiragana / katakana / kanji", () => {
            expect(isJapaneseText("すたーと")).toBe(true);
            expect(isJapaneseText("あそび")).toBe(true);
            expect(isJapaneseText("高とくてん")).toBe(true);
        });

        it("returns false for latin-only text", () => {
            expect(isJapaneseText("Start")).toBe(false);
            expect(isJapaneseText("Back to Menu")).toBe(false);
        });
    });
});
