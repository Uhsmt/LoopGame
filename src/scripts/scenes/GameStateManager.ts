import { GameState } from "./GameState";
import * as PIXI from "pixi.js";

export class GameStateManager {
    private currentState: GameState | null = null;
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
        // onEnterをasyncで実装している状態もあるため、失敗を握りつぶさない
        Promise.resolve(this.currentState.onEnter()).catch((error: unknown) => {
            console.error("Failed to enter state:", error);
        });
    }

    update(delta: number) {
        this.currentState?.update(delta);
    }

    render() {
        this.currentState?.render();
    }
}
