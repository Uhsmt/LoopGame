import * as PIXI from 'pixi.js';
import { GameStateManager } from "./GameStateManager";
import { LineDrawer } from '../components/LineDrawer';
import { GameplayState } from './GameplayState';
import * as Utility from '../utils/Utility';
import { Butterfly } from '../components/Butterfly';
import { myConsts } from '../utils/Const';
import { StageInformation } from '../components/StageInformation';

export class StartState {
    private manager: GameStateManager;
    private container: PIXI.Container;
    private lineDrawer: LineDrawer;
    private startButton: PIXI.BitmapText;
    private ruleButton: PIXI.BitmapText;
    butterflies: Butterfly[] = [];
    private backgroundSprite: PIXI.Sprite;
    private titleSprite: PIXI.Sprite;

    constructor(manager: GameStateManager) {
        const app = manager.app;

        this.manager = manager;
        this.container = new PIXI.Container();
        this.manager.app.stage.addChild(this.container);
        this.lineDrawer = new LineDrawer(this.manager.app);

        // background
        this.backgroundSprite = new PIXI.Sprite(PIXI.Texture.from('menu_background'));
        this.backgroundSprite.interactive = true;
        this.backgroundSprite.anchor.set(0.5, 0.5);
        const bgRateX = app.screen.width / this.backgroundSprite.width;
        const bgRateY = app.screen.height / this.backgroundSprite.height;
        let bgScale = bgRateX;
        if(bgRateX < bgRateY){
            bgScale = bgRateY;
        }
        this.backgroundSprite.scale.set(bgScale);
        this.backgroundSprite.x = app.screen.width / 2;
        this.backgroundSprite.y = app.screen.height / 2;
        this.container.addChild(this.backgroundSprite);

        // title
        const titleSprite = new PIXI.Sprite(PIXI.Texture.from('title'));
        titleSprite.anchor.set(0.5);
        titleSprite.x = app.screen.width / 2;
        titleSprite.y = app.screen.height / 3;
        titleSprite.scale.set(0.8);
        this.titleSprite = titleSprite;
        this.container.addChild(titleSprite);


        // ボタン
        this.startButton = this.button('Start', app.screen.width / 4 - 50, app.screen.height * 3 / 5);
        this.ruleButton= this.button('Rules', app.screen.width * 3 / 4 - 50, app.screen.height * 3 / 5);
        this.container.addChild(this.startButton);
        this.container.addChild(this.ruleButton);
    }

    onEnter(): void {                
        if (!this.manager || !this.manager.app) {
            console.error("ManagerまたはManagerのappが定義されていません");
            return;
        }
        const app = this.manager.app;

        //LineDrawerのイベントハンドラを設定
        this.lineDrawer.on('loopAreaCompleted', this.handleLoopAreaCompleted.bind(this));

        // 適当に蝶を飛ばす
        this.dispButterfly();

        if (DEBUG_MODE){
            this.debug();
        }
    }

    debug(): void {

        const butterfly1 = new Butterfly('small', myConsts.COLOR_LIST[0], myConsts.COLOR_LIST[1], 3);
        const butterfly2 = new Butterfly('medium', myConsts.COLOR_LIST[2], myConsts.COLOR_LIST[3],4);
        const butterfly3 = new Butterfly('large', myConsts.COLOR_LIST[4], myConsts.COLOR_LIST[3],5);
        
        butterfly1.x = 100;
        butterfly1.y = 100;
        butterfly2.x = 200;
        butterfly2.y = 200;
        butterfly3.x = 300;
        butterfly3.y = 300;
        
        this.butterflies.push(butterfly1);
        this.butterflies.push(butterfly2);
        this.butterflies.push(butterfly3);

        this.container.addChild(...this.butterflies);
    }

    private dispButterfly(){
        myConsts.COLOR_LIST.forEach(color => {
            const size = Utility.chooseAtRandom(['small', 'medium', 'large'], 1)[0];
            const butterfly = new Butterfly(size, color, color);
            butterfly.setRandomInitialPoistion(this.manager.app.screen.width, this.manager.app.screen.height);
            this.butterflies.push(butterfly);
        });
        this.container.addChild(...this.butterflies);
    }


    update(delta: number): void {
        this.butterflies.forEach(butterfly => {
            butterfly.flap(delta);
            butterfly.fly(this.manager.app.screen.width, this.manager.app.screen.height, delta);
        });
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

    private async onStartGameSelected(): Promise<void> {
    
        this.butterflies.map(butterfly => butterfly.stop());

        // next background
        const nextBGSprite = new PIXI.Sprite(PIXI.Texture.from('background'));
        nextBGSprite.anchor.y = 1;
        nextBGSprite.x = 0;
        nextBGSprite.scale = this.manager.app.screen.height / nextBGSprite.height;
        nextBGSprite.y = this.manager.app.screen.height;
        this.container.addChildAt(nextBGSprite, 0);

        await Promise.all([
            this.fadeOut(this.startButton), 
            this.fadeOut(this.ruleButton), 
            this.fadeOut(this.titleSprite), 
            this.fadeOut(this.backgroundSprite),
            this.butterflies.map(butterfly => butterfly.delete())
        ]);

        const stageInfo1 = new StageInformation();
        this.manager.setState(new GameplayState(this.manager, stageInfo1));
    }

    private onRuleSelected(): void {        
        //　TODO　RULEの実装
        console.log("Rule is here.");
        // this.manager.setState(new RulesState(this.manager));
    }

    onExit(): void {
        this.manager.app.stage.removeChild(this.container);
        this.container.destroy();

        if (this.lineDrawer) {
            // 次のフレームのレンダリングが完了した後にクリーンアップ処理を行う
            this.manager.app.ticker.addOnce(() => {
                this.lineDrawer.cleanup();
                // this.lineDrawer; // 破棄
            });
        }
    }

    // containerを引数に、フェードアウトさせて完全に消えたたらresolveするPromiseを返す
    private fadeOut(container: PIXI.Container, fadespeed:number = 0.01, alpha:number=0): Promise<void> {
        return new Promise(resolve => {
            const fadeOut = () => {
                if (container.alpha > alpha) {
                    container.alpha -= fadespeed;
                    requestAnimationFrame(fadeOut);
                } else {
                    resolve();
                }
            };
            fadeOut();
        });
    }
}