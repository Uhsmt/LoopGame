import * as Const from "../utils/Const";
import * as Utility from "../utils/Utility";
import stageConfig from "../utils/stage-config.json";
import stageDebugConfig from "../utils/stage-config-debug.json";

interface StageConfig {
    // levelとdebugはJSON上のドキュメント用途で、コードからは参照されない
    // (実際のステージ番号はsetConfigの引数levelで決まる)
    level: number;
    debug?: boolean;
    butterflyColorNum: number;
    needCount: number;
    stageButterflyCount: number;
    butterflySize: string;
    isButterflyColorChange: boolean;
    // 序盤ステージの設定には存在しないキー(存在しない場合は前ステージの値を引き継ぐ)
    stageTime?: number;
    multipleButterflyRate?: number;
    maxMultipleRate?: number;
    helpObjectNum?: number;
    hasBonusButterfly?: boolean;
}

const stageConfigs: StageConfig[] = stageConfig;
const stageDebugConfigs: StageConfig[] = stageDebugConfig;

export class StageInformation {
    //settings
    level: number = 0;
    stageTime: number = 60;
    butterflyColors: number[] = [];
    needCount: number = 0;
    stageButterflyCount: number = 10;
    butterflySize: string = "random";
    isButterflyColorChange: boolean = false;
    multipleButterflyRate: number = 0;
    maxMultipleRate: number = 1;
    helpObjectNum: number = 0;
    hasBonusButterfly: boolean = false;

    // scores
    captureCount: number = 0;
    stagePoint: number = 0;
    bonusCount: number = 0;
    bonusPoint: number = 0;
    stageTotalScore: number = 0;
    totalScore: number = 0;

    //status
    isClear: boolean = false;
    bonusFlag: boolean = false;

    constructor() {
        // initial level
        this.setConfig(1);
        this.captureCount = 0;
        this.stagePoint = 0;
    }

    private setConfig(level: number): void {
        const configs = DEBUG_MODE ? stageDebugConfigs : stageConfigs;
        let config = configs[level];
        if (config === undefined) {
            // 最終まで来た場合はとりあえず＋２
            config = configs[configs.length - 1];
            config.needCount += 2;
        }

        this.needCount = config.needCount;
        this.stageButterflyCount = config.stageButterflyCount;
        this.butterflySize = config.butterflySize;
        this.isButterflyColorChange = config.isButterflyColorChange;
        // 設定に無いキーは前ステージの値を引き継ぐ
        this.stageTime = config.stageTime ?? this.stageTime;
        this.multipleButterflyRate =
            config.multipleButterflyRate ?? this.multipleButterflyRate;
        this.maxMultipleRate = config.maxMultipleRate ?? this.maxMultipleRate;
        this.helpObjectNum = config.helpObjectNum ?? this.helpObjectNum;
        this.hasBonusButterfly =
            config.hasBonusButterfly ?? this.hasBonusButterfly;

        this.level = level;
        this.butterflyColors = Utility.chooseAtRandom(
            [...Const.COLOR_LIST],
            config.butterflyColorNum,
        );
        // levelが5の倍数ならtrue
        this.hasBonusButterfly = level % 5 === 0 || this.hasBonusButterfly;
    }

    calcScore(): void {
        if (this.captureCount >= this.needCount || this.bonusFlag) {
            this.isClear = true;
        }

        this.bonusCount = this.captureCount - this.needCount;
        if (this.bonusCount < 0 || this.bonusFlag) {
            this.bonusCount = 0;
        }
        this.bonusPoint = this.bonusCount * 100;
        this.stageTotalScore = this.stagePoint + this.bonusPoint;
        this.totalScore += this.stageTotalScore;
    }

    next(): void {
        this.hasBonusButterfly = false; // reset
        this.setConfig(this.level + 1);
        this.captureCount = 0;
        this.isClear = false;
        this.bonusFlag = false;
    }

    bonusStage(): void {
        this.bonusFlag = true;
        this.captureCount = 0;
        this.isClear = false;

        this.stageTime = 60;
        const colorNum = Utility.random(3, 4);

        this.butterflyColors = Utility.chooseAtRandom(
            [...Const.COLOR_LIST],
            colorNum,
        );
        this.needCount = -1;
        this.stageButterflyCount = Utility.random(12, 18);
        this.butterflySize = Utility.chooseAtRandom(
            [...Const.SIZE_LIST, "random"],
            1,
        )[0];
        this.isButterflyColorChange = Utility.random(0, 1) === 1;
        this.multipleButterflyRate = Utility.random(15, 20) / 100;
        this.maxMultipleRate = 3;
        this.helpObjectNum = Utility.random(4, 8);
        this.hasBonusButterfly = false;
    }
}
