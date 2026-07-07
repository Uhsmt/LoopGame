import * as PIXI from "pixi.js";
import * as Utility from "../utils/Utility";
import { BaseObstacle } from "./BaseObstacle";

/**
 * お邪魔オブジェクト「イモムシ(Catapy)」
 * - 2枚の画像を交互表示するゆっくりとした尺取り虫的な歩行アニメーション
 * - Spider(0.35)よりさらに遅い速度で、ほぼ水平方向(±20度)にランダムな向きへ這う
 * - 180〜300フレームごとに別のランダムな水平寄り方向へ転換する
 * - ラインに触れても無害(reactsToLine = false)。単体で3回囲むと消える、
 *   蝶と一緒に囲むとループ自体が無効になる(判定自体はGameplayState側で実装)
 */
export class Catapy extends BaseObstacle {
    /** 単体で囲まれるとこの回数で消える */
    static readonly REQUIRED_LOOP_COUNT = 3;
    private loopedCount = 0;
    readonly description: string = "Voids any loop that contains it";
    readonly descriptionJP: string = "いっしょに かこむと ループむこう";

    constructor(screenSize: { x: number; y: number }) {
        super(["catapy1", "catapy2"], 0.192, screenSize);
        this.hitAreaSize = 28;
        this.animIntervalMs = 400;
        this.reactsToLine = false;
        // 体が少しでもループに含まれていたら「入っている」と判定する
        this.hitRate = 0;
        // Spider(0.35)よりさらに遅い
        this.moveSpeed = 0.2;
        this.turnFrameMin = 180;
        this.turnFrameMax = 300;
        this.pickNewDirection();
    }

    /**
     * 単体で囲まれた時に呼ぶ
     * @returns true: 規定回数(3回)に達した(=消えるべき)
     */
    countLoop(): boolean {
        this.loopedCount += 1;
        if (this.loopedCount >= Catapy.REQUIRED_LOOP_COUNT) {
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

    /** イモムシらしく、左右どちらかの水平±20度からランダムに選ぶ */
    protected pickDirectionAngleDeg(): number {
        const baseAngleDeg = Utility.chooseAtRandom([0, 180], 1)[0];
        return baseAngleDeg + Utility.random(-20, 20);
    }

    /**
     * 横長の体に合わせて楕円状にサンプリングする
     * (基底の円判定だと長い体の端がループに入っていても検出できないため)
     */
    protected hitAreaPoints(): PIXI.Point[] {
        const points: PIXI.Point[] = [];
        const center = this.getObjectCenter();
        const radiusX = this.width / 2;
        const radiusY = this.height / 2;
        for (let i = 0; i < 36; i++) {
            const angle = (i * 10 * Math.PI) / 180;
            points.push(
                new PIXI.Point(
                    center.x + Math.cos(angle) * radiusX,
                    center.y + Math.sin(angle) * radiusY,
                ),
            );
        }
        return points;
    }
}
