import * as Utility from "../utils/Utility";
import * as Const from "../utils/Const";
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
    /** 1フレーム16msあたりの移動px(Spider(0.35)よりさらに遅い) */
    private readonly speed = 0.2;
    private directionX = 0;
    private directionY = 0;
    private frameCount = 0;
    private turnFrame = 0;

    constructor(screenSize: { x: number; y: number }) {
        super(["catapy1", "catapy2"], 0.08, screenSize);
        this.hitAreaSize = 12;
        this.animIntervalMs = 400;
        this.reactsToLine = false;
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

    /**
     * ほぼ水平な方向(左右どちらかの±20度)と直進フレーム数(180〜300)を決め直す
     */
    private pickNewDirection(): void {
        this.frameCount = 0;
        this.turnFrame = Utility.random(180, 300);
        const baseAngleDeg = Utility.chooseAtRandom([0, 180], 1)[0];
        const offsetDeg = Utility.random(-20, 20);
        const angleRad = ((baseAngleDeg + offsetDeg) * Math.PI) / 180;
        this.directionX = Math.cos(angleRad);
        this.directionY = Math.sin(angleRad);
    }
}
