import * as Utility from "../utils/Utility";
import * as Const from "../utils/Const";
import { BaseObstacle } from "./BaseObstacle";

/**
 * お邪魔オブジェクト「クモ」
 * - 2枚の画像を交互表示するゆっくりとした歩行アニメーション
 * - 一番遅い蝶(large)くらいの速さでランダムな方向へゆっくり直進し、
 *   120〜180フレームごとに別のランダム方向へ転換する
 * - ラインに触れると鉛筆から逃げる効果を発動する(効果自体はGameplayState側で実装)
 */
export class Spider extends BaseObstacle {
    /** 1フレーム16msあたりの移動px(一番遅い蝶(large: 0.4/0.3)くらい) */
    private readonly speed = 0.35;
    private directionX = 0;
    private directionY = 0;
    private frameCount = 0;
    private turnFrame = 0;

    constructor(screenSize: { x: number; y: number }) {
        super(["spider1", "spider2"], 0.09, screenSize);
        this.hitAreaSize = 9;
        this.animIntervalMs = 300;
        this.pickNewDirection();
    }

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

        this.x += (this.directionX * this.speed * delta) / 16;
        this.y += (this.directionY * this.speed * delta) / 16;

        this.faceDirection(this.directionX);
    }

    /** ランダムな方向(単位ベクトル)と直進フレーム数(120〜180)を決め直す */
    private pickNewDirection(): void {
        this.frameCount = 0;
        this.turnFrame = Utility.random(120, 180);
        const angleDeg = Utility.random(0, 359);
        const angleRad = (angleDeg * Math.PI) / 180;
        this.directionX = Math.cos(angleRad);
        this.directionY = Math.sin(angleRad);
    }
}
