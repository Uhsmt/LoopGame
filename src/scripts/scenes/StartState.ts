import * as PIXI from "pixi.js";
import { GameStateManager } from "./GameStateManager";
import { LineDrawer } from "../components/LineDrawer";
import { GameplayState } from "./GameplayState";
import * as Utility from "../utils/Utility";
import { Butterfly } from "../components/Butterfly";
import * as Const from "../utils/Const";
import { StageInformation } from "../components/StageInformation";
import { StateBase } from "./BaseState";
import { HelpFlower } from "../components/HelpFlower";

export class StartState extends StateBase {
    private lineDrawer: LineDrawer;
    private startButton: PIXI.Text;
    private ruleButton: PIXI.Text;
    butterflies: Butterfly[] = [];
    private backgroundSprite: PIXI.Sprite;
    private titleSprite: PIXI.Sprite;
    debugFlowers: HelpFlower[] = [];

    constructor(manager: GameStateManager) {
        super(manager);
        const app = manager.app;
        this.lineDrawer = new LineDrawer(this.manager.app);

        // background
        this.backgroundSprite = new PIXI.Sprite(
            PIXI.Texture.from("menu_background"),
        );

        this.adjustBackGroundSprite(this.backgroundSprite);
        this.container.addChild(this.backgroundSprite);

        // 適当に蝶を飛ばす
        this.dispButterfly();

        // title
        const titleSprite = new PIXI.Sprite(PIXI.Texture.from("title"));
        titleSprite.anchor.set(0.5);
        titleSprite.x = app.screen.width / 2;
        titleSprite.y = app.screen.height / 3;
        titleSprite.scale.set(0.8);
        this.titleSprite = titleSprite;
        this.container.addChild(titleSprite);

        // ボタン
        this.startButton = this.button(
            "Start",
            app.screen.width / 4 - 50,
            (app.screen.height * 3) / 5,
        );
        this.ruleButton = this.button(
            "Rule",
            (app.screen.width * 3) / 4 - 50,
            (app.screen.height * 3) / 5,
        );
        this.container.addChild(this.startButton);
        this.container.addChild(this.ruleButton);

        // Frame
        this.addFrameGraphic();
    }

    onEnter(): void {
        if (!this.manager || !this.manager.app) {
            console.error("ManagerまたはManagerのappが定義されていません");
            return;
        }
        //LineDrawerのイベントハンドラを設定
        this.lineDrawer.on(
            "loopAreaCompleted",
            this.handleLoopAreaCompleted.bind(this),
        );

        if (DEBUG_MODE) {
            this.debug();
        }
    }

    debug(): void {
        const flower1 = new HelpFlower(
            "freeze",
            this.manager.app.screen.width,
            this.manager.app.screen.height,
        );
        const flower2 = new HelpFlower(
            "time_plus",
            this.manager.app.screen.width,
            this.manager.app.screen.height,
        );
        const flower3 = new HelpFlower(
            "gather",
            this.manager.app.screen.width,
            this.manager.app.screen.height,
        );
        const flower4 = new HelpFlower(
            "long",
            this.manager.app.screen.width,
            this.manager.app.screen.height,
        );

        this.debugFlowers.push(flower1, flower2, flower3, flower4);
        this.container.addChild(...this.debugFlowers);
    }

    private dispButterfly() {
        Const.COLOR_LIST.forEach((color) => {
            const size = Utility.chooseAtRandom([...Const.SIZE_LIST], 1)[0];
            const butterfly = new Butterfly(size, color, color);
            butterfly.setRandomInitialPoistion(
                this.manager.app.screen.width,
                this.manager.app.screen.height,
            );
            this.butterflies.push(butterfly);
        });
        this.container.addChild(...this.butterflies);
    }

    update(delta: number): void {
        this.butterflies.forEach((butterfly) => {
            butterfly.flap(delta);
            butterfly.fly(
                this.manager.app.screen.width,
                this.manager.app.screen.height,
                delta,
            );
        });
        this.debugFlowers.forEach((flower) => {
            flower.spin(delta);
            flower.fall(delta);
        });
    }

