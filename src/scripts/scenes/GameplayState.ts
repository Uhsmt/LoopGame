// GameplayState.ts
import * as PIXI from 'pixi.js';
import { GameStateManager } from './GameStateManager';
import { LineDrawer } from '../components/LineDrawer';
import { Sun } from '../components/Sun';
import { ResultState } from './ResultState';
import { Butterfly } from '../components/Butterfly';
import * as Utility from '../utils/utility';
import { myConsts } from '../utils/const';

export class GameplayState {
    private manager: GameStateManager;
    private container: PIXI.Container;
    private startMessage: PIXI.BitmapText;
    private scoreMessage: PIXI.BitmapText;
    private actionMessage: PIXI.BitmapText;
    private lineDrawer: LineDrawer;
    private sun: Sun;
    private isRunning = true;
    private gameTimer: number = 60;
    private elapsedTime: number = 0;
    private stageScore = 0;
    caputuredButterflies: Butterfly[] = [];
    butterflies: Butterfly[] = [];
    private readonly butterflyCount = 10;
    private needCount = 10; // TODO ステージによって変わる
    //Butterfly TODO ステージによって蝶の条件が変わる
    private readonly butterflyColors = Utility.chooseAtRandom(myConsts.COLOR_LIST,2);
    private readonly butterflySize = 'large';
    pointerDownHandler: any;

    constructor(manager: GameStateManager) {
        this.manager = manager;
        this.container = new PIXI.Container();
        this.manager.app.stage.addChild(this.container);
        this.lineDrawer = new LineDrawer(this.manager.app, 0x000000);
        this.lineDrawer.on('loopAreaCompleted', this.handleLoopAreaCompleted.bind(this));        

        const app = this.manager.app;

        // background
        const backgroundSprite = new PIXI.Sprite(PIXI.Texture.from('background'));
        backgroundSprite.interactive = true;
        backgroundSprite.anchor.y = 1;
        backgroundSprite.x = 0;
        backgroundSprite.scale = app.screen.height / backgroundSprite.height;
        backgroundSprite.y = app.screen.height;
        this.container.addChild(backgroundSprite);

        // SUN
        this.sun = new Sun();
        this.container.addChild(this.sun);

        for (let i = 0; i < this.butterflyCount; i++) {
            const butterfly = new Butterfly(this.butterflySize, Utility.chooseAtRandom(this.butterflyColors,1)[0]);
            this.butterflies.push(butterfly);
        }

        //　イベントリスナー：クリックしたら一時停止
        this.pointerDownHandler = () => {
            this.isRunning = !this.isRunning;
            this.lineDrawer.clearAllSegments();
            if (this.isRunning) {

            } else {
                this.showActionMessage('Pause');
            }
        };

        app.stage.addEventListener('pointerdown', this.pointerDownHandler);
    }

    onEnter(): void {
        this.displayStartMessage();
        this.displayScoreMessage();
        this.sun.position.set(0, this.manager.app.screen.height); 

        this.butterflies.forEach(butterfly => {
            this.container.addChild(butterfly);            
            this.setInitialPositionRandom(butterfly);
        });

        setTimeout(() => {
            this.container.removeChild(this.startMessage);
        }, 3000);
    }

    update(delta: number): void {
        this.butterflies.forEach(butterfly => {
            butterfly.flap();
        });

        if (!this.isRunning) return;

        this.elapsedTime += delta;
        this.moveSun(delta);

        this.butterflies.forEach(butterfly => {
            butterfly.fly(this.manager.app.screen.width, this.manager.app.screen.height);
        });

        // 残り10秒を切ったらblinkさせる
        if (this.elapsedTime >= this.gameTimer * 1000 - 10000) {
            this.sun.blink();
        }

        if (this.elapsedTime >= this.gameTimer * 1000) {
            this.endGame();
        }
    }


    onExit(): void {
        if (this.pointerDownHandler) {
            this.manager.app.stage.removeEventListener('pointerdown', this.pointerDownHandler);
        }
        console.log('Gameplay State Exit. Score: '+ this.stageScore);
        // this.manager.app.stage.removeChild(this.container);
        // this.container.destroy();
        if (this.lineDrawer) {
            // 次のフレームのレンダリングが完了した後にクリーンアップ処理を行う
            this.manager.app.ticker.addOnce(() => {
                this.lineDrawer.cleanup();
                this.lineDrawer = null; // 破棄
            });
        }
    }

    render(): void {
        // レンダリングロジックはここに記述
    }

    private moveSun(delta: number): void {
        const totalTime = this.gameTimer * 1000;
        const startX = 0;
        const endX = this.manager.app.renderer.width;
        const startY = this.manager.app.renderer.height;
        const peakY = this.manager.app.renderer.height * 0.8;
        const t = this.elapsedTime / totalTime;
        const x = startX + t * (endX - startX);
        const y = startY - (4 * peakY * t * (1 - t));

        this.sun.position.set(x, y);
    }

    private setInitialPositionRandom(butterfly: Butterfly): void {
        const positions = ['top', 'bottom', 'left', 'right'];
        const position = Utility.chooseAtRandom(positions, 1)[0];
        let x, y;
        switch (position) {
            case 'top':
                x = Utility.random(0, this.manager.app.screen.width);
                y = 0 - butterfly.height;
                break;
            case 'bottom':
                x = Utility.random(0, this.manager.app.screen.width);
                y = this.manager.app.screen.height + butterfly.height;
                break;
            case 'left':
                x = 0 - butterfly.width;
                y = Utility.random(0, this.manager.app.screen.height);
                break;
            case 'right':
                x = this.manager.app.screen.width + butterfly.width;
                y = Utility.random(0, this.manager.app.screen.height);
                break;
        }
        butterfly.position.set(x, y);
    }

