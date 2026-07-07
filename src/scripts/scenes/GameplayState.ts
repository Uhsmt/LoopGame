// GameplayState.ts
import * as PIXI from "pixi.js";
import { GameStateManager } from "./GameStateManager";
import { AudioManager } from "../utils/AudioManager";
import { isMobileDevice } from "../utils/MobileDetection";
import { SparkleEmitter } from "../components/SparkleEmitter";
import { LineDrawer } from "../components/LineDrawer";
import { Sun } from "../components/Sun";
import { ResultState } from "./ResultState";
import { Butterfly } from "../components/Butterfly";
import * as Utility from "../utils/Utility";
import * as Const from "../utils/Const";
import { StageInformation } from "../components/StageInformation";
import { StateBase } from "./BaseState";
import { HelpFlower } from "../components/HelpFlower";
import { SpecialButterfly } from "../components/SpecialButterfly";
import { Moon } from "../components/Moon";
import { PlanetBase } from "../components/PlanetBase";

export class GameplayState extends StateBase {
    private startMessage: PIXI.BitmapText;
    private scoreMessage: PIXI.BitmapText;
    private actionMessage: PIXI.BitmapText;
    private helpMessage: PIXI.BitmapText;
    private lineDrawer: LineDrawer;
    private sun: PlanetBase;
    private isRunning = true;
    private isFinish = false;
    private gameTimer: number = 60;
    private elapsedTime: number = 0;
    private freezeElapsedTime: number = -1;
    private gatherElapsedTime: number = -1;
    private longLoopElapsedTime: number = -1;
    private stagePoint = 0;
    caputuredButterflies: Butterfly[] = [];
    butterflies: Butterfly[] = [];
    private isAddBonusButterfly = false;
    flowers: HelpFlower[] = [];
    private stageInfo: StageInformation;
    private readonly helpFlowersTiming: number[] = [];
    private pauseHandler: () => void;
    private stagePauseHandler: (() => void) | null = null;
    private gatherPointMap: Map<number, PIXI.Point> = new Map();
    private gatherDistance: number = 0;
    private fontColor: number = 0x000000;
    private lastTickStep: number = -1;
    private sparkles!: SparkleEmitter;
    private trailElapsed: number = 0;

