import { StageInformation } from "../components/StageInformation";
import { GameStateManager } from "./GameStateManager";
import * as PIXI from "pixi.js";
import { GameplayState } from "./GameplayState";
import { StartState } from "./StartState";
import { PracticeSelectState } from "./PracticeSelectState";
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
import { DreamFlightPath } from "../utils/DreamFlightPath";

export class ResultState extends StateBase {
    // 夢に誘う蝶が出現する位置(画面中心からのオフセット、px)。
    // 軌道の形状そのもの(円の半径・速さ・退場のなじませ方など)は
    // DreamFlightPath側に集約している
    private static readonly DREAM_SPAWN_RADIUS = 15;

    private stageInfo: StageInformation;
    private messages: Message[] = [];
    private messageButterflies: Butterfly[] = [];
    private stickySprite: PIXI.Sprite;
    private backToStartButton!: Button;
    // 失敗直後、まだリトライが残っている場合だけ生成される
    private retryButton?: Button;
    // 「1回だけ」であることを伝える、retryButtonと同時にのみ表示するヒント
    private retryHintMessage?: Message;
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
    /** リザルト画面で振り付けモーションを行うスペシャル蝶(夢に入るときだけ) */
    private dreamButterfly?: SpecialButterfly;

    constructor(
        manager: GameStateManager,
        stageInfo: StageInformation,
        isGotBonusButterfly: boolean,
    ) {
        super(manager);

        this.stageInfo = stageInfo;
        this.isGotBonusButterfly = isGotBonusButterfly;
        // プラクティスモードでは夢(ボーナス)演出には入らない(そのステージだけで完結させる)
        this.isEnteringDream =
            stageInfo.isClear && isGotBonusButterfly && !stageInfo.isPractice;
        this.isWakingDream = stageInfo.bonusFlag;

        // 夢に誘う蝶をスコアの紙・テキストより常に手前(最前面)に描画するため、
        // zIndexでの並べ替えを有効にしておく(スコアテキストはdisplayStageResult
        // 内で後から追加されるが、addChildの順序に関係なく前面に保てる)
        this.container.sortableChildren = true;

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

        // 夢に入るリザルトでは、スペシャル蝶が「画面のど真ん中あたりに現れる
        // →軽く円を描く→そのまま画面外へ」という振り付けモーションを行う
        // (ランダムな徘徊はしない)。update()側の壁バウンド徘徊(isFlying)は
        // 使わず、専用の振り付け(startDreamFlightChoreography)で動かすため、
        // isFlying は false のままにする。振り付けは生成と同時に自走を始め、
        // リザルト表示中もずっと進行する
        if (this.isEnteringDream) {
            const special = new SpecialButterfly(
                this.stageInfo.butterflyColors[0],
                {
                    x: this.manager.app.screen.width,
                    y: this.manager.app.screen.height,
                },
            );
            special.x =
                this.manager.app.screen.width / 2 +
                ResultState.DREAM_SPAWN_RADIUS;
            special.y = this.manager.app.screen.height / 2;
            special.appear(false);
            special.isFlapping = true;
            special.isFlying = false;
            // 黒枠を含む全要素より常に手前(最前面)に見えるよう固定する。
            // sortableChildren=trueによりzIndexソートが優先されるため、
            // 挿入位置は描画順に影響しない(addChildで十分)
            special.zIndex = 1000;
            this.container.addChild(special);
            this.dreamButterfly = special;
            this.startDreamFlightChoreography(special);
        }
    }

