import * as PIXI from 'pixi.js';
import { InteractionEvent } from '@pixi/interaction';

export class LineDrawer {
    graphics: PIXI.Graphics;
    private points: PIXI.Point[];
    private startPoint: PIXI.Point | null = null;

    constructor(private app: PIXI.Application) {
        this.graphics = new PIXI.Graphics();
        this.graphics.stroke({ width: 1, color: 0xffffff });
        this.app.stage.addChild(this.graphics);
        this.points = [];
        this.setupInteraction();
    }

    cleanup() {
        console.log("cleanup");
        this.app.stage.removeChild(this.graphics);
        this.graphics.destroy();
    }

    private setupInteraction(): void {
        console.log("setupInteraction");
        this.app.stage.addEventListener('pointermove', (e)=>{
            this.onPointerMove(e.global.x, e.global.y);
        });
    }

    private onPointerMove(x:number, y:number): void {
        if (!this.startPoint) {
            // 線の描画開始点が未設定の場合、現在の位置を開始点とする
            this.startPoint = new PIXI.Point(x, y);
            this.graphics.moveTo(this.startPoint.x, this.startPoint.y);
        } else {
            // 既に開始点が設定されている場合、線を描画
            this.graphics.lineTo(x, y).stroke({ width: 1, color: 0xffffff });
        }
    }

    private isLoopComplete(): boolean {
        // 簡単なループ完成検出ロジック
        // 実際の実装では、より複雑な幾何学的計算が必要かもしれません
        return this.points.length > 10 && this.pointsDistance(this.points[0], this.points[this.points.length - 1]) < 10;
    }

    private pointsDistance(p1: PIXI.Point, p2: PIXI.Point): number {
        return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
    }
}
