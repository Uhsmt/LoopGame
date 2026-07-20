import { StageInformation } from "../components/StageInformation";
import { GameStateManager } from "./GameStateManager";
import * as PIXI from "pixi.js";
import { GameplayState } from "./GameplayState";
import { StartState } from "./StartState";
import { PracticeSelectState } from "./PracticeSelectState";
import { Butterfly } from "../components/Butterfly";
import { PinnedSpecimen } from "../components/PinnedSpecimen";
import * as Utility from "../utils/Utility";
import * as Const from "../utils/Const";
import { StateBase } from "./BaseState";
import { Button } from "../components/Button";
import { LineDrawer } from "../components/LineDrawer";
import { AudioManager } from "../utils/AudioManager";
import { saveResult } from "../utils/ScoreStorage";
import { t, getLang } from "../utils/Language";
import { DreamDeparturePath } from "../utils/DreamDeparturePath";
import { layoutSpecimens } from "../utils/SpecimenLayout";

// ノート型リザルト画面(左ページ・右ページ)のレイアウト定数。
// notebook.pngの実寸(sprite.width/height、常に723x541)に対する割合と、
// 標本を並べる固定セルサイズ(px)で構成する。数値はモックアップでの
// 実測を元にした初期値で、実機で見ながら微調整してよい
const NOTEBOOK_Y_RATIO = 0.5;
const PAGE_LEFT_X_RATIO = 0.064;
const PAGE_LEFT_W_RATIO = 0.405;
const PAGE_RIGHT_X_RATIO = 0.56;
const PAGE_RIGHT_W_RATIO = 0.4;
const PAGE_TOP_RATIO = 0.085;
const PAGE_BOTTOM_MARGIN_RATIO = 0.11;
// 標本1匹分のセルサイズとセル間ギャップ。蝶の実サイズに関わらずこの枠に
// 収めるので、行の高さ・間隔がガタつかない。通常種の最大(large ≒ 51px)を
// 基準に詰めて並べる。スペシャル個体(≒74px幅)は1匹しか出ないため、
// 隣のセルに羽が少しかかるのは許容する
const CELL_SIZE = 60;
const CELL_GAP = 4;
const ROW_PITCH = CELL_SIZE + CELL_GAP;
const HEADING_BLOCK_HEIGHT = 60;
const SCORE_BLOCK_HEIGHT = 132;

export class ResultState extends StateBase {
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
    /**
     * クリアした場合にtrue(ノート型リザルト画面を使う)。通常クリア・
     * ボーナスステージ自身の結果・プラクティスクリアのいずれも同じ
     * デザインを共有する。ゲームオーバーだけは従来どおり
     * displayLegacyResult()を使う
     */
    private readonly isNotebookResult: boolean;
    /**
     * ノート・テキスト・標本(スペシャル個体を除く)をひとかたまりに持つ
     * コンテナ。退場のフェード+スライドはこれごと一体で動かす
     */
    private notebookGroup?: PIXI.Container;
    private notebookSprite?: PIXI.Sprite;
    /** ノート型リザルト画面で生成した表示物(テスト・列挙用にまとめて持つ) */
    private notebookChildren: PIXI.Container[] = [];
    /**
     * 捕まえたスペシャル個体に対応するピン留め標本(夢に入るときだけ)。
     * enterDreamSequenceでこれ自体のx/yを動かして、ピン留め位置から
     * そのまま飛び立たせる(内部のButterflyは再親付けしない)
     */
    private dreamSpecimen?: PinnedSpecimen;

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
        // クリアした場合(通常・ボーナスステージ・プラクティスとも)は
        // ノート型リザルトを使う。ゲームオーバーだけdisplayLegacyResultのまま
        this.isNotebookResult = stageInfo.isClear;

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

        // 夢に誘うスペシャル個体は、ノートにピン留めされた実際の標本を
        // その場から飛び立たせる形にしたため、ここで新規に蝶を生成する処理は
        // 不要になった(displayNotebookResult内でピン留め時にdreamSpecimenを
        // 記録し、enterDreamSequenceで初めて解放して振り付けを開始する)
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

