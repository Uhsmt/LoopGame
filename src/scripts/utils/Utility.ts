import * as PIXI from "pixi.js";

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
