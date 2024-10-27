import * as PIXI from "pixi.js";
import { Butterfly } from "./Butterfly";

export class SpecialButterfly extends Butterfly {
    private filterProgress: number = 0;
    private effectSprite: PIXI.Sprite;

    constructor(color: number, screenSize: { x: number; y: number }) {
        super("random", color, color, 1, screenSize);
        this.sprite.texture = PIXI.Texture.from("butterfly_special");
        this.sprite.scale.set(0.15);
        this.sprite.tint = color;

        this.effectSprite = PIXI.Sprite.from("stardust");
        this.effectSprite.anchor.set(0.5);
        this.effectSprite.scale.set(0.5);
        this.effectSprite.alpha = 1;
        // this.effectSprite.y = this.sprite.height*1.5;
        this.effectSprite.blendMode = "add";

        const effectMask = new PIXI.Graphics();
        effectMask.circle(0, 0, (1.2 * this.sprite.width) / 2);
        effectMask.fill(0x000000);
        effectMask.alpha = 0.5;
        this.addChildAt(effectMask, 0);
        this.effectSprite.mask = effectMask;

        this.addChildAt(this.effectSprite, 0);

        this.sprite.blendMode = "luminosity";
    }

    update(delta: number): void {
        // effectSpriteを回転させる
        this.effectSprite.rotation += 0.001 * delta;

        // alphaを0.5~1.0で変化させる
        this.effectSprite.alpha = 0.7 + 0.3 * Math.sin(this.filterProgress);
        this.filterProgress += 0.001 * delta;

        super.update(delta);
    }
}
