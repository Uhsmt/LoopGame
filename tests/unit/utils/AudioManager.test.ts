import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AudioManager } from "../../../src/scripts/utils/AudioManager";

// ---- AudioContext / Audio モック ----

class MockAudioParam {
    value = 1;
}

class MockBufferSource {
    buffer: unknown = null;
    playbackRate = new MockAudioParam();
    start = vi.fn();
    connect = vi.fn().mockReturnThis();
}

class MockGainNode {
    gain = new MockAudioParam();
    connect = vi.fn().mockReturnThis();
}

class MockAudioContext {
    static instances: MockAudioContext[] = [];
    state: "suspended" | "running" = "suspended";
    destination = {};
    createdSources: MockBufferSource[] = [];
    constructor() {
        MockAudioContext.instances.push(this);
    }
    createBufferSource() {
        const s = new MockBufferSource();
        this.createdSources.push(s);
        return s;
    }
    createGain() {
        return new MockGainNode();
    }
    decodeAudioData = vi.fn().mockResolvedValue({ fake: "buffer" });
    resume = vi.fn().mockImplementation(() => {
        this.state = "running";
        return Promise.resolve();
    });
}

class MockAudioElement {
    static instances: MockAudioElement[] = [];
    loop = false;
    volume = 1;
    src: string;
    play = vi.fn().mockResolvedValue(undefined);
    pause = vi.fn();
    constructor(src: string) {
        this.src = src;
        MockAudioElement.instances.push(this);
    }
}

describe("AudioManager", () => {
    let manager: AudioManager;

    beforeEach(() => {
        MockAudioContext.instances = [];
        MockAudioElement.instances = [];
        vi.stubGlobal("AudioContext", MockAudioContext);
        vi.stubGlobal("Audio", MockAudioElement);
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
            }),
        );
        AudioManager.resetForTesting();
        manager = AudioManager.shared;
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe("loadSe", () => {
        it("should fetch and decode all sound definitions", async () => {
            await manager.loadSe([
                { alias: "a", src: "/sounds/a.m4a" },
                { alias: "b", src: "/sounds/b.m4a" },
            ]);
            expect(fetch).toHaveBeenCalledTimes(2);
            const ctx = MockAudioContext.instances[0];
            expect(ctx.decodeAudioData).toHaveBeenCalledTimes(2);
        });

        it("should not reject when one sound fails to load", async () => {
            vi.mocked(fetch)
                .mockRejectedValueOnce(new Error("network"))
                .mockResolvedValueOnce({
                    ok: true,
                    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
                } as unknown as Response);
            await expect(
                manager.loadSe([
                    { alias: "broken", src: "/x.m4a" },
                    { alias: "fine", src: "/y.m4a" },
                ]),
            ).resolves.toBeUndefined();
        });
    });

    describe("playSe", () => {
        it("should do nothing for unknown alias", () => {
            expect(() => manager.playSe("nope")).not.toThrow();
        });

        it("should not play while the context is still suspended (before unlock)", async () => {
            await manager.loadSe([{ alias: "a", src: "/a.m4a" }]);
            manager.playSe("a");
            expect(MockAudioContext.instances[0].createdSources).toHaveLength(
                0,
            );
        });

        it("should play with the requested playback rate after unlock", async () => {
            await manager.loadSe([{ alias: "a", src: "/a.m4a" }]);
            manager.unlock();
            manager.playSe("a", { rate: 1.5 });
            const source = MockAudioContext.instances[0].createdSources[0];
            expect(source.start).toHaveBeenCalled();
            expect(source.playbackRate.value).toBe(1.5);
        });
    });

    describe("playBgm", () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });
        afterEach(() => {
            vi.useRealTimers();
        });

        it("should defer BGM until unlock, then start it looping", () => {
            manager.playBgm("/bgm/title.m4a");
            expect(MockAudioElement.instances).toHaveLength(0);

            manager.unlock();
            expect(MockAudioElement.instances).toHaveLength(1);
            const el = MockAudioElement.instances[0];
            expect(el.src).toBe("/bgm/title.m4a");
            expect(el.loop).toBe(true);
            expect(el.play).toHaveBeenCalled();
        });

        it("should not restart when the same BGM is requested again", () => {
            manager.unlock();
            manager.playBgm("/bgm/title.m4a");
            manager.playBgm("/bgm/title.m4a");
            expect(MockAudioElement.instances).toHaveLength(1);
        });

        it("should switch tracks by fading out the previous element", () => {
            manager.unlock();
            manager.playBgm("/bgm/title.m4a");
            vi.advanceTimersByTime(1000);
            manager.playBgm("/bgm/stage.m4a");
            expect(MockAudioElement.instances).toHaveLength(2);
            // フェード中はまだ止まっていない
            const prev = MockAudioElement.instances[0];
            expect(prev.pause).not.toHaveBeenCalled();
            vi.advanceTimersByTime(1000);
            expect(prev.pause).toHaveBeenCalled();
            expect(prev.volume).toBe(0);
            expect(MockAudioElement.instances[1].src).toBe("/bgm/stage.m4a");
        });

        it("should fade in a newly started track", () => {
            manager.unlock();
            manager.playBgm("/bgm/title.m4a");
            const el = MockAudioElement.instances[0];
            expect(el.volume).toBe(0);
            vi.advanceTimersByTime(1000);
            expect(el.volume).toBeCloseTo(manager.bgmVolume, 5);
        });

        it("should stop BGM (with fade) and allow the same track again", () => {
            manager.unlock();
            manager.playBgm("/bgm/title.m4a");
            vi.advanceTimersByTime(1000);
            manager.stopBgm();
            vi.advanceTimersByTime(1000);
            expect(MockAudioElement.instances[0].pause).toHaveBeenCalled();

            manager.playBgm("/bgm/title.m4a");
            expect(MockAudioElement.instances).toHaveLength(2);
        });
    });

    describe("unlock", () => {
        it("should resume a suspended context", async () => {
            await manager.loadSe([{ alias: "a", src: "/a.m4a" }]);
            const ctx = MockAudioContext.instances[0];
            expect(ctx.state).toBe("suspended");
            manager.unlock();
            expect(ctx.resume).toHaveBeenCalled();
        });
    });
});
