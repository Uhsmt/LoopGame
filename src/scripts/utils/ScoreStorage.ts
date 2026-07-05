/**
 * localStorageを使った個人記録(ハイスコア・前回スコア)の保存/読み込みを行うユーティリティ。
 *
 * プライベートブラウジング等でlocalStorageが利用できない/例外を投げる環境でも
 * ゲームが止まらないよう、すべてのlocalStorageアクセスをtry/catchで包んでいる。
 * 外部送信は一切行わず、localStorageのみを利用する。
 */

const HIGH_SCORE_KEY = "loopgame.highScore";
const LAST_SCORE_KEY = "loopgame.lastScore";

export interface SaveResultOutcome {
    isNewRecord: boolean;
    previousBest: number | null;
}

function parseScore(raw: string | null): number | null {
    if (raw === null) {
        return null;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
}

function readScore(key: string): number | null {
    try {
        return parseScore(localStorage.getItem(key));
    } catch {
        return null;
    }
}

/** 保存されているハイスコアを取得する。未保存/取得不可の場合はnull。 */
export function getHighScore(): number | null {
    return readScore(HIGH_SCORE_KEY);
}

/** 保存されている前回スコアを取得する。未保存/取得不可の場合はnull。 */
export function getLastScore(): number | null {
    return readScore(LAST_SCORE_KEY);
}

/**
 * 今回のスコアを保存し、ハイスコア更新の有無を判定して返す。
 * localStorageへのアクセスが例外を投げる場合は保存をスキップし、
 * { isNewRecord: false, previousBest: null } を返す。
 */
export function saveResult(totalScore: number): SaveResultOutcome {
    try {
        const previousBest = parseScore(localStorage.getItem(HIGH_SCORE_KEY));
        const isNewRecord = previousBest === null || totalScore > previousBest;

        localStorage.setItem(LAST_SCORE_KEY, String(totalScore));
        if (isNewRecord) {
            localStorage.setItem(HIGH_SCORE_KEY, String(totalScore));
        }

        return { isNewRecord, previousBest };
    } catch {
        return { isNewRecord: false, previousBest: null };
    }
}
