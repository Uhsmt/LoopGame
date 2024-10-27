import * as PIXI from "pixi.js";

export abstract class PlanetBase extends PIXI.Container {
    constructor() {
        super();
    }

    abstract move(
        progress: number,
        screen_width: number,
        screen_height: number,
    ): void;

    abstract blink(): void;

    abstract stopBlink(): void;
}
