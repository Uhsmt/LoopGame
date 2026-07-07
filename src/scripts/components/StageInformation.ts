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
    obstacles?: string[];
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
    obstacles: string[] = [];

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

    /**
     * 最終ステージ以降の構成をレベルから決定的に生成する。
     * 単調にならないよう「群れ / カラフル / 大物 / 混沌」の4パターンを
     * 巡回し、同じレベルは毎回同じ構成になる(公平性のため)
     */
    private static generateOverflowConfig(
        level: number,
        base: StageConfig,
    ): StageConfig {
        // レベル値から決定的な疑似乱数を作る(0〜1)
        const rand = (salt: number): number => {
            let x = (level * 374761393 + salt * 668265263) >>> 0;
            x = ((x ^ (x >>> 13)) * 1274126177) >>> 0;
            return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
        };
        const pick = <T>(salt: number, list: readonly T[]): T =>
            list[Math.floor(rand(salt) * list.length)];

        const lastLevel = DEBUG_MODE
            ? stageDebugConfigs.length - 1
            : stageConfigs.length - 1;
        const needCount = base.needCount + (level - lastLevel) * 2;

        // お邪魔オブジェクトは最終レベル以降で種類を段階的に増やしていく
        // (11〜12: bee / 13〜14: bee+spider / 15〜: 全種)
        const obstacles =
            level >= 15
                ? ["bee", "spider", "catapy"]
                : level >= 13
                  ? ["bee", "spider"]
                  : ["bee"];

        switch (level % 4) {
            case 0: // 群れ: 少ない色でまとめ捕り推奨
                return {
                    level,
                    needCount,
                    obstacles,
                    butterflyColorNum: pick(1, [2, 3]),
                    stageButterflyCount: 16 + Math.floor(rand(2) * 5), // 16-20
                    butterflySize: pick(3, ["small", "medium", "random"]),
                    isButterflyColorChange: false,
                    multipleButterflyRate: 0.2 + rand(4) * 0.05,
                    maxMultipleRate: 3,
                    helpObjectNum: 2 + Math.floor(rand(5) * 3), // 2-4
                };
            case 1: // カラフル: 多色コンビ捕り推奨
                return {
                    level,
                    needCount,
                    obstacles,
                    butterflyColorNum: 5,
                    stageButterflyCount: 11 + Math.floor(rand(2) * 4), // 11-14
                    butterflySize: pick(3, ["medium", "random"]),
                    isButterflyColorChange: true,
                    multipleButterflyRate: 0.08 + rand(4) * 0.04,
                    maxMultipleRate: 2,
                    helpObjectNum: 3 + Math.floor(rand(5) * 3), // 3-5
                };
            case 2: // 大物: 数は少ないが大きい
                return {
                    level,
                    needCount,
                    obstacles,
                    butterflyColorNum: 3,
                    stageButterflyCount: 9 + Math.floor(rand(2) * 4), // 9-12
                    butterflySize: "large",
                    isButterflyColorChange: rand(6) < 0.5,
                    multipleButterflyRate: 0.15 + rand(4) * 0.05,
                    maxMultipleRate: 2,
                    helpObjectNum: 2 + Math.floor(rand(5) * 3), // 2-4
                };
            default: // 混沌: 小さめ多数+色替え
                return {
                    level,
                    needCount,
                    obstacles,
                    butterflyColorNum: 4,
                    stageButterflyCount: 14 + Math.floor(rand(2) * 5), // 14-18
                    butterflySize: pick(3, ["small", "random"]),
                    isButterflyColorChange: true,
                    multipleButterflyRate: 0.12 + rand(4) * 0.06,
                    maxMultipleRate: 3,
                    helpObjectNum: 3 + Math.floor(rand(5) * 4), // 3-6
                };
        }
    }

    private setConfig(level: number): void {
        const configs = DEBUG_MODE ? stageDebugConfigs : stageConfigs;
        let config = configs[level];
        if (config === undefined) {
            // 最終ステージを超えたらレベルごとに構成を生成する
            config = StageInformation.generateOverflowConfig(
                level,
                configs[configs.length - 1],
            );
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
        // お邪魔オブジェクトも設定に無ければ前ステージから引き継ぐ
        // (レベルが上がると種類が追加されていく)
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
        // note: obstaclesはクリアしない(次ステージへの引き継ぎ用)
        // ボーナスステージ中はGameplayState側がbonusFlagを見て出現させない
    }
}
