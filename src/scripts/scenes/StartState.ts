import * as PIXI from "pixi.js";
import { GameStateManager } from "./GameStateManager";
import { AudioManager } from "../utils/AudioManager";
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
import { SpecialButterfly } from "../components/SpecialButterfly";
import { t, getLang, toggleLang } from "../utils/Language";

export class StartState extends StateBase {
    private lineDrawer: LineDrawer;
    private startButton: Button;
    private ruleButton: Button;
    private langButton: Button;
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
                fill: "#e0ffff",
                align: "center",
            },
        });
        this.title.anchor.set(0.5);
        this.title.x = app.screen.width / 2;
        this.title.y = app.screen.height * 0.4;
        this.container.addChild(this.title);

        // ボタン
        this.startButton = new Button(
            t("button.start"),
            app.screen.width / 4,
            app.screen.height * 0.65,
        );
        this.ruleButton = new Button(
            t("button.howToPlay"),
            (app.screen.width * 3) / 4,
            app.screen.height * 0.65,
        );

        this.container.addChild(this.startButton);
        this.container.addChild(this.ruleButton);

        // 言語切替トグル(押すと今と反対の言語に切り替わる)
        // メインボタンより目立たないよう右下すみに配置する。
        // ループで囲んで選択するボタンなので、判定円(hitAreaSize × scale)の
        // 半径ぶん以上の余白を画面端(黒枠)との間に確保している。
        this.langButton = new Button(
            this.langLabel(),
            app.screen.width * 0.92,
            app.screen.height * 0.87,
        );
        this.langButton.scale.set(0.5);
        this.container.addChild(this.langButton);

        // Frame
        this.addFrameGraphic();
    }

    /** 言語切替ボタンのラベル(切り替え先の言語名を表示する) */
    private langLabel(): string {
        return getLang() === "ja" ? t("lang.english") : t("lang.japanese");
    }

    /** 表示中のテキストを現在の言語で更新する */
    private refreshTexts(): void {
        this.startButton.setLabel(t("button.start"));
        this.ruleButton.setLabel(t("button.howToPlay"));
        this.langButton.setLabel(this.langLabel());
    }

    onEnter(): void {
        if (!this.manager || !this.manager.app) {
            console.error("ManagerまたはManagerのappが定義されていません");
            return;
        }
        AudioManager.shared.playBgm(Const.bgmSrcs.title);

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

        const specialButterfly = new SpecialButterfly(Const.COLOR_LIST[0], {
            x: this.manager.app.screen.width,
            y: this.manager.app.screen.height,
        });
        specialButterfly.setRandomInitialPoistion(
            this.manager.app.screen.width,
            this.manager.app.screen.height,
        );
        specialButterfly.appear(false);
        specialButterfly.isFlying = true;
        specialButterfly.isFlapping = true;
        this.butterflies.push(specialButterfly);
        this.container.addChild(specialButterfly);
    }

    update(delta: number): void {
        this.butterflies.forEach((butterfly) => {
            butterfly.update(delta, this.lineDrawer.getSegmentPoints());
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
            const butterfly = new Butterfly(size, color, color, 1, {
                x: this.manager.app.screen.width,
                y: this.manager.app.screen.height,
            });
            butterfly.setRandomInitialPoistion(
                this.manager.app.screen.width,
                this.manager.app.screen.height,
            );
            butterfly.appear(false);
            butterfly.isFlying = true;
            butterfly.isFlapping = true;
            this.butterflies.push(butterfly);
        });
        this.container.addChild(...this.butterflies);
    }

    // LineDrawerのループエリアが完成したときのハンドラ
    private handleLoopAreaCompleted(loopArea: PIXI.Graphics) {
        if (this.langButton.isHit(loopArea)) {
            AudioManager.shared.playSe("se_select");
            this.langButton.selected();
            toggleLang();
            this.refreshTexts();
            this.wait(300)
                .then(() => {
                    this.langButton.releaseSelected();
                })
                .catch((error: unknown) => {
                    console.error("Failed to toggle language:", error);
                });
            return;
        }
        if (this.ruleButton.isHit(loopArea)) {
            AudioManager.shared.playSe("se_select");
            this.ruleButton.selected();
            this.onRuleSelected().catch((error: unknown) => {
                console.error("Failed to open rules:", error);
            });
        } else if (this.startButton.isHit(loopArea)) {
            AudioManager.shared.playSe("se_select");
            this.startButton.selected();
            this.onStartGameSelected().catch((error: unknown) => {
                console.error("Failed to start game:", error);
            });
        }
    }

    private async onStartGameSelected(): Promise<void> {
        this.butterflies.map((butterfly) => (butterfly.isFlying = false));

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
        this.butterflies.map((butterfly) => (butterfly.isFlying = false));
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
