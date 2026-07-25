/**
 * プラクティスモードのステージ選択画面に表示するステージ一覧を選ぶ、
 * PIXI非依存の純粋なユーティリティ。
 *
 * このゲームの進行は必ず1レベルずつ順番に進む(StageInformation.nextは
 * 常にlevelを1だけ増やす)ため、レベルNに到達していれば1..Nのすべてに
 * 到達していることが保証される。そのため呼び出し側は到達済みレベルの
 * 一覧ではなく、最高到達レベル(maxLevel)ひとつだけを渡せばよい。
 */

export interface PracticeStageEntry {
    level: number;
    isBonus: boolean;
}

/**
 * maxLevel以下のボーナス出現レベル(5の倍数)をすべて列挙する。
 * 「5の倍数でスペシャル蝶=ボーナス」のルールはStageInformation.setConfigの
 * `level % 5 === 0` と対応している。デバッグ時の全ステージ表示のように、
 * 保存された到達履歴(ScoreStorage)を使わずに一覧を作る場合に使う。
 */
export function bonusLevelsUpTo(maxLevel: number): number[] {
    const count = Math.max(0, Math.floor(maxLevel / 5));
    return Array.from({ length: count }, (_, i) => (i + 1) * 5);
}

/**
 * 表示するステージ一覧を選ぶ。
 *
 * - 通常ステージは1..maxLevelをすべて候補にする。
 * - ボーナスステージは、bonusLevelsのうちmaxLevel以下で最も大きい値
 *   (＝最後に到達したボーナス)1件だけを候補にする(bonusStage()の中身は
 *   levelに関わらず毎回ランダム生成されるため、どのレベルで解放された
 *   ボーナスかを複数出し分ける意味がない)。
 * - 候補数がmaxCount以下ならすべてを返す。ボーナスは常に一覧の末尾に置く
 *   (「16面までクリアしたなら16面の次」)。
 * - 候補数がmaxCountを超える場合は、通常ステージはレベルが高いものを優先して
 *   残す。ボーナスは(存在すれば)常に1枠を確保して残し、末尾に置く。
 */
export function selectDisplayStages(
    maxLevel: number,
    bonusLevels: number[],
    maxCount: number,
): PracticeStageEntry[] {
    const safeMaxLevel =
        Number.isFinite(maxLevel) && maxLevel > 0 ? maxLevel : 0;

    if (maxCount <= 0 || safeMaxLevel <= 0) {
        return [];
    }

    const reachedBonusLevels = bonusLevels.filter(
        (level) => level <= safeMaxLevel,
    );
    const latestBonusLevel =
        reachedBonusLevels.length > 0 ? Math.max(...reachedBonusLevels) : null;

    const normalSlots =
        latestBonusLevel !== null ? Math.max(0, maxCount - 1) : maxCount;
    const keepCount = Math.min(safeMaxLevel, normalSlots);

    const entries: PracticeStageEntry[] = [];
    for (
        let level = safeMaxLevel - keepCount + 1;
        level <= safeMaxLevel;
        level++
    ) {
        entries.push({ level, isBonus: false });
    }

    if (latestBonusLevel !== null) {
        entries.push({ level: latestBonusLevel, isBonus: true });
    }

    return entries;
}
