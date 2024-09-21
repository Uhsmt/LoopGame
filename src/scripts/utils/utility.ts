/**
 * 範囲内のランダム整数を返す
 * @param {number} _min
 * @param {number} _max
 * @returns number
 */
export function random(min:number, max:number) :number
{
    return min + Math.round(Math.random() * (max - min));
}

/**
 * 配列から指定した個数、ランダムで抽出する
 * @param {*} _arrayData
 * @param {*} _count
 * @returns array[]
 */
export function chooseAtRandom(_arrayData:any[], _count:number):any[]
{
    const count = _count || 1;
    const copyArray = JSON.parse(JSON.stringify(_arrayData));
    const result = [];

    for (let i = 0; i < count; i++)
    {
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
export function isTrueRandom(_percentage:number):boolean
{
    return Math.random() * 100 <= _percentage;
}
