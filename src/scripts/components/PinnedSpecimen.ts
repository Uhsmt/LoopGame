import * as PIXI from "pixi.js";
import { Butterfly } from "./Butterfly";
import { SpecialButterfly } from "./SpecialButterfly";
import { CapturedSpecimen } from "./StageInformation";

const PIN_SCALE = 0.013;
const PIN_SCALE_SPECIAL = 0.02;
// pin.png(1024x1024)は針を下に伸ばした構図のため、頭(円盤)部分の中心は
// 画像中心(0.5, 0.5)ではなく縦42.7%あたりにある。anchorをそこに合わせないと
// 頭が中心からずれて見える(実測: 頭部分だけのアルファ重心 = (0.500, 0.427))
const PIN_ANCHOR = { x: 0.5, y: 0.427 };

/**
 * ノート型リザルト画面で、実際に捕まえた1匹を標本のようにピン留め表示する。
 * 蝶のsprite(anchor 0.5)はButterflyコンテナのローカル原点(0,0)に描かれる
 * ため、ピンの頭も同じローカル原点に合わせれば、サイズに関わらず体の中心に
 * 刺さって見える。
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
