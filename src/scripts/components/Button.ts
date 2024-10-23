import * as PIXI from "pixi.js";
import * as Const from "../utils/Const";
import { BaseCaptureableObject } from "./BaseCaptureableObject";

export class Button extends BaseCaptureableObject {
    private buttonText: PIXI.Text;
    constructor(text: string, x: number, y: number) {
        super();
        const leafSprite = new PIXI.Sprite(PIXI.Texture.from("leaf"));
        leafSprite.scale.set(0.5);
        this.addChild(leafSprite);

        this.buttonText = new PIXI.Text({
            text: text,
            style: {
                fontFamily: Const.FONT_ENGLISH,
                fontWeight: Const.FONT_ENGLISH_BOLD,
                fontSize: 30,
                fill: "#ffffff",
                align: "center",
            },
        });
        this.addChild(this.buttonText);
        this.buttonText.anchor.set(0.5);
        this.buttonText.x = (1.1 * leafSprite.width) / 2;
        this.buttonText.y = leafSprite.height / 2;

        this.x = x;
        this.y = y;
        this.pivot.set(this.width / 2, this.height / 2);
        this.hitAreaSize = this.buttonText.height / 2;
    }

    protected getObjectCenter(): { x: number; y: number } {
        return {
            x: this.x,
            y: this.y,
        };
    }

    selected() {
        this.buttonText.style.fill = "#ffea77";
    }
}
