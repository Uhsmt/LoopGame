import * as PIXI from 'pixi.js';
import { GameStateManager } from "./GameStateManager";
import { LineDrawer } from '../components/LineDrawer';
import { GameplayState } from './GameplayState';

export class StartState {
    private manager: GameStateManager;
    private container: PIXI.Container;
    private lineDrawer: LineDrawer;
    private startButton: PIXI.BitmapText
    private ruleButton: PIXI.BitmapText

    constructor(manager: GameStateManager) {
        this.manager = manager;
        this.container = new PIXI.Container();
        this.manager.app.stage.addChild(this.container);
    }

    onEnter(): void {        
        console.log("Entered Start State");
        
        if (!this.manager || !this.manager.app) {
            console.error("ManagerまたはManagerのappが定義されていません");
            return;
        }
        const app = this.manager.app;

        //LineDrawerを初期化
        this.lineDrawer = new LineDrawer(this.manager.app);
        this.lineDrawer.on('loopAreaCompleted', this.handleLoopAreaCompleted.bind(this));

        // background
        const backgroundSprite = new PIXI.Sprite(PIXI.Texture.from('menu_background'));
        backgroundSprite.interactive = true;
        backgroundSprite.anchor.y = 1;
        backgroundSprite.x = 0;
        backgroundSprite.scale = app.screen.width / backgroundSprite.width;
        backgroundSprite.y = app.screen.height;

        // ボタン
        this.startButton = this.button('Start', app.screen.width / 4 - 50, app.screen.height / 2);
        this.ruleButton= this.button('Rules', app.screen.width * 3 / 4 - 50, app.screen.height / 2);
        this.container.addChild(backgroundSprite);
        this.container.addChild(this.startButton);
        this.container.addChild(this.ruleButton);
    }

    update(delta: number): void {
        // Start Stateでは特にアップデートするロジックは不要
    }

    render(): void {
        // 描画はPixiJSがハンドルするのでここでは何もしない
    }

    private button(name: string, _x:number , _y:number ): PIXI.BitmapText{
        const button = new PIXI.BitmapText({
            text: name,
            style: {
                fill: '#ffffff',
                fontSize: 40,
                fontFamily: "Arial",
            },
        });


        // const button = new PIXI.Text(name, style);
        button.interactive = true;
        button.x = _x;
        button.y = _y;

        return button;
    }

    // LineDrawerのループエリアが完成したときのハンドラ
    private handleLoopAreaCompleted(loopArea: PIXI.Graphics) {
        if(this.isRuleButtonInLoopArea(loopArea)){
            this.onRuleSelected();
        }else if (this.isStartButtonInLoopArea(loopArea)) {
            this.onStartGameSelected();
        }
    }

    private isStartButtonInLoopArea(loopArea: PIXI.Graphics): boolean {
        const startButtonBounds = this.startButton.getBounds();
        const loopAreaBounds = loopArea.getBounds();

        const startButtonRect = new PIXI.Rectangle(startButtonBounds.x, startButtonBounds.y, startButtonBounds.width, startButtonBounds.height);
        const loopAreaRect = new PIXI.Rectangle(loopAreaBounds.x, loopAreaBounds.y, loopAreaBounds.width, loopAreaBounds.height);

        return this.checkOverlap(startButtonRect, loopAreaRect);
    }

    private isRuleButtonInLoopArea(loopArea: PIXI.Graphics): boolean {
        const ruleButtonBounds = this.ruleButton.getBounds();
        const loopAreaBounds = loopArea.getBounds();

        const startButtonRect = new PIXI.Rectangle(ruleButtonBounds.x, ruleButtonBounds.y, ruleButtonBounds.width, ruleButtonBounds.height);
        const loopAreaRect = new PIXI.Rectangle(loopAreaBounds.x, loopAreaBounds.y, loopAreaBounds.width, loopAreaBounds.height);

        return this.checkOverlap(startButtonRect, loopAreaRect);
    }

    private checkOverlap(rect1: PIXI.Rectangle, rect2: PIXI.Rectangle): boolean {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    private onStartGameSelected(): void {
        console.log("Start Game");
        this.manager.setState(new GameplayState(this.manager));
    }

    private onRuleSelected(): void {        
        console.log("Rule");
        // this.manager.setState(new RulesState(this.manager));
    }

    onExit(): void {
        // Exit logic if any
        this.manager.app.stage.removeChild(this.container);
        this.container.destroy();

        if (this.lineDrawer) {
            // 次のフレームのレンダリングが完了した後にクリーンアップ処理を行う
            this.manager.app.ticker.addOnce(() => {
                this.lineDrawer.cleanup();
                this.lineDrawer = null; // 破棄
            });
        }
    }
}