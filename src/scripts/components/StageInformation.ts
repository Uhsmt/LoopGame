import { myConsts } from "../utils/Const";
import * as Utility from "../utils/Utility";
import stageConfig from "../utils/stage-config.json";
import stageDebugConfig from "../utils/stage-config-debug.json";

export class StageInformation {
    //settings
    level: number = 0;
    stageTime: number = 60;
    butterflyColors: number[] = [];
    needCount: number = 0;
    stageButterflyCount: number = 10;
    butterflySize: string = "random";
    isButterflyColorChange: boolean = false;
    muptipleButterflyRate: number = 0;
    maxMultiplateRate: number = 1;

    // scores
    captureCount: number = 0;
    stagePoint: number = 0;
    bonusCount: number = 0;
    bonusPoint: number = 0;
    stageTotalScore: number = 0;
    totalScore: number = 0;

    //status
    isClear: boolean = false;

    constructor() {
        // initial level
        this.setConfig(1);
        this.captureCount = 0;
        this.stagePoint = 0;
    }

    private setConfig(level: number): void {
        let config = DEBUG_MODE ? stageDebugConfig[level] : stageConfig[level];
        if (config === undefined) {
            // 最終まで来た場合はとりあえず＋２
            config = DEBUG_MODE
                ? stageDebugConfig[stageDebugConfig.length - 1]
                : stageConfig[stageConfig.length - 1];
            config.needCount += 2;
        }

        Object.keys(config).forEach((key) => {
            if (key in this) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
                (this as any)[key] = config[key as keyof typeof config];
            }
        });
        this.level = level;
        this.butterflyColors = Utility.chooseAtRandom(
            myConsts.COLOR_LIST,
            config.butterflyColorNum,
        );
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

    next(): void {
        const nextLevel = this.level + 1;
        this.setConfig(nextLevel);
        this.captureCount = 0;
        this.isClear = false;
    }
}
