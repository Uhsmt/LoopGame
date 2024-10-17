import * as PIXI from "pixi.js";

export class BaseCaptureableObject extends PIXI.Container {
    spriteWith!: number;
    sprite!: PIXI.Sprite;
    hitAreaSize: number = 10;

    constructor() {
        super();
    }

    isHit(loopArea: PIXI.Graphics): boolean {
        const objectCenter = {
            x: this.x - this.spriteWith / 2,
            y: this.y - this.height / 2,
        };
        const points: PIXI.Point[] = [];

        for (let i = 0; i < 36; i++) {
            const angle = (i * 10 * Math.PI) / 180;
            const x = objectCenter.x + Math.cos(angle) * this.hitAreaSize;
            const y = objectCenter.y + Math.sin(angle) * this.hitAreaSize;
            points.push(new PIXI.Point(x, y));
        }

        // ループエリア内のpointの数がhitsRateを超えていれば、ループエリア内と判定
        const hitsRate = 0.7;
        let hits = 0;
        points.forEach((point) => {
            if (loopArea.containsPoint(point)) {
                hits++;
            }
        });
        return hits / points.length > hitsRate;
    }

    delete() {
        // アニメーションで透明度を徐々に減少させる
        const fadeOut = () => {
            if (this.alpha > 0) {
                this.alpha -= 0.02;
                requestAnimationFrame(fadeOut);
            } else {
                this.destroy();
                this.removeFromParent();
            }
        };
        fadeOut();
    }
}
