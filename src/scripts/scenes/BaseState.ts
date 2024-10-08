import * as PIXI from "pixi.js";
import { GameStateManager } from "./GameStateManager";
import * as Const from "../utils/Const";

export class StateBase {
    protected manager: GameStateManager;
    protected container: PIXI.Container;

    constructor(manager: GameStateManager) {
        this.manager = manager;
        this.container = new PIXI.Container();
        this.manager.app.stage.addChild(this.container);
    }

    protected adjustBackGroundSprite(backgroundSprite: PIXI.Sprite): void {
        backgroundSprite.interactive = true;
        backgroundSprite.anchor.set(0.5, 0.5);
        const mainAreaWidth = this.manager.app.screen.width - Const.MARGIN * 2;
        const mainAreaHeight =
            this.manager.app.screen.height - Const.MARGIN * 2;
        const bgRateX = mainAreaWidth / backgroundSprite.width;
        const bgRateY = mainAreaHeight / backgroundSprite.height;
        let bgScale = bgRateX;
        if (bgRateX < bgRateY) {
            bgScale = bgRateY;
        }
        backgroundSprite.scale.set(bgScale);
        backgroundSprite.x = this.manager.app.screen.width / 2;
        backgroundSprite.y = this.manager.app.screen.height / 2;
    }

    protected addFrameGraphic(): void {
        // Frame
        const frameGraphics = new PIXI.Graphics();
        frameGraphics.rect(
            0,
            0,
            this.manager.app.screen.width,
            this.manager.app.screen.height,
        );
        frameGraphics.stroke({
            width: Const.MARGIN,
            color: 0x242424,
            alignment: 1,
        });
        this.container.addChild(frameGraphics);
    }
}
