import { StageInformation } from "../components/StageInformation";
import { GameStateManager } from "./GameStateManager";
import * as PIXI from "pixi.js";
import { GameplayState } from "./GameplayState";
import { StartState } from "./StartState";
import { Butterfly } from "../components/Butterfly";
import { SpecialButterfly } from "../components/SpecialButterfly";
import * as Utility from "../utils/Utility";
import * as Const from "../utils/Const";
import { StateBase } from "./BaseState";
import { Button } from "../components/Button";
import { LineDrawer } from "../components/LineDrawer";
import { AudioManager } from "../utils/AudioManager";
import { saveResult } from "../utils/ScoreStorage";
import { t, getLang } from "../utils/Language";

export class ResultState extends StateBase {
    private stageInfo: StageInformation;
    private messages: Message[] = [];
    private messageButterflies: Butterfly[] = [];
    private stickySprite: PIXI.Sprite;
    private backToStartButton!: Button;
    private nextMessage!: Message;
    private recordMessage?: Message;
    private lineDrawer!: LineDrawer;
    private isGotBonusButterfly: boolean = false;
    /**
     * 夢に入る: スペシャル蝶を捕まえた通常ステージのリザルト。
     * このあと暗転してボーナス(夢)へ入っていく。
     */
    private readonly isEnteringDream: boolean;
    /**
     * 夢から覚める: ボーナスステージのリザルト。
     * 夜のまま結果を見せ、明転して通常ステージへ戻る。
     */
    private readonly isWakingDream: boolean;
    /** 暗転/明転に使う夜背景(夢の演出があるときだけ用意する) */
    private nightBackground?: PIXI.Sprite;
    /** リザルト画面をふらふら飛ぶスペシャル蝶(夢に入るときだけ) */
    private dreamButterfly?: SpecialButterfly;

