import { describe, it, expect, vi, beforeEach } from "vitest";

// PIXI.js のローカルモック(SparkleEmitter.test.tsと同様の方針)。
// BonusStageEffect と、それが内部で駆動する実物の SparkleEmitter の
// 両方がこのモックを共有する
vi.mock("pixi.js", () => {
    class Container {
        children: unknown[] = [];
        alpha = 1;
        x = 0;
        y = 0;
        rotation = 0;
        destroyed = false;
        anchor = { set: vi.fn() };
        scale = {
            _v: 1,
            set(v: number) {
                this._v = v;
            },
        };
        addChild(c: unknown) {
            this.children.push(c);
            return c;
        }
        removeChild(c: unknown) {
            this.children = this.children.filter((x) => x !== c);
            return c;
        }
        destroy() {
            this.destroyed = true;
        }
    }
    class Sprite extends Container {
        tint = 0xffffff;
        blendMode = "normal";
        texture: unknown;
        constructor(texture?: unknown) {
            super();
            this.texture = texture;
        }
    }
    class BitmapText extends Container {
        text = "";
        style: unknown;
        constructor(opts: { text?: string; style?: unknown } = {}) {
            super();
            this.text = opts.text ?? "";
            this.style = opts.style;
        }
    }
    class TextStyle {
        constructor(public opts: unknown) {}
    }
    return { Container, Sprite, BitmapText, TextStyle };
});

import { BonusStageEffect } from "../../../src/scripts/components/BonusStageEffect";
import { SparkleEmitter } from "../../../src/scripts/components/SparkleEmitter";
import { t } from "../../../src/scripts/utils/Language";

const fakeTexture = { fake: "star" };

interface TextChild {
    text: string;
    alpha: number;
}

/** 誘いメッセージ用に追加された BitmapText を取り出す */
function invitationChild(effect: BonusStageEffect): TextChild {
    const children = (effect as unknown as { children: TextChild[] }).children;
    const child = children.find(
        (c) => typeof c.text === "string" && c.text.length > 0,
    );
    if (!child) throw new Error("invitation message child not found");
    return child;
}

describe("BonusStageEffect", () => {
    let sparkles: SparkleEmitter;
    let effect: BonusStageEffect;

    beforeEach(() => {
        sparkles = new SparkleEmitter(fakeTexture as never);
        effect = new BonusStageEffect(1150, 650, sparkles, 0xffffff);
    });

    it("starts in the idle phase and does nothing until triggered", () => {
        expect(effect.phase).toBe("idle");
        effect.update(1000);
        expect(effect.phase).toBe("idle");
        expect(sparkles.particleCount).toBe(0);
        expect(effect.consumeIntroComplete()).toBe(false);
    });

    it("shows the quiet invitation message, not a festive BONUS STAGE banner", () => {
        const child = invitationChild(effect);
        expect(child.text).toBe(t("bonus.invitation"));
        expect(child.text).not.toMatch(/bonus stage/i);
    });

    describe("intro (dream invitation)", () => {
        it("enters the intro phase and stays there until the duration elapses", () => {
            effect.startIntro();
            expect(effect.phase).toBe("intro");

            // 途中まで進めてもまだ intro
            effect.update(BonusStageEffect.INTRO_DURATION_MS - 100);
            expect(effect.phase).toBe("intro");
            expect(effect.consumeIntroComplete()).toBe(false);
        });

        it("fades the invitation in softly (starts invisible, becomes visible mid-intro)", () => {
            const child = invitationChild(effect);
            effect.startIntro();
            expect(child.alpha).toBe(0);

            // 導入の中盤ではっきり見えている
            effect.update(BonusStageEffect.INTRO_DURATION_MS * 0.5);
            expect(child.alpha).toBeGreaterThan(0.5);
        });

        it("emits sparse, non-festive sparkles while the intro plays", () => {
            effect.startIntro();
            effect.update(600);
            expect(sparkles.particleCount).toBeGreaterThan(0);
        });

        it("transitions to playing once the intro duration is exceeded", () => {
            effect.startIntro();
            effect.update(BonusStageEffect.INTRO_DURATION_MS + 50);
            expect(effect.phase).toBe("playing");
            // 誘いメッセージは消えている
            expect(invitationChild(effect).alpha).toBe(0);
        });

        it("signals intro completion exactly once (frame-safe trigger)", () => {
            effect.startIntro();
            effect.update(BonusStageEffect.INTRO_DURATION_MS + 50);
            expect(effect.consumeIntroComplete()).toBe(true);
            // 2回目以降は false(ゲームを二重開始させない)
            expect(effect.consumeIntroComplete()).toBe(false);
        });

        it("reaches the same phase regardless of frame step size (delta-driven)", () => {
            // 大きな1ステップ
            const coarse = new BonusStageEffect(1150, 650, sparkles, 0xffffff);
            coarse.startIntro();
            coarse.update(BonusStageEffect.INTRO_DURATION_MS + 10);

            // 細かい多ステップ(合計は同じ)
            const fine = new BonusStageEffect(1150, 650, sparkles, 0xffffff);
            fine.startIntro();
            const step = 16;
            let acc = 0;
            while (acc < BonusStageEffect.INTRO_DURATION_MS + 10) {
                fine.update(step);
                acc += step;
            }

            expect(coarse.phase).toBe(fine.phase);
            expect(coarse.phase).toBe("playing");
        });
    });
});
