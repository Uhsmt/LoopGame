import * as PIXI from "pixi.js";
import * as Utility from "../utils/Utility";
import * as Const from "../utils/Const";
import { BaseCaptureableObject } from "./BaseCaptureableObject";

export class Butterfly extends BaseCaptureableObject {
    private ellipse: PIXI.Graphics;
    private mark: PIXI.Graphics;
    protected sprite: PIXI.Sprite;
    private xDiretion: number; // x方向の進行距離（1フレームあたり）
    private yDiretion: number; // y方向の進行距離（1フレームあたり）
    private xFrame: number; // x方向で同じ方向に進んだ累積フレーム数
    private yFrame: number; // y方向で同じ方向に進んだ累積フレーム数
    private isHitLineBeforeFrame: boolean = false; // 前フレームで線に当たっていたか
    private flappingProgress: number = 0;
    private flappingSpeed = 0.01;
    isFlying = false;
    isFlapping = false;
    readonly multiplicationRate: number = 1;
    private gatherPoint: PIXI.Point | null = null;
    private gatherDistance = 10;
    private isForceToGather = false;

    color: number;
    private readonly xTernFrame = Utility.random(120, 150);
    private readonly yTernFrame = Utility.random(120, 150);
    readonly spriteWith: number;

    readonly screenSize: { x: number; y: number };

    constructor(
        size: string,
        color: number,
        subColor: number,
        multiplicationRate: number = 1,
        screenSize: { x: number; y: number },
    ) {
        super();
        this.screenSize = screenSize;

        this.alpha = 0;
        this.color = color;
        if (size === "random") {
            size = Utility.chooseAtRandom([...Const.SIZE_LIST], 1)[0];
        }

        switch (size) {
            case "large":
                this.sprite = PIXI.Sprite.from("butterfly_large");
                this.sprite.scale.set(0.2);
                this.xDiretion = 0.4;
                this.yDiretion = 0.3;
                this.flappingSpeed = Utility.random(8, 10) / 1000;
                this.hitAreaSize = 14;
                break;
            case "medium":
                this.sprite = PIXI.Sprite.from("butterfly_medium");
                this.sprite.scale.set(0.16);
                this.xDiretion = 0.5;
                this.yDiretion = 0.4;
                this.flappingSpeed = Utility.random(12, 15) / 1000;
                this.hitAreaSize = 11;
                break;
            case "special":
                this.sprite = PIXI.Sprite.from("butterfly_special");
                this.sprite.scale.set(0.15);
                this.xDiretion = 0.6;
                this.yDiretion = 0.5;
                this.flappingSpeed = Utility.random(10, 13) / 1000;
                this.hitAreaSize = 10;
                break;
            default:
                this.sprite = PIXI.Sprite.from("butterfly_small");
                this.sprite.scale.set(0.12);
                this.xDiretion = 0.6;
                this.yDiretion = 0.6;
                this.flappingSpeed = Utility.random(13, 17) / 1000;
                this.hitAreaSize = 9;
                break;
        }
        this.sprite.tint = color;
        this.sprite.anchor.set(0.5);
        this.addChild(this.sprite);
        this.spriteWith = this.sprite.width;

        // color change用のobject
        const ellipse = new PIXI.Graphics();
        ellipse.ellipse(
            0,
            0,
            30 * this.sprite.scale.x,
            40 * this.sprite.scale.x,
        );
        ellipse.fill(0xffffff);
        ellipse.x = 0;
        ellipse.y = 0;
        this.ellipse = ellipse;
        this.ellipse.tint = subColor;
        if (color == subColor) {
            this.ellipse.alpha = 0;
        }
        this.addChild(ellipse);

        // 色覚特性があっても色以外の手がかりで同色判定できるよう、
        // 体の上に色ごとの形状マークを重ねる(白地に黒縁取りでどの羽色でも視認できるようにする)
        const mark = new PIXI.Graphics();
        this.mark = mark;
        this.drawMark(color);
        this.addChild(mark);

        // for multiplications
        this.multiplicationRate = multiplicationRate;
        if (this.multiplicationRate >= 2) {
            const leaf = new MultipleLeaf(this.multiplicationRate);
            leaf.x = 0;
            leaf.y = (this.sprite.height * 2) / 3;
            this.addChild(leaf);
        }

        // for animation
        this.xFrame = Utility.random(1, 120);
        this.yFrame = Utility.random(1, 120);

        // Set the pivot to the center
        this.pivot.set(this.width / 2, this.height / 2);
    }

