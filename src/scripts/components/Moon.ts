import * as PIXI from "pixi.js";
import { PlanetBase } from "./PlanetBase";
import * as Const from "../utils/Const";

export class Moon extends PlanetBase {
    constructor() {
        super();
        // normal sprite
        const sprite = PIXI.Sprite.from("moon");
        sprite.anchor.set(0.5);
        this.alpha = 1;
        this.angle = -30;
        this.scale.set(0.7);
        this.addChild(sprite);
    }

    stopBlink(): void {
        // not implemented
    }
    blink(): void {
        // not implemented
    }

    move(progress: number, screen_width: number, screen_height: number): void {
        const startX = Const.MARGIN;
        const endX = screen_width - Const.MARGIN;
        const startY = Const.MARGIN;
        const peakY = Const.MARGIN + (screen_height - Const.MARGIN * 2) * 0.3;

        const x = startX + progress * (endX - startX);
        const y = startY + 4 * peakY * progress * (1 - progress);

        if (x > endX) {
            this.position.set(endX, Const.MARGIN);
        } else {
            this.position.set(x, y);
        }
    }
}