    constructor(manager: GameStateManager, stageInfo: StageInformation) {
        super(manager);

        this.stageInfo = stageInfo;

        this.lineDrawer = new LineDrawer(
            this.manager.app,
            this.stageInfo.bonusFlag ? 0xffffff : 0x730000,
        );
        this.lineDrawer.on(
            "loopAreaCompleted",
            this.handleLoopAreaCompleted.bind(this),
        );

        const app = this.manager.app;
        this.gameTimer = this.stageInfo.stageTime;
        this.fontColor = this.stageInfo.bonusFlag ? 0xffffff : 0x000000;

        // background
        const backgroundSprite = PIXI.Sprite.from(
            this.stageInfo.bonusFlag ? "background_night" : "background",
        );
        this.adjustBackGroundSprite(backgroundSprite);
        this.container.addChild(backgroundSprite);

        // SUN
        this.sun = this.stageInfo.bonusFlag ? new Moon() : new Sun();
        this.sun.move(0, app.screen.width, app.screen.height);
        this.container.addChild(this.sun);

        // スタートメッセージ
        this.startMessage = new PIXI.BitmapText({
            text: `Capture ${this.stageInfo.bonusFlag ? "many" : this.stageInfo.needCount} butterflies!`,
            style: new PIXI.TextStyle({
                fontFamily: Const.FONT_ENGLISH,
                fontSize: 24,
                fill: this.fontColor,
                fontWeight: Const.FONT_ENGLISH_BOLD,
            }),
        });
        this.startMessage.x =
            this.manager.app.renderer.width / 2 - this.startMessage.width / 2;
        this.startMessage.y =
            this.manager.app.renderer.height / 3 + Const.MARGIN;
        this.startMessage.alpha = 0;
        this.container.addChild(this.startMessage);

        // スコアメッセージ
        this.scoreMessage = new PIXI.BitmapText({
            text: `0 / ${this.stageInfo.bonusFlag ? "∞" : this.stageInfo.needCount}`,
            style: new PIXI.TextStyle({
                fontFamily: Const.FONT_ENGLISH,
                fontWeight: Const.FONT_ENGLISH_BOLD,
                fontSize: 24,
                fill: this.fontColor,
            }),
        });
        this.scoreMessage.x =
            this.manager.app.renderer.width / 2 - this.scoreMessage.width / 2;
        this.scoreMessage.y =
            this.manager.app.renderer.height -
            Const.MARGIN -
            this.scoreMessage.height * 1.5;
        this.scoreMessage.alpha = 0;
        this.container.addChild(this.scoreMessage);

        // アクションメッセージ
        this.actionMessage = new PIXI.BitmapText({
            text: "A",
            style: new PIXI.TextStyle({
                fontFamily: Const.FONT_ENGLISH,
                fontWeight: Const.FONT_ENGLISH_BOLD,
                fontSize: 24,
                fill: this.fontColor,
            }),
        });
        this.actionMessage.y = this.manager.app.renderer.height / 2;
        this.actionMessage.alpha = 0;
        this.container.addChild(this.actionMessage);

        // ヘルプメッセージ
        this.helpMessage = new PIXI.BitmapText({
            text: "A",
            style: new PIXI.TextStyle({
                fontFamily: Const.FONT_ENGLISH,
                fontWeight: Const.FONT_ENGLISH_BOLD,
                fontSize: 24,
                fill: this.fontColor,
            }),
        });
        this.helpMessage.y =
            this.actionMessage.height * 1.1 +
            this.manager.app.renderer.height / 2;
        this.helpMessage.alpha = 0;
        this.container.addChild(this.helpMessage);

        // 蝶々を生成
        for (let i = 0; i < this.stageInfo.stageButterflyCount; i++) {
            this.butterflies.push(this.createButterfly());
        }
        this.butterflies.forEach((butterfly) => {
            this.container.addChild(butterfly);
            butterfly.setRandomInitialPoistion(
                this.manager.app.screen.width,
                this.manager.app.screen.height,
            );
            butterfly.appear();
        });

        // helpオブジェクトの設定
        this.setupForHelpObject();

        // Frame
        this.addFrameGraphic();

        // 一時停止ボタン用ハンドラ(全プラットフォーム共通)
        this.pauseHandler = () => {
            this.togglePause();
        };

        // キラキラ用パーティクル(最前面に重ねる)
        this.sparkles = new SparkleEmitter(this.createStarTexture());
        this.container.addChild(this.sparkles);

        // PCはステージクリックでも一時停止できる。タッチ端末では線を引く
        // 操作と衝突するため無効 (#41)
        if (!isMobileDevice()) {
            this.stagePauseHandler = () => {
                this.togglePause();
            };
            app.stage.addEventListener("pointerdown", this.stagePauseHandler);
        }
    }

    private showerOverLoopArea(
        butterflies: Butterfly[],
        loopArea?: PIXI.Graphics,
    ): void {
        const fallbackX =
            butterflies.reduce((sum, b) => sum + b.x - b.width / 2, 0) /
            butterflies.length;
        const fallbackY =
            butterflies.reduce((sum, b) => sum + b.y - b.height / 2, 0) /
            butterflies.length;
        try {
            if (!loopArea) throw new Error("no loop area");
            const bounds = loopArea.getBounds();
            // 領域の広さに応じて粒数を増やす(45〜90)
            const count = Math.min(
                90,
                45 + Math.floor((bounds.width * bounds.height) / 8000),
            );
            this.sparkles.showerOver(count, () => {
                // 矩形サンプリング+領域内判定(外れたら中心へフォールバック)
                for (let i = 0; i < 8; i++) {
                    const x = bounds.x + Math.random() * bounds.width;
                    const y = bounds.y + Math.random() * bounds.height;
                    if (loopArea.containsPoint({ x, y })) {
                        return { x, y };
                    }
                }
                return { x: fallbackX, y: fallbackY };
            });
        } catch {
            this.sparkles.shower(fallbackX, fallbackY, 45);
        }
    }

