import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getMuted, setMuted } from "../../../src/scripts/utils/SettingsStorage";

describe("SettingsStorage", () => {
    let store: Record<string, string>;

    beforeEach(() => {
        store = {};
        vi.stubGlobal("localStorage", {
            getItem: vi.fn((key: string) => store[key] ?? null),
            setItem: vi.fn((key: string, value: string) => {
                store[key] = value;
            }),
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("should default to unmuted", () => {
        expect(getMuted()).toBe(false);
    });

    it("should persist and restore the muted flag", () => {
        setMuted(true);
        expect(getMuted()).toBe(true);
        setMuted(false);
        expect(getMuted()).toBe(false);
    });

    it("should use a namespaced key", () => {
        setMuted(true);
        expect(Object.keys(store)).toEqual(["loopgame.muted"]);
    });

    it("should not throw when localStorage is unavailable", () => {
        vi.stubGlobal("localStorage", {
            getItem: vi.fn(() => {
                throw new Error("denied");
            }),
            setItem: vi.fn(() => {
                throw new Error("denied");
            }),
        });
        expect(getMuted()).toBe(false);
        expect(() => setMuted(true)).not.toThrow();
    });
});
