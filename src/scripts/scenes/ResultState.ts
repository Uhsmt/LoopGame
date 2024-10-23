import { StageInformation } from "../components/StageInformation";
import { GameStateManager } from "./GameStateManager";
import * as PIXI from "pixi.js";
import { GameplayState } from "./GameplayState";
import { StartState } from "./StartState";
import { Butterfly } from "../components/Butterfly";
import * as Utility from "../utils/Utility";
import * as Const from "../utils/Const";
import { StateBase } from "./BaseState";
import { Button } from "../components/Button";
import { LineDrawer } from "../components/LineDrawer";

export class ResultState extends StateBase {
    private stageInfo: StageInformation;
    private messages: Message[] = [];
    private messageButterflies: Butterfly[] = [];
    private stickySprite: PIXI.Sprite;
    private backToStartButton!: Button;
    private nextMessage!: Message;
    private lineDrawer!: LineDrawer;

    constructor(manager: GameStateManager, stageInfo: StageInformation) {
        super(manager);

        this.stageInfo = stageInfo;

        // background
        const backgroundSprite = new PIXI.Sprite(
            PIXI.Texture.from("background"),
        );
        this.adjustBackGroundSprite(backgroundSprite);
        this.container.addChild(backgroundSprite);

        // sticky
        const stickySprite = new PIXI.Sprite(PIXI.Texture.from("sticky"));
        stickySprite.anchor.set(0.5);
        stickySprite.scale.set(0.25);
        stickySprite.x = this.manager.app.screen.width / 2;
        stickySprite.y = this.manager.app.screen.height / 2;
        this.stickySprite = stickySprite;
        this.container.addChild(stickySprite);

        // frame
        this.addFrameGraphic();
    }

    async onEnter(): Promise<void> {
        // disp result
        await this.displayStageResult();

        // 5秒まつ
        await new Promise((resolve) =>
            setTimeout(() => {
                resolve(null);
            }, 5000),
        );

        // messagesぜんぶ消す
        this.messages.forEach((msg) => {
            this.container.removeChild(msg);
            msg.destroy();
        });
        // 蝶も消す
        this.messageButterflies.forEach((butterfly) => {
            this.container.removeChild(butterfly);
            butterfly.delete();
        });
        this.messageButterflies = [];

        const messageText = this.stageInfo.isClear
            ? `Level ${this.stageInfo.level + 1}`
            : "Total score\r " + this.stageInfo.totalScore;
        this.nextMessage = new Message(messageText, 40);
        this.nextMessage.anchor.set(0.5);
        this.nextMessage.x = this.manager.app.screen.width / 2;
        this.nextMessage.y = this.manager.app.screen.height / 2;
        this.container.addChild(this.nextMessage);
        this.nextMessage.show();

        // 2秒待つ
        await new Promise((resolve) =>
            setTimeout(() => {
                resolve(null);
            }, 2000),
        );

        if (this.stageInfo.isClear) {
            this.stageInfo.next();
            this.manager.setState(
                new GameplayState(this.manager, this.stageInfo),
            );
        } else {
            // ゲームオーバーの場合はスタート画面に戻る
            this.lineDrawer = new LineDrawer(this.manager.app);

            this.lineDrawer.on(
                "loopAreaCompleted",
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                this.handleLoopAreaCompleted.bind(this),
            );
            this.backToStartButton = new Button(
                "Back to\rStart",
                this.manager.app.screen.width / 2,
                this.manager.app.screen.height * 0.8,
            );

            this.container.addChild(this.backToStartButton);
        }
    }

    update(delta: number): void {
        this.messageButterflies.forEach((butterfly) => {
            butterfly.flap(delta);
        });
    }

    render(): void {}

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

