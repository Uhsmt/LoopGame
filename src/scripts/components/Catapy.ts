import * as Utility from "../utils/Utility";
import { BaseObstacle } from "./BaseObstacle";

/**
 * お邪魔オブジェクト「イモムシ(Catapy)」
 * - 2枚の画像を交互表示するゆっくりとした尺取り虫的な歩行アニメーション
 * - Spider(0.35)よりさらに遅い速度で、ほぼ水平方向(±20度)にランダムな向きへ這う
 * - 180〜300フレームごとに別のランダムな水平寄り方向へ転換する
 * - ラインに触れても無害(reactsToLine = false)。単体で囲むと退場、
 *   蝶と一緒に囲むとループ自体が無効になる(判定自体はGameplayState側で実装)
 */
export class Catapy extends BaseObstacle {
    constructor(screenSize: { x: number; y: number }) {
        super(["catapy1", "catapy2"], 0.08, screenSize);
        this.hitAreaSize = 12;
        this.animIntervalMs = 400;
        this.reactsToLine = false;
        // Spider(0.35)よりさらに遅い
        this.moveSpeed = 0.2;
        this.turnFrameMin = 180;
        this.turnFrameMax = 300;
        this.pickNewDirection();
    }

    /** イモムシらしく、左右どちらかの水平±20度からランダムに選ぶ */
    protected pickDirectionAngleDeg(): number {
        const baseAngleDeg = Utility.chooseAtRandom([0, 180], 1)[0];
        return baseAngleDeg + Utility.random(-20, 20);
    }
}
