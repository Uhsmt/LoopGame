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
 * 表示するステージ一覧を選ぶ。
 *
 * - 候補は「1..maxLevelの各レベルの通常ステージ」+「bonusLevelsのうち
 *   maxLevel以下の値それぞれのボーナスステージ」(重複は除去)。
 * - 候補数がmaxCount以下ならすべてをlevel昇順(同levelは通常→ボーナス)で返す。
 * - 候補数がmaxCountを超える場合は、レベルが高いものを優先して残す
 *   (同levelで両方残せる場合は両方、片方しか残せない場合は通常を優先)。
 *   残した候補をlevel昇順(同levelは通常→ボーナス)で返す。
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

    const bonusSet = new Set(
        bonusLevels.filter((level) => level <= safeMaxLevel),
    );

    // レベル降順、同レベルは通常→ボーナスの優先順位で並べた候補一覧
    const priorityOrder: PracticeStageEntry[] = [];
    for (let level = safeMaxLevel; level >= 1; level--) {
        priorityOrder.push({ level, isBonus: false });
        if (bonusSet.has(level)) {
            priorityOrder.push({ level, isBonus: true });
        }
    }

    const kept = priorityOrder.slice(0, maxCount);

    return kept.sort((a, b) => {
        if (a.level !== b.level) {
            return a.level - b.level;
        }
        return Number(a.isBonus) - Number(b.isBonus);
    });
}
