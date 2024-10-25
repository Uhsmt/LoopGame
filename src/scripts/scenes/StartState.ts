import * as PIXI from "pixi.js";
import { GameStateManager } from "./GameStateManager";
import { LineDrawer } from "../components/LineDrawer";
import { GameplayState } from "./GameplayState";
import { RuleState } from "./RuleState";
import * as Utility from "../utils/Utility";
import { Butterfly } from "../components/Butterfly";
import * as Const from "../utils/Const";
import { StageInformation } from "../components/StageInformation";
import { StateBase } from "./BaseState";
import { HelpFlower } from "../components/HelpFlower";
import { Button } from "../components/Button";

export class StartState extends StateBase {
    private lineDrawer: LineDrawer;
    private startButton: Button;
    private ruleButton: Button;
    butterflies: Butterfly[] = [];
    private backgroundSprite: PIXI.Sprite;
    private title: PIXI.Text;
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
        this.title = new PIXI.Text({
            text: "L O O P",
            style: {
                fontFamily: Const.FONT_TITLE,
                fontSize: 80,
                fill: "#83cbc0",
                align: "center",
            },
        });
        this.title.anchor.set(0.5);
        this.title.x = app.screen.width / 2;
        this.title.y = app.screen.height * 0.4;
        this.title.blendMode = "screen";
        this.container.addChild(this.title);

        // ボタン
        this.startButton = new Button(
            "Start",
            app.screen.width / 4,
            app.screen.height * 0.65,
        );
        this.ruleButton = new Button(
            "How to\rplay",
            (app.screen.width * 3) / 4,
            app.screen.height * 0.65,
        );

        this.container.addChild(this.startButton);
        this.container.addChild(this.ruleButton);
        if (DEBUG_MODE) {
            this.container.addChild(this.startButton.debugGraphics(0.1));
            this.container.addChild(this.ruleButton.debugGraphics(0.1));
        }

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

    onExit(): void {
        this.manager.app.stage.removeChild(this.container);
        this.container.destroy();

        if (this.lineDrawer) {
            // 次のフレームのレンダリングが完了した後にクリーンアップ処理を行う
            this.manager.app.ticker.addOnce(() => {
                this.lineDrawer.cleanup();
            });
        }
    }

    private dispButterfly() {
        Const.COLOR_LIST.forEach((color) => {
            const size = Utility.chooseAtRandom([...Const.SIZE_LIST], 1)[0];
            const butterfly = new Butterfly(size, color, color);
            butterfly.setRandomInitialPoistion(
                this.manager.app.screen.width,
                this.manager.app.screen.height,
            );
            butterfly.appear(false);
            this.butterflies.push(butterfly);
        });
        this.container.addChild(...this.butterflies);
    }

    // LineDrawerのループエリアが完成したときのハンドラ
    private handleLoopAreaCompleted(loopArea: PIXI.Graphics) {
        if (this.ruleButton.isHit(loopArea)) {
            this.ruleButton.selected();
            void this.onRuleSelected();
        }
        if (this.startButton.isHit(loopArea)) {
            this.startButton.selected();
            void this.onStartGameSelected();
        }
    }

    private async onStartGameSelected(): Promise<void> {
        this.butterflies.map((butterfly) => butterfly.stop());

        // next background
        const nextBGSprite = new PIXI.Sprite(PIXI.Texture.from("background"));
        this.adjustBackGroundSprite(nextBGSprite);
        this.container.addChildAt(nextBGSprite, 0);

        await Promise.all([
            this.fadeOut(this.ruleButton, 0.05),
            this.fadeOut(this.title, 0.05),
            this.butterflies.map((butterfly) => butterfly.delete()),
            this.wait(300).then(() => {
                return this.fadeOut(this.startButton, 0.05);
            }),
            this.wait(300).then(() => {
                return this.fadeOut(this.backgroundSprite, 0.05);
            }),
        ]);

        const stageInfo1 = new StageInformation();
        this.manager.setState(new GameplayState(this.manager, stageInfo1));
    }

    private async onRuleSelected(): Promise<void> {
        this.butterflies.map((butterfly) => butterfly.stop());
        await Promise.all([
            this.fadeOut(this.startButton, 0.05),
            this.fadeOut(this.title, 0.05),
            this.butterflies.map((butterfly) => butterfly.delete()),
            this.wait(300).then(() => {
                return this.fadeOut(this.ruleButton, 0.05);
            }),
        ]);
        this.manager.setState(new RuleState(this.manager));
    }

    private async showButtomMessage(message: string): Promise<void> {
        const bottomMessage = new PIXI.Text({
            text: message,
            style: {
                fontFamily: Const.FONT_ENGLISH,
                fontSize: 20,
                fill: "#ffffff",
                align: "center",
            },
        });
        bottomMessage.anchor.set(0.5);
        bottomMessage.x = this.manager.app.screen.width / 2;
        bottomMessage.y = this.manager.app.screen.height * 0.9;
        this.container.addChild(bottomMessage);
        await this.wait(2000);
        await this.fadeOut(bottomMessage);
    }
}
