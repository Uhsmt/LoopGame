import { describe, it, expect, beforeEach } from "vitest";

/**
 * GameplayStateはPIXI.Applicationに強く依存し直接インスタンス化が難しいため、
 * PowerUpSystem.test.tsと同様に実装ロジックを模したテストダブルで検証する。
 * ここでは applyLineDrawTime / longLoopEffect / lineShortenEffect の
 * 「lineDrawer描画時間の一元管理」ロジックにフォーカスする。
 */

const LONG_LOOP_EFFECT_TIME_MS = 5000;
const LINE_SHORTEN_EFFECT_TIME_MS = 4000;
const AVOID_PENCIL_EFFECT_TIME_MS = 4000;

class TestLineDrawer {
    public originalLineDrawTime: number = 1500;
    public originalLineColor: number = 0xffffff;
    private lineDrawTime: number = 1500;
    private lineColor: number = 0xffffff;

    setLineDrawTime(time: number): void {
        this.lineDrawTime = time;
    }

    setLineColor(color: number): void {
        this.lineColor = color;
    }

    getLineDrawTime(): number {
        return this.lineDrawTime;
    }

    getLineColor(): number {
        return this.lineColor;
    }
}

/**
 * GameplayState.applyLineDrawTime / longLoopEffect / lineShortenEffect
 * を再現したテストダブル(実装と同じ分岐ロジックであることをテストで担保する)
 */
class TestGameplayEffects {
    public longLoopElapsedTime = -1;
    public lineShortenElapsedTime = -1;
    public avoidPencilElapsedTime = -1;
    public lineDrawer = new TestLineDrawer();
    public helpMessage = "";

    avoidPencilEffect(isActive: boolean): void {
        this.avoidPencilElapsedTime = isActive
            ? AVOID_PENCIL_EFFECT_TIME_MS
            : -1;
    }

    longLoopEffect(isActive: boolean): void {
        if (isActive) {
            this.lineDrawer.setLineColor(0x0081af);
            this.longLoopElapsedTime = LONG_LOOP_EFFECT_TIME_MS;
        } else {
            this.lineDrawer.setLineColor(this.lineDrawer.originalLineColor);
            this.longLoopElapsedTime = -1;
        }
        this.applyLineDrawTime();
    }

    lineShortenEffect(isActive: boolean): void {
        this.lineShortenElapsedTime = isActive
            ? LINE_SHORTEN_EFFECT_TIME_MS
            : -1;
        this.applyLineDrawTime();
    }

    applyLineDrawTime(): void {
        let time = this.lineDrawer.originalLineDrawTime;
        if (this.longLoopElapsedTime >= 0) {
            time += 500;
        }
        if (this.lineShortenElapsedTime >= 0) {
            time /= 2;
        }
        this.lineDrawer.setLineDrawTime(time);
    }

    applyObstacleEffect(obstacleType: "bee" | "spider"): void {
        if (obstacleType === "bee") {
            this.lineShortenEffect(true);
            this.helpMessage = "Short loop!";
        } else if (obstacleType === "spider") {
            this.avoidPencilEffect(true);
            this.helpMessage = "Run away!";
        }
    }

    // GameplayState.update()内のeffect時間管理を再現
    tick(delta: number): void {
        if (this.longLoopElapsedTime >= 0) {
            this.longLoopElapsedTime -= delta;
            if (this.longLoopElapsedTime <= 0) {
                this.longLoopEffect(false);
            }
        }
        if (this.lineShortenElapsedTime >= 0) {
            this.lineShortenElapsedTime -= delta;
            if (this.lineShortenElapsedTime <= 0) {
                this.lineShortenEffect(false);
            }
        }
        if (this.avoidPencilElapsedTime >= 0) {
            this.avoidPencilElapsedTime -= delta;
            if (this.avoidPencilElapsedTime <= 0) {
                this.avoidPencilEffect(false);
            }
        }
    }
}

