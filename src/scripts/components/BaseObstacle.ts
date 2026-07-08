import * as PIXI from "pixi.js";
import * as Utility from "../utils/Utility";
import * as Const from "../utils/Const";
import { BaseCaptureableObject } from "./BaseCaptureableObject";

/**
 * お邪魔オブジェクトの基底クラス
 * - 複数画像の交互表示による歩行アニメーション(1枚なら静止画)
 * - 鉛筆ライン(描画中の線分)との接触判定
 * - ライン接触後は効果を1度だけ発動し、画面外へ退場する
 * - 単体でループに囲まれると反応し、3回囲まれると消える(全種共通)
 */
export abstract class BaseObstacle extends BaseCaptureableObject {
    /**
     * 単体で囲まれるとこの回数で消える。
     * note: この「3回囲むと消える」仕様は隠し要素として、How To Playの
     * 説明文(description/descriptionJP)にはあえて書いていない
     */
    static readonly REQUIRED_LOOP_COUNT = 3;
    private loopedCount = 0;
    protected sprites: PIXI.Sprite[] = [];
    /** 歩行アニメーションのコマ切り替え間隔(ms) */
    protected animIntervalMs: number = 250;
    private animElapsedMs: number = 0;
    private frameIndex: number = 0;

    /** ラインに触れると効果を発動して退場するか(catapyはfalse) */
    protected reactsToLine: boolean = true;
    /** 退場時の移動速度(1フレーム16msあたりのpx) */
    protected leaveSpeed: number = 1.5;

    // 徘徊(wander)移動のパラメータ。サブクラスのコンストラクタで設定して
    // 最後にpickNewDirection()を呼ぶ
    /** 1フレーム16msあたりの移動px */
    protected moveSpeed: number = 0.35;
    /** 直進フレーム数の範囲(この間隔でランダムに方向転換する) */
    protected turnFrameMin: number = 120;
    protected turnFrameMax: number = 180;
    private directionX: number = 0;
    private directionY: number = 0;
    private frameCount: number = 0;
    private turnFrame: number = 0;

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

    /**
     * 共通の移動ロジック: 一定フレームごとにランダムへ方向転換しながら
     * 直進し、画面端(MARGIN内側)で反射する
     */
    protected move(delta: number): void {
        const left = Const.MARGIN;
        const right = this.screenSize.x - Const.MARGIN;
        const top = Const.MARGIN;
        const bottom = this.screenSize.y - Const.MARGIN;

        // 一定フレーム進んだらランダムに方向転換
        this.frameCount += 1;
        if (this.frameCount >= this.turnFrame) {
            this.pickNewDirection();
        }

        // 画面端(MARGIN内側)に達したら反射する
        if (this.directionX < 0 && this.x <= left) {
            this.directionX = Math.abs(this.directionX);
        } else if (this.directionX > 0 && this.x >= right) {
            this.directionX = -Math.abs(this.directionX);
        }
        if (this.directionY < 0 && this.y <= top) {
            this.directionY = Math.abs(this.directionY);
        } else if (this.directionY > 0 && this.y >= bottom) {
            this.directionY = -Math.abs(this.directionY);
        }

        this.x += (this.directionX * this.moveSpeed * delta) / 16;
        this.y += (this.directionY * this.moveSpeed * delta) / 16;

        this.faceDirection(this.directionX);
    }

    /** ランダムな方向(単位ベクトル)と直進フレーム数を決め直す */
    protected pickNewDirection(): void {
        this.frameCount = 0;
        this.turnFrame = Utility.random(this.turnFrameMin, this.turnFrameMax);
        const angleRad = (this.pickDirectionAngleDeg() * Math.PI) / 180;
        this.directionX = Math.cos(angleRad);
        this.directionY = Math.sin(angleRad);
    }

    /** 進行方向の角度(度)を選ぶ。デフォルトは全方位ランダム */
    protected pickDirectionAngleDeg(): number {
        return Utility.random(0, 359);
    }

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
     * 単体で囲まれた時に呼ぶ
     * @returns true: 規定回数(3回)に達した(=消えるべき)
     */
    countLoop(): boolean {
        this.loopedCount += 1;
        if (this.loopedCount >= BaseObstacle.REQUIRED_LOOP_COUNT) {
            return true;
        }
        // まだ消えない間は、囲まれた手応えとして一瞬薄くなって戻る
        this.flash();
        return false;
    }

    /** 一瞬薄くして徐々に戻す(囲まれた時のリアクション) */
    private flash(): void {
        this.alpha = 0.3;
        const restore = () => {
            // 破棄済みならループを止める(リーク防止)
            if (this.destroyed) {
                return;
            }
            if (this.alpha < 1) {
                this.alpha = Math.min(this.alpha + 0.05, 1);
                requestAnimationFrame(restore);
            }
        };
        restore();
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
