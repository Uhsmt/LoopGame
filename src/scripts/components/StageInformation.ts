import { myConsts } from "../utils/Const";
import * as Utility from '../utils/Utility';
import stageConfig from '../utils/stage-config.json';
import stageDebugConfig from '../utils/stage-config-debug.json';

export class StageInformation {
    level: number;
    butterflyColors: number[];
    butterflySize: string;
    isButterflyColorChange: boolean;
    needCount: number;
    stageButterflyCount: number;
    captureCount: number = 0;
    stagePoint: number = 0;
    bonusCount: number = 0;
    bonusPoint: number = 0;
    stageTotalScore: number = 0;
    totalScore: number = 0;
    isClear: boolean = false; 

    constructor() {
        // level0 
        this.setConfig(1)
        this.captureCount = 0;
        this.stagePoint = 0;
    }

    private setConfig(level: number): void {
        let config = DEBUG_MODE? stageDebugConfig[level]: stageConfig[level];
        if (config === undefined) {
            // TODO : ゲームクリアにしたいけどいったんは最終ステージを繰り返す
            config = DEBUG_MODE? stageDebugConfig[stageDebugConfig.length-1]: stageConfig[stageConfig.length - 1];
        }
        this.level = level;
        this.butterflyColors = Utility.chooseAtRandom(myConsts.COLOR_LIST,config.butterflyColorNum);
        this.needCount = config.needCount;
        this.stageButterflyCount = config.stageButterflyCount;
        this.butterflySize = config.butterflySize;
        this.isButterflyColorChange = config.isButterflyColorChange;
    }

    calcScore(): void {
        if (this.captureCount >= this.needCount) {
            this.isClear = true;
        }

        this.bonusCount = this.captureCount - this.needCount;
        if (this.bonusCount < 0) {
            this.bonusCount = 0;
        }
        this.bonusPoint = this.bonusCount * 100;
        this.stageTotalScore = this.stagePoint + this.bonusPoint;
        this.totalScore += this.stageTotalScore;
    }

    nextStage(): StageInformation{

        const nextLevel = this.level + 1;

        const nextStageInfo = new StageInformation();
        nextStageInfo.setConfig(nextLevel);
        nextStageInfo.totalScore = this.totalScore;

        return nextStageInfo;
      
    }
}