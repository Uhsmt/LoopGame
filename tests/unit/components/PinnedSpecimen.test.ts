import { describe, it, expect } from "vitest";
import {
    PinnedSpecimen,
    IDLE_TREMBLE_QUIET_MS,
    IDLE_TREMBLE_BURST_MS,
} from "../../../src/scripts/components/PinnedSpecimen";

const SCREEN = { x: 1150, y: 650 };

function makeSpecial(): PinnedSpecimen {
    return new PinnedSpecimen(
        { color: 0xdc143c, sizeCategory: "special", isSpecial: true },
        SCREEN,
    );
}

/** deltaMS刻みでelapsedMsぶんupdateする */
function advance(specimen: PinnedSpecimen, elapsedMs: number, deltaMS = 16) {
    for (let t = 0; t < elapsedMs; t += deltaMS) {
        specimen.update(deltaMS);
    }
}

describe("PinnedSpecimen idle tremble", () => {
    it("stays still at its base position during the quiet interval", () => {
        const specimen = makeSpecial();
        const baseX = specimen.butterfly.x;
        const baseY = specimen.butterfly.y;

        advance(specimen, IDLE_TREMBLE_QUIET_MS - 100);

        expect(specimen.butterfly.x).toBe(baseX);
        expect(specimen.butterfly.y).toBe(baseY);
    });

    it("trembles subtly during the burst, then settles back to base", () => {
        const specimen = makeSpecial();
        const baseX = specimen.butterfly.x;
        const baseY = specimen.butterfly.y;

        // 静止期間を越えてバースト中盤まで進めると、微小なオフセットが乗る
        advance(specimen, IDLE_TREMBLE_QUIET_MS);
        let moved = false;
        for (let t = 0; t < IDLE_TREMBLE_BURST_MS; t += 16) {
            specimen.update(16);
            const dist = Math.hypot(
                specimen.butterfly.x - baseX,
                specimen.butterfly.y - baseY,
            );
            // 「ちょっとブルブル」: 動くが、控えめな振れ幅に収まる
            expect(dist).toBeLessThan(5);
            if (dist > 0.1) moved = true;
        }
        expect(moved).toBe(true);

        // バーストが終わると基準位置に戻って静止する
        specimen.update(16);
        expect(specimen.butterfly.x).toBe(baseX);
        expect(specimen.butterfly.y).toBe(baseY);
    });

    it("no longer trembles once the pin is removed", () => {
        const specimen = makeSpecial();
        const baseX = specimen.butterfly.x;
        const baseY = specimen.butterfly.y;

        specimen.unpinAndRelease();
        // 飛行はコンテナ(specimen.x/y)側が担うため、ピンが外れたあとは
        // 内側の蝶は基準位置に固定されたまま
        advance(specimen, IDLE_TREMBLE_QUIET_MS + IDLE_TREMBLE_BURST_MS);
        expect(specimen.butterfly.x).toBe(baseX);
        expect(specimen.butterfly.y).toBe(baseY);
    });

    it("resets the butterfly to its base position when released mid-burst", () => {
        const specimen = makeSpecial();
        const baseX = specimen.butterfly.x;
        const baseY = specimen.butterfly.y;

        // バーストの途中(オフセットが乗っている状態)でピンを外しても、
        // ずれたまま飛び立たないように基準位置へ戻る
        advance(specimen, IDLE_TREMBLE_QUIET_MS + IDLE_TREMBLE_BURST_MS / 2);
        specimen.unpinAndRelease();
        expect(specimen.butterfly.x).toBe(baseX);
        expect(specimen.butterfly.y).toBe(baseY);
    });
});