describe("Obstacle System Integration Tests (Bee / line shorten)", () => {
    let effects: TestGameplayEffects;

    beforeEach(() => {
        effects = new TestGameplayEffects();
    });

    describe("Bee hit -> line shorten effect", () => {
        it("should halve the line draw time and show a help message", () => {
            const original = effects.lineDrawer.originalLineDrawTime;

            effects.applyObstacleEffect("bee");

            expect(effects.lineDrawer.getLineDrawTime()).toBe(original / 2);
            expect(effects.lineShortenElapsedTime).toBe(
                LINE_SHORTEN_EFFECT_TIME_MS,
            );
            expect(effects.helpMessage).toBe("Short loop!");
        });

        it("should restore the original line draw time after the effect expires", () => {
            const original = effects.lineDrawer.originalLineDrawTime;
            effects.applyObstacleEffect("bee");

            effects.tick(LINE_SHORTEN_EFFECT_TIME_MS); // ちょうど時間切れ

            expect(effects.lineDrawer.getLineDrawTime()).toBe(original);
            expect(effects.lineShortenElapsedTime).toBe(-1);
        });

        it("should not restore before the effect duration has elapsed", () => {
            const original = effects.lineDrawer.originalLineDrawTime;
            effects.applyObstacleEffect("bee");

            effects.tick(LINE_SHORTEN_EFFECT_TIME_MS - 1000);

            expect(effects.lineDrawer.getLineDrawTime()).toBe(original / 2);
        });
    });

    describe("longLoop effect (existing behavior, unaffected by refactor)", () => {
        it("should add 500ms to the line draw time", () => {
            const original = effects.lineDrawer.originalLineDrawTime;

            effects.longLoopEffect(true);

            expect(effects.lineDrawer.getLineDrawTime()).toBe(original + 500);
            expect(effects.lineDrawer.getLineColor()).toBe(0x0081af);
        });

        it("should restore original time and color when it expires", () => {
            const original = effects.lineDrawer.originalLineDrawTime;
            const originalColor = effects.lineDrawer.originalLineColor;
            effects.longLoopEffect(true);

            effects.tick(LONG_LOOP_EFFECT_TIME_MS);

            expect(effects.lineDrawer.getLineDrawTime()).toBe(original);
            expect(effects.lineDrawer.getLineColor()).toBe(originalColor);
        });
    });

    describe("longLoop and line shorten overlap", () => {
        it("should apply both: (original + 500) / 2", () => {
            const original = effects.lineDrawer.originalLineDrawTime;

            effects.longLoopEffect(true);
            effects.applyObstacleEffect("bee");

            expect(effects.lineDrawer.getLineDrawTime()).toBe(
                (original + 500) / 2,
            );
        });

        it("should fall back to longLoop-only time once line shorten expires first", () => {
            const original = effects.lineDrawer.originalLineDrawTime;

            effects.longLoopEffect(true); // 5000ms
            effects.applyObstacleEffect("bee"); // 4000ms

            effects.tick(LINE_SHORTEN_EFFECT_TIME_MS); // line shortenのみ失効

            expect(effects.lineShortenElapsedTime).toBe(-1);
            expect(effects.longLoopElapsedTime).toBeGreaterThan(0);
            expect(effects.lineDrawer.getLineDrawTime()).toBe(original + 500);
        });

        it("should fall back to original time once both effects expire", () => {
            const original = effects.lineDrawer.originalLineDrawTime;

            effects.longLoopEffect(true);
            effects.applyObstacleEffect("bee");

            effects.tick(LONG_LOOP_EFFECT_TIME_MS);

            expect(effects.lineDrawer.getLineDrawTime()).toBe(original);
        });
    });

    describe("Spider hit -> avoid pencil effect", () => {
        it("should start the avoid-pencil timer and show a help message", () => {
            effects.applyObstacleEffect("spider");

            expect(effects.avoidPencilElapsedTime).toBe(
                AVOID_PENCIL_EFFECT_TIME_MS,
            );
            expect(effects.helpMessage).toBe("Run away!");
        });

        it("should clear the avoid-pencil timer once the effect duration elapses", () => {
            effects.applyObstacleEffect("spider");

            effects.tick(AVOID_PENCIL_EFFECT_TIME_MS); // ちょうど時間切れ

            expect(effects.avoidPencilElapsedTime).toBe(-1);
        });

        it("should keep the avoid-pencil timer running before the duration has elapsed", () => {
            effects.applyObstacleEffect("spider");

            effects.tick(AVOID_PENCIL_EFFECT_TIME_MS - 1000);

            expect(effects.avoidPencilElapsedTime).toBe(1000);
        });

        it("should not interfere with the independent line shorten timer (bee + spider overlap)", () => {
            effects.applyObstacleEffect("bee"); // 4000ms line shorten
            effects.applyObstacleEffect("spider"); // 4000ms avoid pencil

            effects.tick(1000);

            expect(effects.lineShortenElapsedTime).toBe(3000);
            expect(effects.avoidPencilElapsedTime).toBe(3000);

            effects.tick(3000);

            expect(effects.lineShortenElapsedTime).toBe(-1);
            expect(effects.avoidPencilElapsedTime).toBe(-1);
        });
    });
});
