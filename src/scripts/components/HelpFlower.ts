import * as PIXI from "pixi.js";
import * as Utility from "../utils/Utility";
import { BaseCaptureableObject } from "./BaseCaptureableObject";

export class HelpFlower extends BaseCaptureableObject {
    private type: string;
    private elapsedX: number = 0; // 時間パラメータ
    private elapsedY: number = 0; // 時間パラメータ
    readonly message: string;
    isRunning: boolean = true;
    private sprite: PIXI.Sprite;
    private readonly screenWidth: number;
    private readonly screenHeight: number;
    private readonly initialX: number;
    private readonly amplitude: number; // 振幅
    private readonly coefficientY: number = Utility.random(50, 70) / 100; // Y軸の振動の係数
    private readonly coefficientX: number =
        (Utility.chooseAtRandom([-1, 1], 1)[0] * Utility.random(50, 70)) / 100; // X軸の振動の係数
    readonly description: string;
    readonly descriptionJP: string;
    readonly messageJP: string;

    constructor(type: string, screenWidth: number, screenHeight: number) {
        super();
        this.type = type;
        switch (type) {
            case "freeze":
                this.sprite = PIXI.Sprite.from("flower1");
                this.message = "Freeze!";
                this.messageJP = "とまれ！";
                this.description = "Freeze the butterflies";
                this.descriptionJP = "ちょうちょをとめる";
                break;
            case "time_plus":
                this.sprite = PIXI.Sprite.from("flower2");
                this.message = "Time extension!";
                this.messageJP = "もどれ！";
                this.description = "Extend the game time";
                this.descriptionJP = "ゲームじかんをのばす";
                break;
            case "gather":
                this.sprite = PIXI.Sprite.from("flower3");
                this.message = "Ghather!";
                this.messageJP = "あつまれ！";
                this.description = "Gather the butterflies by color";
                this.descriptionJP = "ちょうちょをあつめる";
                break;
            default:
            case "long":
                this.sprite = PIXI.Sprite.from("flower4");
                this.message = "Long Loop!";
                this.messageJP = "ながいループ！";
                this.description = "Extend the loop line";
                this.descriptionJP = "ループをのばす";
                break;
        }
        this.scale.set(0.3);
        this.sprite.anchor.set(0.5);
        this.addChild(this.sprite);
        this.hitAreaSize = this.width / 2;

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

    protected getObjectCenter(): { x: number; y: number } {
        return {
            x: this.x,
            y: this.y,
        };
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

    stop(): void {
        this.isRunning = false;
    }

    getType(): string {
        return this.type;
    }
}