    /**
     * Set the center of the object(Global position)
     * @returns {x: number, y: number} - The center of the object
     */
    protected getObjectCenter(): { x: number; y: number } {
        return {
            x: this.x - this.spriteWith / 2,
            y: this.y - this.height / 2,
        };
    }

    appear(fadeIn: boolean = true): void {
        if (fadeIn) {
            const fadeInStep = () => {
                // 破棄済みならループを止める(リーク防止)
                if (this.destroyed) {
                    return;
                }
                if (this.alpha < 1) {
                    this.alpha = Math.min(this.alpha + 0.07, 1);
                    requestAnimationFrame(fadeInStep);
                }
            };
            fadeInStep();
        } else {
            this.alpha = 1;
        }
    }

    update(
        delta: number,
        lineSegments: PIXI.Point[],
        avoidPoint: PIXI.Point | null = null,
    ): void {
        this.flap(delta);
        this.fly(delta, lineSegments, avoidPoint);
    }

    private fly(
        delta: number,
        lineSegments: PIXI.Point[],
        avoidPoint: PIXI.Point | null = null,
    ): void {
        if (!this.isFlying) return;
        const left = Const.MARGIN;
        const right = this.screenSize.x - Const.MARGIN;
        const top = Const.MARGIN;
        const bottom = this.screenSize.y - Const.MARGIN;

        // avoidPointが指定されていれば、画面上の全ての蝶が
        // gather・通常移動より優先して遠ざかる
        const isAvoiding = !!avoidPoint;

        if (isAvoiding && avoidPoint) {
            // avoidPointから遠ざかる方向へ飛ぶ(gatherPointロジックの逆)
            // 横方向
            if (this.x < avoidPoint.x) {
                this.xDiretion = -1 * Math.abs(this.xDiretion);
            } else {
                this.xDiretion = Math.abs(this.xDiretion);
            }
            // 縦方向
            if (this.y < avoidPoint.y) {
                this.yDiretion = -1 * Math.abs(this.yDiretion);
            } else {
                this.yDiretion = Math.abs(this.yDiretion);
            }
            // 画面端では外側へ逃げ続けない(端に達したら内側方向を維持)
            if (this.x <= left + this.spriteWith) {
                this.xDiretion = Math.abs(this.xDiretion);
            } else if (this.x >= right) {
                this.xDiretion = -1 * Math.abs(this.xDiretion);
            }
            if (this.y <= this.sprite.height + top) {
                this.yDiretion = Math.abs(this.yDiretion);
            } else if (this.y >= bottom) {
                this.yDiretion = -1 * Math.abs(this.yDiretion);
            }
            // ライン判定をスキップする間は前フレームの接触状態を持ち越さない
            // (効果終了直後の反転判定が誤ってスキップされないように)
            this.isHitLineBeforeFrame = false;
        } else if (this.isForceToGather && this.gatherPoint) {
            // gatherPointに向かって飛ぶ
            // 横方向
            if (this.x < this.gatherPoint.x) {
                this.xDiretion = Math.abs(this.xDiretion);
            } else {
                this.xDiretion = -1 * Math.abs(this.xDiretion);
            }
            // 縦方向
            if (this.y < this.gatherPoint.y) {
                this.yDiretion = Math.abs(this.yDiretion);
            } else {
                this.yDiretion = -1 * Math.abs(this.yDiretion);
            }
            // ライン判定をスキップする間は前フレームの接触状態を持ち越さない
            this.isHitLineBeforeFrame = false;
        } else {
            // lineSegmentsと距離がhitAreaSize以下の点があればisHitLineをtrueにする
            const isHitLine = lineSegments.some((segment) => {
                const center = this.getObjectCenter();
                const distance = Utility.getDistance(
                    new PIXI.Point(center.x, center.y),
                    segment,
                );
                return distance <= this.hitAreaSize;
            });

            // 横方向
            if (this.xDiretion < 0 && this.x <= left + this.spriteWith) {
                // 左端に到達したら右に向かう
                this.xFrame = 0;
                this.xDiretion = Math.abs(this.xDiretion);
            } else if (this.xDiretion > 0 && this.x >= right) {
                // 右端に到達したら左に向かう
                this.xFrame = 0;
                this.xDiretion = -1 * Math.abs(this.xDiretion);
            } else if (isHitLine && !this.isHitLineBeforeFrame) {
                // 線に当たったら反転
                this.xFrame = 0;
                this.xDiretion = -1 * this.xDiretion;
            } else if (this.xFrame === this.xTernFrame) {
                // 一定フレーム数進んだらランダムに方向変換
                this.xFrame = 0;
                this.xDiretion *= Utility.chooseAtRandom([-1, 1], 1)[0];
            } else {
                // それ以外は進む
                this.xFrame += 1;
            }

            // 縦方向
            if (this.yDiretion < 0 && this.y <= this.sprite.height + top) {
                // 上端に到達したら下に向かう
                this.yFrame = 0;
                this.yDiretion = Math.abs(this.yDiretion);
            } else if (this.yDiretion > 0 && this.y >= bottom) {
                // 下端に到達したら上に向かう
                this.yFrame = 0;
                this.yDiretion = -1 * Math.abs(this.yDiretion);
            } else if (isHitLine && !this.isHitLineBeforeFrame) {
                // 線に当たったら反転
                this.yFrame = 0;
                this.yDiretion = -1 * this.yDiretion;
            } else if (this.yFrame === this.yTernFrame) {
                // 一定フレーム数進んだらランダムに方向変換
                this.yFrame = 0;
                this.yDiretion *= Utility.chooseAtRandom([-1, 1], 1)[0];
            } else {
                // それ以外は進む
                this.yFrame += 1;
            }

            this.isHitLineBeforeFrame = isHitLine;
        }

        // update position
        let useXDiretion = this.xDiretion;
        let useYDiretion = this.yDiretion;
        if (isAvoiding) {
            // 逃避中はサイズによらず小蝶(0.6)と同じ速さで逃げる
            // (向きだけ維持して大きさを揃える。xDiretion自体は書き換えない)
            useXDiretion = Math.sign(this.xDiretion) * Const.AVOID_PENCIL_SPEED;
            useYDiretion = Math.sign(this.yDiretion) * Const.AVOID_PENCIL_SPEED;
        }
        if (isAvoiding || this.isForceToGather) {
            useXDiretion *= 1.7;
            useYDiretion *= 1.7;
        }
        this.x += (useXDiretion * delta) / 16;
        this.y += (useYDiretion * delta) / 16;

        // thisとgatherPointの距離が一定以下になったらisForeToGatherをfalseにする
        if (this.gatherPoint) {
            const thisPoint = new PIXI.Point(this.x, this.y);
            const distance = Utility.getDistance(thisPoint, this.gatherPoint);
            if (distance <= 10) {
                this.isForceToGather = false;
            } else if (distance >= this.gatherDistance) {
                this.isForceToGather = true;
            }
        }
    }