    private createStarTexture(): PIXI.Texture {
        try {
            return SparkleEmitter.createStarTexture(this.manager.app.renderer);
        } catch {
            // テスト等でレンダラーが使えない場合のフォールバック
            return PIXI.Texture.WHITE;
        }
    }

    private togglePause(): void {
        if (this.isFinish) return;

        this.isRunning = !this.isRunning;
        this.lineDrawer.clearAllSegments();
        this.butterflies.forEach((butterfly) => {
            butterfly.isFlying = this.isRunning && this.freezeElapsedTime <= 0;
        });
        const icon = document.querySelector("#pauseButton i");
        if (icon) {
            icon.className = this.isRunning ? "fa fa-pause" : "fa fa-play";
        }
        if (!this.isRunning) {
            this.showActionMessage("Pause");
        } else {
            this.actionMessage.alpha = 0;
        }
    }

    private setupForHelpObject() {
        // helpオブジェクトを出すタイミングを設定
        if (this.stageInfo.helpObjectNum > 0) {
            // gameTimerをhelpObjectNum+1 で等分割（2つだったら1/3, 2/3）
            for (let i = 1; i <= this.stageInfo.helpObjectNum; i++) {
                this.helpFlowersTiming.push(
                    Math.floor(
                        (this.gameTimer / (this.stageInfo.helpObjectNum + 1)) *
                            i,
                    ),
                );
            }
        }

        // gatherPointMapの初期化
        const colors = this.stageInfo.butterflyColors;
        const canvasWidth = this.manager.app.screen.width - Const.MARGIN * 2;
        const canvasHeight = this.manager.app.screen.height - Const.MARGIN * 2;

        let distanceWidth = 0;
        let distanceHeight = 0;

        if (colors.length <= 2) {
            // 2色の場合は、左右に分けて配置
            colors.forEach((color, index) => {
                const order = index + 1;
                const posX =
                    Const.MARGIN +
                    (canvasWidth * (order * 2 - 1)) / (colors.length * 2);
                this.gatherPointMap.set(
                    color,
                    new PIXI.Point(posX, Const.MARGIN + canvasHeight / 2),
                );
            });
            distanceWidth = (0.95 * canvasWidth) / (colors.length * 2);
            distanceHeight = (0.95 * canvasHeight) / 2;
        } else {
            // まずcolorsを上段、下段に分ける
            const colorsTop = colors.slice(0, Math.floor(colors.length / 2));
            const colorsBottom = colors.slice(Math.floor(colors.length / 2));

            // 上段のgatherPointMapを設定
            colorsTop.forEach((color, index) => {
                const order = index + 1;
                const posX =
                    Const.MARGIN +
                    (canvasWidth * (order * 2 - 1)) / (colorsTop.length * 2);

                this.gatherPointMap.set(
                    color,
                    new PIXI.Point(posX, Const.MARGIN + canvasHeight / 4),
                );
            });

            // 下段のgatherPointMapを設定
            colorsBottom.forEach((color, index) => {
                const order = index + 1;
                const posX =
                    Const.MARGIN +
                    (canvasWidth * (order * 2 - 1)) / (colorsBottom.length * 2);
                this.gatherPointMap.set(
                    color,
                    new PIXI.Point(posX, Const.MARGIN + (canvasHeight * 3) / 4),
                );
            });

            distanceWidth = (0.95 * canvasWidth) / colors.length;
            distanceHeight = (0.95 * canvasHeight) / 4;
        }
        this.gatherDistance = Math.min(distanceWidth, distanceHeight);
    }

    async onEnter(): Promise<void> {
        AudioManager.shared.playBgm(
            this.stageInfo.bonusFlag
                ? Const.bgmSrcs.bonus
                : this.stageInfo.level % 2 === 1
                  ? Const.bgmSrcs.stage1
                  : Const.bgmSrcs.stage2,
        );

        const pauseButton = document.getElementById("pauseButton");
        if (pauseButton) {
            pauseButton.classList.remove("hidden");
            pauseButton.addEventListener("click", this.pauseHandler);
        }

        this.isRunning = false;
        this.startMessage.alpha = 1;
        this.scoreMessage.alpha = 1;

        await this.wait(1000);
        this.container.removeChild(this.startMessage);
        this.isRunning = true;
        this.butterflies.forEach((butterfly) => {
            butterfly.isFlapping = true;
            butterfly.isFlying = true;
        });
    }

