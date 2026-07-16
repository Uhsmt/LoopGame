import { describe, it, expect, vi } from "vitest";
import {
    random,
    chooseAtRandom,
    isTrueRandom,
    formatNumberWithCommas,
    getDistance,
    isClickGesture,
    shuffleArray,
    calculateObstacleTiming,
    getColorMarkShape,
} from "../../../src/scripts/utils/Utility";
import * as Const from "../../../src/scripts/utils/Const";

// Create a simple Point-like object for testing
class MockPoint {
    x: number;
    y: number;
    constructor(x: number = 0, y: number = 0) {
        this.x = x;
        this.y = y;
    }
}

describe("Utility Functions", () => {
    describe("random()", () => {
        it("should return a number within the specified range", () => {
            const min = 1;
            const max = 10;
            for (let i = 0; i < 100; i++) {
                const result = random(min, max);
                expect(result).toBeGreaterThanOrEqual(min);
                expect(result).toBeLessThanOrEqual(max);
                expect(Number.isInteger(result)).toBe(true);
            }
        });

        it("should return the same number when min equals max", () => {
            const value = 5;
            const result = random(value, value);
            expect(result).toBe(value);
        });

        it("should handle negative numbers", () => {
            const min = -10;
            const max = -5;
            const result = random(min, max);
            expect(result).toBeGreaterThanOrEqual(min);
            expect(result).toBeLessThanOrEqual(max);
        });
    });

    describe("chooseAtRandom()", () => {
        it("should return the specified number of items", () => {
            const array = [1, 2, 3, 4, 5];
            const count = 3;
            const result = chooseAtRandom(array, count);
            expect(result).toHaveLength(count);
        });

        it("should return items from the original array", () => {
            const array = ["a", "b", "c", "d"];
            const count = 2;
            const result = chooseAtRandom(array, count);
            result.forEach((item) => {
                expect(array).toContain(item);
            });
        });

        it("should not modify the original array", () => {
            const array = [1, 2, 3, 4];
            const originalArray = [...array];
            chooseAtRandom(array, 2);
            expect(array).toEqual(originalArray);
        });

        it("should return entire array when count equals array length", () => {
            const array = [1, 2, 3];
            const result = chooseAtRandom(array, 3);
            expect(result).toHaveLength(3);
            array.forEach((item) => {
                expect(result).toContain(item);
            });
        });

        it("should handle empty array", () => {
            const array: number[] = [];
            const result = chooseAtRandom(array, 1);
            expect(result).toHaveLength(1);
            expect(result[0]).toBeUndefined();
        });

        it("should default to count 1 when count is 0", () => {
            const array = [1, 2, 3];
            const result = chooseAtRandom(array, 0);
            expect(result).toHaveLength(1); // Function defaults 0 to 1
            expect(array).toContain(result[0]);
        });
    });

    describe("isTrueRandom()", () => {
        it("should always return true for 100%", () => {
            for (let i = 0; i < 10; i++) {
                expect(isTrueRandom(100)).toBe(true);
            }
        });

        it("should always return false for 0%", () => {
            for (let i = 0; i < 10; i++) {
                expect(isTrueRandom(0)).toBe(false);
            }
        });

        it("should return boolean value", () => {
            const result = isTrueRandom(50);
            expect(typeof result).toBe("boolean");
        });

        it("should work with Math.random mock", () => {
            vi.spyOn(Math, "random").mockReturnValue(0.3);
            expect(isTrueRandom(50)).toBe(true); // 0.3 * 100 = 30 <= 50
            expect(isTrueRandom(25)).toBe(false); // 0.3 * 100 = 30 > 25
            vi.restoreAllMocks();
        });
    });

    describe("getColorMarkShape()", () => {
        it("should map every COLOR_LIST entry to a distinct MARK_SHAPES entry", () => {
            const shapes = Const.COLOR_LIST.map((color) =>
                getColorMarkShape(color),
            );
            expect(shapes).toEqual([...Const.MARK_SHAPES]);
            // 全て異なる形状であること(色だけでなく形でも判別できるようにするため)
            expect(new Set(shapes).size).toBe(Const.COLOR_LIST.length);
        });

        it("should return the same shape for the same color every time", () => {
            const color = Const.COLOR_LIST[2];
            expect(getColorMarkShape(color)).toBe(getColorMarkShape(color));
        });
    });

    describe("formatNumberWithCommas()", () => {
        it("should add commas to large numbers", () => {
            expect(formatNumberWithCommas(1000)).toBe("1,000");
            expect(formatNumberWithCommas(1234567)).toBe("1,234,567");
            expect(formatNumberWithCommas(999999999)).toBe("999,999,999");
        });

        it("should not add commas to small numbers", () => {
            expect(formatNumberWithCommas(123)).toBe("123");
            expect(formatNumberWithCommas(99)).toBe("99");
            expect(formatNumberWithCommas(0)).toBe("0");
        });

        it("should handle negative numbers", () => {
            expect(formatNumberWithCommas(-1000)).toBe("-1,000");
            expect(formatNumberWithCommas(-1234567)).toBe("-1,234,567");
        });
    });

    describe("getDistance()", () => {
        it("should calculate distance between two points correctly", () => {
            const p1 = new MockPoint(0, 0);
            const p2 = new MockPoint(3, 4);
            const distance = getDistance(p1 as any, p2 as any);
            expect(distance).toBe(5); // 3-4-5 triangle
        });

        it("should return 0 for same points", () => {
            const p1 = new MockPoint(5, 5);
            const p2 = new MockPoint(5, 5);
            const distance = getDistance(p1 as any, p2 as any);
            expect(distance).toBe(0);
        });

        it("should handle negative coordinates", () => {
            const p1 = new MockPoint(-3, -4);
            const p2 = new MockPoint(0, 0);
            const distance = getDistance(p1 as any, p2 as any);
            expect(distance).toBe(5);
        });

        it("should calculate horizontal distance", () => {
            const p1 = new MockPoint(0, 5);
            const p2 = new MockPoint(10, 5);
            const distance = getDistance(p1 as any, p2 as any);
            expect(distance).toBe(10);
        });

        it("should calculate vertical distance", () => {
            const p1 = new MockPoint(5, 0);
            const p2 = new MockPoint(5, 12);
            const distance = getDistance(p1 as any, p2 as any);
            expect(distance).toBe(12);
        });
    });

    describe("isClickGesture()", () => {
        it("returns true when both distance and duration are within the default thresholds", () => {
            expect(isClickGesture(0, 0)).toBe(true);
            expect(isClickGesture(5, 200)).toBe(true);
        });

        it("returns true exactly at the default threshold boundaries", () => {
            expect(isClickGesture(10, 500)).toBe(true);
        });

        it("returns false when the pointer moved too far (drag / loop drawing)", () => {
            expect(isClickGesture(10.1, 100)).toBe(false);
            expect(isClickGesture(300, 100)).toBe(false);
        });

        it("returns false when the press was held too long", () => {
            expect(isClickGesture(0, 500.1)).toBe(false);
            expect(isClickGesture(0, 2000)).toBe(false);
        });

        it("respects custom thresholds", () => {
            expect(isClickGesture(20, 100, 30, 1000)).toBe(true);
            expect(isClickGesture(40, 100, 30, 1000)).toBe(false);
            expect(isClickGesture(20, 1500, 30, 1000)).toBe(false);
        });
    });

    describe("shuffleArray()", () => {
        it("should return array with same length", () => {
            const array = [1, 2, 3, 4, 5];
            const shuffled = shuffleArray([...array]);
            expect(shuffled).toHaveLength(array.length);
        });

        it("should contain all original elements", () => {
            const array = ["a", "b", "c", "d"];
            const shuffled = shuffleArray([...array]);
            array.forEach((item) => {
                expect(shuffled).toContain(item);
            });
        });

        it("should modify the input array", () => {
            const array = [1, 2, 3, 4, 5];
            const originalArray = [...array];
            const result = shuffleArray(array);
            expect(result).toBe(array); // Same reference
            // Note: There's a small chance the shuffled array is the same as original
            // but statistically very unlikely for larger arrays
        });

        it("should handle single element array", () => {
            const array = [42];
            const shuffled = shuffleArray([...array]);
            expect(shuffled).toEqual([42]);
        });

        it("should handle empty array", () => {
            const array: number[] = [];
            const shuffled = shuffleArray([...array]);
            expect(shuffled).toEqual([]);
        });

        it("should produce different results on multiple calls (statistical test)", () => {
            const array = [1, 2, 3, 4, 5, 6, 7, 8];
            const results: string[] = [];

            // Run shuffle multiple times and collect results
            for (let i = 0; i < 10; i++) {
                const shuffled = shuffleArray([...array]);
                results.push(shuffled.join(","));
            }

            // Check that we get different arrangements (not all the same)
            const uniqueResults = new Set(results);
            expect(uniqueResults.size).toBeGreaterThan(1);
        });
    });

    describe("calculateObstacleTiming()", () => {
        it("should return the fixed 23 seconds for a first-appearance obstacle regardless of split math", () => {
            expect(calculateObstacleTiming(0, 1, 60, true)).toBe(23);
            expect(calculateObstacleTiming(2, 3, 60, true)).toBe(23);
        });

        it("should return the fixed timing that is earlier than the equal-split formula in a single-obstacle stage", () => {
            // 現行configの初登場ステージ(Lv9/11/13)はいずれもobstacles 1種のみ。
            // 等分式(60秒 ÷ 2 × 1 + 3 = 33秒)より23秒の方が早いことを保証する
            const equalSplitTiming = calculateObstacleTiming(0, 1, 60, false);
            expect(equalSplitTiming).toBe(33);

            const firstAppearanceTiming = calculateObstacleTiming(
                0,
                1,
                60,
                true,
            );
            expect(firstAppearanceTiming).toBeLessThan(equalSplitTiming);
        });

        it("should follow the equal-split + 3s formula when not a first appearance", () => {
            // 90秒を(種類数+1)で等分し、+3秒。花の出現タイミングとずらす仕様
            expect(calculateObstacleTiming(0, 2, 90, false)).toBe(33); // floor(90/3*1)+3
            expect(calculateObstacleTiming(1, 2, 90, false)).toBe(63); // floor(90/3*2)+3
        });

        it("should return the same 23s regardless of typesCount or index, as long as the equal-split value exceeds 23", () => {
            expect(calculateObstacleTiming(0, 1, 60, true)).toBe(
                calculateObstacleTiming(3, 5, 45, true),
            );
        });

        it("should clamp the first-appearance timing to the equal-split value on a short stage (gameTimeSec=20)", () => {
            // 23秒はgameTimeSecを考慮しない固定値のため、stageTime < 23の
            // ステージでは等分+3秒の式にクランプする(お邪魔が一切出現しない
            // 静かな不具合を防ぐ)。20秒ステージ・1種構成なら
            // floor(20/2*1)+3 = 13秒 となり、23にはならない
            const timing = calculateObstacleTiming(0, 1, 20, true);
            expect(timing).not.toBe(23);
            expect(timing).toBe(13);
            expect(timing).toBeLessThan(20);
        });
    });
});
