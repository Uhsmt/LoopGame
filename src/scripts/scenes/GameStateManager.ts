import { GameState } from "./GameState";
import * as PIXI from "pixi.js";

export class GameStateManager {
    private currentState!: GameState;
    public app: PIXI.Application;

    constructor(app: PIXI.Application) {
        this.app = app;
        // for cursor move
        app.stage.eventMode = "static";
        app.stage.hitArea = app.screen;
    }

    setState(newState: GameState) {
        if (this.currentState) {
            this.currentState.onExit();
        }
        this.currentState = newState;
        this.currentState.onEnter();
    }

    update(delta: number) {
        this.currentState.update(delta);
    }

    render() {
        this.currentState.render();
    }
}