    private async displayStageResult(): Promise<void> {
        const topMsg = new Message(`Level ${this.stageInfo.level}`, 30);
        const conditionMsg = new Message(
            `Need :         × ${this.stageInfo.needCount} `,
            20,
        );
        const countMsg = new Message(
            `Got :          × ${this.stageInfo.captureCount} `,
            20,
        );
        const lineMsg = new Message("----", 30);
        const baseScoreMsg = new Message(
            `base score : ${Utility.formatNumberWithCommas(this.stageInfo.stagePoint)}`,
            20,
        );
        const bonusMsg = new Message(
            `bonus score : ${this.stageInfo.bonusCount} × 100 = ${Utility.formatNumberWithCommas(this.stageInfo.bonusPoint)}`,
            20,
        );
        const stageScoreMsg = new Message(
            `stage score : ${Utility.formatNumberWithCommas(this.stageInfo.stageTotalScore)}`,
            30,
        );
        const totalScoreMsg = new Message(
            `total score : ${Utility.formatNumberWithCommas(this.stageInfo.totalScore)}`,
            30,
        );

        const top_msgs = [topMsg, conditionMsg, countMsg, lineMsg];
        const result_msgs = [
            baseScoreMsg,
            bonusMsg,
            stageScoreMsg,
            totalScoreMsg,
        ];
        this.messages = [...top_msgs, ...result_msgs];
        const marginTop =
            this.stickySprite.y -
            this.stickySprite.height / 2 +
            this.stickySprite.height * 0.12;
        const lineHeight = this.manager.app.screen.height * 0.08;

        top_msgs.forEach((msg, index) => {
            this.container.addChild(msg);
            msg.anchor.set(0.5);
            msg.x = this.manager.app.screen.width / 2;
            msg.y = marginTop + lineHeight * index;
            msg.show();
        });

        // 2匹の蝶々を表示
        for (let i = 0; i < 2; i++) {
            const butterfly = new Butterfly(
                "small",
                this.stageInfo.butterflyColors[i],
                this.stageInfo.butterflyColors[i],
            );
            butterfly.y =
                marginTop + lineHeight * (i + 1) + butterfly.height / 2;
            butterfly.x = this.manager.app.screen.width / 2 + butterfly.width;
            butterfly.appear(false);
            this.container.addChild(butterfly);
            this.messageButterflies.push(butterfly);
        }

        // 1秒待ってから結果表示
        await new Promise((resolve) =>
            setTimeout(() => {
                resolve(null);
            }, 1000),
        );

        for (let index = 0; index < result_msgs.length; index++) {
            const msg = result_msgs[index];
            this.container.addChild(msg);
            msg.anchor.set(0.5);
            msg.x = this.manager.app.screen.width / 2;
            msg.y = marginTop + lineHeight * (index + top_msgs.length);
            if (msg === lineMsg) {
                msg.show();
            } else {
                await new Promise((resolve) =>
                    setTimeout(
                        () => {
                            msg.show();
                            resolve(null);
                        },
                        200 * (index + 1),
                    ),
                );
            }
        }
    }

    // LineDrawerのループエリアが完成したときのハンドラ
    private async handleLoopAreaCompleted(loopArea: PIXI.Graphics) {
        if (this.backToStartButton && this.backToStartButton.isHit(loopArea)) {
            this.backToStartButton.selected();

            await this.wait(300);

            await Promise.all([
                this.fadeOut(this.backToStartButton),
                this.fadeOut(this.nextMessage),
                this.fadeOut(this.stickySprite),
            ]);
            const startState = new StartState(this.manager);
            this.manager.setState(startState);
        }
    }
}

class Message extends PIXI.BitmapText {
    constructor(message: string, size: number) {
        super();
        const style = new PIXI.TextStyle({
            fontFamily: Const.FONT_ENGLISH,
            fontWeight: Const.FONT_ENGLISH_BOLD,
            fontSize: size,
            align: "center",
            fill: 0x000000,
        });
        this.style = style;
        this.text = message;
        this.alpha = 0;
    }
    show(): void {
        this.alpha = 1;
    }
}
