import * as PIXI from "pixi.js";
import * as Utility from "../utils/Utility";

export class HelpFlower extends PIXI.Container {
    private sprite: PIXI.Sprite;
    private type: string;
    private elapsedX: number = 0; // 時間パラメータ
    private elapsedY: number = 0; // 時間パラメータ
    private message: string;
    private readonly screenWidth: number;
    private readonly screenHeight: number;
    private readonly initialX: number;
    private readonly amplitude: number; // 振幅
    private readonly coefficientY: number = Utility.random(50, 70) / 100; // Y軸の振動の係数
    private readonly coefficientX: number =
        (Utility.chooseAtRandom([-1, 1], 1)[0] * Utility.random(50, 70)) / 100; // X軸の振動の係数

    constructor(type: string, screenWidth: number, screenHeight: number) {
        super();
        this.type = type;
        switch (type) {
            case "freeze":
                this.sprite = PIXI.Sprite.from("flower1");
                this.message = "Freeze!";
                break;
            case "time_plus":
                this.sprite = PIXI.Sprite.from("flower2");
                this.message = "Time extension!";
                break;
            case "gather":
                this.sprite = PIXI.Sprite.from("flower3");
                this.message = "Cather!";
                break;
            default:
            case "long":
                this.sprite = PIXI.Sprite.from("flower4");
                this.message = "Long Loop!";
                break;
        }
        this.addChild(this.sprite);
        this.addChild(this.sprite);
        this.sprite.anchor.set(0.5);
        this.scale.set(0.3);

        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
        this.amplitude = Utility.random(
            this.screenWidth / 10,
            this.screenWidth / 6,
        );

        this.initialX = Utility.random(
            this.amplitude,
            (this.screenWidth * 5) / 6,
        );
        this.y = Utility.random(-this.screenHeight / 4, 0);
    }

    fall(delta: number): void {
        if (this.y > this.screenHeight + this.height) {
            return;
        }
        this.elapsedX += 0.0015 * delta * this.coefficientX;
        this.elapsedY += 0.002 * delta;

        this.x = Math.sin(this.elapsedX) * this.amplitude + this.initialX;
        this.y += (Math.sin(this.elapsedY) + 2) * this.coefficientY;
    }

    spin(delta: number): void {
        this.sprite.rotation += 0.001 * delta * Utility.random(7, 10);
    }
}
