import * as PIXI from "pixi.js";
import * as Const from "../utils/Const";

export class Sun extends PIXI.Container {
    public blinking: boolean;

    constructor() {
        super(); // 親クラスのコンストラクタを呼び出す
        this.blinking = false;
        const sprite = PIXI.Sprite.from("sun");

        sprite.scale.set(0.7);
        sprite.anchor.set(0.5);
        this.addChild(sprite);
    }

    blink(): void {
        if (this.blinking) return;
        this.blinking = true;

        const textures = [];

        for (let i = 0; i < 2; i++) {
            textures.push(PIXI.Texture.from(`sun_${i + 1}.png`));
        }
        const blinkSprite = new PIXI.AnimatedSprite(textures);

        blinkSprite.scale.set(0.7);
        blinkSprite.anchor.set(0.5);
        blinkSprite.animationSpeed = 0.03;
        blinkSprite.play();
        this.removeChildAt(0);
        this.addChild(blinkSprite);
    }

    move(progress: number, screen_width: number, screen_height: number): void {
        const startX = Const.MARGIN;
        const endX = screen_width - Const.MARGIN;
        const startY = screen_height - Const.MARGIN;
        const peakY = Const.MARGIN + (screen_height - Const.MARGIN * 2) * 0.5;

        const x = startX + progress * (endX - startX);
        const y = startY - 4 * peakY * progress * (1 - progress);

        if (x > endX) {
            this.position.set(endX, screen_height);
        } else {
            this.position.set(x, y);
        }
    }
}
