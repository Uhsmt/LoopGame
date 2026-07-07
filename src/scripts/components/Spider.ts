import { BaseObstacle } from "./BaseObstacle";

/**
 * お邪魔オブジェクト「クモ」
 * - 2枚の画像を交互表示するゆっくりとした歩行アニメーション
 * - 一番遅い蝶(large)くらいの速さでランダムな方向へゆっくり直進し、
 *   120〜180フレームごとに別のランダム方向へ転換する
 * - ラインに触れると鉛筆から逃げる効果を発動する(効果自体はGameplayState側で実装)
 */
export class Spider extends BaseObstacle {
    constructor(screenSize: { x: number; y: number }) {
        super(["spider1", "spider2"], 0.18, screenSize);
        this.hitAreaSize = 18;
        this.animIntervalMs = 300;
        // 一番遅い蝶(large: 0.4/0.3)くらいの速さ
        this.moveSpeed = 0.35;
        this.turnFrameMin = 120;
        this.turnFrameMax = 180;
        this.pickNewDirection();
    }
}
