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
    private status: string = "playing";
    caputuredButterflies: Butterfly[] = [];
    butterflies: Butterfly[] = [];
    flowers: HelpFlower[] = [];
    pointerDownHandler: (event: PIXI.FederatedPointerEvent) => void;
    private stageInfo: StageInformation;
    private readonly helpFlowersTiming: number[] = [];

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
            text: `Catch ${this.stageInfo.needCount} butterflies!`,
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
            // TODO 検証ができたものから有効にする
            // const flowerType = Utility.chooseAtRandom(
            //     ["freeze", "time_plus", "gather", "long"],
            //     1,
            // )[0];
            const flowerType = "gather";

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
        if (this.status !== "freeze") {
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
            butterfliesInLoopArea[0].switchColor();
            this.captureFlowers(flowersInLoopArea);
            // TODO gatherの場合は、gatherPointを設定
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

        // score加算 全部同じ色の場合は蝶の数×10 それ以外は蝶の数×30
        const basePoint =
            butterflies.length *
            (butterflies.every((b) => b.color === butterflies[0].color)
                ? 10
                : 30);
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
            this.status = "freeze";
            this.butterflies.forEach((butterfly) => {
                butterfly.stop();
            });
            this.freezeElapsedTime = 5000;
        } else {
            this.status = "playing";
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
            this.longLoopElapsedTime = 5000;
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
        const debugCircles: PIXI.Graphics[] = [];
        if (isActive) {
            const colorNum = this.stageInfo.butterflyColors.length;
            const centerPoints: PIXI.Point[] = [];
            const canvasWidth =
                this.manager.app.screen.width - Const.MARGIN * 2;
            const canvasHeight =
                this.manager.app.screen.height - Const.MARGIN * 2;

            let gatherDistance = 0;

            if (colorNum === 2) {
                centerPoints.push(
                    new PIXI.Point(
                        Const.MARGIN + canvasWidth / 4,
                        Const.MARGIN + canvasHeight / 2,
                    ),
                );
                centerPoints.push(
                    new PIXI.Point(
                        Const.MARGIN + (canvasWidth * 3) / 4,
                        Const.MARGIN + canvasHeight / 2,
                    ),
                );
                gatherDistance = (0.9 * canvasWidth) / 4;
            }
            // TODO 3色以上の場合の処理を追加

            if (DEBUG_MODE) {
                // centerPointsを中心に円を描画
                centerPoints.forEach((point) => {
                    const circle = new PIXI.Graphics().circle(
                        point.x,
                        point.y,
                        gatherDistance,
                    );
                    circle.fill(0xde3249);
                    circle.alpha = 0.5;
                    debugCircles.push(circle);
                    this.container.addChild(circle);
                });
            }

            this.stageInfo.butterflyColors.forEach((color, index) => {
                const butterflies = this.butterflies.filter(
                    (butterfly) => butterfly.color === color,
                );
                if (butterflies.length === 0) return;
                const centerPoint = centerPoints[index];
                butterflies.forEach((butterfly) => {
                    butterfly.setGatherPoint(centerPoint, gatherDistance);
                });
            });

            this.gatherElapsedTime = 10000;
        } else {
            this.butterflies.forEach((butterfly) => {
                butterfly.deleteGatherPoint();
            });
            debugCircles.forEach((circle) => {
                this.container.removeChild(circle);
                circle.destroy();
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

        // TODO gatherの場合は、gatherPointを設定

        return new Butterfly(
            this.stageInfo.butterflySize,
            mainColor,
            subColor,
            multiplication,
        );
    }
}
