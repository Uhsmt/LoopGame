import * as PIXI from "pixi.js";
import * as Const from "../utils/Const";
import { BaseCaptureableObject } from "./BaseCaptureableObject";

export class Button extends BaseCaptureableObject {
    private buttonText: PIXI.Text;
    constructor(text: string, x: number, y: number) {
        super();
        this.buttonText = new PIXI.Text({
            text: text,
            style: {
                fontFamily: Const.FONT_ENGLISH,
                fontWeight: Const.FONT_ENGLISH_BOLD,
                fontSize: 40,
                fill: "#ffffff",
                align: "center",
            },
        });
        this.addChild(this.buttonText);
        this.interactive = true;
        this.x = x;
        this.y = y;
    }

    protected getObjectCenter(): { x: number; y: number } {
        return {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2,
        };
    }

    selected() {
        this.buttonText.style.fill = "#ffea77";
    }
}
