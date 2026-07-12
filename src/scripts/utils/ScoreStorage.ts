/**
 * localStorageを使った個人記録(ハイスコア・前回スコア)、および
 * プラクティスモード用の進行状況(最高到達レベル・到達済みボーナスステージ)の
 * 保存/読み込みを行うユーティリティ。
 *
 * プライベートブラウジング等でlocalStorageが利用できない/例外を投げる環境でも
 * ゲームが止まらないよう、すべてのlocalStorageアクセスをtry/catchで包んでいる。
 * 外部送信は一切行わず、localStorageのみを利用する。
 */

const HIGH_SCORE_KEY = "loopgame.highScore";
const LAST_SCORE_KEY = "loopgame.lastScore";
const MAX_LEVEL_KEY = "loopgame.maxLevel";
const MAX_BONUS_LEVELS_KEY = "loopgame.maxBonusLevels";

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

/** 保存されている最高到達レベルを取得する。未保存/取得不可の場合は0。 */
export function getMaxLevel(): number {
    return readScore(MAX_LEVEL_KEY) ?? 0;
}

function parseBonusLevels(raw: string | null): number[] {
    if (raw === null) {
        return [];
    }
    try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.filter(
            (value): value is number =>
                typeof value === "number" && Number.isFinite(value),
        );
    } catch {
        return [];
    }
}

/**
 * 到達済みのボーナスステージのレベル一覧を昇順・重複なしで取得する。
 * 未保存/取得不可/不正な値の場合は空配列。
 */
export function getReachedBonusLevels(): number[] {
    try {
        const levels = parseBonusLevels(
            localStorage.getItem(MAX_BONUS_LEVELS_KEY),
        );
        return [...new Set(levels)].sort((a, b) => a - b);
    } catch {
        return [];
    }
}

/**
 * (プラクティスモードではない)ステージへの到達を記録する。
 * isBonusがtrueならボーナスステージ到達レベルの一覧に追加(重複なし)し、
 * falseなら最高到達レベルを更新する(現在の値より大きい場合のみ。単調増加)。
 * localStorageが利用できない環境でもゲームが止まらないよう例外は握りつぶす。
 */
export function recordProgress(level: number, isBonus: boolean): void {
    try {
        if (isBonus) {
            const current = parseBonusLevels(
                localStorage.getItem(MAX_BONUS_LEVELS_KEY),
            );
            const updated = [...new Set([...current, level])].sort(
                (a, b) => a - b,
            );
            localStorage.setItem(MAX_BONUS_LEVELS_KEY, JSON.stringify(updated));
        } else {
            const currentMax = parseScore(localStorage.getItem(MAX_LEVEL_KEY));
            if (currentMax === null || level > currentMax) {
                localStorage.setItem(MAX_LEVEL_KEY, String(level));
            }
        }
    } catch {
        // localStorageが使えない環境では何もしない
    }
}
