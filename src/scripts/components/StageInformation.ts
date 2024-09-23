// ステージの情報を保持するクラス。
/**
 * level: ステージのレベル
 * butterflyColor: 出現する蝶の色
 * 
 * needCount: 必要な蝶の数
 * captureCount: 捕まえた蝶の数
 * point: 獲得したポイント
 * 
 */

export class StageInformation {
    readonly level: number;
    readonly butterflyColors: number[];
    readonly butterflySize: string;
    readonly isButterflyColorChange: boolean;
    readonly needCount: number;
    readonly stageButterflyCount: number;
    captureCount: number = 0;
    stagePoint: number = 0;
    bonusCount: number = 0;
    bonusPoint: number = 0;
    stageTotalScore: number = 0;
    totalScore: number = 0;
    isClear: boolean = false; 

    constructor(level: number, butterflyColors: number[], needCount: number, stageButterflyCount: number, butterflySize: string, isButterflyColorChange: boolean) {
        this.level = level;
        this.butterflyColors = butterflyColors;
        this.needCount = needCount;
        this.captureCount = 0;
        this.stagePoint = 0;
        this.stageButterflyCount = stageButterflyCount;
        this.butterflySize = butterflySize;
        this.isButterflyColorChange = isButterflyColorChange;
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
}