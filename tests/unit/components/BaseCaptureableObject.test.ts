import { describe, it, expect } from "vitest";
import { BaseCaptureableObject } from "../../../src/scripts/components/BaseCaptureableObject";

// テスト用の最小限の具象クラス(中心座標と当たり判定半径を自由に設定できる)
class TestCaptureableObject extends BaseCaptureableObject {
    constructor(
        private center: { x: number; y: number },
        hitAreaSize: number = 10,
    ) {
        super();
        this.hitAreaSize = hitAreaSize;
    }

    protected getObjectCenter(): { x: number; y: number } {
        return this.center;
    }
}

describe("BaseCaptureableObject.containsPoint()", () => {
    it("returns true for a point exactly at the center", () => {
        const obj = new TestCaptureableObject({ x: 100, y: 100 }, 20);
        expect(obj.containsPoint({ x: 100, y: 100 })).toBe(true);
    });

    it("returns true for a point inside the hit radius", () => {
        const obj = new TestCaptureableObject({ x: 100, y: 100 }, 20);
        expect(obj.containsPoint({ x: 110, y: 100 })).toBe(true);
    });

    it("returns true for a point exactly on the hit radius boundary", () => {
        const obj = new TestCaptureableObject({ x: 0, y: 0 }, 10);
        expect(obj.containsPoint({ x: 10, y: 0 })).toBe(true);
    });

    it("returns false for a point outside the hit radius", () => {
        const obj = new TestCaptureableObject({ x: 100, y: 100 }, 20);
        expect(obj.containsPoint({ x: 130, y: 100 })).toBe(false);
    });

    it("scales the hit radius with the object's scale.y", () => {
        const obj = new TestCaptureableObject({ x: 0, y: 0 }, 10);
        obj.scale.y = 0.5;
        // 半径10 * scale.y(0.5) = 5 なので、距離8の点は範囲外になる
        expect(obj.containsPoint({ x: 8, y: 0 })).toBe(false);
        expect(obj.containsPoint({ x: 4, y: 0 })).toBe(true);
    });

    it("returns false when the object is fully transparent (alpha 0)", () => {
        const obj = new TestCaptureableObject({ x: 100, y: 100 }, 20);
        obj.alpha = 0;
        expect(obj.containsPoint({ x: 100, y: 100 })).toBe(false);
    });
});
