import * as PIXI from "pixi.js";

export abstract class BaseCaptureableObject extends PIXI.Container {
    protected hitAreaSize: number = 10;
    protected hitRate: number = 0.6;

    constructor() {
        super();
    }

    protected abstract getObjectCenter(): { x: number; y: number };

    isHit(loopArea: PIXI.Graphics): boolean {
        if (this.alpha === 0) {
            return false;
        }

        const points: PIXI.Point[] = this.hitAreaPoints();

        // ループエリア内のpointの数がhitsRateを超えていれば、ループエリア内と判定
        let hits = 0;
        points.forEach((point) => {
            if (loopArea.containsPoint(point)) {
                hits++;
            }
        });
        return hits / points.length > this.hitRate;
    }

    protected hitAreaPoints(): PIXI.Point[] {
        const points: PIXI.Point[] = [];
        const center = this.getObjectCenter();
        for (let i = 0; i < 36; i++) {
            const angle = (i * 10 * Math.PI) / 180;
            const x = center.x + Math.cos(angle) * this.hitAreaSize;
            const y = center.y + Math.sin(angle) * this.hitAreaSize;
            points.push(new PIXI.Point(x, y));
        }
        return points;
    }

    delete(speed: number = 0.02): void {
        // アニメーションで透明度を徐々に減少させる
        const fadeOut = () => {
            if (this.alpha > 0) {
                this.alpha -= speed;
                requestAnimationFrame(fadeOut);
            } else {
                this.destroy();
                this.removeFromParent();
            }
        };
        fadeOut();
    }
}
