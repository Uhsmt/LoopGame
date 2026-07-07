import { describe, it, expect, beforeEach } from "vitest";

/**
 * GameplayStateはPIXI.Applicationに強く依存し直接インスタンス化が難しいため、
 * PowerUpSystem.test.tsと同様に実装ロジックを模したテストダブルで検証する。
 * ここでは applyLineDrawTime / longLoopEffect / lineShortenEffect の
 * 「lineDrawer描画時間の一元管理」ロジックにフォーカスする。
 */

const LONG_LOOP_EFFECT_TIME_MS = 5000;
const LINE_SHORTEN_EFFECT_TIME_MS = 4000;
const LINE_SHORTEN_COLOR = 0x808080;
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
        this.longLoopElapsedTime = isActive ? LONG_LOOP_EFFECT_TIME_MS : -1;
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
        let color = this.lineDrawer.originalLineColor;
        if (this.longLoopElapsedTime >= 0) {
            time += 500;
            color = 0x0081af;
        }
        if (this.lineShortenElapsedTime >= 0) {
            time /= 2;
            color = LINE_SHORTEN_COLOR;
        }
        this.lineDrawer.setLineDrawTime(time);
        this.lineDrawer.setLineColor(color);
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

        it("should turn the line gray while the effect is active", () => {
            effects.applyObstacleEffect("bee");

            expect(effects.lineDrawer.getLineColor()).toBe(LINE_SHORTEN_COLOR);
        });

        it("should restore the original line draw time and color after the effect expires", () => {
            const original = effects.lineDrawer.originalLineDrawTime;
            effects.applyObstacleEffect("bee");

            effects.tick(LINE_SHORTEN_EFFECT_TIME_MS); // ちょうど時間切れ

            expect(effects.lineDrawer.getLineDrawTime()).toBe(original);
            expect(effects.lineDrawer.getLineColor()).toBe(
                effects.lineDrawer.originalLineColor,
            );
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

        it("should prefer the gray shorten color over the longLoop color", () => {
            effects.longLoopEffect(true);
            effects.applyObstacleEffect("bee");

            expect(effects.lineDrawer.getLineColor()).toBe(LINE_SHORTEN_COLOR);
        });

        it("should fall back to longLoop-only time and color once line shorten expires first", () => {
            const original = effects.lineDrawer.originalLineDrawTime;

            effects.longLoopEffect(true); // 5000ms
            effects.applyObstacleEffect("bee"); // 4000ms

            effects.tick(LINE_SHORTEN_EFFECT_TIME_MS); // line shortenのみ失効

            expect(effects.lineShortenElapsedTime).toBe(-1);
            expect(effects.longLoopElapsedTime).toBeGreaterThan(0);
            expect(effects.lineDrawer.getLineDrawTime()).toBe(original + 500);
            expect(effects.lineDrawer.getLineColor()).toBe(0x0081af);
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

/**
 * GameplayState.handleLoopAreaCompleted内のcatapy(イモムシ)判定ロジックを
 * 再現したテストダブル(実装と同じ分岐であることをテストで担保する)。
 * - 蝶+catapyが同じループ内 -> ループ無効(捕獲・色替え・花取得を一切行わない)
 * - catapy単体(蝶0匹)で囲む -> catapyが消える。花は通常どおり取得できる
 * - catapyがいない -> 既存の蝶/花のロジックそのまま
 */
class TestCatapy {
    public removed = false;
    constructor(public inLoop: boolean) {}
    isHit(_loopArea: unknown): boolean {
        return this.inLoop;
    }
    delete(): void {
        this.removed = true;
    }
}

class TestFlower {
    public captured = false;
    constructor(public inLoop: boolean) {}
    isHit(_loopArea: unknown): boolean {
        return this.inLoop;
    }
}

class TestButterflyForCatapy {
    public colorSwitched = false;
    public captured = false;
    constructor(public inLoop: boolean) {}
    isHit(_loopArea: unknown): boolean {
        return this.inLoop;
    }
    switchColor(): void {
        this.colorSwitched = true;
    }
}

class TestGameplayLoopHandler {
    public obstacles: TestCatapy[] = [];
    public flowers: TestFlower[] = [];
    public butterflies: TestButterflyForCatapy[] = [];
    public playedSe: string[] = [];
    public actionMessage = "";
    public capturedFlowers: TestFlower[] = [];
    public capturedButterflies: TestButterflyForCatapy[] = [];

    playSe(name: string): void {
        this.playedSe.push(name);
    }

    showActionMessage(message: string): void {
        this.actionMessage = message;
    }

    captureFlowers(flowers: TestFlower[]): void {
        flowers.forEach((flower) => {
            flower.captured = true;
            this.flowers = this.flowers.filter((f) => f !== flower);
        });
        this.capturedFlowers.push(...flowers);
    }

    // GameplayState.handleLoopAreaCompletedのcatapy判定部分を再現
    handleLoopAreaCompleted(loopArea: unknown): void {
        const butterfliesInLoopArea = this.butterflies.filter((b) =>
            b.isHit(loopArea),
        );
        const flowersInLoopArea = this.flowers.filter((f) => f.isHit(loopArea));
        const catapiesInLoop = this.obstacles.filter((o) => o.isHit(loopArea));

        if (catapiesInLoop.length > 0) {
            if (butterfliesInLoopArea.length > 0) {
                this.playSe("se_obstacle_hit");
                this.showActionMessage("Invalid loop!");
                return;
            }
            catapiesInLoop.forEach((catapy) => {
                this.obstacles = this.obstacles.filter((o) => o !== catapy);
                catapy.delete();
            });
            this.playSe("se_obstacle_hit");
            this.captureFlowers(flowersInLoopArea);
            return;
        }

        if (butterfliesInLoopArea.length === 1) {
            butterfliesInLoopArea[0].switchColor();
            this.playSe("se_switch");
            this.captureFlowers(flowersInLoopArea);
        } else if (butterfliesInLoopArea.length >= 2) {
            this.capturedButterflies.push(...butterfliesInLoopArea);
            this.captureFlowers(flowersInLoopArea);
        } else {
            this.captureFlowers(flowersInLoopArea);
        }
    }
}

describe("Obstacle System Integration Tests (Catapy / loop invalidation)", () => {
    let handler: TestGameplayLoopHandler;

    beforeEach(() => {
        handler = new TestGameplayLoopHandler();
    });

    describe("butterfly + catapy in the same loop", () => {
        it("should invalidate the loop entirely (no capture, no color switch, no flower)", () => {
            const catapy = new TestCatapy(true);
            const flower = new TestFlower(true);
            const butterfly = new TestButterflyForCatapy(true);
            handler.obstacles = [catapy];
            handler.flowers = [flower];
            handler.butterflies = [butterfly];

            handler.handleLoopAreaCompleted({});

            expect(handler.playedSe).toEqual(["se_obstacle_hit"]);
            expect(handler.actionMessage).toBe("Invalid loop!");
            expect(catapy.removed).toBe(false);
            expect(butterfly.colorSwitched).toBe(false);
            expect(handler.capturedFlowers).toHaveLength(0);
            expect(handler.flowers).toHaveLength(1);
            expect(handler.obstacles).toHaveLength(1);
        });
    });

    describe("catapy alone (no butterfly) in the loop", () => {
        it("should remove the catapy and still capture flowers normally", () => {
            const catapy = new TestCatapy(true);
            const flower = new TestFlower(true);
            handler.obstacles = [catapy];
            handler.flowers = [flower];
            handler.butterflies = [];

            handler.handleLoopAreaCompleted({});

            expect(handler.playedSe).toEqual(["se_obstacle_hit"]);
            expect(catapy.removed).toBe(true);
            expect(handler.obstacles).toHaveLength(0);
            expect(handler.capturedFlowers).toEqual([flower]);
            expect(handler.flowers).toHaveLength(0);
        });
    });

    describe("no catapy in the loop", () => {
        it("should fall back to the normal single-butterfly color switch behavior", () => {
            const catapy = new TestCatapy(false); // ループ外
            const butterfly = new TestButterflyForCatapy(true);
            handler.obstacles = [catapy];
            handler.butterflies = [butterfly];

            handler.handleLoopAreaCompleted({});

            expect(handler.playedSe).toEqual(["se_switch"]);
            expect(butterfly.colorSwitched).toBe(true);
            expect(catapy.removed).toBe(false);
            expect(handler.obstacles).toHaveLength(1);
        });

        it("should fall back to normal multi-butterfly capture behavior", () => {
            const butterflyA = new TestButterflyForCatapy(true);
            const butterflyB = new TestButterflyForCatapy(true);
            handler.butterflies = [butterflyA, butterflyB];

            handler.handleLoopAreaCompleted({});

            expect(handler.capturedButterflies).toEqual([
                butterflyA,
                butterflyB,
            ]);
        });
    });
});
