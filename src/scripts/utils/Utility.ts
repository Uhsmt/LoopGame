import * as PIXI from "pixi.js";
import * as Const from "./Const";

/**
 * 範囲内のランダム整数を返す
 * @param {number} _min
 * @param {number} _max
 * @returns number
 */
export function random(min: number, max: number): number {
    return min + Math.round(Math.random() * (max - min));
}

/**
 * 配列から指定した個数、ランダムで抽出する
 * @param {*} _arrayData
 * @param {*} _count
 * @returns array[]
 */
export function chooseAtRandom<T>(_arrayData: T[], _count: number): T[] {
    const count = _count || 1;
    const copyArray = [..._arrayData]; // 型安全な方法で配列をコピーする
    const result: T[] = [];

    for (let i = 0; i < count; i++) {
        const arrayIndex = Math.floor(Math.random() * copyArray.length);

        result[i] = copyArray[arrayIndex];
        copyArray.splice(arrayIndex, 1);
    }

    return result;
}
/**
 * 指定した確率でtrueを返す
 * @param {*} _percentage
 * @returns boolean
 */
export function isTrueRandom(_percentage: number): boolean {
    return Math.random() * 100 <= _percentage;
}

export function formatNumberWithCommas(x: number): string {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function getDistance(p1: PIXI.Point, p2: PIXI.Point): number {
    return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

/**
 * 配列をランダムにシャッフルして返却
 * @param _array
 */
export function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * お邪魔オブジェクトの出現タイミング(秒)を計算する。
 * 初登場ステージ(isFirstAppearance)は教習目的で固定23秒、
 * それ以外はステージ時間を種類数+1で等分したタイミング+3秒。
 * @param index obstacles配列内でのインデックス
 * @param typesCount そのステージのお邪魔の種類数
 * @param gameTimeSec ステージ時間(秒)
 * @param isFirstAppearance その種類が初めて登場するステージか
 * @returns number 出現タイミング(秒)
 */
export function calculateObstacleTiming(
    index: number,
    typesCount: number,
    gameTimeSec: number,
    isFirstAppearance: boolean,
): number {
    if (isFirstAppearance) {
        return Const.FIRST_APPEARANCE_OBSTACLE_TIME_SEC;
    }
    return Math.floor((gameTimeSec / (typesCount + 1)) * (index + 1)) + 3;
}