    constructor(
        manager: GameStateManager,
        stageInfo: StageInformation,
        isGotBonusButterfly: boolean,
    ) {
        super(manager);

        this.stageInfo = stageInfo;
        this.isGotBonusButterfly = isGotBonusButterfly;
        this.isEnteringDream = stageInfo.isClear && isGotBonusButterfly;
        this.isWakingDream = stageInfo.bonusFlag;

        // background(昼)
        const backgroundSprite = new PIXI.Sprite(
            PIXI.Texture.from("background"),
        );
        this.adjustBackGroundSprite(backgroundSprite);
        this.container.addChild(backgroundSprite);

        // 夜背景(昼の上に重ねる)。夢の演出があるときだけ用意する。
        // - 夢に入る:  alpha=0 で待機し、リザルト後にフェードインして暗転
        // - 夢から覚める: alpha=1 で夜のまま結果を見せ、最後にフェードアウトして明転
        if (this.isEnteringDream || this.isWakingDream) {
            const nightSprite = new PIXI.Sprite(
                PIXI.Texture.from("background_night"),
            );
            this.adjustBackGroundSprite(nightSprite);
            nightSprite.alpha = this.isWakingDream ? 1 : 0;
            this.container.addChild(nightSprite);
            this.nightBackground = nightSprite;
        }

        // sticky
        const stickySprite = new PIXI.Sprite(PIXI.Texture.from("sticky"));
        stickySprite.anchor.set(0.5);
        stickySprite.scale.set(0.25);
        stickySprite.x = this.manager.app.screen.width / 2;
        stickySprite.y = this.manager.app.screen.height / 2;
        stickySprite.alpha = 0;
        this.stickySprite = stickySprite;
        this.container.addChild(stickySprite);

        // frame
        this.addFrameGraphic();

        // 夢に入るリザルトでは、スペシャル蝶が画面をふらふら飛んでいる
        if (this.isEnteringDream) {
            const special = new SpecialButterfly(
                this.stageInfo.butterflyColors[0],
                {
                    x: this.manager.app.screen.width,
                    y: this.manager.app.screen.height,
                },
            );
            special.setRandomInitialPoistion(
                this.manager.app.screen.width,
                this.manager.app.screen.height,
            );
            special.appear(false);
            special.isFlapping = true;
            special.isFlying = true;
            this.addChildBelowFrame(special);
            this.dreamButterfly = special;
        }
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

        // 夢に入る: 「BONUS STAGE!」とは出さず、静かに暗転してボーナスへ誘う
        if (this.isEnteringDream) {
            await this.enterDreamSequence();
            return;
        }

        let messageText = "";
        if (this.stageInfo.isClear) {
            messageText = t("result.level", { n: this.stageInfo.level + 1 });
        } else {
            messageText = t("result.yourTotalScore", {
                score: Utility.formatNumberWithCommas(
                    this.stageInfo.totalScore,
                ),
            });
        }
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
            // 夢から覚める: ボーナスのリザルトは夜のまま見せ、
            // ここでじわじわ明るくして昼へ戻してから通常ステージへ遷移する
            if (this.isWakingDream && this.nightBackground) {
                await this.fadeOut(this.nightBackground, 0.008);
            }
            this.stageInfo.next();
            this.manager.setState(
                new GameplayState(this.manager, this.stageInfo),
            );
        } else {
            // ゲームオーバーの場合はスタート画面に戻る

            // 個人記録(ハイスコア・前回スコア)をlocalStorageに保存し、結果を表示する
            const { isNewRecord, previousBest } = saveResult(
                this.stageInfo.totalScore,
            );
            if (isNewRecord) {
                AudioManager.shared.playSe("se_applause");
                this.recordMessage = new Message(t("result.newRecord"), 24);
            } else if (previousBest !== null) {
                this.recordMessage = new Message(
                    t("result.best", {
                        score: Utility.formatNumberWithCommas(previousBest),
                    }),
                    20,
                );
            }
            if (this.recordMessage) {
                this.recordMessage.anchor.set(0.5);
                this.recordMessage.x = this.manager.app.screen.width / 2;
                this.recordMessage.y =
                    this.manager.app.screen.height / 2 +
                    this.manager.app.screen.height * 0.1;
                this.container.addChild(this.recordMessage);
                this.recordMessage.show();
            }

            this.lineDrawer = new LineDrawer(this.manager.app);

            this.lineDrawer.on(
                "loopAreaCompleted",
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                this.handleLoopAreaCompleted.bind(this),
            );
            this.backToStartButton = new Button(
                t("button.backToMenu"),
                this.manager.app.screen.width / 2,
                this.manager.app.screen.height * 0.8,
            );

            this.container.addChild(this.backToStartButton);
        }
    }

    /**
     * 夢に入る演出: リザルト表示のあと、画面がだんだん暗くなって夜へ向かい、
     * 誘ってくれたスペシャル蝶が画面外へ飛び去ってから、ボーナス(夢)へ入る。
     */
    private async enterDreamSequence(): Promise<void> {
        // 少し余韻をおく(スペシャル蝶はこの間もふらふら飛んでいる)
        await this.wait(400);

        // 背景の切り替わり(暗転)が始まる時点で、ボーナスBGMを先出しして
        // 流し始める。実際にボーナスのGameplayStateへ入った時にも同じsrcで
        // playBgmが呼ばれるが、AudioManagerは同一src再生中は何もしないので
        // 二重再生にはならない
        AudioManager.shared.playBgm(Const.bgmSrcs.bonus);

        // だんだん暗くなる(夜へ)。従来の2倍(約4秒)かけてゆっくり切り替える。
        // 同時にリザルトの紙は、入場アニメ(下からスライドイン)の逆再生として
        // 下へスライドアウトさせる(フェードでは消さない)
        await Promise.all([
            this.nightBackground
                ? this.fadeIn(this.nightBackground, 0.004)
                : Promise.resolve(),
            this.slideY(
                this.stickySprite,
                this.manager.app.screen.height + this.stickySprite.height,
                0.5,
            ),
        ]);

        // スペシャル蝶が画面外へ飛び去る
        await this.flyAwayDreamButterfly();

        await this.wait(300);

        this.stageInfo.bonusStage();
        this.manager.setState(new GameplayState(this.manager, this.stageInfo));
    }

    /**
     * 夢へ誘うスペシャル蝶を、素早くふらふらと蛇行させながら画面外まで
     * 飛ばして消す。フェードで消すのではなく「実際に飛んで出て行った」感を
     * 優先するため、直線移動(slideY)ではなく、進行方向に対して垂直に
     * サインカーブで揺れながら画面の外まで移動させる。
     */
    private async flyAwayDreamButterfly(): Promise<void> {
        const butterfly = this.dreamButterfly;
        if (!butterfly) return;

        await this.flutterOffScreen(butterfly);

        if (!butterfly.destroyed) {
            this.container.removeChild(butterfly);
            butterfly.delete();
        }
        this.dreamButterfly = undefined;
    }

    /**
     * 指定した蝶を、画面中心から現在位置への方向(=最も近い外周へ抜ける
     * 自然な脱出方向)へ、蛇行(サインカーブ)を加えながら素早く移動させる。
     * 画面外まで抜けたら解決する。update()側の壁バウンド徘徊(isFlying)は
     * 呼び出し前に止めておくこと。
     */
    private flutterOffScreen(butterfly: SpecialButterfly): Promise<void> {
        butterfly.isFlying = false;

        const screenWidth = this.manager.app.screen.width;
        const screenHeight = this.manager.app.screen.height;
        const centerX = screenWidth / 2;
        const centerY = screenHeight / 2;

        // 画面中心から現在位置への方向 = もっとも近い外周へ向かう自然な脱出方向
        let dirX = butterfly.x - centerX;
        let dirY = butterfly.y - centerY;
        let startDistance = Math.hypot(dirX, dirY);
        if (startDistance < 1) {
            // ほぼ中心にいて方向が定まらない場合のフォールバック(上方向へ)
            dirX = 0;
            dirY = -1;
            startDistance = 0;
        } else {
            dirX /= startDistance;
            dirY /= startDistance;
        }
        // 進行方向に直交する軸(蛇行の揺れはこちらへ加える)
        const perpX = -dirY;
        const perpY = dirX;

        // どの角度でも確実に画面外まで抜けられる半径(半対角線+余白)
        const targetRadius = Math.hypot(screenWidth, screenHeight) / 2 + 150;
        // 少なくともこれだけは動いて見えるように最低距離を確保する
        const remaining = Math.max(targetRadius - startDistance, 200);

        // 従来のslideY(約250px/秒)よりずっと速く駆け抜ける
        const speedPerMs = 1.1;
        const wobbleAmplitude = 50;
        const wobbleFrequency = 0.007;

        return new Promise((resolve) => {
            let traveled = 0;
            const ticker = new PIXI.Ticker();
            ticker.add(() => {
                if (butterfly.destroyed) {
                    ticker.stop();
                    ticker.destroy();
                    resolve();
                    return;
                }
                traveled += speedPerMs * ticker.deltaMS;
                const wobble =
                    Math.sin(traveled * wobbleFrequency) * wobbleAmplitude;
                const radius = startDistance + traveled;
                butterfly.x = centerX + dirX * radius + perpX * wobble;
                butterfly.y = centerY + dirY * radius + perpY * wobble;
                if (traveled >= remaining) {
                    ticker.stop();
                    ticker.destroy();
                    resolve();
                }
            });
            ticker.start();
        });
    }

    update(delta: number): void {
        this.messageButterflies.forEach((butterfly) => {
            butterfly.update(delta, []);
        });
        // 夢に誘うスペシャル蝶を飛ばす。飛び去る間(isFlying=false)は
        // flutterOffScreen側が位置を動かすが、羽ばたきアニメは
        // update()(内部のflap)に任せ続ける
        if (this.dreamButterfly) {
            this.dreamButterfly.update(delta, []);
        }
    }

    render(): void {}

    onExit(): void {
        // 途中で遷移した場合に備え、飛び残ったスペシャル蝶を確実に破棄する
        if (this.dreamButterfly && !this.dreamButterfly.destroyed) {
            this.dreamButterfly.delete();
            this.dreamButterfly = undefined;
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

    private async displayStageResult(): Promise<void> {
        this.stickySprite.y += this.manager.app.screen.height * 0.08;
        await Promise.all([
            this.fadeIn(this.stickySprite, 0.05, 1),
            this.slideY(
                this.stickySprite,
                this.manager.app.screen.height / 2,
                0.15,
            ),
        ]);

        const topMsg = new Message(
            this.stageInfo.bonusFlag
                ? t("result.bonusStage")
                : t("result.level", { n: this.stageInfo.level }),
            30,
        );
        const conditionMsg = new Message(
            t("result.need", {
                n: this.stageInfo.bonusFlag ? "∞" : this.stageInfo.needCount,
            }),
            20,
        );
        const countMsg = new Message(
            t("result.got", { n: this.stageInfo.captureCount }),
            20,
        );
        const lineMsg = new Message("----", 30);
        const baseScoreMsg = new Message(
            t("result.baseScore", {
                score: Utility.formatNumberWithCommas(
                    this.stageInfo.stagePoint,
                ),
            }),
            20,
        );
        const bonusMsg = new Message(
            t("result.bonusScore", {
                count: this.stageInfo.bonusCount,
                score: Utility.formatNumberWithCommas(
                    this.stageInfo.bonusPoint,
                ),
            }),
            20,
        );
        const stageScoreMsg = new Message(
            t("result.stageScore", {
                score: Utility.formatNumberWithCommas(
                    this.stageInfo.stageTotalScore,
                ),
            }),
            30,
        );
        const totalScoreMsg = new Message(
            t("result.totalScore", {
                score: Utility.formatNumberWithCommas(
                    this.stageInfo.totalScore,
                ),
            }),
            30,
        );

        const top_msgs = [topMsg, conditionMsg, countMsg, lineMsg];
        const result_msgs = [
            baseScoreMsg,
            ...(this.stageInfo.bonusFlag ? [] : [bonusMsg]),
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
                1,
                {
                    x: this.manager.app.screen.width,
                    y: this.manager.app.screen.height,
                },
            );
            butterfly.y =
                marginTop + lineHeight * (i + 1) + butterfly.height / 2;
            butterfly.x = this.manager.app.screen.width / 2 + butterfly.width;
            butterfly.isFlapping = true;
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
                    setTimeout(() => {
                        msg.show();
                        // 行ごとに半音ずつ上げる
                        AudioManager.shared.playSe("se_score", {
                            rate: Math.pow(2, index / 12),
                        });
                        resolve(null);
                    }, 450),
                );
            }
        }
    }

    // LineDrawerのループエリアが完成したときのハンドラ
    private async handleLoopAreaCompleted(loopArea: PIXI.Graphics) {
        if (this.backToStartButton && this.backToStartButton.isHit(loopArea)) {
            AudioManager.shared.playSe("se_select");
            this.backToStartButton.selected();

            await this.wait(300);

            await Promise.all([
                this.fadeOut(this.backToStartButton),
                this.fadeOut(this.nextMessage),
                this.fadeOut(this.stickySprite),
                ...(this.recordMessage
                    ? [this.fadeOut(this.recordMessage)]
                    : []),
            ]);
            const startState = new StartState(this.manager);
            this.manager.setState(startState);
        }
    }
}

class Message extends PIXI.BitmapText {
    constructor(message: string, size: number) {
        super();
        const isJa = getLang() === "ja";
        const style = new PIXI.TextStyle({
            fontFamily: isJa ? Const.FONT_JAPANESE : Const.FONT_ENGLISH,
            fontWeight: isJa
                ? Const.FONT_JAPANESE_BOLD
                : Const.FONT_ENGLISH_BOLD,
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
