import { GameStateManager } from "./GameStateManager";
import * as PIXI from 'pixi.js';

export class ResultState{

    private manager: GameStateManager;
    private container: PIXI.Container;

    constructor(manager: GameStateManager) {
        this.manager = manager;
        this.container = new PIXI.Container();
        this.manager.app.stage.addChild(this.container);
    }

    onEnter(): void {
        console.log("Result");
    }

    update(delta: number): void {
        // Start Stateでは特にアップデートするロジックは不要
    }

    render(): void {
        // 描画はPixiJSがハンドルするのでここでは何もしない
    }
    onExit(): void {
        // Exit logic if any

    }
}