    private flap(delta: number): void {
        if (!this.isFlapping) return;

        // Calculate the scale based on flappingProgress
        let scale = 1;
        if (this.flappingProgress < 50) {
            scale = 1 - this.flappingProgress / 100;
        } else {
            scale = this.flappingProgress / 100;
        }
        this.sprite.scale.x = this.sprite.scale.y * scale;
        if (this.ellipse) {
            this.ellipse.scale.x = scale;
        }
        if (this.mark) {
            this.mark.scale.x = scale;
        }

        // Update flappingProgress
        this.flappingProgress += this.flappingSpeed * 8 * delta;
        if (this.flappingProgress >= 100) {
            this.flappingProgress = 0;
        }
    }

    switchColor(): void {
        if (!this.ellipse) return;
        const mainColor: number = this.sprite.tint;
        const subColor: number = this.ellipse.tint;

        this.sprite.tint = subColor;
        this.ellipse.tint = mainColor;
        this.color = subColor;
        this.drawMark(subColor);
    }

    /**
     * 現在の色に対応する形状マークを(白地に黒縁取りで)描き直す
     */
    private drawMark(color: number): void {
        if (!this.mark) return;
        const shape = Utility.getColorMarkShape(color);
        const scale = this.sprite.scale.x;
        this.mark.clear();
        drawMarkShapePath(this.mark, shape, 24 * scale);
        this.mark.fill(0x000000);
        drawMarkShapePath(this.mark, shape, 18 * scale);
        this.mark.fill(0xffffff);
    }