    render(): void {
        // 描画はPixiJSがハンドルするのでここでは何もしない
    }

    private button(name: string, _x: number, _y: number): PIXI.Text {
        const button = new PIXI.Text({
            text: name,
            style: {
                fontFamily: Const.FONT_ENGLISH,
                fontWeight: Const.FONT_ENGLISH_BOLD,
                fontSize: 40,
                fill: "#ffffff",
                align: "left",
            },
        });

        button.interactive = true;
        button.x = _x;
        button.y = _y;

        return button;
    }

    // LineDrawerのループエリアが完成したときのハンドラ
    private handleLoopAreaCompleted(loopArea: PIXI.Graphics) {
        if (this.isRuleButtonInLoopArea(loopArea)) {
            this.onRuleSelected();
            this.butterflies.forEach((butterfly) => {
                butterfly.isHit(loopArea);
            });
        } else if (this.isStartButtonInLoopArea(loopArea)) {
            void this.onStartGameSelected();
        }
    }

    private isStartButtonInLoopArea(loopArea: PIXI.Graphics): boolean {
        const startButtonBounds = this.startButton.getBounds();
        const loopAreaBounds = loopArea.getBounds();

        const startButtonRect = new PIXI.Rectangle(
            startButtonBounds.x,
            startButtonBounds.y,
            startButtonBounds.width,
            startButtonBounds.height,
        );
        const loopAreaRect = new PIXI.Rectangle(
            loopAreaBounds.x,
            loopAreaBounds.y,
            loopAreaBounds.width,
            loopAreaBounds.height,
        );

        return this.checkOverlap(startButtonRect, loopAreaRect);
    }

    private isRuleButtonInLoopArea(loopArea: PIXI.Graphics): boolean {
        const ruleButtonBounds = this.ruleButton.getBounds();
        const loopAreaBounds = loopArea.getBounds();

        const startButtonRect = new PIXI.Rectangle(
            ruleButtonBounds.x,
            ruleButtonBounds.y,
            ruleButtonBounds.width,
            ruleButtonBounds.height,
        );
        const loopAreaRect = new PIXI.Rectangle(
            loopAreaBounds.x,
            loopAreaBounds.y,
            loopAreaBounds.width,
            loopAreaBounds.height,
        );

        return this.checkOverlap(startButtonRect, loopAreaRect);
    }

    private checkOverlap(
        rect1: PIXI.Rectangle,
        rect2: PIXI.Rectangle,
    ): boolean {
        return (
            rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
        );
    }

    private async onStartGameSelected(): Promise<void> {
        this.butterflies.map((butterfly) => butterfly.stop());

        // next background
        const nextBGSprite = new PIXI.Sprite(PIXI.Texture.from("background"));
        this.adjustBackGroundSprite(nextBGSprite);
        this.container.addChildAt(nextBGSprite, 0);

        await Promise.all([
            this.fadeOut(this.ruleButton),
            this.fadeOut(this.titleSprite),
            this.butterflies.map((butterfly) => butterfly.delete()),
            this.wait(300).then(() => {
                return this.fadeOut(this.startButton);
            }),
            this.wait(300).then(() => {
                return this.fadeOut(this.backgroundSprite);
            }),
        ]);

        const stageInfo1 = new StageInformation();
        this.manager.setState(new GameplayState(this.manager, stageInfo1));
    }

    private onRuleSelected(): void {
        //TODO RULEの実装
        console.log("Rule is here.");
        // this.manager.setState(new RulesState(this.manager));
    }

    onExit(): void {
        this.manager.app.stage.removeChild(this.container);
        this.container.destroy();

        if (this.lineDrawer) {
            // 次のフレームのレンダリングが完了した後にクリーンアップ処理を行う
            this.manager.app.ticker.addOnce(() => {
                this.lineDrawer.cleanup();
                // this.lineDrawer; // 破棄
            });
        }
    }
}
