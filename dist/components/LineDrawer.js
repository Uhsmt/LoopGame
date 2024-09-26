import * as PIXI from 'pixi.js';
import { EventEmitter } from 'events';
export class LineDrawer extends EventEmitter {
    constructor(app, color = 0xffffff) {
        super();
        this.startPoint = null;
        this.segments = [];
        this.lineDrawTime = 1000;
        this.lineColor = 0xffffff;
        this.app = app;
        this.lineColor = color;
        this.graphics = new PIXI.Graphics();
        this.app.stage.addChild(this.graphics);
        this.setupInteraction();
    }
    cleanup() {
        // イベントリスナーを削除
        if (this.pointerMoveHandler) {
            this.app.stage.removeEventListener('pointermove', this.pointerMoveHandler);
        }
        if (this.graphics) {
            this.graphics.destroy();
            this.app.stage.removeChild(this.graphics);
        }
        this.startPoint = null;
    }
    setupInteraction() {
        this.pointerMoveHandler = (e) => {
            this.onPointerMove(e.data.global.x, e.data.global.y);
        };
        this.app.stage.addEventListener('pointermove', this.pointerMoveHandler);
    }
    onPointerMove(x, y) {
        if (!this.startPoint) {
            // 線の描画開始点が未設定の場合、現在の位置を開始点とする
            this.startPoint = new PIXI.Point(x, y);
            this.graphics.moveTo(this.startPoint.x, this.startPoint.y);
        }
        else {
            // 既に開始点が設定されている場合、線を描画
            const endPoint = new PIXI.Point(x, y);
            const segment = new PIXI.Graphics();
            segment.moveTo(this.startPoint.x, this.startPoint.y);
            segment.lineTo(endPoint.x, endPoint.y).stroke({ width: 2, color: this.lineColor });
            this.app.stage.addChild(segment);
            this.segments.push({ start: this.startPoint, end: endPoint, graphics: segment });
            // セグメントを削除
            setTimeout(() => {
                this.app.stage.removeChild(segment);
                segment.destroy();
            }, this.lineDrawTime);
            // ループ完成のチェック
            const loopSegments = this.getLoopSegments(this.startPoint, endPoint);
            if (loopSegments.length > 0) {
                this.fillLoopArea(loopSegments);
                this.clearAllSegments();
            }
            // 次のセグメントの開始点を更新
            this.startPoint = endPoint;
        }
    }
    getLoopSegments(start, end) {
        const loopSegments = [];
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
    doLinesIntersect(p1, p2, p3, p4) {
        const d1 = this.direction(p3, p4, p1);
        const d2 = this.direction(p3, p4, p2);
        const d3 = this.direction(p1, p2, p3);
        const d4 = this.direction(p1, p2, p4);
        if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
            return true;
        }
        return false;
    }
    direction(p1, p2, p3) {
        return (p3.x - p1.x) * (p2.y - p1.y) - (p2.x - p1.x) * (p3.y - p1.y);
    }
    fillLoopArea(loopSegments) {
        const fillGraphics = new PIXI.Graphics();
        fillGraphics.moveTo(loopSegments[0].start.x, loopSegments[0].start.y);
        for (const segment of loopSegments) {
            fillGraphics.lineTo(segment.end.x, segment.end.y);
        }
        fillGraphics.lineTo(loopSegments[0].start.x, loopSegments[0].start.y); // 閉じる
        fillGraphics.fill({ color: 0xffffff, alpha: 0.5 });
        this.app.stage.addChild(fillGraphics);
        this.emit('loopAreaCompleted', fillGraphics);
        // アニメーションで透明度を徐々に減少させる
        const fadeOut = () => {
            if (fillGraphics.alpha > 0) {
                fillGraphics.alpha -= 0.01;
                requestAnimationFrame(fadeOut);
            }
            else {
                this.app.stage.removeChild(fillGraphics);
                fillGraphics.destroy();
            }
        };
        fadeOut();
    }
    clearAllSegments() {
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
}
//# sourceMappingURL=LineDrawer.js.map