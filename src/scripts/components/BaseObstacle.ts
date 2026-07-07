import * as PIXI from "pixi.js";
import * as Utility from "../utils/Utility";
import * as Const from "../utils/Const";
import { BaseCaptureableObject } from "./BaseCaptureableObject";

/**
 * お邪魔オブジェクトの基底クラス
 * - 複数画像の交互表示による歩行アニメーション(1枚なら静止画)
 * - 鉛筆ライン(描画中の線分)との接触判定
 * - ライン接触後は効果を1度だけ発動し、画面外へ退場する
 */
export abstract class BaseObstacle extends BaseCaptureableObject {
    protected sprites: PIXI.Sprite[] = [];
    /** 歩行アニメーションのコマ切り替え間隔(ms) */
    protected animIntervalMs: number = 250;
    private animElapsedMs: number = 0;
    private frameIndex: number = 0;

    /** ラインに触れると効果を発動して退場するか(catapyはfalse) */
    protected reactsToLine: boolean = true;
    /** 退場時の移動速度(1フレーム16msあたりのpx) */
    protected leaveSpeed: number = 1.5;

    isActive: boolean = false;
    isLeaving: boolean = false;
    /** 画面外へ出た(削除待ち) */
    isGone: boolean = false;
    private hasTouchedLine: boolean = false;
    private justHitLine: boolean = false;
    private isHitLineBeforeFrame: boolean = false;
    private leaveDirection: { x: number; y: number } | null = null;

    readonly screenSize: { x: number; y: number };

    constructor(
        textureAliases: string[],
        scale: number,
        screenSize: { x: number; y: number },
    ) {
        super();
        this.screenSize = screenSize;
        this.alpha = 0;

        textureAliases.forEach((alias, index) => {
            const sprite = PIXI.Sprite.from(alias);
            sprite.anchor.set(0.5);
            sprite.scale.set(scale);
            sprite.visible = index === 0;
            this.sprites.push(sprite);
            this.addChild(sprite);
        });
    }

    /** 種別ごとの移動ロジック */
    protected abstract move(delta: number): void;

    protected getObjectCenter(): { x: number; y: number } {
        return { x: this.x, y: this.y };
    }

    appear(fadeIn: boolean = true): void {
        this.isActive = true;
        if (!fadeIn) {
            this.alpha = 1;
            return;
        }
        const fadeInStep = () => {
            // 破棄済みならループを止める(リーク防止)
            if (this.destroyed) {
                return;
            }
            if (this.alpha < 1) {
                this.alpha = Math.min(this.alpha + 0.07, 1);
                requestAnimationFrame(fadeInStep);
            }
        };
        fadeInStep();
    }

    setRandomInitialPosition(screenWidth: number, screenHeight: number): void {
        const positions = ["top", "bottom", "left", "right"];
        const position = Utility.chooseAtRandom(positions, 1)[0];
        const top_y = Const.MARGIN;
        const bottom_y = screenHeight - Const.MARGIN;
        const left_x = Const.MARGIN;
        const right_x = screenWidth - Const.MARGIN;

        let x, y;
        switch (position) {
            case "top":
                x = Utility.random(left_x, right_x);
                y = top_y + this.height / 2;
                break;
            case "bottom":
                x = Utility.random(left_x, right_x);
                y = bottom_y - this.height / 2;
                break;
            case "left":
                x = left_x + this.width / 2;
                y = Utility.random(top_y, bottom_y);
                break;
            default:
                x = right_x - this.width / 2;
                y = Utility.random(top_y, bottom_y);
                break;
        }
        this.position.set(x, y);
        this.x = x;
        this.y = y;
    }

    update(delta: number, lineSegments: PIXI.Point[]): void {
        if (!this.isActive || this.isGone) {
            return;
        }
        this.animate(delta);
        if (this.isLeaving) {
            this.moveToLeave(delta);
            return;
        }
        this.move(delta);
        if (this.reactsToLine) {
            this.checkLineHit(lineSegments);
        }
    }

    /**
     * ラインに当たった直後の1回だけtrueを返す(効果発動のトリガー用)
     */
    consumeLineHit(): boolean {
        if (this.justHitLine) {
            this.justHitLine = false;
            return true;
        }
        return false;
    }

    private animate(delta: number): void {
        if (this.sprites.length < 2) {
            return;
        }
        this.animElapsedMs += delta;
        if (this.animElapsedMs >= this.animIntervalMs) {
            this.animElapsedMs = 0;
            this.sprites[this.frameIndex].visible = false;
            this.frameIndex = (this.frameIndex + 1) % this.sprites.length;
            this.sprites[this.frameIndex].visible = true;
        }
    }

    private checkLineHit(lineSegments: PIXI.Point[]): void {
        const center = this.getObjectCenter();
        const isHitLine = lineSegments.some((segment) => {
            const distance = Utility.getDistance(
                new PIXI.Point(center.x, center.y),
                segment,
            );
            return distance <= this.hitAreaSize;
        });

        if (isHitLine && !this.isHitLineBeforeFrame && !this.hasTouchedLine) {
            this.hasTouchedLine = true;
            this.justHitLine = true;
            this.startLeaving();
        }
        this.isHitLineBeforeFrame = isHitLine;
    }

    /**
     * 一番近い画面端に向かって退場を開始する
     */
    startLeaving(): void {
        if (this.isLeaving) {
            return;
        }
        this.isLeaving = true;

        const distances = [
            { x: -1, y: 0, distance: this.x }, // left
            { x: 1, y: 0, distance: this.screenSize.x - this.x }, // right
            { x: 0, y: -1, distance: this.y }, // top
            { x: 0, y: 1, distance: this.screenSize.y - this.y }, // bottom
        ];
        distances.sort((a, b) => a.distance - b.distance);
        this.leaveDirection = { x: distances[0].x, y: distances[0].y };
    }

    private moveToLeave(delta: number): void {
        if (!this.leaveDirection) {
            return;
        }
        this.x += (this.leaveDirection.x * this.leaveSpeed * delta) / 16;
        this.y += (this.leaveDirection.y * this.leaveSpeed * delta) / 16;

        const outMargin = Math.max(this.width, this.height) + 10;
        if (
            this.x < -outMargin ||
            this.x > this.screenSize.x + outMargin ||
            this.y < -outMargin ||
            this.y > this.screenSize.y + outMargin
        ) {
            this.isGone = true;
        }
    }

    /**
     * 進行方向に合わせてスプライトを左右反転する
     * @param xDirection 正: 右向きに進行中
     */
    protected faceDirection(xDirection: number): void {
        if (xDirection === 0) {
            return;
        }
        this.sprites.forEach((sprite) => {
            const absX = Math.abs(sprite.scale.x);
            // 元画像は左向きなので、右進行時に反転する
            sprite.scale.x = xDirection > 0 ? -absX : absX;
        });
    }
}
