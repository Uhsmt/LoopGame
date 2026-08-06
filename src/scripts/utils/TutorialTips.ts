import { MessageKey } from "./Language";

/**
 * チュートリアルtipsを表示するレベル→メッセージキーの対応表。
 *
 * stage-config.json から「その要素の初出ステージ」を動的に算出するのではなく、
 * レベル番号にハードコードしている(#91での決定)。そのため
 * stage-config.json / stage-config-debug.json のステージ構成を変更した場合、
 * この対応表がずれる可能性がある。構成を変えたときはこの表も手で見直すこと。
 */
const TUTORIAL_TIP_LEVELS: Readonly<Record<number, MessageKey>> = {
    1: "tip.level1", // 基本の捕獲ルール(同色2匹以上)
    2: "tip.level2", // helpObjectNum 初出
    3: "tip.level3", // butterflyColorNum が3になる
    4: "tip.level4", // isButterflyColorChange 初出
    5: "tip.level5", // hasBonusButterfly 初出
    9: "tip.level9", // obstacles 初出
};

/** 指定レベルに対応するチュートリアルtipsのメッセージキー(なければnull) */
export function getTutorialTipKey(level: number): MessageKey | null {
    return TUTORIAL_TIP_LEVELS[level] ?? null;
}