    private endGame(): void {
        this.butterflies.forEach(butterfly => {
            butterfly.destroy();
        });
        this.manager.setState(new ResultState(this.manager));
    }

    private displayStartMessage(): void {
        this.startMessage = new PIXI.BitmapText({text:`Catch ${this.needCount} butterflies!`, style:new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 24, fill: 0x000000 })});
        this.startMessage.x = this.manager.app.renderer.width / 2 - this.startMessage.width / 2;
        this.startMessage.y = 50;
        this.container.addChild(this.startMessage);
    }

    private displayScoreMessage(): void {
        this.scoreMessage = new PIXI.BitmapText({text:`0 / ${this.needCount}`, style:new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 24, fill: 0x000000 })});
        this.scoreMessage.x = this.manager.app.renderer.width / 2 - this.scoreMessage.width / 2;
        this.scoreMessage.y = this.manager.app.renderer.height - 50;
        this.container.addChild(this.scoreMessage);
    }

    private showActionMessage(message: string): void {
        if(this.actionMessage){
            this.actionMessage.alpha = 1;
            this.actionMessage.text = message;
            this.actionMessage.x = this.manager.app.renderer.width / 2 - this.actionMessage.width / 2;
        }else{
            this.actionMessage = new PIXI.BitmapText({text:message, style:new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 24, fill: 0x000000 })});
            this.actionMessage.x = this.manager.app.renderer.width / 2 - this.actionMessage.width / 2;
            this.actionMessage.y = this.manager.app.renderer.height / 2;
            this.container.addChild(this.actionMessage);    
        }
        setTimeout(() => {
            this.actionMessage.alpha = 0;
        }, 3000);
    }

    private updateScoreMessage(): void { 
        this.scoreMessage.text = `${this.caputuredButterflies.length} / ${this.needCount}`;
    }

    // ループエリアが完成したときの処理
    private handleLoopAreaCompleted(loopArea: PIXI.Graphics): void {
        if (!this.isRunning) return;

        // loopArea内にいる蝶を取得
        const butterfliesInLoopArea = this.butterflies.filter(butterfly => {
            // 蝶の位置を中心とした矩形領域を作成
            const butterflyBounds = new PIXI.Rectangle(
                butterfly.position.x - butterfly.width / 2 ,
                butterfly.position.y - butterfly.height / 2 ,
                butterfly.width ,
                butterfly.height
            );

            // 矩形領域がloopAreaに含まれているかをチェック
            return loopArea.containsPoint(new PIXI.Point(butterflyBounds.x, butterflyBounds.y)) ||
                loopArea.containsPoint(new PIXI.Point(butterflyBounds.x + butterflyBounds.width, butterflyBounds.y)) ||
                loopArea.containsPoint(new PIXI.Point(butterflyBounds.x, butterflyBounds.y + butterflyBounds.height)) ||
                loopArea.containsPoint(new PIXI.Point(butterflyBounds.x + butterflyBounds.width, butterflyBounds.y + butterflyBounds.height));
        });

        if (butterfliesInLoopArea.length <= 0) return;

        if(butterfliesInLoopArea.length === 1){
            // １匹だけの時は、colorChange
            butterfliesInLoopArea[0].switchColor();
        } else if (butterfliesInLoopArea.length === 2){
            //　2匹の時は、同じ色であればGet
            if(butterfliesInLoopArea[0].color === butterfliesInLoopArea[1].color){
                this.captureButterflies(butterfliesInLoopArea);
            } else{
                this.badLoop();
            }
        } else{
            // 3匹以上の時は、全色同じもしくは全色違いであればGet
            const colors = butterfliesInLoopArea.map(butterfly => butterfly.color);
            if (colors.every((val, i, arr) => val === arr[0]) || new Set(colors).size === colors.length){
                this.captureButterflies(butterfliesInLoopArea);
            } else{
                this.badLoop();
            }
        }
    }

    private captureButterflies(butterflies: Butterfly[]): void {
        this.caputuredButterflies.push(...butterflies);
        this.updateScoreMessage();
        // score加算 全部同じ色の場合は蝶の数×10　それ以外は蝶の数×20
        const point = butterflies.length * (butterflies.every(b => b.color === butterflies[0].color) ? 10 : 20);
        this.stageScore += point
        this.showActionMessage(`Loop! ${point} point`);

        butterflies.forEach(butterfly => {
            // butterfliesから同じやつを削除
            this.butterflies = this.butterflies.filter(b => b !== butterfly);

            butterfly.stop();
            butterfly.destroy();
        });
        if (this.caputuredButterflies.length >= this.needCount) {
            this.endGame();
        }else{
            // 捕まえた分だけ新しく蝶々を補充
            for (let i = 0; i < butterflies.length; i++) {
                const butterfly = new Butterfly(this.butterflySize, Utility.chooseAtRandom(this.butterflyColors,1)[0]);
                this.butterflies.push(butterfly);
                this.container.addChild(butterfly);
                this.setInitialPositionRandom(butterfly);
            }
        }
    }

    private badLoop(): void {
        this.stageScore -= 20;
        this.showActionMessage('Bad Loop! -20 point');
    }
}
