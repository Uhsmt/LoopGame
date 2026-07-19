import * as PIXI from "pixi.js";
import { PlanetBase } from "./PlanetBase";
import * as Const from "../utils/Const";

// ハンモックのような揺れの周期(ms)。値が小さいほど速く揺れる
const SWAY_PERIOD_MS = 900;
// 揺れ幅(度)。基準角度を中心に左右にこの分だけ傾く
const SWAY_AMPLITUDE_DEG = 8;

export class Moon extends PlanetBase {
    public blinking: boolean;
    private sprite: PIXI.Sprite;
    private swayTicker: PIXI.Ticker | null = null;
    private swayElapsed: number = 0;
    private readonly baseAngle: number = -30;

    constructor() {
        super();
        this.blinking = false;
        // normal sprite
        const sprite = PIXI.Sprite.from("moon");
        sprite.anchor.set(0.5);
        this.alpha = 1;
        this.angle = this.baseAngle;
        this.scale.set(0.7);
        this.addChild(sprite);
        this.sprite = sprite;
    }

    // 太陽の点滅の代わりに、月をハンモックのように左右へゆっくり揺らして
    // 残り時間の緊張感を演出する
    blink(): void {
        if (this.blinking) return;
        this.blinking = true;
        this.swayElapsed = 0;
        this.swayTicker = new PIXI.Ticker();
        this.swayTicker.add(() => {
            this.swayElapsed += this.swayTicker!.deltaMS;
            const angleOffset =
                Math.sin((this.swayElapsed / SWAY_PERIOD_MS) * Math.PI * 2) *
                SWAY_AMPLITUDE_DEG;
            this.angle = this.baseAngle + angleOffset;
        });
        this.swayTicker.start();
    }

    stopBlink(): void {
        if (!this.blinking) return;
        this.blinking = false;
        this.swayTicker?.stop();
        this.swayTicker?.destroy();
        this.swayTicker = null;
        this.angle = this.baseAngle;
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
