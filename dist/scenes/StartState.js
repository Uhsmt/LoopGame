import * as PIXI from 'pixi.js';
import { LineDrawer } from '../components/LineDrawer';
import { GameplayState } from './GameplayState';
import * as Utility from '../utils/Utility';
import { Butterfly } from '../components/Butterfly';
import { myConsts } from '../utils/Const';
import { StageInformation } from '../components/StageInformation';
export class StartState {
    constructor(manager) {
        this.butterflies = [];
        this.manager = manager;
        this.container = new PIXI.Container();
        this.manager.app.stage.addChild(this.container);
    }
    onEnter() {
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
        this.container.addChild(backgroundSprite);
        // title
        const titleSprite = new PIXI.Sprite(PIXI.Texture.from('title'));
        titleSprite.anchor.set(0.5);
        titleSprite.x = app.screen.width / 2;
        titleSprite.y = app.screen.height / 3;
        titleSprite.scale.set(0.8);
        this.container.addChild(titleSprite);
        // ボタン
        this.startButton = this.button('Start', app.screen.width / 4 - 50, app.screen.height * 3 / 5);
        this.ruleButton = this.button('Rules', app.screen.width * 3 / 4 - 50, app.screen.height * 3 / 5);
        this.container.addChild(this.startButton);
        this.container.addChild(this.ruleButton);
        // 適当に蝶を飛ばす
        this.dispButterfly();
        // this.debug();
    }
    // TODO デバッグ終わったら消す
    debug() {
        const butterfly1 = new Butterfly('small', myConsts.COLOR_LIST[0], myConsts.COLOR_LIST[1]);
        const butterfly2 = new Butterfly('medium', myConsts.COLOR_LIST[2], myConsts.COLOR_LIST[3]);
        const butterfly3 = new Butterfly('large', myConsts.COLOR_LIST[4], myConsts.COLOR_LIST[3]);
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
    dispButterfly() {
        myConsts.COLOR_LIST.forEach(color => {
            const size = Utility.chooseAtRandom(['small', 'medium', 'large'], 1)[0];
            const butterfly = new Butterfly(size, color);
            butterfly.setRandomInitialPoistion(this.manager.app.screen.width, this.manager.app.screen.height);
            this.butterflies.push(butterfly);
        });
        this.container.addChild(...this.butterflies);
    }
    update(delta) {
        this.butterflies.forEach(butterfly => {
            butterfly.flap();
            butterfly.fly(this.manager.app.screen.width, this.manager.app.screen.height);
        });
    }
    render() {
        // 描画はPixiJSがハンドルするのでここでは何もしない
    }
    button(name, _x, _y) {
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
    handleLoopAreaCompleted(loopArea) {
        if (this.isRuleButtonInLoopArea(loopArea)) {
            this.onRuleSelected();
        }
        else if (this.isStartButtonInLoopArea(loopArea)) {
            this.onStartGameSelected();
        }
    }
    isStartButtonInLoopArea(loopArea) {
        const startButtonBounds = this.startButton.getBounds();
        const loopAreaBounds = loopArea.getBounds();
        const startButtonRect = new PIXI.Rectangle(startButtonBounds.x, startButtonBounds.y, startButtonBounds.width, startButtonBounds.height);
        const loopAreaRect = new PIXI.Rectangle(loopAreaBounds.x, loopAreaBounds.y, loopAreaBounds.width, loopAreaBounds.height);
        return this.checkOverlap(startButtonRect, loopAreaRect);
    }
    isRuleButtonInLoopArea(loopArea) {
        const ruleButtonBounds = this.ruleButton.getBounds();
        const loopAreaBounds = loopArea.getBounds();
        const startButtonRect = new PIXI.Rectangle(ruleButtonBounds.x, ruleButtonBounds.y, ruleButtonBounds.width, ruleButtonBounds.height);
        const loopAreaRect = new PIXI.Rectangle(loopAreaBounds.x, loopAreaBounds.y, loopAreaBounds.width, loopAreaBounds.height);
        return this.checkOverlap(startButtonRect, loopAreaRect);
    }
    checkOverlap(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y;
    }
    onStartGameSelected() {
        console.log("Start Game");
        // Level1 ステージの設定
        const butterflyColors = Utility.chooseAtRandom(myConsts.COLOR_LIST, 2);
        const needCount = 10;
        const stageInfo1 = new StageInformation(1, butterflyColors, needCount, 10, 'large', false);
        this.manager.setState(new GameplayState(this.manager, stageInfo1));
    }
    onRuleSelected() {
        //　TODO　RULEの実装
        // this.manager.setState(new RulesState(this.manager));
    }
    onExit() {
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
//# sourceMappingURL=StartState.js.map