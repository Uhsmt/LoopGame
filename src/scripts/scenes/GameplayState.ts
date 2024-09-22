// GameplayState.ts
import * as PIXI from 'pixi.js';
import { GameStateManager } from './GameStateManager';
import { LineDrawer } from '../components/LineDrawer';
import { Sun } from '../components/Sun';
import { ResultState } from './ResultState';

export class GameplayState {
    private manager: GameStateManager;
    private container: PIXI.Container;
    private message: PIXI.BitmapText;
    private lineDrawer: LineDrawer;
    private sun: Sun;
    private gameTimer: number = 15;
    private elapsedTime: number = 0;

    constructor(manager: GameStateManager) {
        this.manager = manager;
        this.container = new PIXI.Container();
        this.manager.app.stage.addChild(this.container);
        this.lineDrawer = new LineDrawer(this.manager.app, 0x000000);
        this.lineDrawer.on('loopAreaCompleted', this.handleLoopAreaCompleted.bind(this));        
        this.sun = new Sun();
        this.container.addChild(this.sun);
    }

    onEnter(): void {
        const app = this.manager.app;

        // background
        const backgroundSprite = new PIXI.Sprite(PIXI.Texture.from('background'));
        backgroundSprite.interactive = true;
        backgroundSprite.anchor.y = 1;
        backgroundSprite.x = 0;
        backgroundSprite.scale = app.screen.height / backgroundSprite.height;
        backgroundSprite.y = app.screen.height;
        this.container.addChild(backgroundSprite);

        this.displayStartMessage();
        setTimeout(() => {
            this.container.removeChild(this.message);
            this.startGame();
        }, 3000);
    }

    update(delta: number): void {
        this.elapsedTime += delta;
        // this.moveSun(delta);

        if (this.elapsedTime >= this.gameTimer * 1000) {
            this.endGame();
        }
        // console.log(parseInt(this.elapsedTime.toString()));
    }

    private moveSun(delta: number): void {
        const totalTime = this.gameTimer * 1000;
        const startX = 0;
        const endX = this.manager.app.renderer.width;
        const startY = this.manager.app.renderer.height;
        const peakY = 100; // 画面上端からどれだけ下か
        const t = this.elapsedTime / totalTime;
        const x = startX + t * (endX - startX);
        const y = startY - (4 * peakY * t * (1 - t));

        this.sun.position.set(x, y);
    }

    private startGame(): void {
        this.sun.position.set(0, this.manager.app.screen.height); // ゲーム開始時に太陽の位置を初期化
        // ここでゲームのロジックを開始
    }

    private endGame(): void {
        this.manager.setState(new ResultState(this.manager));
    }

    private displayStartMessage(): void {
        this.message = new PIXI.BitmapText({text:'Catch 10 butterflies!', style:new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 24, fill: 0x000000 })});
        this.message.x = this.manager.app.renderer.width / 2 - this.message.width / 2;
        this.message.y = 50;
        this.container.addChild(this.message);
    }

    onExit(): void {
        console.log('Gameplay State Exit');
        this.manager.app.stage.removeChild(this.container);
        this.container.destroy();
    }

    render(): void {
        // レンダリングロジックはここに記述
    }

    private handleLoopAreaCompleted(loopArea: PIXI.Graphics): void {
        console.log('Loop Area Completed');
    }
}
