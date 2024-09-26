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
    constructor(level, butterflyColors, needCount, stageButterflyCount, butterflySize, isButterflyColorChange) {
        this.captureCount = 0;
        this.stagePoint = 0;
        this.bonusCount = 0;
        this.bonusPoint = 0;
        this.stageTotalScore = 0;
        this.totalScore = 0;
        this.isClear = false;
        this.level = level;
        this.butterflyColors = butterflyColors;
        this.needCount = needCount;
        this.captureCount = 0;
        this.stagePoint = 0;
        this.stageButterflyCount = stageButterflyCount;
        this.butterflySize = butterflySize;
        this.isButterflyColorChange = isButterflyColorChange;
    }
    calcScore() {
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
//# sourceMappingURL=StageInformation.js.map