    update(delta: number): void {
        // 蝶々
        this.butterflies.forEach((butterfly) => {
            butterfly.update(delta, this.lineDrawer.getSegmentPoints());
        });

        // helpオブジェクトを出すタイミングで表示
        if (
            this.helpFlowersTiming.includes(Math.floor(this.elapsedTime / 1000))
        ) {
            const flowerType = Utility.chooseAtRandom(
                [...Const.HELP_FLOWER_TYPES],
                1,
            )[0];

            const flower = new HelpFlower(
                flowerType,
                this.manager.app.screen.width,
                this.manager.app.screen.height,
            );
            this.flowers.push(flower);
            this.container.addChildAt(
                flower,
                this.container.children.length - 2,
            );
            this.helpFlowersTiming.shift();
            AudioManager.shared.playSe("se_powerup");
        }

        this.flowers.forEach((flower) => {
            if (flower.isRunning) {
                flower.spin(delta);
                flower.fall(delta);
            }
        });

        // 10秒経ったら special butterfly を出現させる
        if (
            this.stageInfo.hasBonusButterfly &&
            this.elapsedTime >= 10000 &&
            !this.isAddBonusButterfly
        ) {
            const specialButterfly = new SpecialButterfly(
                Utility.chooseAtRandom(this.stageInfo.butterflyColors, 1)[0],
                {
                    x: this.manager.app.screen.width,
                    y: this.manager.app.screen.height,
                },
            );
            specialButterfly.setRandomInitialPoistion(
                this.manager.app.screen.width,
                this.manager.app.screen.height,
            );
            specialButterfly.appear(false);
            specialButterfly.isFlying = true;
            specialButterfly.isFlapping = true;
            this.butterflies.push(specialButterfly);
            this.isAddBonusButterfly = true;
            AudioManager.shared.playSe("se_powerup");
            this.container.addChild(specialButterfly);
        }
        if (this.helpMessage.alpha > 0) {
            this.helpMessage.alpha -= delta / 2000;
        }

        // パーティクルはpause中も動かす(余韻が固まらないように)
        this.sparkles.update(delta);

        if (!this.isRunning) return;

        // ボーナス蝶の軌跡キラキラ
        this.trailElapsed += delta;
        if (this.trailElapsed >= 60) {
            this.trailElapsed = 0;
            this.butterflies.forEach((butterfly) => {
                if (butterfly instanceof SpecialButterfly) {
                    this.sparkles.trail(
                        butterfly.x - butterfly.width / 2,
                        butterfly.y - butterfly.height / 2,
                    );
                }
            });
        }

        // ↑ pause中でも動く処理、↓ pause中は動かない処理

        this.elapsedTime += delta;

        // sun
        const progress = this.elapsedTime / (this.gameTimer * 1000);
        this.sun.move(
            progress,
            this.manager.app.screen.width,
            this.manager.app.screen.height,
        );
        // 残り10秒を切ったらblinkさせ、残り5秒はカウントダウン音を鳴らす
        if (this.elapsedTime >= this.gameTimer * 1000 - 10000) {
            this.sun.blink();
            const remainHalfStep = Math.ceil(
                (this.gameTimer * 1000 - this.elapsedTime) / 500,
            );
            // 残り10秒間、0.5秒ごとにチク(高)・タク(低)を交互に鳴らす
            if (
                remainHalfStep <= 20 &&
                remainHalfStep >= 1 &&
                remainHalfStep !== this.lastTickStep
            ) {
                this.lastTickStep = remainHalfStep;
                AudioManager.shared.playSe("se_tick", {
                    rate: remainHalfStep % 2 === 0 ? 1.5 : 1.15,
                });
            }
        }

        // effect系処理
        if (this.freezeElapsedTime >= 0) {
            this.freezeElapsedTime -= delta;
            if (this.freezeElapsedTime <= 0) {
                this.freezeEffect(false);
            }
        }
        if (this.longLoopElapsedTime >= 0) {
            this.longLoopElapsedTime -= delta;
            if (this.longLoopElapsedTime <= 0) {
                this.longLoopEffect(false);
            }
        }
        if (this.gatherElapsedTime >= 0) {
            this.gatherElapsedTime -= delta;
            if (this.gatherElapsedTime <= 0) {
                this.gatherEffect(false);
            }
        }

        if (this.elapsedTime >= this.gameTimer * 1000) {
            this.showActionMessage("Time up!");
            this.endGame();
        }

        // messagingのfade処理
        if (this.actionMessage.alpha > 0) {
            this.actionMessage.alpha -= delta / 2000;
        }
    }

