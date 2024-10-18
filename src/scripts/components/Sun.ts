import * as PIXI from "pixi.js";
import * as Const from "../utils/Const";

export class Sun extends PIXI.Container {
    public blinking: boolean;
    private sprite: PIXI.Sprite;
    private blinkSprite: PIXI.AnimatedSprite;

    constructor() {
        super(); // 親クラスのコンストラクタを呼び出す
        const scale: number = 0.7;
        this.blinking = false;

        // normal sprite
        this.sprite = PIXI.Sprite.from("sun");
        this.sprite.scale.set(scale);
        this.sprite.anchor.set(0.5);
        this.alpha = 1;
        this.addChild(this.sprite);

        // blink sprite
        const textures = [];
        for (let i = 0; i < 2; i++) {
            textures.push(PIXI.Texture.from(`sun_${i + 1}.png`));
        }
        this.blinkSprite = new PIXI.AnimatedSprite(textures);
        this.blinkSprite.scale.set(scale);
        this.blinkSprite.anchor.set(0.5);
        this.blinkSprite.animationSpeed = 0.03;
        this.blinkSprite.alpha = 0;
        this.addChild(this.blinkSprite);
    }

    blink(): void {
        if (this.blinking) return;
        this.blinking = true;
        this.sprite.alpha = 0;
        this.blinkSprite.alpha = 1;
        this.blinkSprite.play();
    }

    stopBlink(): void {
        if (!this.blinking) return;
        this.blinking = false;
        this.sprite.alpha = 1;
        this.blinkSprite.alpha = 0;
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
