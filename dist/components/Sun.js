import * as PIXI from 'pixi.js';
export class Sun extends PIXI.Container {
    constructor() {
        super(); // 親クラスのコンストラクタを呼び出す
        this.blinking = false;
        const sprite = PIXI.Sprite.from('sun');
        sprite.scale.set(0.7);
        sprite.anchor.set(0.5);
        this.addChild(sprite);
    }
    blink() {
        if (this.blinking)
            return;
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
}
//# sourceMappingURL=Sun.js.map