        // 5秒まつ(ノート型はさらに2秒長く見せる)
        await new Promise((resolve) =>
            setTimeout(
                () => {
                    resolve(null);
                },
                this.isNotebookResult ? 7000 : 5000,
            ),
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
        // (ノート一式の非表示はenterDreamSequence側で行う。dreamSpecimenは
        // グループに入れていないので、ノートが消えても飛び続けられる)
        if (this.isEnteringDream) {
            await this.enterDreamSequence();
            return;
        }

        // ノートの中央に次面の案内を重ねると読みづらいため、ノート型リザルト
        // では先にノート一式(ノート・テキスト・標本)をひとつのオブジェクト
        // としてフェード+スライドで下げてから次のメッセージを出す
        // (登場時と対になる動き)
        if (this.notebookGroup) {
            const group = this.notebookGroup;
            await Promise.all([
                this.fadeOut(group, 0.05),
                this.slideY(
                    group,
                    group.y + this.manager.app.screen.height * 0.08,
                    0.15,
                ),
            ]);
            this.container.removeChild(group);
            group.destroy({ children: true });
            this.notebookGroup = undefined;
            this.notebookSprite = undefined;
            this.notebookChildren = [];
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
     * 誘ってくれるのはノートにピン留めされていた実際のスペシャル標本
     * (dreamSpecimen)で、ピン留め位置でブルブルと震えたあとピンが外れ、
     * 画面の左半分にいれば右上へ・右半分にいれば左上へ、ふら〜と蛇行
     * しながら飛び去っていく。暗転は旅立ちと並行して進み、蝶が画面外へ
     * 抜けきってからボーナス(夢)へ入る。
     */
    private async enterDreamSequence(): Promise<void> {
        // 少し余韻をおく
        await this.wait(400);

        // 背景の切り替わり(暗転)が始まる時点で、ボーナスBGMを先出しして
        // 流し始める。実際にボーナスのGameplayStateへ入った時にも同じsrcで
        // playBgmが呼ばれるが、AudioManagerは同一src再生中は何もしないので
        // 二重再生にはならない
        AudioManager.shared.playBgm(Const.bgmSrcs.bonus);

        // ノート一式は蝶がピンから外れた時点からゆっくりフェードアウト
        // させる(startDreamDeparture内)。震えている間はまだノートの上にいる

        // 旅立ち(震え→ピンが外れて飛び去る)と暗転(約3.2秒)を並行して
        // 進め、両方が終わって(=蝶が画面外に抜けきって)からボーナスへ入る
        const departurePromise = this.dreamSpecimen
            ? this.startDreamDeparture(this.dreamSpecimen)
            : Promise.resolve();
        const darkenPromise = this.nightBackground
            ? this.fadeIn(this.nightBackground, 0.005)
            : Promise.resolve();
        await Promise.all([departurePromise, darkenPromise]);

        // 蝶は既に画面外へ抜けきっているので、そのまま片付けてよい
        if (this.dreamSpecimen && !this.dreamSpecimen.destroyed) {
            this.container.removeChild(this.dreamSpecimen);
            this.dreamSpecimen.destroy({ children: true });
        }
        this.dreamSpecimen = undefined;

        this.stageInfo.bonusStage();
        this.manager.setState(new GameplayState(this.manager, this.stageInfo));
    }

    /**
     * ピン留めされていた標本(dreamSpecimen)の旅立ちモーションを開始する。
     * 軌道の計算は DreamDeparturePath(PIXI非依存の純粋なステッパー)に任せ、
     * ここでは毎フレームその結果をspecimenコンテナの座標へ反映するだけに
     * する(中のButterflyは再親付けしていないので、コンテナごと動かせば
     * 一緒についてくる)。
     *
     * ピンは震え(trembling)の間は刺さったままで、departingへ切り替わった
     * 瞬間に外す(=ブルブル震えてピンが抜ける)。外れたピンは落下+フェード
     * アウトさせ、ノート一式もこの瞬間からゆっくりフェードアウトを始める。
     * 返すPromiseは蝶が画面外へ抜けきる(path.done)か、万一先に破棄された
     * 場合に解決する。
     */
    private startDreamDeparture(specimen: PinnedSpecimen): Promise<void> {
        // 黒枠を含む全要素より常に手前(最前面)に見えるよう固定する
        specimen.zIndex = 1000;

        const path = new DreamDeparturePath({
            startX: specimen.x,
            startY: specimen.y,
            screenWidth: this.manager.app.screen.width,
            screenHeight: this.manager.app.screen.height,
        });

        return new Promise((resolve) => {
            let released = false;
            const ticker = new PIXI.Ticker();
            ticker.add(() => {
                if (specimen.destroyed) {
                    ticker.stop();
                    ticker.destroy();
                    resolve();
                    return;
                }
                path.step(ticker.deltaMS);
                if (!released && path.mode === "departing") {
                    // 震え終わり: ピンが外れ、羽ばたきながら飛び立つ。
                    // 外れたピンは下に落ちながらフェードアウトさせる
                    const pin = specimen.detachPin();
                    if (pin) {
                        // specimenのローカル座標からcontainer座標へ変換して
                        // 同じ見た目の位置に置き直す
                        pin.x += specimen.x;
                        pin.y += specimen.y;
                        this.dropPin(pin);
                    }
                    // 蝶がピンから外れたら、ノート一式(テキスト・標本ごと)を
                    // ゆっくりフェードアウトさせる(蝶とピンだけが残っていく)。
                    // 完了は待ち合わせない(退場飛行・暗転と並行して進む)
                    if (this.notebookGroup) {
                        void this.fadeOut(this.notebookGroup, 0.008);
                    }
                    released = true;
                }
                specimen.x = path.x;
                specimen.y = path.y;
                if (path.done) {
                    ticker.stop();
                    ticker.destroy();
                    resolve();
                }
            });
            ticker.start();
        });
    }

    /**
     * 外れたピンを重力っぽく加速しながら下へ落とし、同時にフェードアウト
     * させて消す。純粋な飾りの演出なので、完了は誰も待ち合わせない
     * (シーン遷移で親ごと破棄されても、ticker側のガードで安全に止まる)。
     */
    private dropPin(pin: PIXI.Sprite): void {
        pin.zIndex = 900; // 蝶(1000)のすぐ下、ノートより手前
        this.container.addChild(pin);

        let velocityY = 0;
        const ticker = new PIXI.Ticker();
        ticker.add(() => {
            if (pin.destroyed) {
                ticker.stop();
                ticker.destroy();
                return;
            }
            velocityY += 0.0008 * ticker.deltaMS;
            pin.y += velocityY * ticker.deltaMS;
            pin.alpha -= 0.0012 * ticker.deltaMS;
            if (pin.alpha <= 0) {
                this.container.removeChild(pin);
                pin.destroy();
                ticker.stop();
                ticker.destroy();
            }
        });
        ticker.start();
    }

    update(delta: number): void {
        this.messageButterflies.forEach((butterfly) => {
            butterfly.update(delta, []);
        });
        if (this.dreamSpecimen && !this.dreamSpecimen.destroyed) {
            // ピン留め中の「たまにちょっとブルブル」(deltaはms単位:
            // game.tsがapp.ticker.deltaMSを渡してくる)
            this.dreamSpecimen.update(delta);
            // isFlying=falseなのでButterfly.update内のfly()は何もしない。
            // 羽ばたきアニメ(flap())だけをここに任せる。位置は
            // startDreamDepartureの専用Tickerが動かす
            this.dreamSpecimen.butterfly.update(delta, []);
        }
        // ノート上の標本の羽ばたきアニメ(isFlapping=trueなのはスペシャル
        // 個体だけで、通常の標本は静止したままなので実質何もしない)
        this.notebookChildren.forEach((child) => {
            if (child instanceof PinnedSpecimen && !child.destroyed) {
                child.butterfly.update(delta, []);
            }
        });
    }

    render(): void {}

    onExit(): void {
        // 途中で遷移した場合に備え、飛び残った標本を確実に破棄する
        if (this.dreamSpecimen && !this.dreamSpecimen.destroyed) {
            this.dreamSpecimen.destroy({ children: true });
            this.dreamSpecimen = undefined;
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
        if (this.isNotebookResult) {
            await this.displayNotebookResult();
        } else {
            await this.displayLegacyResult();
        }
    }

    /**
     * ノート型リザルト画面(レベルクリア→次のステージへ進む場合のみ)。
     * 左ページに見出しと実際に捕まえた蝶を標本のようにピン留め表示し、
     * 右ページにスコアをまとめて一括表示する(行ごとの逐次演出はしない)。
     * 既存のsticky版と同様、まずページ自体をフェードインさせ、それが
     * 収まってから中身を一括で表示する(中身の逐次演出はしない)。
     */
    private async displayNotebookResult(): Promise<void> {
        const screenSize = {
            x: this.manager.app.screen.width,
            y: this.manager.app.screen.height,
        };

        // ノート・テキスト・標本をひとかたまりで動かすためのグループ。
        // 中身は画面絶対座標のまま配置する(グループ自体は原点に置く)
        const notebookGroup = new PIXI.Container();
        this.container.addChild(notebookGroup);
        this.notebookGroup = notebookGroup;

        const notebookSprite = new PIXI.Sprite(PIXI.Texture.from("notebook"));
        notebookSprite.anchor.set(0.5);
        notebookSprite.x = screenSize.x / 2;
        const notebookRestY = screenSize.y * NOTEBOOK_Y_RATIO;
        // stickyと同じく、少し下からフェード+スライドで収まる形にする
        notebookSprite.y = notebookRestY + screenSize.y * 0.08;
        notebookSprite.alpha = 0;
        notebookGroup.addChild(notebookSprite);
        this.notebookSprite = notebookSprite;

        await Promise.all([
            this.fadeIn(notebookSprite, 0.05, 1),
            this.slideY(notebookSprite, notebookRestY, 0.15),
        ]);

        const notebookLeft = notebookSprite.x - notebookSprite.width / 2;
        const notebookTop = notebookSprite.y - notebookSprite.height / 2;
        const leftPageX =
            notebookLeft + notebookSprite.width * PAGE_LEFT_X_RATIO;
        const leftPageWidth = notebookSprite.width * PAGE_LEFT_W_RATIO;
        const rightPageX =
            notebookLeft + notebookSprite.width * PAGE_RIGHT_X_RATIO;
        const rightPageWidth = notebookSprite.width * PAGE_RIGHT_W_RATIO;
        const pageTop = notebookTop + notebookSprite.height * PAGE_TOP_RATIO;
        const pageBottom =
            notebookTop +
            notebookSprite.height * (1 - PAGE_BOTTOM_MARGIN_RATIO);

        // 左ページ: 見出し(ボーナスステージの結果も同じデザインを使う)
        const headingText = this.stageInfo.bonusFlag
            ? t("result.bonusStage")
            : t("result.level", { n: this.stageInfo.level });
        const levelMsg = new Message(headingText, 28);
        levelMsg.anchor.set(0, 0.5);
        levelMsg.x = leftPageX;
        levelMsg.y = pageTop + 16;
        levelMsg.show();
        notebookGroup.addChild(levelMsg);
        this.notebookChildren.push(levelMsg);

        // 左ページ: 標本のグリッド配置(見出し分だけ上を空ける)
        const leftGridTop = pageTop + HEADING_BLOCK_HEIGHT;
        const leftColumns = Math.max(1, Math.floor(leftPageWidth / ROW_PITCH));
        const leftRows = Math.max(
            1,
            Math.floor((pageBottom - leftGridTop) / ROW_PITCH),
        );
        const leftCapacity = leftColumns * leftRows;

        // 右ページ: 標本の続き(見出し無し、スコア欄の分だけ下を空ける)
        const rightGridTop = pageTop;
        const rightColumns = Math.max(
            1,
            Math.floor(rightPageWidth / ROW_PITCH),
        );
        const rightRows = Math.max(
            1,
            Math.floor(
                (pageBottom - SCORE_BLOCK_HEIGHT - rightGridTop) / ROW_PITCH,
            ),
        );
        const rightCapacity = rightColumns * rightRows;

        const { left, right, overflowCount } = layoutSpecimens(
            this.stageInfo.capturedSpecimens,
            leftCapacity,
            rightCapacity,
        );

        const placeSpecimens = (
            specimens: typeof left,
            originX: number,
            originY: number,
            columns: number,
        ): void => {
            specimens.forEach((specimen, index) => {
                const row = Math.floor(index / columns);
                const col = index % columns;
                const pinned = new PinnedSpecimen(specimen, screenSize);
                pinned.x = originX + CELL_SIZE / 2 + col * ROW_PITCH;
                pinned.y = originY + CELL_SIZE / 2 + row * ROW_PITCH;
                if (specimen.isSpecial && this.isEnteringDream) {
                    // ノートに貼ったこの標本を、あとで夢演出でそのまま
                    // 飛び立たせる。ノート一式が消えたあとも飛び続けるため
                    // グループには入れず、containerへ直接置いて専用フィールドで持つ
                    this.container.addChild(pinned);
                    this.dreamSpecimen = pinned;
                } else {
                    // プラクティスではスペシャル個体でも夢演出に入らない
                    // (isEnteringDream=false)ため、専用フィールドに退避すると
                    // 回収されず画面に残る。通常の標本として一緒に片付ける
                    notebookGroup.addChild(pinned);
                    this.notebookChildren.push(pinned);
                }
            });
        };

        placeSpecimens(left, leftPageX, leftGridTop, leftColumns);
        placeSpecimens(right, rightPageX, rightGridTop, rightColumns);

        // 右ページ: 表示しきれなかった分は「…+N」で右寄せに省略する
        if (overflowCount > 0) {
            const rightRowsUsed = Math.ceil(right.length / rightColumns);
            const overflowMsg = new Message(
                t("result.notebook.overflow", { count: overflowCount }),
                16,
            );
            overflowMsg.anchor.set(1, 0);
            overflowMsg.x = rightPageX + rightPageWidth;
            overflowMsg.y = rightGridTop + rightRowsUsed * ROW_PITCH + 4;
            overflowMsg.show();
            notebookGroup.addChild(overflowMsg);
            this.notebookChildren.push(overflowMsg);
        }

        // 右ページ: スコア(下部にまとめて、一括で表示する)
        const scoreBlockTop = pageBottom - SCORE_BLOCK_HEIGHT;
        const scoreLineHeight = 24;

        const addScoreRow = (
            label: string,
            value: string,
            y: number,
            fontSize: number,
        ): void => {
            const labelMsg = new Message(label, fontSize);
            labelMsg.anchor.set(0, 0.5);
            labelMsg.x = rightPageX;
            labelMsg.y = y;
            labelMsg.show();
            notebookGroup.addChild(labelMsg);
            this.notebookChildren.push(labelMsg);

            const valueMsg = new Message(value, fontSize);
            valueMsg.anchor.set(1, 0.5);
            valueMsg.x = rightPageX + rightPageWidth;
            valueMsg.y = y;
            valueMsg.show();
            notebookGroup.addChild(valueMsg);
            this.notebookChildren.push(valueMsg);
        };

        const needGotMsg = new Message(
            t("result.notebook.needGot", {
                need: this.stageInfo.bonusFlag ? "∞" : this.stageInfo.needCount,
                got: this.stageInfo.captureCount,
            }),
            16,
        );
        needGotMsg.anchor.set(0, 0.5);
        needGotMsg.x = rightPageX;
        needGotMsg.y = scoreBlockTop;
        needGotMsg.show();
        notebookGroup.addChild(needGotMsg);
        this.notebookChildren.push(needGotMsg);

        // ボーナスステージの結果には「ボーナス」行がない(上限のないステージ
        // なので、通常クリアのような超過ボーナスという概念がない)
        const scoreLines: { label: string; value: string }[] = [
            {
                label: t("result.notebook.baseScore"),
                value: Utility.formatNumberWithCommas(
                    this.stageInfo.stagePoint,
                ),
            },
            ...(this.stageInfo.bonusFlag
                ? []
                : [
                      {
                          label: t("result.notebook.bonusScore", {
                              count: this.stageInfo.bonusCount,
                          }),
                          value: `+${Utility.formatNumberWithCommas(this.stageInfo.bonusPoint)}`,
                      },
                  ]),
            {
                label: t("result.notebook.stageScore"),
                value: Utility.formatNumberWithCommas(
                    this.stageInfo.stageTotalScore,
                ),
            },
        ];

        scoreLines.forEach((row, index) => {
            addScoreRow(
                row.label,
                row.value,
                scoreBlockTop + scoreLineHeight * (index + 1),
                16,
            );
        });

        addScoreRow(
            t("result.notebook.totalScore"),
            Utility.formatNumberWithCommas(this.stageInfo.totalScore),
            scoreBlockTop + scoreLineHeight * (scoreLines.length + 1) + 10,
            22,
        );
    }

    /**
     * 従来のリザルト表示(ボーナスステージ・ゲームオーバー・プラクティス
     * クリア用)。スコアを紙(sticky)の上に行ごとに逐次表示する
     */
    private async displayLegacyResult(): Promise<void> {
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
