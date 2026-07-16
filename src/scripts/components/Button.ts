import * as PIXI from "pixi.js";
import * as Const from "../utils/Const";
import { isJapaneseText } from "../utils/Language";
import { BaseCaptureableObject } from "./BaseCaptureableObject";

export class Button extends BaseCaptureableObject {
    private buttonText: PIXI.Text;
    private leafSprite: PIXI.Sprite;
    isSelected: boolean = false;
    /**
     * @param textureAlias 葉の絵柄。既定は "leaf"(通常の緑色の葉、tintは
     *   色調を少し変える程度にしか効かない)。鮮やかな色で塗り分けたい場合は
     *   白抜きの "leaf_white" を渡す(butterfly_*と同じく、白地なのでtintが
     *   そのまま発色する)
     */
    constructor(
        text: string,
        x: number,
        y: number,
        textureAlias: string = "leaf",
    ) {
        super();
        this.leafSprite = new PIXI.Sprite(PIXI.Texture.from(textureAlias));
        this.leafSprite.scale.set(0.5);
        this.addChild(this.leafSprite);

        this.buttonText = new PIXI.Text({
            text: text,
            style: {
                ...Button.fontStyleFor(text),
                fontSize: 30,
                fill: "#ffffff",
                align: "center",
            },
        });
        this.addChild(this.buttonText);
        this.buttonText.anchor.set(0.5);
        this.buttonText.x = (1.1 * this.leafSprite.width) / 2;
        this.buttonText.y = this.leafSprite.height / 2;

        this.x = x;
        this.y = y;
        this.pivot.set(this.width / 2, this.height / 2);
        this.hitAreaSize = this.leafSprite.height * 0.4;
        this.hitRate = 0.3;
    }

    /** 表示テキストに応じて日本語/英語フォントを選ぶ */
    private static fontStyleFor(text: string): {
        fontFamily: string;
        fontWeight: PIXI.TextStyleFontWeight;
    } {
        return isJapaneseText(text)
            ? {
                  fontFamily: Const.FONT_JAPANESE,
                  fontWeight:
                      Const.FONT_JAPANESE_BOLD as PIXI.TextStyleFontWeight,
              }
            : {
                  fontFamily: Const.FONT_ENGLISH,
                  fontWeight:
                      Const.FONT_ENGLISH_BOLD as PIXI.TextStyleFontWeight,
              };
    }

    /** ボタンのラベルを差し替える(言語切替時に使う) */
    setLabel(text: string): void {
        this.buttonText.text = text;
        const font = Button.fontStyleFor(text);
        this.buttonText.style.fontFamily = font.fontFamily;
        this.buttonText.style.fontWeight = font.fontWeight;
    }

    /**
     * 葉(ボタン本体)の色味を変える。バリエーション表示に使う
     * (例: れんしゅうモードのボーナスステージボタンを見分けやすくする)。
     * selected()/releaseSelected() はこのtintを一時的に上書きする。
     */
    setTint(color: number): void {
        this.leafSprite.tint = color;
    }

    protected getObjectCenter(): { x: number; y: number } {
        return {
            x: this.x,
            y: this.y,
        };
    }

    selected() {
        this.buttonText.style.fill = 0xffea77;
        this.leafSprite.tint = 0x7ab400;
        this.isSelected = true;
    }

    releaseSelected() {
        this.buttonText.style.fill = "#ffffff";
        this.leafSprite.tint = 0xffffff;
        this.isSelected = false;
    }
}