    setRandomInitialPoistion(screenWidth: number, screenHeight: number): void {
        const positions = ["top", "bottom", "left", "right"];
        const position = Utility.chooseAtRandom(positions, 1)[0];
        const top_y = Const.MARGIN;
        const bottom_y = screenHeight - Const.MARGIN + this.height;
        const left_x = Const.MARGIN;
        const right_x = screenWidth - Const.MARGIN + this.width;

        let x, y;
        switch (position) {
            case "top":
                x = Utility.random(left_x, right_x);
                y = top_y + this.height / 2;
                break;
            case "bottom":
                x = Utility.random(left_x, right_x);
                y = bottom_y - this.height / 2;
                break;
            case "left":
                x = left_x + this.width / 2;
                y = Utility.random(top_y, bottom_y);
                break;
            case "right":
                x = right_x - this.width / 2;
                y = Utility.random(top_y, bottom_y);
                break;
        }
        this.position.set(x, y);
    }

    setGatherPoint(point: PIXI.Point, distance: number): void {
        this.gatherPoint = point;
        this.gatherDistance = distance;
        this.isForceToGather = true;
    }

    deleteGatherPoint(): void {
        this.gatherPoint = null;
        this.isForceToGather = false;
    }

    getSubColor(): number {
        return this.ellipse.tint;
    }
}

/**
 * 正多角形の頂点座標を [x0, y0, x1, y1, ...] の形式で返す(PIXI.Graphics.polyの入力形式)
 */
function regularPolygonPoints(
    sides: number,
    radius: number,
    rotationDeg: number,
): number[] {
    const points: number[] = [];
    for (let i = 0; i < sides; i++) {
        const angle = (rotationDeg + (360 / sides) * i) * (Math.PI / 180);
        points.push(radius * Math.cos(angle), radius * Math.sin(angle));
    }
    return points;
}

/**
 * 星型の頂点座標を返す(外側/内側の半径を交互に配置する)
 */
function starPolygonPoints(
    spikes: number,
    outerRadius: number,
    innerRadius: number,
    rotationDeg: number,
): number[] {
    const points: number[] = [];
    for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (rotationDeg + (180 / spikes) * i) * (Math.PI / 180);
        points.push(radius * Math.cos(angle), radius * Math.sin(angle));
    }
    return points;
}

/**
 * 色ごとの形状マーク(Const.MarkShape)を graphics 上にパスとして構築する。
 * 呼び出し側で fill()/stroke() を実行するまでは描画されない。
 */
function drawMarkShapePath(
    graphics: PIXI.Graphics,
    shape: Const.MarkShape,
    radius: number,
): void {
    switch (shape) {
        case "circle":
            graphics.circle(0, 0, radius);
            break;
        case "square":
            graphics.poly(regularPolygonPoints(4, radius, -45));
            break;
        case "triangle":
            graphics.poly(regularPolygonPoints(3, radius, -90));
            break;
        case "diamond":
            graphics.poly(regularPolygonPoints(4, radius, -90));
            break;
        case "star":
            graphics.poly(starPolygonPoints(4, radius, radius * 0.42, -90));
            break;
    }
}

class MultipleLeaf extends PIXI.Container {
    constructor(number: number) {
        super();
        const sprite = PIXI.Sprite.from("leaf");
        sprite.scale.x = 0.1;
        sprite.scale.y = 0.1;
        sprite.anchor.set(0.5);
        this.addChild(sprite);

        const text = new PIXI.BitmapText({
            text: `x${number}`,
            style: {
                fill: "#ffffff",
                fontSize: 15,
                fontFamily: "Arial",
            },
        });
        text.anchor.set(0.5);
        text.x = 2;
        this.addChild(text);
    }
}
