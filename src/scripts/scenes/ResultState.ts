import { StageInformation } from "../components/StageInformation";
import { myConsts } from "../utils/Const";
import { GameStateManager } from "./GameStateManager";
import * as PIXI from 'pixi.js';
import * as Utility from '../utils/Utility';
import { GameplayState } from "./GameplayState";
import { StartState } from "./StartState";
import { Butterfly } from "../components/Butterfly";


export class ResultState{

    private manager: GameStateManager;
    private container: PIXI.Container;
    private stageInfo: StageInformation;
    private messages: Message[] = [];
    private messageButterflies: Butterfly[] = [];

    constructor(manager: GameStateManager, stageInfo: StageInformation ) {
        this.manager = manager;
        this.container = new PIXI.Container();
        this.manager.app.stage.addChild(this.container);
        this.stageInfo = stageInfo;

        const app = this.manager.app;

        // background
        const backgroundSprite = new PIXI.Sprite(PIXI.Texture.from('background'));
        backgroundSprite.interactive = true;
        backgroundSprite.anchor.y = 1;
        backgroundSprite.x = 0;
        backgroundSprite.scale = app.screen.height / backgroundSprite.height;
        backgroundSprite.y = app.screen.height;
        this.container.addChild(backgroundSprite);

    }

    async onEnter(): Promise<void> {
        const stickySprite = new PIXI.Sprite(PIXI.Texture.from('sticky'));
        stickySprite.anchor.set(0.5);
        stickySprite.x = this.manager.app.screen.width / 2;
        stickySprite.y = this.manager.app.screen.height / 2;
        stickySprite.scale.set(0.25);
        this.container.addChild(stickySprite);
        await this.displayStageResult();

        //　次のステージ情報を作成
        // TODO ステージごとに持ってる設定ファイル作って、それ参照にしたい
        const butterflyColors = Utility.chooseAtRandom(myConsts.COLOR_LIST,3);
        const needCount = this.stageInfo.needCount + 3;
        const size = Utility.chooseAtRandom(['large', 'medium', 'small'],1)[0];
        const nextStageInfo = new StageInformation(this.stageInfo.level + 1, butterflyColors, needCount, 15, size, false);
        nextStageInfo.totalScore = this.stageInfo.totalScore;

        // 5秒まつ
        await new Promise(resolve => setTimeout(() => {
            resolve(null);
        }, 5000));

        // messagesぜんぶ消す
        this.messages.forEach(msg => {
            this.container.removeChild(msg);
            msg.destroy();
        });
        //　蝶も消す
        this.messageButterflies.forEach(butterfly => {
            this.container.removeChild(butterfly);
            butterfly.delete();
        });
        this.messageButterflies = [];

        const messageText = this.stageInfo.isClear ? `Next: Level ${nextStageInfo.level}`: 'Game Over';
        const nextMessage = new Message(messageText, 40);        
        nextMessage.anchor.set(0.5);
        nextMessage.x = this.manager.app.screen.width / 2;
        nextMessage.y = this.manager.app.screen.height / 2;
        this.container.addChild(nextMessage);
        nextMessage.show();

        // 2秒待つ
        await new Promise(resolve => setTimeout(() => {
            resolve(null);
        }, 2000));
        
        if (this.stageInfo.isClear) {
            this.manager.setState(new GameplayState(this.manager, nextStageInfo ));
        }else{
            const manager = new GameStateManager(this.manager.app);
            const startState = new StartState(manager);
            this.manager.setState(startState);
        }
    }
    
    update(delta: number): void {
    }

    render(): void {
    }

    onExit(): void {
        this.manager.app.stage.removeChild(this.container);
        this.container.destroy();
    }

    private async displayStageResult(): Promise<void> {
        const topMsg = new Message(this.stageInfo.isClear ? `Level ${this.stageInfo.level} clear!!` : 'Game Over', 30);
        const conditionMsg = new Message(`Need :         × ${this.stageInfo.needCount} `, 20);
        const countMsg = new Message(`Got :         × ${this.stageInfo.captureCount} `, 20);
        const lineMsg = new Message('----', 30);
        const baseScoreMsg = new Message(`base score : ${this.stageInfo.stagePoint}`, 20);
        const bonusMsg = new Message(`bonus score : ${this.stageInfo.bonusCount} × 100 = ${this.stageInfo.bonusPoint}`, 20);
        const stageScoreMsg = new Message(`stage score : ${this.stageInfo.stageTotalScore}`, 30);
        const totalScoreMsg = new Message(`total score : ${this.stageInfo.totalScore}`, 30);

        const top_msgs = [topMsg, conditionMsg, countMsg, lineMsg];
        const result_msgs = [baseScoreMsg, bonusMsg, stageScoreMsg, totalScoreMsg];
        this.messages = [...top_msgs, ...result_msgs];

        top_msgs.forEach((msg, index) => {
            this.container.addChild(msg);
            msg.anchor.set(0.5);
            msg.x = this.manager.app.screen.width / 2;
            msg.y = 100 + (this.manager.app.screen.height * 0.08 * index);
            msg.show();
        });

        // 2匹の蝶々を表示
        for(let i = 0; i < 2; i++){
            const butterfly = new Butterfly('small', this.stageInfo.butterflyColors[i]);
            butterfly.y = 100 + (this.manager.app.screen.height * 0.08 * (i+1));
            butterfly.x = (this.manager.app.screen.width / 2 ) + 10;
            this.container.addChild(butterfly);
            this.messageButterflies.push(butterfly);
        }

        // 1秒待ってから結果表示
        await new Promise(resolve => setTimeout(() => {
            resolve(null);
        }, 1000));

        for (let index = 0; index < result_msgs.length; index++) {
            const msg = result_msgs[index];
            this.container.addChild(msg);
            msg.anchor.set(0.5);
            msg.x = this.manager.app.screen.width / 2;
            msg.y = 100 + (this.manager.app.screen.height * 0.08 * (index + top_msgs.length));
            if (msg === lineMsg) {
                msg.show();
            } else {
                await new Promise(resolve => setTimeout(() => {
                    msg.show();
                    resolve(null);
                }, 200 * (index + 1)));
            }
        }
    }
}
    
class Message extends PIXI.BitmapText {
    constructor(message: string, size: number) {
        super();
        const style = new PIXI.TextStyle({ 
            fontFamily: 'Arial', 
            fontSize: size, 
            fill: 0x000000 
        });
        this.style = style;
        this.text = message; 
        this.alpha = 0;
    }
    show():void{
        this.alpha = 1;
    }
}