 
// GameplayState.ts
import * as PIXI from "pixi.js";
import { GameStateManager } from "./GameStateManager";
import { LineDrawer } from "../components/LineDrawer";
import { Sun } from "../components/Sun";
import { ResultState } from "./ResultState";
import { Butterfly } from "../components/Butterfly";
import * as Utility from "../utils/Utility";
import * as Const from "../utils/Const";
import { StageInformation } from "../components/StageInformation";
import { StateBase } from "./BaseState";
import { HelpFlower } from "../components/HelpFlower";

export class GameplayState extends StateBase {
    private startMessage: PIXI.BitmapText;
    private scoreMessage: PIXI.BitmapText;
    private actionMessage: PIXI.BitmapText;
    private helpMessage: PIXI.BitmapText;
    private lineDrawer: LineDrawer;
    private sun: Sun;
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
    flowers: HelpFlower[] = [];
    private stageInfo: StageInformation;
    private readonly helpFlowersTiming: number[] = [];
    pointerDownHandler: (event: PIXI.FederatedPointerEvent) => void;
    private gatherPointMap: Map<number, PIXI.Point> = new Map();
    private gatherDistance: number = 0;

    constructor(manager: GameStateManager, stageInfo: StageInformation) {
        super(manager);

        this.lineDrawer = new LineDrawer(this.manager.app, 0x730000);
        this.lineDrawer.on(
            "loopAreaCompleted",
            this.handleLoopAreaCompleted.bind(this),
        );

        this.stageInfo = stageInfo;
        const app = this.manager.app;
        this.gameTimer = this.stageInfo.stageTime;

        // background
        const backgroundSprite = new PIXI.Sprite(
            PIXI.Texture.from("background"),
        );
        this.adjustBackGroundSprite(backgroundSprite);
        this.container.addChild(backgroundSprite);

        // SUN
        this.sun = new Sun();
        this.sun.move(0, app.screen.width, app.screen.height);
        this.container.addChild(this.sun);

        // スタートメッセージ
        this.startMessage = new PIXI.BitmapText({
            text: `Capture ${this.stageInfo.needCount} butterflies!`,
            style: new PIXI.TextStyle({
                fontFamily: Const.FONT_ENGLISH,
                fontSize: 24,
                fill: 0x000000,
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
            text: `0 / ${this.stageInfo.needCount}`,
            style: new PIXI.TextStyle({
                fontFamily: Const.FONT_ENGLISH,
                fontWeight: Const.FONT_ENGLISH_BOLD,
                fontSize: 24,
                fill: 0x000000,
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
                fill: 0x000000,
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
                fill: 0x000000,
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

        // イベントリスナー：クリックしたら一時停止
        this.pointerDownHandler = () => {
            this.isRunning = !this.isRunning;
            this.lineDrawer.clearAllSegments();
            if (!this.isRunning) {
                this.showActionMessage("Pause", false);
            } else {
                this.hideActionmessage();
            }
        };

        app.stage.addEventListener("pointerdown", this.pointerDownHandler);
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
                this.gatherPointMap.set(
                    color,
                    new PIXI.Point(
                        Const.MARGIN +
                            ((canvasWidth * ((index + 1) * 2 - 1)) /
                                colors.length) *
                                2,
                        Const.MARGIN + canvasHeight / 2,
                    ),
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
                this.gatherPointMap.set(
                    color,
                    new PIXI.Point(
                        Const.MARGIN +
                            (canvasWidth * (order * 2 - 1)) /
                                (colorsTop.length * 2),
                        Const.MARGIN + canvasHeight / 4,
                    ),
                );
            });

            // 下段のgatherPointMapを設定
            colorsBottom.forEach((color, index) => {
                const order = index + 1;
                this.gatherPointMap.set(
                    color,
                    new PIXI.Point(
                        Const.MARGIN +
                            (canvasWidth * (order * 2 - 1)) /
                                (colorsBottom.length * 2),
                        Const.MARGIN + (canvasHeight * 3) / 4,
                    ),
                );
            });

            distanceWidth = (0.95 * canvasWidth) / colors.length;
            distanceHeight = (0.95 * canvasHeight) / 4;
        }
        this.gatherDistance = Math.min(distanceWidth, distanceHeight);
    }

    async onEnter(): Promise<void> {
        this.isRunning = false;
        this.displayStartMessage();
        this.displayScoreMessage();

        const deleteMessage = new Promise((resolve) =>
            setTimeout(() => {
                this.container.removeChild(this.startMessage);
                resolve(null);
            }, 3000),
        );

        const startGame = new Promise((resolve) =>
            setTimeout(() => {
                this.isRunning = true;
                resolve(null);
            }, 1500),
        );
        await Promise.all([deleteMessage, startGame]);
    }

    update(delta: number): void {
        // 蝶々の羽ばたき
        this.butterflies.forEach((butterfly) => {
            butterfly.flap(delta);
        });

        // helpオブジェクトを出すタイミングで表示
        if (
            this.helpFlowersTiming.includes(Math.floor(this.elapsedTime / 1000))
        ) {
            const flowerType = Utility.chooseAtRandom(
                ["freeze", "time_plus", "gather", "long"],
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
        }

        this.flowers.forEach((flower) => {
            if (flower.isRunning) {
                flower.spin(delta);
                flower.fall(delta);
            }
        });

        if (!this.isRunning) return;

        // ↑ pause中でも動く処理、↓ pause中は動かない処理

        this.elapsedTime += delta;

        // sun
        const progress = this.elapsedTime / (this.gameTimer * 1000);
        this.sun.move(
            progress,
            this.manager.app.screen.width,
            this.manager.app.screen.height,
        );
        // 残り10秒を切ったらblinkさせる
        if (this.elapsedTime >= this.gameTimer * 1000 - 10000) {
            this.sun.blink();
        }

        // butterfly flying
        if (this.freezeElapsedTime <= 0) {
            this.butterflies.forEach((butterfly) => {
                butterfly.fly(
                    this.manager.app.screen.width,
                    this.manager.app.screen.height,
                    delta,
                );
            });
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
            this.showActionMessage("Time up!", false);
            this.endGame();
        }
    }

    onExit(): void {
        if (this.pointerDownHandler) {
            this.manager.app.stage.removeEventListener(
                "pointerdown",
                this.pointerDownHandler,
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

    render(): void {}

    private endGame(): void {
        if (this.isFinish) return;

        this.isRunning = false;
        this.isFinish = true;
        this.stageInfo.stagePoint = this.stagePoint;
        this.stageInfo.captureCount = this.caputuredButterflies.length;
        this.stageInfo.calcScore();

        this.butterflies.forEach((butterfly) => {
            butterfly.stop();
            butterfly.stopFlap();
            butterfly.delete();
        });

        this.flowers.forEach((flower) => {
            flower.stop();
            flower.delete();
        });

        setTimeout(() => {
            this.manager.setState(
                new ResultState(this.manager, this.stageInfo),
            );
        }, 3000);
    }

    private displayStartMessage(): void {
        this.startMessage.alpha = 1;
    }

    private displayScoreMessage(): void {
        this.scoreMessage.alpha = 1;
    }

    private showActionMessage(
        message: string,
        isFadeOut: boolean = true,
    ): void {
        this.actionMessage.alpha = 1;
        this.actionMessage.text = message;
        this.actionMessage.x =
            this.manager.app.renderer.width / 2 - this.actionMessage.width / 2;

        if (isFadeOut) {
            setTimeout(() => {
                this.hideActionmessage();
            }, 1500);
        }
    }

    private showHelpMessage(message: string): void {
        this.helpMessage.alpha = 1;
        this.helpMessage.text = message;
        this.helpMessage.x =
            this.manager.app.renderer.width / 2 - this.helpMessage.width / 2;
        setTimeout(() => {
            this.helpMessage.alpha = 0;
        }, 1500);
    }

    private hideActionmessage() {
        if (this.actionMessage) {
            this.actionMessage.alpha = 0;
        }
    }

    private updateScoreMessage(): void {
        this.scoreMessage.text = `${this.caputuredButterflies.length} / ${this.stageInfo.needCount}`;
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
            this.captureFlowers(flowersInLoopArea);
        } else if (butterfliesInLoopArea.length === 1) {
            // １匹だけの時は、colorChange
            const butterfly = butterfliesInLoopArea[0];
            butterfly.switchColor();
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
        } else if (butterfliesInLoopArea.length === 2) {
            // 2匹の時は、同じ色であればGet
            if (
                butterfliesInLoopArea[0].color ===
                butterfliesInLoopArea[1].color
            ) {
                this.captureButterflies(butterfliesInLoopArea);
                this.captureFlowers(flowersInLoopArea);
            } else {
                this.badLoop();
            }
        } else {
            // 3匹以上の時は、全色同じもしくは全色違いであればGet
            const colors = butterfliesInLoopArea.map(
                (butterfly) => butterfly.color,
            );
            if (
                colors.every((val, i, arr) => val === arr[0]) ||
                new Set(colors).size === colors.length
            ) {
                this.captureButterflies(butterfliesInLoopArea);
                this.captureFlowers(flowersInLoopArea);
            } else {
                this.badLoop();
            }
        }
    }

    private captureButterflies(butterflies: Butterfly[]): void {
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
            butterfly.stop();
            butterfly.delete();
        });

        if (this.caputuredButterflies.length >= this.stageInfo.needCount) {
            this.endGame();
        } else {
            // 捕まえた分だけ新しく蝶々を補充
            for (let i = 0; i < butterflies.length; i++) {
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
            }
        }
    }

    private captureFlowers(flowers: HelpFlower[]): void {
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
                butterfly.stop();
            });
            this.freezeElapsedTime = Const.FREEZE_EFFECT_TIME_MS;
        } else {
            this.butterflies.forEach((butterfly) => {
                butterfly.reFly();
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
            this.lineDrawer.setLineColor(0x0081af);
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
            this.gatherElapsedTime = Const.GATHHER_EFFECT_TIME_MS;

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
                    this.container.addChild(circle);
                    setTimeout(() => {
                        this.container.removeChild(circle);
                    }, Const.GATHHER_EFFECT_TIME_MS);
                });
            }
        } else {
            this.butterflies.forEach((butterfly) => {
                butterfly.deleteGatherPoint();
            });
            this.gatherElapsedTime = -1;
        }
    }

    private badLoop(): void {
        this.stagePoint -= 20;
        this.showActionMessage("Bad Loop! \r\n -20 point");
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
            this.stageInfo.muptipleButterflyRate * 100,
        );
        const multiplication = isMultiple
            ? Utility.random(2, this.stageInfo.maxMultiplateRate)
            : 1;

        const newButterfly = new Butterfly(
            this.stageInfo.butterflySize,
            mainColor,
            subColor,
            multiplication,
        );
        if (this.gatherElapsedTime >= 0) {
            const point = this.gatherPointMap.get(newButterfly.color);
            if (point) {
                newButterfly.setGatherPoint(point, this.gatherDistance);
            }
        }

        return newButterfly;
    }
}
