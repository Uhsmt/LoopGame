import * as PIXI from "pixi.js";
import { PlanetBase } from "./PlanetBase";
import * as Const from "../utils/Const";

// 発光の明滅の周期(ms)。値が小さいほど点滅が速くなる
const BLINK_PERIOD_MS = 500;
// 明滅時の最小alpha(0にすると消えてしまうため下限を設ける)
const BLINK_MIN_ALPHA = 0.35;

export class Moon extends PlanetBase {
    public blinking: boolean;
    private sprite: PIXI.Sprite;
    private blinkTicker: PIXI.Ticker | null = null;
    private blinkElapsed: number = 0;

    constructor() {
        super();
        this.blinking = false;
        // normal sprite
        const sprite = PIXI.Sprite.from("moon");
        sprite.anchor.set(0.5);
        this.alpha = 1;
        this.angle = -30;
        this.scale.set(0.7);
        this.addChild(sprite);
        this.sprite = sprite;
    }

    blink(): void {
        if (this.blinking) return;
        this.blinking = true;
        this.blinkElapsed = 0;
        this.blinkTicker = new PIXI.Ticker();
        this.blinkTicker.add(() => {
            this.blinkElapsed += this.blinkTicker!.deltaMS;
            const cycle =
                (Math.sin((this.blinkElapsed / BLINK_PERIOD_MS) * Math.PI * 2) +
                    1) /
                2;
            this.sprite.alpha = BLINK_MIN_ALPHA + cycle * (1 - BLINK_MIN_ALPHA);
        });
        this.blinkTicker.start();
    }

    stopBlink(): void {
        if (!this.blinking) return;
        this.blinking = false;
        this.blinkTicker?.stop();
        this.blinkTicker?.destroy();
        this.blinkTicker = null;
        this.sprite.alpha = 1;
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
