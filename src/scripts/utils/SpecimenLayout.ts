import { CapturedSpecimen } from "../components/StageInformation";

export interface SpecimenLayoutResult {
    left: CapturedSpecimen[];
    right: CapturedSpecimen[];
    overflowCount: number;
}

/**
 * 捕まえた蝶の標本を、ノートの左ページ→右ページの順に割り当てる。
 * leftCapacity/rightCapacityは呼び出し側(ResultState)がノートの実寸と
 * 見出し・スコア欄の占有分から計算した「実際に何匹分のスロットが
 * 収まるか」を渡す。両ページに収まりきらない分はoverflowCountとして返し、
 * 呼び出し側が「…+N」のようなプレーンテキストで表示する。
 */
export function layoutSpecimens(
    specimens: CapturedSpecimen[],
    leftCapacity: number,
    rightCapacity: number,
): SpecimenLayoutResult {
    const left = specimens.slice(0, leftCapacity);
    const remaining = specimens.slice(leftCapacity);
    const right = remaining.slice(0, rightCapacity);
    const overflowCount = remaining.length - right.length;

    return { left, right, overflowCount };
}
