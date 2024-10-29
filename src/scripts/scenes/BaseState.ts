import * as PIXI from "pixi.js";
import { GameStateManager } from "./GameStateManager";
import * as Const from "../utils/Const";
import { Butterfly } from "../components/Butterfly";

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

    protected fadeOut(
        container: PIXI.Container,
        fadespeed: number = 0.01,
        alpha: number = 0,
    ): Promise<void> {
        return new Promise((resolve) => {
            const ticker = new PIXI.Ticker();
            ticker.add(() => {
                if (container.alpha > alpha) {
                    container.alpha -= fadespeed * ticker.deltaMS / 16;
                    if (container.alpha < alpha) {
                        container.alpha = alpha;
                    }
                } else {
                    ticker.stop();
                    ticker.destroy();
                    resolve();
                }
            });
            ticker.start();
        });
    }

    protected fadeIn(
        container: PIXI.Container,
        fadespeed: number = 0.01,
        alpha: number = 1,
    ): Promise<void> {
        return new Promise((resolve) => {
            const ticker = new PIXI.Ticker();
            ticker.add(() => {
                if (container.alpha < alpha) {
                    container.alpha += fadespeed * ticker.deltaMS / 16;
                    if (container.alpha > alpha) {
                        container.alpha = alpha;
                    }
                } else {
                    ticker.stop();
                    ticker.destroy();
                    resolve();
                }
            });
            ticker.start();
        });
    }

    protected slideY(
        container: PIXI.Container,
        reachPointY: number,
        speed: number,
    ): Promise<void> {
        const isUp = container.y > reachPointY;
        return new Promise((resolve) => {
            const slideY = () => {
                if (isUp) {
                    if (container.y > reachPointY) {
                        container.y -= speed;
                        requestAnimationFrame(slideY);
                    } else {
                        resolve();
                    }
                } else {
                    if (container.y < reachPointY) {
                        container.y += speed;
                        requestAnimationFrame(slideY);
                    } else {
                        resolve();
                    }
                }
            };
            slideY();
        });
    }

    protected wait(time: number): Promise<void> {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, time);
        });
    }

    protected isSuccessLoop(butterfliesInLoopArea: Butterfly[]): boolean {
        let result = false;
        const colors = Array.from(
            new Set(butterfliesInLoopArea.map((butterfly) => butterfly.color)),
        );
        // 色が3種類以上かつ蝶の数と同じ場合、もしくは色が1種類かつ蝶の数が2匹以上の場合はOK
        if (
            colors.length >= 3 &&
            colors.length === butterfliesInLoopArea.length
        ) {
            result = true;
        } else if (colors.length === 1 && butterfliesInLoopArea.length >= 2) {
            result = true;
        }
        return result;
    }
}
