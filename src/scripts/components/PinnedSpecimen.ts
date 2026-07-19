import * as PIXI from "pixi.js";
import { Butterfly } from "./Butterfly";
import { SpecialButterfly } from "./SpecialButterfly";
import { CapturedSpecimen } from "./StageInformation";

const PIN_SCALE = 0.026;
const PIN_SCALE_SPECIAL = 0.04;
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

        const pin = PIXI.Sprite.from("pin");
        pin.anchor.set(PIN_ANCHOR.x, PIN_ANCHOR.y);
        pin.scale.set(specimen.isSpecial ? PIN_SCALE_SPECIAL : PIN_SCALE);
        this.addChild(pin);
        this.pinSprite = pin;
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
        return this.butterfly;
    }
}
