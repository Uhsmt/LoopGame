import * as PIXI from "pixi.js";
import { GlowFilter } from "pixi-filters";
import { Butterfly } from "./Butterfly";

export class SpecialButterfly extends Butterfly {
    private glowProgress: number = 0;
    private glow: GlowFilter;
    hitRate: number = 0.4;

    constructor(color: number, screenSize: { x: number; y: number }) {
        super("special", color, color, 1, screenSize);

        // 金色のグローを脈動させる(小さいスプライトへのフィルタなので軽量)
        this.glow = new GlowFilter({
            distance: 14,
            outerStrength: 2.5,
            innerStrength: 0.6,
            color: 0xffe066,
            quality: 0.3,
        });
        this.filters = [this.glow];

        this.hitAreaSize = this.sprite.height / 3;
    }

    update(delta: number, lineSegments: PIXI.Point[]): void {
        // グローの強さをふわ〜っと脈動させる
        this.glowProgress += 0.003 * delta;
        this.glow.outerStrength = 2.2 + 1.5 * Math.sin(this.glowProgress);

        super.update(delta, lineSegments);
    }

    protected getObjectCenter(): { x: number; y: number } {
        return {
            x: this.x - this.spriteWith / 2, // sprite.widthはflapで変わるので、固定値のspriteWithを使う
            y: this.y - this.sprite.height / 2,
        };
    }
}
