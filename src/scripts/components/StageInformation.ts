import { myConsts } from "../utils/Const";
import * as Utility from '../utils/Utility';
import stageConfig from '../utils/stage-config.json';
import stageDebugConfig from '../utils/stage-config-debug.json';

export class StageInformation {
    level: number = 0;
    butterflyColors: number[] = [];
    butterflySize: string = 'random';
    isButterflyColorChange: boolean = false;
    needCount: number = 0;
    stageButterflyCount: number = 10;
    captureCount: number = 0;
    stagePoint: number = 0;
    bonusCount: number = 0;
    bonusPoint: number = 0;
    stageTotalScore: number = 0;
    totalScore: number = 0;
    isClear: boolean = false; 
    muptipleButterflyRate:number = 0;
    maxMultiplateRate:number = 1;
    stageTime:number = 60;

    constructor() {
        // initial level
        this.setConfig(1)
        this.captureCount = 0;
        this.stagePoint = 0;
    }

    private setConfig(level: number): void {
        let config = DEBUG_MODE? stageDebugConfig[level]: stageConfig[level];
        if (config === undefined) {
            // 最終まで来た場合はとりあえず＋２
            config = DEBUG_MODE? stageDebugConfig[stageDebugConfig.length-1]: stageConfig[stageConfig.length - 1];
            config.needCount += 2;
        }

        Object.keys(config).forEach(key => {
            if (key in this) {
                (this as any)[key] = config[key as keyof typeof config];
            }
        });
        this.level = level;
        this.butterflyColors = Utility.chooseAtRandom(myConsts.COLOR_LIST,config.butterflyColorNum);
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