import * as PIXI from "pixi.js";
import { EventEmitter } from "events";
import * as Const from "../utils/Const";

export class LineDrawer extends EventEmitter {
    private app: PIXI.Application;
    private graphics: PIXI.Graphics;
    private startPoint: PIXI.Point | null = null;
    private segments: {
        start: PIXI.Point;
        end: PIXI.Point;
        graphics: PIXI.Graphics;
    }[] = [];
    readonly originalLineDrawTime: number = 1000;
    readonly originalLineColor: number = 0xffffff;
    private lineDrawTime: number;
    private lineColor: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pointerMoveHandler: any;

    constructor(app: PIXI.Application, color: number = 0xffffff) {
        super();
        this.app = app;
        this.originalLineColor = color;
        this.lineDrawTime = this.originalLineDrawTime;
        this.lineColor = color;
        this.graphics = new PIXI.Graphics();
        this.app.stage.addChild(this.graphics);
        this.setupInteraction();
    }

    cleanup() {
        // イベントリスナーを削除
        if (this.pointerMoveHandler) {
            this.app.stage.removeEventListener(
                "pointermove",
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                this.pointerMoveHandler,
            );
        }
        if (this.graphics) {
            this.graphics.destroy();
            this.app.stage.removeChild(this.graphics);
        }
        this.startPoint = null;
    }

    private setupInteraction(): void {
        this.pointerMoveHandler = (e: {
            data: { global: { x: number; y: number } };
        }) => {
            this.onPointerMove(e.data.global.x, e.data.global.y);
        };
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        this.app.stage.addEventListener("pointermove", this.pointerMoveHandler);
    }

    private onPointerMove(x: number, y: number): void {
        if (x < Const.MARGIN) {
            x = Const.MARGIN - 1;
        } else if (x > this.app.screen.width - Const.MARGIN) {
            x = this.app.screen.width - Const.MARGIN + 1;
        }

        if (y < Const.MARGIN) {
            y = Const.MARGIN - 1;
        } else if (y > this.app.screen.height - Const.MARGIN) {
            y = this.app.screen.height - Const.MARGIN + 1;
        }

        if (!this.startPoint) {
            // 線の描画開始点が未設定の場合、現在の位置を開始点とする
            this.startPoint = new PIXI.Point(x, y);
            this.graphics.moveTo(this.startPoint.x, this.startPoint.y);
        } else {
            // 既に開始点が設定されている場合、線を描画
            const endPoint = new PIXI.Point(x, y);
            const segment = new PIXI.Graphics();
            segment.moveTo(this.startPoint.x, this.startPoint.y);
            segment
                .lineTo(endPoint.x, endPoint.y)
                .stroke({ width: 2.5, color: this.lineColor });
            this.app.stage.addChild(segment);
            const segmentObj = {
                start: this.startPoint,
                end: endPoint,
                graphics: segment,
            };
            this.segments.push(segmentObj);

            // セグメントを削除
            setTimeout(() => {
                this.app.stage.removeChild(segment);
                // 自分より前のセグメントをすべてdestroyする(lineDrawTime変更対策)
                const index = this.segments.indexOf(segmentObj);
                for (let i = 0; i < index; i++) {
                    this.app.stage.removeChild(this.segments[i].graphics);
                    this.segments[i].graphics.destroy();
                    this.segments.shift();
                }
            }, this.lineDrawTime);

            // ループ完成のチェック
            const loopSegments = this.getLoopSegments(
                this.startPoint,
                endPoint,
            );
            if (loopSegments.length > 0) {
                this.fillLoopArea(loopSegments);
                this.clearAllSegments();
            }

            // 次のセグメントの開始点を更新
            this.startPoint = endPoint;
        }
    }

    private getLoopSegments(
        start: PIXI.Point,
        end: PIXI.Point,
    ): { start: PIXI.Point; end: PIXI.Point; graphics: PIXI.Graphics }[] {
        const loopSegments: {
            start: PIXI.Point;
            end: PIXI.Point;
            graphics: PIXI.Graphics;
        }[] = [];
        let foundIntersection = false;

        for (let i = 0; i < this.segments.length - 1; i++) {
            const segment = this.segments[i];
            if (this.doLinesIntersect(segment.start, segment.end, start, end)) {
                foundIntersection = true;
            }
            if (foundIntersection) {
                loopSegments.push(segment);
            }
        }

        if (foundIntersection) {
            loopSegments.push({ start, end, graphics: new PIXI.Graphics() });
        }

        return loopSegments;
    }

    private doLinesIntersect(
        p1: PIXI.Point,
        p2: PIXI.Point,
        p3: PIXI.Point,
        p4: PIXI.Point,
    ): boolean {
        const d1 = this.direction(p3, p4, p1);
        const d2 = this.direction(p3, p4, p2);
        const d3 = this.direction(p1, p2, p3);
        const d4 = this.direction(p1, p2, p4);
        if (
            ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
            ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
        ) {
            return true;
        }
        return false;
    }

    private direction(p1: PIXI.Point, p2: PIXI.Point, p3: PIXI.Point): number {
        return (p3.x - p1.x) * (p2.y - p1.y) - (p2.x - p1.x) * (p3.y - p1.y);
    }

    private fillLoopArea(
        loopSegments: {
            start: PIXI.Point;
            end: PIXI.Point;
            graphics: PIXI.Graphics;
        }[],
    ): void {
        const fillGraphics = new PIXI.Graphics();
        fillGraphics.moveTo(loopSegments[0].start.x, loopSegments[0].start.y);

        for (const segment of loopSegments) {
            fillGraphics.lineTo(segment.end.x, segment.end.y);
        }

        fillGraphics.lineTo(loopSegments[0].start.x, loopSegments[0].start.y); // 閉じる
        fillGraphics.fill({ color: 0xffffff, alpha: 0.5 });
        this.app.stage.addChild(fillGraphics);
        this.emit("loopAreaCompleted", fillGraphics);

        // アニメーションで透明度を徐々に減少させる
        const fadeOut = () => {
            if (fillGraphics.alpha > 0) {
                fillGraphics.alpha -= 0.01;
                requestAnimationFrame(fadeOut);
            } else {
                this.app.stage.removeChild(fillGraphics);
                fillGraphics.destroy();
            }
        };

        fadeOut();
    }

    clearAllSegments(): void {
        for (const segment of this.segments) {
            this.app.stage.removeChild(segment.graphics);
            segment.graphics.destroy();
        }
        this.segments = [];
        if (this.graphics) {
            this.graphics.clear();
        }
        this.startPoint = null;
    }

    setLineColor(color: number): void {
        this.lineColor = color;
    }

    setLineDrawTime(time: number): void {
        this.lineDrawTime = time;
    }

    getSegmentPoints(): PIXI.Point[] {
        const res = [];
        if (this.startPoint) {
            res.push(this.startPoint);
        }
        res.push(...this.segments.map((segment) => segment.end));
        return res;
    }
}
