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
import { t, getLang, toggleLang, isJapaneseText } from "../utils/Language";

export class StartState extends StateBase {
    // クリック(タップ)判定: これより短い移動・短い時間ならドラッグではなく「クリック」とみなす
    private static readonly CLICK_MAX_DISTANCE = 10;
    private static readonly CLICK_MAX_DURATION_MS = 500;

    private lineDrawer: LineDrawer;
    private startButton: Button;
    private ruleButton: Button;
    private langButton: Button;
    butterflies: Butterfly[] = [];
    private backgroundSprite: PIXI.Sprite;
    private title: PIXI.Text;
    debugFlowers: HelpFlower[] = [];

    // ボタンをクリック/タップした際のヒントメッセージ表示用
    private hintMessage: PIXI.Text;
    // クリック候補として追跡中のポインタID(マルチタッチ時の指の混線を防ぐため)
    private clickPointerId: number | null = null;
    private clickDownPoint: PIXI.Point | null = null;
    private clickDownTime: number = 0;
    // このジェスチャー中(pointerdown〜pointerup)にループが完成したか
    private loopCompletedDuringGesture: boolean = false;
    private stagePointerDownHandler:
        | ((e: PIXI.FederatedPointerEvent) => void)
        | null = null;
    private stagePointerUpHandler:
        | ((e: PIXI.FederatedPointerEvent) => void)
        | null = null;
    // pointercancel / pointerupoutside(キャンセル・画面外リリース)で追跡状態を破棄するハンドラ
    private stagePointerCancelHandler:
        | ((e: PIXI.FederatedPointerEvent) => void)
        | null = null;

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

        // ボタンをクリック/タップしてしまったユーザー向けのヒントメッセージ
        this.hintMessage = new PIXI.Text({
            text: "",
            style: {
                fontFamily: Const.FONT_ENGLISH,
                fontSize: 24,
                fill: "#ffffff",
                align: "center",
            },
        });
        this.hintMessage.anchor.set(0.5);
        this.hintMessage.x = app.screen.width / 2;
        this.hintMessage.y = app.screen.height * 0.78;
        this.hintMessage.alpha = 0;
        this.container.addChild(this.hintMessage);

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

        // ボタンをクリック/タップした際にヒントを出すためのハンドラを設定
        this.stagePointerDownHandler = (e: PIXI.FederatedPointerEvent) => {
            if (this.clickPointerId !== null) {
                // 既に別の指(ポインタ)を追跡中に新しい指が追加された
                // = マルチタッチなのでクリック候補ではない。追跡状態を破棄する
                this.clearClickState();
                return;
            }
            this.clickPointerId = e.pointerId;
            this.clickDownPoint = new PIXI.Point(e.global.x, e.global.y);
            this.clickDownTime = Date.now();
            this.loopCompletedDuringGesture = false;
        };
        this.stagePointerUpHandler = (e: PIXI.FederatedPointerEvent) => {
            this.handlePointerUp(e);
        };
        this.stagePointerCancelHandler = (e: PIXI.FederatedPointerEvent) => {
            // 追跡中のポインタがキャンセル/画面外リリースされたら状態を破棄する
            if (this.clickPointerId === e.pointerId) {
                this.clearClickState();
            }
        };
        this.manager.app.stage.addEventListener(
            "pointerdown",
            this.stagePointerDownHandler,
        );
        this.manager.app.stage.addEventListener(
            "pointerup",
            this.stagePointerUpHandler,
        );
        this.manager.app.stage.addEventListener(
            "pointercancel",
            this.stagePointerCancelHandler,
        );
        this.manager.app.stage.addEventListener(
            "pointerupoutside",
            this.stagePointerCancelHandler,
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

        // ヒントメッセージのfade処理
        if (this.hintMessage.alpha > 0) {
            this.hintMessage.alpha -= delta / 2000;
        }
    }

    render(): void {
        // 描画はPixiJSがハンドルするのでここでは何もしない
    }

    onExit(): void {
        if (this.stagePointerDownHandler) {
            this.manager.app.stage.removeEventListener(
                "pointerdown",
                this.stagePointerDownHandler,
            );
        }
        if (this.stagePointerUpHandler) {
            this.manager.app.stage.removeEventListener(
                "pointerup",
                this.stagePointerUpHandler,
            );
        }
        if (this.stagePointerCancelHandler) {
            this.manager.app.stage.removeEventListener(
                "pointercancel",
                this.stagePointerCancelHandler,
            );
            this.manager.app.stage.removeEventListener(
                "pointerupoutside",
                this.stagePointerCancelHandler,
            );
        }

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
        // クリック判定と誤認しないよう、ジェスチャー中にループが完成したことを記録する
        this.loopCompletedDuringGesture = true;

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

    /**
     * ボタンをクリック/タップし終えたとき(pointerup)のハンドラ。
     * 「線で囲む」操作ではなく「クリック」だったと判定できた場合、
     * その位置がボタン上であればヒントメッセージを表示する。
     */
    private handlePointerUp(e: PIXI.FederatedPointerEvent): void {
        // 追跡中のポインタ(指)のpointerupでなければ無視する
        // (マルチタッチで別の指がpointerdown/pointerupした場合の混線を防ぐ)
        if (
            this.clickPointerId === null ||
            this.clickPointerId !== e.pointerId ||
            !this.clickDownPoint
        ) {
            return;
        }

        const upPoint = new PIXI.Point(e.global.x, e.global.y);
        const distance = Utility.getDistance(this.clickDownPoint, upPoint);
        const duration = Date.now() - this.clickDownTime;
        const loopCompleted = this.loopCompletedDuringGesture;

        this.clearClickState();

        // ループが完成した操作、またはドラッグ量・時間がクリックの範囲を超える操作は無視する
        if (
            loopCompleted ||
            !Utility.isClickGesture(
                distance,
                duration,
                StartState.CLICK_MAX_DISTANCE,
                StartState.CLICK_MAX_DURATION_MS,
            )
        ) {
            return;
        }

        const clickedButton = [
            this.startButton,
            this.ruleButton,
            this.langButton,
        ].some((button) => button.containsPoint(upPoint));

        if (clickedButton) {
            this.showHintMessage();
        }
    }

    /** クリック(タップ)候補として追跡していた状態を破棄する */
    private clearClickState(): void {
        this.clickPointerId = null;
        this.clickDownPoint = null;
        this.loopCompletedDuringGesture = false;
    }

    /**
     * 「線で囲んでね」ヒントメッセージを表示する。
     * 単一のTextを使い回すので、連打しても多重表示にはならず、表示時間が延長されるだけになる。
     */
    private showHintMessage(): void {
        const message = t("hint.drawLoop");
        this.hintMessage.text = message;
        const isJa = isJapaneseText(message);
        this.hintMessage.style.fontFamily = isJa
            ? Const.FONT_JAPANESE
            : Const.FONT_ENGLISH;
        this.hintMessage.style.fontWeight = (
            isJa ? Const.FONT_JAPANESE_BOLD : Const.FONT_ENGLISH_BOLD
        ) as PIXI.TextStyleFontWeight;
        this.hintMessage.alpha = 1;
    }
}
