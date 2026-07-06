/**
 * ユーザー設定(ミュート等)のlocalStorage保存。
 * ScoreStorageと同様、localStorageが使えない環境でも例外を投げない。
 */

const MUTED_KEY = "loopgame.muted";

export function getMuted(): boolean {
    try {
        return localStorage.getItem(MUTED_KEY) === "true";
    } catch {
        return false;
    }
}

export function setMuted(muted: boolean): void {
    try {
        localStorage.setItem(MUTED_KEY, String(muted));
    } catch {
        // 保存できない環境では設定は揮発する(ゲームは継続)
    }
}
