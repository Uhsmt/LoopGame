import { StageInformation } from "../components/StageInformation";
import { GameStateManager } from "./GameStateManager";
import * as PIXI from 'pixi.js';
import { GameplayState } from "./GameplayState";
import { StartState } from "./StartState";
import { Butterfly } from "../components/Butterfly";
import * as Utility from '../utils/Utility';


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

        const nextStageInfo = this.stageInfo.nextStage();

        const messageText = this.stageInfo.isClear ? `Level ${nextStageInfo.level}`: 'Game Over';
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
            // ゲームオーバーの場合はスタート画面に戻る
            // TODO ゲームオーバー後の再スタート時の挙動がおかしい
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
        const countMsg = new Message(`Got :          × ${this.stageInfo.captureCount} `, 20);
        const lineMsg = new Message('----', 30);
        const baseScoreMsg = new Message(`base score : ${Utility.formatNumberWithCommas(this.stageInfo.stagePoint)}`, 20);
        const bonusMsg = new Message(`bonus score : ${this.stageInfo.bonusCount} × 100 = ${Utility.formatNumberWithCommas(this.stageInfo.bonusPoint)}`, 20);
        const stageScoreMsg = new Message(`stage score : ${Utility.formatNumberWithCommas(this.stageInfo.stageTotalScore)}`, 30);
        const totalScoreMsg = new Message(`total score : ${Utility.formatNumberWithCommas(this.stageInfo.totalScore)}`, 30);

        const top_msgs = [topMsg, conditionMsg, countMsg, lineMsg];
        const result_msgs = [baseScoreMsg, bonusMsg, stageScoreMsg, totalScoreMsg];
        this.messages = [...top_msgs, ...result_msgs];
        const marginTop = 110;
        const lineHeight = this.manager.app.screen.height * 0.08;

        top_msgs.forEach((msg, index) => {
            this.container.addChild(msg);
            msg.anchor.set(0.5);
            msg.x = this.manager.app.screen.width / 2;
            msg.y = marginTop + (lineHeight * index);
            console.log(`${msg.y}:${msg.text}`);
            msg.show();
        });

        // 2匹の蝶々を表示
        for(let i = 0; i < 2; i++){
            const butterfly = new Butterfly('small', this.stageInfo.butterflyColors[i],this.stageInfo.butterflyColors[i]);
            butterfly.y = marginTop + (lineHeight * (i+1)) + butterfly.height/2;
            butterfly.x = (this.manager.app.screen.width / 2 ) + butterfly.width;
            console.log(`${butterfly.y}:butterfly`);
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
            msg.y = marginTop + (lineHeight * (index + top_msgs.length));
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