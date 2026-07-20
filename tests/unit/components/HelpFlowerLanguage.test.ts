import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock PIXI.js (HelpFlower only needs Sprite.from)
vi.mock("pixi.js", () => {
    const makeSprite = () => ({
        anchor: { set: vi.fn() },
        rotation: 0,
        width: 40,
        height: 40,
    });
    return {
        Sprite: {
            from: vi.fn().mockImplementation(() => makeSprite()),
        },
    };
});

// Mock Utility(振幅/初期位置の乱数は固定値でよい)
vi.mock("../../../src/scripts/utils/Utility", () => ({
    random: vi.fn().mockImplementation((min: number) => min),
    chooseAtRandom: vi
        .fn()
        .mockImplementation(<T>(list: T[], num: number) => list.slice(0, num)),
}));

// Mock BaseCaptureableObject
vi.mock("../../../src/scripts/components/BaseCaptureableObject", () => ({
    BaseCaptureableObject: class {
        hitAreaSize = 10;
        x = 0;
        y = 0;
        width = 40;
        scale = { set: vi.fn() };
        addChild = vi.fn();
    },
}));

import { HelpFlower } from "../../../src/scripts/components/HelpFlower";
import { setLang, resetLangCache } from "../../../src/scripts/utils/Language";

describe("HelpFlower localization", () => {
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

    it("pulls English message/description from the catalog when the language is en", () => {
        setLang("en");
        const flower = new HelpFlower("freeze", 800, 600);
        expect(flower.message).toBe("Freeze!");
        expect(flower.description).toBe("Freeze the butterflies");
    });

    it("pulls Japanese message/description from the catalog when the language is ja", () => {
        setLang("ja");
        const flower = new HelpFlower("gather", 800, 600);
        expect(flower.message).toBe("あつまれ！");
        expect(flower.description).toBe("ちょうをあつめる");
    });
});