    onExit(): void {
        this.sparkles.clear();
        if (this.stagePauseHandler) {
            this.manager.app.stage.removeEventListener(
                "pointerdown",
                this.stagePauseHandler,
            );
        }
        const pauseButton = document.getElementById("pauseButton");
        if (pauseButton) {
            pauseButton.classList.add("hidden");
            pauseButton.removeEventListener("click", this.pauseHandler);
            const icon = pauseButton.querySelector("i");
            if (icon) {
                icon.className = "fa fa-pause";
            }
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

    render(): void {}

    private endGame(): void {
        if (this.isFinish) return;

        this.isRunning = false;
        this.isFinish = true;
        this.stageInfo.stagePoint = this.stagePoint;
        this.stageInfo.captureCount = this.caputuredButterflies.length;
        this.stageInfo.calcScore();

        this.butterflies.forEach((butterfly) => {
            butterfly.isFlying = false;
            butterfly.isFlapping = false;
            butterfly.delete();
        });

        this.flowers.forEach((flower) => {
            flower.stop();
            flower.delete();
        });

        // captureButterfliesの中にSpecialButterflyが含まれているかどうか
        const isGotBonusButterfly = this.caputuredButterflies.some(
            (butterfly) => butterfly instanceof SpecialButterfly,
        );

        // リザルト表示(3秒後)の1秒前からBGMをフェードアウトし始める
        setTimeout(() => {
            AudioManager.shared.stopBgm(2500);
        }, 2000);

        setTimeout(() => {
            this.manager.setState(
                new ResultState(
                    this.manager,
                    this.stageInfo,
                    isGotBonusButterfly,
                ),
            );
        }, 3000);
    }

    private showActionMessage(message: string): void {
        this.actionMessage.alpha = 1;
        this.actionMessage.text = message;
        this.actionMessage.x =
            this.manager.app.renderer.width / 2 - this.actionMessage.width / 2;
        // note: fadeoutはupdateで行う
    }

    private showHelpMessage(message: string): void {
        this.helpMessage.alpha = 1;
        this.helpMessage.text = message;
        this.helpMessage.x =
            this.manager.app.renderer.width / 2 - this.helpMessage.width / 2;
    }

    private updateScoreMessage(): void {
        this.scoreMessage.text = `${this.caputuredButterflies.length} / ${this.stageInfo.bonusFlag ? "∞" : this.stageInfo.needCount}`;
    }

    // ループエリアが完成したときの処理
    private handleLoopAreaCompleted(loopArea: PIXI.Graphics): void {
        if ((!this.isRunning && !DEBUG_MODE) || this.isFinish) return;

        // loopArea内にいる蝶を取得
        const butterfliesInLoopArea = this.butterflies.filter((butterfly) => {
            return butterfly.isHit(loopArea);
        });
        // loopArea内にあるflowerを取得
        const flowersInLoopArea = this.flowers.filter((flower) => {
            return flower.isHit(loopArea);
        });

        if (butterfliesInLoopArea.length <= 0) {
            // 空ループは音を出さない(線を引くだけで頻発してうるさいため)
            this.captureFlowers(flowersInLoopArea);
        } else if (butterfliesInLoopArea.length === 1) {
            // １匹だけの時は、colorChange
            const butterfly = butterfliesInLoopArea[0];
            butterfly.switchColor();
            AudioManager.shared.playSe("se_switch");
            this.captureFlowers(flowersInLoopArea);
            if (this.gatherElapsedTime >= 0) {
                const point = this.gatherPointMap.get(butterfly.color);
                if (point) {
                    butterfliesInLoopArea[0].setGatherPoint(
                        point,
                        this.gatherDistance,
                    );
                }
            }
        } else if (butterfliesInLoopArea.length >= 2) {
            if (this.isSuccessLoop(butterfliesInLoopArea)) {
                this.captureButterflies(butterfliesInLoopArea, loopArea);
                this.captureFlowers(flowersInLoopArea);
            } else {
                this.stagePoint -= 20;
                AudioManager.shared.playSe("se_bad_loop");
                this.showActionMessage("Bad Loop! \r\n -20 point");
            }
        }
    }

    private captureButterflies(
        butterflies: Butterfly[],
        loopArea?: PIXI.Graphics,
    ): void {
        AudioManager.shared.playSe(
            butterflies.length >= 10 ? "se_capture_many" : "se_capture",
        );

        // 10匹以上の大量捕獲時だけ、囲んだ領域全体に淡いきらきらを降らせる
        if (butterflies.length >= 10) {
            this.showerOverLoopArea(butterflies, loopArea);
        }

        this.caputuredButterflies.push(...butterflies);
        this.updateScoreMessage();

        // score加算 全部同じ色の場合は蝶の数×10 それ以外は蝶の数×20
        const basePoint =
            butterflies.length *
            (butterflies.every((b) => b.color === butterflies[0].color)
                ? 10
                : 20);

        let point = basePoint;
        let calculationText = "";
        butterflies.forEach((butterfly) => {
            if (butterfly.multiplicationRate >= 2) {
                point *= butterfly.multiplicationRate;
                calculationText += `x ${butterfly.multiplicationRate} `;
            }
        });
        if (calculationText !== "") {
            calculationText = `${basePoint} ${calculationText} = `;
        }

        this.stagePoint += point;
        this.showActionMessage(
            `${calculationText} ${Utility.formatNumberWithCommas(point)} point`,
        );

        butterflies.forEach((butterfly) => {
            this.butterflies = this.butterflies.filter((b) => b !== butterfly);
            butterfly.isFlying = false;
            butterfly.delete();
        });

        if (
            !this.stageInfo.bonusFlag &&
            this.caputuredButterflies.length >= this.stageInfo.needCount
        ) {
            this.endGame();
        } else {
            // 捕まえた分だけ新しく蝶々を補充
            for (let i = 0; i < butterflies.length; i++) {
                // special butterflyの場合は、補充しない
                if (butterflies[i] instanceof SpecialButterfly) continue;

                const butterfly = this.createButterfly();
                this.butterflies.push(butterfly);
                this.container.addChildAt(
                    butterfly,
                    this.container.children.length - 2,
                );
                butterfly.setRandomInitialPoistion(
                    this.manager.app.screen.width,
                    this.manager.app.screen.height,
                );
                butterfly.appear();
                butterfly.isFlying =
                    this.isRunning && this.freezeElapsedTime <= 0;
            }
        }
    }

    private captureFlowers(flowers: HelpFlower[]): void {
        if (flowers.length > 0) {
            // アイテムは単体でも取得できるので、取得音はここで鳴らす
            AudioManager.shared.playSe("se_capture");
        }
        flowers.forEach((flower) => {
            this.flowers = this.flowers.filter((f) => f !== flower);
            this.showHelpMessage(flower.message);
            flower.stop();
            flower.delete();

            // effect
            switch (flower.getType()) {
                case "freeze":
                    this.freezeEffect(true);
                    break;
                case "time_plus":
                    this.TimePlusEffect();
                    break;
                case "gather":
                    this.gatherEffect(true);
                    break;
                case "long":
                    this.longLoopEffect(true);
                    break;
            }
        });
    }

    /**
     * 蝶を一時停止させる
     * @param isActive true: freeze, false: playing
     */
    private freezeEffect(isActive: boolean): void {
        if (isActive) {
            this.butterflies.forEach((butterfly) => {
                butterfly.isFlying = false;
            });
            this.freezeElapsedTime = Const.FREEZE_EFFECT_TIME_MS;
        } else {
            this.butterflies.forEach((butterfly) => {
                butterfly.isFlying = true;
            });
            this.freezeElapsedTime = -1;
        }
    }

    /**
     * 時間を5秒もどす
     */
    private TimePlusEffect(): void {
        this.elapsedTime -= 5000;
        if (this.elapsedTime < 0) {
            this.elapsedTime = 0;
        }
        // 残り10秒を切ったらblinkさせる
        if (this.elapsedTime < this.gameTimer * 1000 - 10000) {
            this.sun.stopBlink();
        }
    }

    /**
     * lineDrawerの描画を長くする
     * @param isActive true: longLoop, false: playing
     */
    private longLoopEffect(isActive: boolean): void {
        if (isActive) {
            this.lineDrawer.setLineDrawTime(
                this.lineDrawer.originalLineDrawTime + 500,
            );
            this.lineDrawer.setLineColor(
                this.stageInfo.bonusFlag ? 0xffd700 : 0x0081af,
            );
            this.longLoopElapsedTime = Const.LONG_LOOP_EFFECT_TIME_MS;
        } else {
            this.lineDrawer.setLineDrawTime(
                this.lineDrawer.originalLineDrawTime,
            );
            this.lineDrawer.setLineColor(this.lineDrawer.originalLineColor);
            this.longLoopElapsedTime = -1;
        }
    }

    /**
     * 蝶を集める
     * @param isActive true: gather, false: playing
     */
    private gatherEffect(isActive: boolean): void {
        if (isActive) {
            this.stageInfo.butterflyColors.forEach((color) => {
                const butterflies = this.butterflies.filter(
                    (butterfly) => butterfly.color === color,
                );
                if (butterflies.length === 0) return;
                const centerPoint = this.gatherPointMap.get(color);
                if (centerPoint) {
                    butterflies.forEach((butterfly) => {
                        butterfly.setGatherPoint(
                            centerPoint,
                            this.gatherDistance,
                        );
                    });
                }
            });
            this.gatherElapsedTime = Const.GATHER_EFFECT_TIME_MS;

            // デバッグモードの場合は、集まる範囲を表示
            if (DEBUG_MODE) {
                // gatherPointMapをforEachで回して、gatherDistanceの円を描画
                this.gatherPointMap.forEach((point, color) => {
                    const circle = new PIXI.Graphics().circle(
                        point.x,
                        point.y,
                        this.gatherDistance,
                    );
                    circle.fill(color);
                    circle.alpha = 0.2;
                    this.container.addChildAt(circle, 1);
                    setTimeout(() => {
                        this.container.removeChild(circle);
                    }, Const.GATHER_EFFECT_TIME_MS);
                });
            }
        } else {
            this.butterflies.forEach((butterfly) => {
                butterfly.deleteGatherPoint();
            });
            this.gatherElapsedTime = -1;
        }
    }

    private createButterfly(): Butterfly {
        const randomColors = Utility.chooseAtRandom(
            this.stageInfo.butterflyColors,
            2,
        );
        const mainColor = randomColors[0];
        const subColor = this.stageInfo.isButterflyColorChange
            ? randomColors[1]
            : mainColor;
        const isMultiple = Utility.isTrueRandom(
            this.stageInfo.multipleButterflyRate * 100,
        );
        const multiplication = isMultiple
            ? Utility.random(2, this.stageInfo.maxMultipleRate)
            : 1;

        const newButterfly = new Butterfly(
            this.stageInfo.butterflySize,
            mainColor,
            subColor,
            multiplication,
            {
                x: this.manager.app.screen.width,
                y: this.manager.app.screen.height,
            },
        );
        if (this.gatherElapsedTime >= 0) {
            const point = this.gatherPointMap.get(newButterfly.color);
            if (point) {
                newButterfly.setGatherPoint(point, this.gatherDistance);
            }
        }
        newButterfly.isFlapping = true;
        return newButterfly;
    }
}
