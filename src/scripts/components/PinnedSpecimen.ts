import * as PIXI from "pixi.js";
import { Butterfly } from "./Butterfly";
import { SpecialButterfly } from "./SpecialButterfly";
import { CapturedSpecimen } from "./StageInformation";

const PIN_SCALE = 0.026;
const PIN_SCALE_SPECIAL = 0.04;

// リザルト表示中の「たまにちょっとブルブル」の周期と振れ幅。
// 静止期間をはさんで短いバーストだけ、ごく控えめに震える
export const IDLE_TREMBLE_QUIET_MS = 2200;
export const IDLE_TREMBLE_BURST_MS = 280;
const IDLE_TREMBLE_AMPLITUDE = 1.2;
// pin.png(1024x1024)は針を下に伸ばした構図のため、頭(円盤)部分の中心は
// 画像中心(0.5, 0.5)ではなく縦42.1%あたりにある。anchorをそこに合わせないと
// 頭が中心からずれて見える(実測: 頭部分だけの外接矩形/アルファ重心 ≒ (0.500, 0.421))
const PIN_ANCHOR = { x: 0.5, y: 0.421 };

/**
 * ノート型リザルト画面で、実際に捕まえた1匹を標本のようにピン留め表示する。
 *
 * 注意: Butterflyは内部でpivotを(width/2, height/2)に設定しているため、
 * 単純に(0,0)へ配置すると見た目の中心がPinnedSpecimenの原点からずれる
 * (pivotぶん左上に寄る)。そのためbutterfly.x/yをwidth/2, height/2へ
 * 明示的にずらして、見た目の中心をこのコンテナの原点(0,0)に一致させている。
 * ピンもその原点(頭の実際の中心)に合わせて置くので、サイズに関わらず
 * 体の中心に刺さって見える。
 */
export class PinnedSpecimen extends PIXI.Container {
    readonly butterfly: Butterfly;
    private pinSprite: PIXI.Sprite | null;
    /** 蝶の基準位置(pivot打ち消し後)。震えはこの周りの微小オフセットで表す */
    private readonly butterflyBaseX: number;
    private readonly butterflyBaseY: number;
    private idleClockMs = 0;

    constructor(
        specimen: CapturedSpecimen,
        screenSize: { x: number; y: number },
    ) {
        super();

        this.butterfly = specimen.isSpecial
            ? new SpecialButterfly(specimen.color, screenSize)
            : new Butterfly(
                  specimen.sizeCategory,
                  specimen.color,
                  specimen.color,
                  1,
                  screenSize,
              );
        this.butterfly.isFlying = false;
        this.butterfly.isFlapping = false;
        this.butterfly.appear(false);
        this.addChild(this.butterfly);
        // pivotによる見た目のずれを打ち消し、蝶の中心をこのコンテナの原点に合わせる
        this.butterfly.x = this.butterfly.width / 2;
        this.butterfly.y = this.butterfly.height / 2;
        this.butterflyBaseX = this.butterfly.x;
        this.butterflyBaseY = this.butterfly.y;

        const pin = PIXI.Sprite.from("pin");
        pin.anchor.set(PIN_ANCHOR.x, PIN_ANCHOR.y);
        pin.scale.set(specimen.isSpecial ? PIN_SCALE_SPECIAL : PIN_SCALE);
        this.addChild(pin);
        this.pinSprite = pin;
    }

    /**
     * リザルト表示中に毎フレーム呼ぶ。生きているスペシャル個体らしく、
     * 静止期間(IDLE_TREMBLE_QUIET_MS)をはさんで、たまに短いバーストだけ
     * かすかにブルブルと震える。ピンが外れたあとは震えない
     * (飛行の位置駆動はコンテナ自身のx/yを動かす側が担う)。
     */
    update(deltaMS: number): void {
        if (!this.pinSprite) return;
        this.idleClockMs += deltaMS;

        const cycle = IDLE_TREMBLE_QUIET_MS + IDLE_TREMBLE_BURST_MS;
        const phase = this.idleClockMs % cycle;
        if (phase < IDLE_TREMBLE_QUIET_MS) {
            this.butterfly.x = this.butterflyBaseX;
            this.butterfly.y = this.butterflyBaseY;
            return;
        }
        // 高周波(周期~70ms)の微小な揺れ。x/yで周波数と位相をずらして
        // 単調な振動に見えないようにする
        const t = phase - IDLE_TREMBLE_QUIET_MS;
        this.butterfly.x =
            this.butterflyBaseX + Math.sin(t * 0.09) * IDLE_TREMBLE_AMPLITUDE;
        this.butterfly.y =
            this.butterflyBaseY +
            Math.sin(t * 0.07 + 1.3) * IDLE_TREMBLE_AMPLITUDE * 0.6;
    }

    /**
     * ピンだけを取り外し、中の蝶を返す(夢演出でその場から飛び立たせる際に使う)。
     * 蝶自身はこのコンテナの子のまま残すため、以降は本コンテナのx/yを
     * 動かせばそのまま蝶が動く(再親付け不要)。
     */
    unpinAndRelease(): Butterfly {
        if (this.pinSprite) {
            this.removeChild(this.pinSprite);
            this.pinSprite.destroy();
            this.pinSprite = null;
        }
        // 震えの途中で外れても、ずれたまま飛び立たないよう基準位置へ戻す
        this.butterfly.x = this.butterflyBaseX;
        this.butterfly.y = this.butterflyBaseY;
        return this.butterfly;
    }
}
