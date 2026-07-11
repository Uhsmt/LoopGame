import * as PIXI from "pixi.js";

export abstract class BaseCaptureableObject extends PIXI.Container {
    protected hitAreaSize: number = 10;
    protected hitRate: number = 0.6;
    private isDeleting: boolean = false;

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

    /**
     * 指定した座標が当たり判定の円内にあるかを判定する
     * (ループで囲む isHit とは異なり、クリック/タップ1点だけの判定に使う)
     */
    containsPoint(point: { x: number; y: number }): boolean {
        if (this.alpha === 0) {
            return false;
        }
        const center = this.getObjectCenter();
        const radius = this.hitAreaSize * this.scale.y;
        const dx = point.x - center.x;
        const dy = point.y - center.y;
        return dx * dx + dy * dy <= radius * radius;
    }

    getDebugGraphics(): PIXI.Graphics {
        const points = this.hitAreaPoints();
        const graphics = new PIXI.Graphics();
        graphics.moveTo(points[0].x, points[0].y);
        points.forEach((point) => {
            graphics.lineTo(point.x, point.y);
        });
        graphics.fill(0xff0000);
        graphics.alpha = 0.5;
        return graphics;
    }

    protected hitAreaPoints(): PIXI.Point[] {
        const points: PIXI.Point[] = [];
        const center = this.getObjectCenter();
        for (let i = 0; i < 36; i++) {
            const angle = (i * 10 * Math.PI) / 180;
            const x =
                center.x + Math.cos(angle) * this.hitAreaSize * this.scale.y;
            const y =
                center.y + Math.sin(angle) * this.hitAreaSize * this.scale.y;
            points.push(new PIXI.Point(x, y));
        }
        return points;
    }

    delete(speed: number = 0.02): void {
        // 二重呼び出しでrAFループが多重に走らないようにする
        if (this.isDeleting) {
            return;
        }
        this.isDeleting = true;

        // アニメーションで透明度を徐々に減少させる
        const fadeOut = () => {
            // 外部で既に破棄されていたらループを止める(リーク防止)
            if (this.destroyed) {
                return;
            }
            if (this.alpha > 0) {
                this.alpha -= speed;
                requestAnimationFrame(fadeOut);
            } else {
                this.removeFromParent();
                this.destroy();
            }
        };
        fadeOut();
    }
}
