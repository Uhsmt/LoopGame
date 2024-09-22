import { GameStateManager } from "./GameStateManager";
import * as PIXI from 'pixi.js';
import { LineDrawer } from '../components/LineDrawer'; // Adjust the path as necessary

export class StartState {
    private manager: GameStateManager;
    private container: PIXI.Container;
    private lineDrawer: LineDrawer;

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

        // background
        const backgroundSprite = new PIXI.Sprite(PIXI.Texture.from('menu_background'));
        backgroundSprite.interactive = true;
        backgroundSprite.anchor.y = 1;
        backgroundSprite.x = 0;
        backgroundSprite.scale = app.screen.width / backgroundSprite.width;
        backgroundSprite.y = app.screen.height;

        // スタートボタン
        const startButton: PIXI.Text = this.button('Start', app.screen.width / 4 - 50, app.screen.height / 2);
        startButton.on('pointerdown', () => this.onStartGameSelected());

        // ルール説明ボタン
        const rulesButton = this.button('Rules', app.screen.width * 3 / 4 - 50, app.screen.height / 2);
        rulesButton.on('pointerdown', () => this.onRuleSelected());
        
        this.container.addChild(backgroundSprite);
        this.container.addChild(startButton);
        this.container.addChild(rulesButton);

        // this.container.addChild(this.lineDrawer.graphics);
    }

    update(delta: number): void {
        // Start Stateでは特にアップデートするロジックは不要
    }

    render(): void {
        // 描画はPixiJSがハンドルするのでここでは何もしない
    }

    private button(name: string, _x:number , _y:number ): PIXI.Text{
        const button = new PIXI.Text(name, { fill: 0xffffff, fontSize: 24 });
        button.interactive = true;
        button.x = _x;
        button.y = _y;
        return button;
    }

    private onStartGameSelected(): void {
        console.log("Start Game clicked");
        // this.manager.setState(new GameplayState(this.manager));
    }

    private onRuleSelected(): void {
        console.log("Rules clicked");
        console.log(this.manager.app.stage);
        this.manager.app.stage.updateTick;
        // this.manager.setState(new RulesState(this.manager));
    }

    onExit(): void {
        // Exit logic if any
        console.log("Exiting Start State");
        this.manager.app.stage.removeChild(this.container);
        this.container.destroy();
        this.lineDrawer.cleanup();
    }
}