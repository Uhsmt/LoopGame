import * as Const from "../utils/Const";
import * as Utility from "../utils/Utility";
import stageConfig from "../utils/stage-config.json";
import stageDebugConfig from "../utils/stage-config-debug.json";

interface StageConfig {
    // level: 対応するステージ番号。setConfigはこの値でエントリを検索する
    // debug: JSON上のドキュメント用途で、コードからは参照されない
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
    obstacles?: string[];
}

const stageConfigs: StageConfig[] = stageConfig;
const stageDebugConfigs: StageConfig[] = stageDebugConfig;

// 実際に捕まえた蝶1匹分のスナップショット(ノート型リザルト画面で
// 標本としてピン留め表示するために使う)
export interface CapturedSpecimen {
    color: number;
    sizeCategory: Const.ButterflySizeCategory;
    isSpecial: boolean;
}

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
    obstacles: string[] = [];

    // scores
    captureCount: number = 0;
    // このステージで実際に捕まえた蝶の一覧(ノート型リザルト画面用)。
    // captureCountと同様、GameplayState.endGame()で毎回上書きされる
    capturedSpecimens: CapturedSpecimen[] = [];
    stagePoint: number = 0;
    bonusCount: number = 0;
    bonusPoint: number = 0;
    stageTotalScore: number = 0;
    totalScore: number = 0;

    //status
    isClear: boolean = false;
    bonusFlag: boolean = false;
    // プラクティスモード(記録・スコア保存を行わない再挑戦プレイ)かどうか
    isPractice: boolean = false;
    // 1回だけ使えるリトライを使い切ったかどうか(ラン全体で1回のみ)
    retryUsed: boolean = false;

    constructor(startLevel: number = 1) {
        // initial level (プラクティスモードでは任意のレベルから開始できる)
        this.setConfig(startLevel);
        this.captureCount = 0;
        this.stagePoint = 0;
    }

    /**
     * 最終ステージ(本編Lv20)を超えた「エクストラ帯」の構成を生成する。
     * 本編最終レベルの構成をそのまま引き継ぎ、needCountだけをレベル差分に
     * 応じて加算する。お邪魔オブジェクトは3種同時(いもむし・ハチ・クモ)に
     * 固定し、「本編を卒業した者だけが見る景色」という質的な一段を残す。
     * 全プレイヤーが同じレベルで同じ構成を走るため、ラン合計スコアの
     * 比較が公平になる。
     *
     * 注意: 呼び出し元(setConfig)は `configs[configs.length - 1]` を
     * baseとして渡す。つまり「配列の最後のエントリ = 本編最終レベル」
     * という前提に暗黙依存しているため、stage-config.json /
     * stage-config-debug.json のエントリは必ずlevelの昇順で並べること。
     * 順序が崩れるとエクストラ帯のneedCount・構成の起点がずれる。
     */
    private static generateOverflowConfig(
        level: number,
        base: StageConfig,
    ): StageConfig {
        return {
            ...base,
            level,
            needCount: base.needCount + (level - base.level) * 2,
            obstacles: ["catapy", "bee", "spider"],
        };
    }

    private setConfig(level: number): void {
        const configs = DEBUG_MODE ? stageDebugConfigs : stageConfigs;
        const config =
            configs.find((c) => c.level === level) ??
            // 配列の最後のエントリを本編最終レベルとみなして渡す
            // (エントリがlevel昇順である前提。generateOverflowConfigの注意書き参照)
            StageInformation.generateOverflowConfig(
                level,
                configs[configs.length - 1],
            );

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
        // お邪魔オブジェクトも設定に無ければ前ステージから引き継ぐ
        this.obstacles = config.obstacles ?? this.obstacles;

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

    /**
     * 失敗時に1回だけ使えるリトライ。同じレベルを最初からやり直す。
     * calcScore()が既にtotalScoreへ加算した失敗分のスコアを取り消してから、
     * 挑戦カウンタをリセットする(ラン全体で1回のみ、retryUsedで管理)。
     */
    retry(): void {
        this.totalScore -= this.stageTotalScore;
        this.retryUsed = true;
        this.setConfig(this.level);
        this.captureCount = 0;
        this.stagePoint = 0;
        this.bonusCount = 0;
        this.bonusPoint = 0;
        this.stageTotalScore = 0;
        this.isClear = false;
    }

    next(): void {
        this.hasBonusButterfly = false; // reset
        this.setConfig(this.level + 1);
        this.captureCount = 0;
        this.isClear = false;
        this.bonusFlag = false;
    }

    /**
     * 現在のステージが、指定したお邪魔オブジェクトの種類の「初登場ステージ」かを判定する。
     * 「初登場」はレベル番号のハードコードではなく、stage-configから動的に算出する:
     * その種類をobstaclesに含む最小のlevelと現在のlevelが一致する場合にtrue。
     * エクストラ帯(本編最終レベルを超える生成ステージ)はconfigs配列に実体が
     * 存在しないため、必ずfalseになる(本編で全種登場済みという設計と整合)。
     */
    isFirstAppearanceStage(type: string): boolean {
        const configs = DEBUG_MODE ? stageDebugConfigs : stageConfigs;
        return (
            StageInformation.findFirstAppearanceLevel(configs, type) ===
            this.level
        );
    }

    private static findFirstAppearanceLevel(
        configs: StageConfig[],
        type: string,
    ): number | undefined {
        return configs.reduce<number | undefined>((minLevel, config) => {
            if (!config.obstacles?.includes(type)) {
                return minLevel;
            }
            return minLevel === undefined
                ? config.level
                : Math.min(minLevel, config.level);
        }, undefined);
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
        // note: obstaclesはクリアしない(次ステージへの引き継ぎ用)
        // ボーナスステージ中はGameplayState側がbonusFlagを見て出現させない
    }
}
