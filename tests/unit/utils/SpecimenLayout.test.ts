import { describe, it, expect } from "vitest";
import { layoutSpecimens } from "../../../src/scripts/utils/SpecimenLayout";
import type { CapturedSpecimen } from "../../../src/scripts/components/StageInformation";

/**
 * ノート型リザルト画面で「捕まえた蝶を標本としてピン留め表示する」ための
 * ページ割り当てロジック。PIXIに依存しない純粋関数として実装し、
 * 実際に何匹収まるか(=capacity)は呼び出し側がノートの実寸から計算した
 * 値を渡す前提でテストする。
 */

function makeSpecimens(count: number): CapturedSpecimen[] {
    return Array.from({ length: count }, () => ({
        color: 0xff69b4,
        sizeCategory: "small" as const,
        isSpecial: false,
    }));
}

describe("layoutSpecimens", () => {
    it("puts everything on the left page when it fits within leftCapacity", () => {
        const specimens = makeSpecimens(5);
        const result = layoutSpecimens(specimens, 10, 10);

        expect(result.left).toHaveLength(5);
        expect(result.right).toHaveLength(0);
        expect(result.overflowCount).toBe(0);
    });

    it("fills the left page exactly with no overflow", () => {
        const specimens = makeSpecimens(10);
        const result = layoutSpecimens(specimens, 10, 10);

        expect(result.left).toHaveLength(10);
        expect(result.right).toHaveLength(0);
        expect(result.overflowCount).toBe(0);
    });

    it("spills the remainder onto the right page once the left page is full", () => {
        const specimens = makeSpecimens(12);
        const result = layoutSpecimens(specimens, 10, 10);

        expect(result.left).toHaveLength(10);
        expect(result.right).toHaveLength(2);
        expect(result.overflowCount).toBe(0);
    });

    it("fills both pages exactly with no overflow", () => {
        const specimens = makeSpecimens(20);
        const result = layoutSpecimens(specimens, 10, 10);

        expect(result.left).toHaveLength(10);
        expect(result.right).toHaveLength(10);
        expect(result.overflowCount).toBe(0);
    });

    it("reports the remainder as overflowCount once both pages are full", () => {
        const specimens = makeSpecimens(52);
        const result = layoutSpecimens(specimens, 20, 12);

        expect(result.left).toHaveLength(20);
        expect(result.right).toHaveLength(12);
        expect(result.overflowCount).toBe(20); // 52 - 20 - 12
    });

    it("preserves original order across left, right, and overflow", () => {
        const specimens: CapturedSpecimen[] = Array.from(
            { length: 5 },
            (_, i) => ({
                color: i,
                sizeCategory: "small",
                isSpecial: false,
            }),
        );
        const result = layoutSpecimens(specimens, 2, 2);

        expect(result.left.map((s) => s.color)).toEqual([0, 1]);
        expect(result.right.map((s) => s.color)).toEqual([2, 3]);
        expect(result.overflowCount).toBe(1);
    });

    it("handles an empty capture list", () => {
        const result = layoutSpecimens([], 10, 10);

        expect(result.left).toHaveLength(0);
        expect(result.right).toHaveLength(0);
        expect(result.overflowCount).toBe(0);
    });

    it("handles zero right-page capacity by sending everything past the left page to overflow", () => {
        const specimens = makeSpecimens(15);
        const result = layoutSpecimens(specimens, 10, 0);

        expect(result.left).toHaveLength(10);
        expect(result.right).toHaveLength(0);
        expect(result.overflowCount).toBe(5);
    });
});
