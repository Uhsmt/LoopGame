import * as PIXI from "pixi.js";
import * as Utility from "../utils/Utility";
import * as Const from "../utils/Const";
import { BaseCaptureableObject } from "./BaseCaptureableObject";

export class Butterfly extends BaseCaptureableObject {
    private ellipse: PIXI.Graphics;
    protected sprite: PIXI.Sprite;
    private xDiretion: number;
    private yDiretion: number;
    private xFrame: number;
    private yFrame: number;
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
    readonly hitAreaSize: number;

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
                this.hitAreaSize = 13;
                break;
            case "medium":
                this.sprite = PIXI.Sprite.from("butterfly_medium");
                this.sprite.scale.set(0.16);
                this.xDiretion = 0.5;
                this.yDiretion = 0.4;
                this.flappingSpeed = Utility.random(12, 15) / 1000;
                this.hitAreaSize = 11;
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

    protected getObjectCenter(): { x: number; y: number } {
        return {
            x: this.x - this.spriteWith / 2,
            y: this.y - this.height / 2,
        };
    }

    appear(fadeIn: boolean = true): void {
        if (fadeIn) {
            const fadeIn = () => {
                if (this.alpha <= 1) {
                    this.alpha += 0.07;
                    requestAnimationFrame(fadeIn);
                }
            };
            fadeIn();
        } else {
            this.alpha = 1;
        }
    }

    update(delta: number): void {
        this.flap(delta);
        this.fly(delta);
    }

    private fly(delta: number): void {
        if (!this.isFlying) return;
        const left = Const.MARGIN;
        const right = this.screenSize.x - Const.MARGIN;
        const top = Const.MARGIN;
        const bottom = this.screenSize.y - Const.MARGIN;

        if (this.isForceToGather && this.gatherPoint) {
            if (this.x < this.gatherPoint.x) {
                this.xDiretion = Math.abs(this.xDiretion);
            } else {
                this.xDiretion = -1 * Math.abs(this.xDiretion);
            }
            if (this.y < this.gatherPoint.y) {
                this.yDiretion = Math.abs(this.yDiretion);
            } else {
                this.yDiretion = -1 * Math.abs(this.yDiretion);
            }
        } else {
            // 横方向
            if (this.xDiretion < 0 && this.x <= left + this.spriteWith) {
                this.xFrame = 0;
                this.xDiretion = Math.abs(this.xDiretion);
            } else if (this.xDiretion > 0 && this.x >= right) {
                this.xFrame = 0;
                this.xDiretion = -1 * Math.abs(this.xDiretion);
            } else if (this.xFrame === this.xTernFrame) {
                this.xFrame = 0;
                this.xDiretion *= Utility.chooseAtRandom([-1, 1], 1)[0];
            } else {
                this.xFrame += 1;
            }

            // 縦方向
            if (this.yDiretion < top && this.y <= this.sprite.height + top) {
                this.yFrame = 0;
                this.yDiretion = Math.abs(this.yDiretion);
            } else if (this.yDiretion > 0 && this.y >= bottom) {
                this.yFrame = 0;
                this.yDiretion = -1 * Math.abs(this.yDiretion);
            } else if (this.yFrame === this.yTernFrame) {
                this.yFrame = 0;
                this.yDiretion *= Utility.chooseAtRandom([-1, 1], 1)[0];
            } else {
                this.yFrame += 1;
            }
        }

        // update position
        let useXDiretion = this.xDiretion;
        let useYDiretion = this.yDiretion;
        if (this.isForceToGather) {
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