    async onEnter(): Promise<void> {
        // 夢から覚める(ボーナスのリザルト)は、明転(夜→昼)をスコア表示の
        // 完了を待たずに、ほぼ同時に始める(明転は裏で進み、あとで待ち合わせる)
        const brightenPromise =
            this.isWakingDream && this.nightBackground
                ? this.fadeOut(this.nightBackground, 0.008)
                : Promise.resolve();

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

        // プラクティスモードのクリアは次のステージへ進まないため、
        // 「Level N+1」という次面への案内は出さず、ゲームオーバーと同じく
        // スコアだけを見せる(このあとメニューへ戻るボタンが出る)
        let messageText = "";
        if (this.stageInfo.isClear && !this.stageInfo.isPractice) {
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

        if (this.stageInfo.isClear && !this.stageInfo.isPractice) {
            // 通常プレイでクリアした場合は、そのまま次のステージへ進む。
            // 夢から覚める場合は、明転はonEnterの冒頭で開始済み(スコア表示と
            // ほぼ同時進行)なので、ここでは完了を待ち合わせるだけ
            await brightenPromise;
            this.stageInfo.next();
            this.manager.setState(
                new GameplayState(this.manager, this.stageInfo),
            );
        } else if (
            !this.stageInfo.isClear &&
            !this.stageInfo.isPractice &&
            !this.stageInfo.retryUsed
        ) {
            // 失敗直後、まだ1回分のリトライが残っている場合。
            // このランはまだ確定していないため、ここではスコアを保存せず、
            // 「もう一度」か「メニューへ戻る」かをプレイヤーに選ばせる
            // (保存/記録メッセージの表示はhandleLoopAreaCompleted側で行う)
            this.lineDrawer = new LineDrawer(this.manager.app);
            this.lineDrawer.on(
                "loopAreaCompleted",
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                this.handleLoopAreaCompleted.bind(this),
            );
            this.retryButton = new Button(
                t("button.retry"),
                this.manager.app.screen.width * 0.35,
                this.manager.app.screen.height * 0.8,
            );
            this.backToStartButton = new Button(
                t("button.backToMenu"),
                this.manager.app.screen.width * 0.65,
                this.manager.app.screen.height * 0.8,
            );
            this.container.addChild(this.retryButton);
            this.container.addChild(this.backToStartButton);

            // ボタンだけでは「1回だけ」だと伝わらないため、一言添える
            this.retryHintMessage = new Message(t("result.retryHint"), 18);
            this.retryHintMessage.anchor.set(0.5);
            this.retryHintMessage.x = this.manager.app.screen.width / 2;
            this.retryHintMessage.y = this.manager.app.screen.height * 0.68;
            this.container.addChild(this.retryHintMessage);
            this.retryHintMessage.show();
        } else {
            // ゲームオーバー(リトライを使い切った、または元々対象外)、
            // またはプラクティスモードでのクリアの場合は、次のステージへは
            // 進めず、メニューへ戻るボタンのみを表示する

            // プラクティスモードでは個人記録(ハイスコア・前回スコア)を保存しない
            if (!this.stageInfo.isPractice) {
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
     * 夢に入る演出: リザルト表示のあと、画面がだんだん暗くなって夜へ向かう。
     * 遷移のゲートは暗転完了のみ(オーナー了承済み)で、誘ってくれた
     * スペシャル蝶の振り付け(円→退場)完了は待たない。画面切り替えで
     * 蝶が唐突に消えて見えないよう、暗転が終わったら短くフェードアウト
     * させてからボーナス(夢)へ入る。
     */
    private async enterDreamSequence(): Promise<void> {
        // 少し余韻をおく(スペシャル蝶はこの間もふらふら飛んでいる)
        await this.wait(400);

        // 背景の切り替わり(暗転)が始まる時点で、ボーナスBGMを先出しして
        // 流し始める。実際にボーナスのGameplayStateへ入った時にも同じsrcで
        // playBgmが呼ばれるが、AudioManagerは同一src再生中は何もしないので
        // 二重再生にはならない
        AudioManager.shared.playBgm(Const.bgmSrcs.bonus);

        // スコアの紙はスライドやフェードではなく、パッと非表示にする
        this.stickySprite.visible = false;

        // だんだん暗くなる(夜へ)。約3.2秒かけてゆっくり切り替える
        if (this.nightBackground) {
            await this.fadeIn(this.nightBackground, 0.005);
        }

        // 暗転が完了したら、蝶の退場(振り付けの完了)は待たずにボーナスへ
        // 進む。ただし画面切り替えで蝶が唐突に消えて見えないよう、
        // 遷移直前に短くフェードアウトしてから消す
        await this.fadeOutDreamButterfly();

        this.stageInfo.bonusStage();
        this.manager.setState(new GameplayState(this.manager, this.stageInfo));
    }

    /**
     * 夢に誘うスペシャル蝶の振り付けモーションを開始する。
     * 「画面中央あたりに現れる → 軽く円を描く(だいたい1周) → そのまま
     * 同じ速さで画面外へ抜ける」という軌道の計算自体は DreamFlightPath
     * (PIXI非依存の純粋なステッパー)に任せ、ここでは毎フレームその結果を
     * butterflyの座標へ反映するだけにする。生成と同時に自走を始め、
     * リザルト表示中もずっと進行する(delta駆動、専用Tickerで動く)。
     *
     * 遷移(enterDreamSequence)は暗転完了だけをゲートにしており、この
     * 振り付けの完了(画面外まで抜けきること)は待たない。そのため
     * butterfly.destroyed(=fadeOutDreamButterflyによる破棄)か、
     * まれに振り付け自体が最後まで完了した場合のどちらかでTickerを
     * 止める(自然完了は安全弁で、通常はdestroyedの方が先に来る)。
     */
    private startDreamFlightChoreography(butterfly: SpecialButterfly): void {
        const path = new DreamFlightPath({
            centerX: this.manager.app.screen.width / 2,
            centerY: this.manager.app.screen.height / 2,
            screenWidth: this.manager.app.screen.width,
            screenHeight: this.manager.app.screen.height,
            spawnRadius: ResultState.DREAM_SPAWN_RADIUS,
        });

        const ticker = new PIXI.Ticker();
        ticker.add(() => {
            if (butterfly.destroyed) {
                ticker.stop();
                ticker.destroy();
                return;
            }
            path.step(ticker.deltaMS);
            butterfly.x = path.x;
            butterfly.y = path.y;
            if (path.done) {
                ticker.stop();
                ticker.destroy();
            }
        });
        ticker.start();
    }

    /**
     * 夢へ誘うスペシャル蝶を短くフェードアウトしてから消す。
     * enterDreamSequenceは暗転完了だけをゲートに次のシーンへ進むため、
     * 振り付け(円→退場)の途中で画面が切り替わり得る。画面切り替えで
     * 蝶が唐突に消えて見えないよう、遷移直前にひと呼吸フェードさせておく
     * (フェード中も振り付け自体は自然に動き続ける)。
     */
    private async fadeOutDreamButterfly(): Promise<void> {
        const butterfly = this.dreamButterfly;
        if (!butterfly) return;

        await this.fadeOut(butterfly, 0.05);

        if (!butterfly.destroyed) {
            this.container.removeChild(butterfly);
            butterfly.delete();
        }
        this.dreamButterfly = undefined;
    }

    update(delta: number): void {
        this.messageButterflies.forEach((butterfly) => {
            butterfly.update(delta, []);
        });
        if (this.dreamButterfly) {
            // isFlying=falseなのでButterfly.update内のfly()は何もしない。
            // 羽ばたきアニメ(flap())だけをここに任せる。位置は
            // startDreamFlightChoreographyの専用Tickerが動かす
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
        if (this.retryButton && this.retryButton.isHit(loopArea)) {
            AudioManager.shared.playSe("se_select");
            this.retryButton.selected();

            await this.wait(300);

            await Promise.all([
                this.fadeOut(this.retryButton),
                this.fadeOut(this.backToStartButton),
                this.fadeOut(this.nextMessage),
                this.fadeOut(this.stickySprite),
                ...(this.retryHintMessage
                    ? [this.fadeOut(this.retryHintMessage)]
                    : []),
            ]);
            // 同じレベルを最初からやり直す(このランはまだ確定していないので保存しない)
            this.stageInfo.retry();
            this.manager.setState(
                new GameplayState(this.manager, this.stageInfo),
            );
            return;
        }

        if (this.backToStartButton && this.backToStartButton.isHit(loopArea)) {
            AudioManager.shared.playSe("se_select");
            this.backToStartButton.selected();

            await this.wait(300);

            // リトライ提示中に「メニューへ戻る」を選んだ場合、このランは
            // ここで初めて確定する。onEnter側ではまだ保存していないため、
            // 決定した最終スコアをここで保存する(recordMessageはこの経路
            // では出さない: リトライを蹴った直後にフェードアウトが始まる
            // ため、表示してもほぼ読めないまま消えてしまう)
            if (this.retryButton && !this.stageInfo.isPractice) {
                saveResult(this.stageInfo.totalScore);
            }

            await Promise.all([
                this.fadeOut(this.backToStartButton),
                ...(this.retryButton ? [this.fadeOut(this.retryButton)] : []),
                this.fadeOut(this.nextMessage),
                this.fadeOut(this.stickySprite),
                ...(this.recordMessage
                    ? [this.fadeOut(this.recordMessage)]
                    : []),
                ...(this.retryHintMessage
                    ? [this.fadeOut(this.retryHintMessage)]
                    : []),
            ]);
            // プラクティスモードはステージ選択画面へ、通常プレイはスタート画面へ戻る
            this.manager.setState(
                this.stageInfo.isPractice
                    ? new PracticeSelectState(this.manager)
                    : new StartState(this.manager),
            );
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
