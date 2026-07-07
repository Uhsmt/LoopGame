import { BaseObstacle } from "./BaseObstacle";

/**
 * お邪魔オブジェクト「ハチ」
 * - 静止画1枚(歩行アニメなし)、蝶より速く直線的なジグザグ移動
 * - ランダムな方向へ30〜60フレーム直進した後、別のランダム方向へ急転換する
 * - ラインに触れるとライン短縮効果を発動する(効果自体はGameplayState側で実装)
 */
export class Bee extends BaseObstacle {
    constructor(screenSize: { x: number; y: number }) {
        super(["bee"], 0.16, screenSize);
        this.hitAreaSize = 16;
        this.leaveSpeed = 3;
        // 小蝶(0.6)よりずっと速く、長い距離を一気に直進するジグザグ飛行
        this.moveSpeed = 2.4;
        this.turnFrameMin = 120;
        this.turnFrameMax = 240;
        this.pickNewDirection();
    }
}
