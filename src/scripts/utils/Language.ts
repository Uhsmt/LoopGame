/**
 * 言語モード(日本語/英語)の管理と、ゲーム内テキストの多言語カタログ。
 *
 * - 自動判定: navigator.language が "ja" で始まれば日本語、それ以外は英語
 * - 手動切替: setLang / toggleLang で切り替え、localStorage に永続化する
 *   (次回以降は保存値を優先する)
 * - localStorage が使えない環境でも例外を投げない(揮発するだけ)
 *
 * テキストは子どもがしゃべっているような、やさしい言葉づかいにしている。
 */

const LANG_KEY = "loopgame.lang";

export type Lang = "ja" | "en";

/** カタログの1エントリ。基本は両言語を持つが、pick でフォールバックできる */
export interface CatalogEntry {
    ja?: string;
    en?: string;
}

/** メッセージカタログ: キー → { ja, en } */
const CATALOG = {
    // --- ボタン ---
    "button.start": { ja: "スタート", en: "Start" },
    "button.howToPlay": { ja: "あそびかた", en: "How to\rplay" },
    "button.back": { ja: "もどる", en: "Back" },
    "button.next": { ja: "つぎへ", en: "Next" },
    "button.backToMenu": { ja: "メニュー", en: "Menu" },

    // --- ヒント(StartState) ---
    "hint.drawLoop": {
        ja: "くりっく じゃなくて せんで かこんでね！",
        en: "Draw a loop around it!",
    },

    // --- 言語切替 ---
    "lang.english": { ja: "English", en: "English" },
    "lang.japanese": { ja: "にほんご", en: "にほんご" },

    // --- ゲーム中(GameplayState) ---
    "game.captureN": {
        ja: "ちょうちょを {n}ひき つかまえて！",
        en: "Capture {n} butterflies!",
    },
    "game.captureMany": {
        ja: "ちょうちょを たくさん つかまえて！",
        en: "Capture many butterflies!",
    },
    "game.pause": { ja: "おやすみ", en: "Pause" },
    "game.lineShortened": { ja: "みじかい！", en: "Line shortened!" },
    "game.butterfliesFlee": {
        ja: "にげる！",
        en: "Butterflies flee!",
    },
    "game.invalidLoop": { ja: "だめループ！", en: "Invalid loop!" },
    "game.timesUp": { ja: "じかんぎれ！", en: "Time's up!" },
    "game.badLoop": {
        ja: "だめループ！\r\n -20てん",
        en: "Bad loop! \r\n -20 points",
    },
    "game.points": { ja: "{calc}{points} てん", en: "{calc}{points} points" },

    // --- リザルト(ResultState) ---
    "result.bonusStageBang": { ja: "ボーナスステージ", en: "Bonus stage!" },
    "result.bonusStage": { ja: "ボーナスステージ", en: "Bonus stage" },
    "result.level": { ja: "Level {n}", en: "Level {n}" },
    "result.yourTotalScore": {
        ja: "Score \r {score}",
        en: "Your total score\r {score}",
    },
    "result.newRecord": { ja: "しんきろく！", en: "New Record!" },
    "result.best": { ja: "ベスト: {score}", en: "Best: {score}" },
    "result.need": {
        ja: "Need :         × {n} ",
        en: "Need :         × {n} ",
    },
    "result.got": {
        ja: "Got :          × {n} ",
        en: "Got :          × {n} ",
    },
    "result.baseScore": {
        ja: "base score : {score}",
        en: "base score : {score}",
    },
    "result.bonusScore": {
        ja: "bonus score : {count} × 100 = {score}",
        en: "bonus score : {count} × 100 = {score}",
    },
    "result.stageScore": {
        ja: "stage score : {score}",
        en: "stage score : {score}",
    },
    "result.totalScore": {
        ja: "total : {score}",
        en: "total score : {score}",
    },

    // --- あそびかた(RuleState) ---
    "rule.title.howToPlay": { ja: "あそびかた", en: "How to play" },
    "rule.p1.draw": {
        ja: "せんをかいてちょうちょをつかまえて",
        en: "Draw a loop to capture butterflies",
    },
    "rule.p1.morePoints": {
        ja: "おおいほど　たくさんてん",
        en: "More butterflies, more points",
    },
    "rule.p1.beforeSunset": {
        ja: "たいようがしずむまえに \rひつようなかずをつかまえて",
        en: "Capture needed number of\rbutterflies before sunset",
    },
    "rule.title.combinations": { ja: "くみあわせ", en: "Combinations" },
    "rule.p2.sameColor": {
        ja: "おなじいろ 2ひきいじょう…OK",
        en: "Same color 2 or more: OK",
    },
    "rule.p2.eachDifferent": {
        ja: "ちがういろを1ひきずつ　3ひきいじょう…OK",
        en: "Each different color 3 or more: OK",
    },
    "rule.p2.onlyOne": {
        ja: "1ひきだけ…いろをかえる",
        en: "Only one butterfly: Change color",
    },
    "rule.p2.other": {
        ja: "それいがい…だめループ",
        en: "Other combinations: Bad Loop",
    },
    "rule.title.tryLoop": {
        ja: "ループのれんしゅう",
        en: "Let's try to loop!",
    },
    "rule.title.helpObjects": {
        ja: "おたすけ オブジェクト",
        en: "Help Objects",
    },
    "rule.title.hindranceObjects": {
        ja: "おじゃま オブジェクト",
        en: "Hindrance Objects",
    },
    "rule.practice.colorSwitched": {
        ja: "いろがかわった！",
        en: "Color switched!",
    },
    "rule.practice.gotN": {
        ja: "{n}ひき つかまえた！",
        en: "Got {n} butterflies!",
    },
    "rule.practice.badLoop": { ja: "だめループ！", en: "Bad Loop!" },

    // --- おたすけフラワー(HelpFlower) ---
    "flower.freeze.message": { ja: "とまれ！", en: "Freeze!" },
    "flower.freeze.description": {
        ja: "ちょうちょをとめる",
        en: "Freeze the butterflies",
    },
    "flower.time_plus.message": { ja: "もどれ！", en: "Time extended!" },
    "flower.time_plus.description": {
        ja: "ゲームじかんをのばす",
        en: "Extend the game time",
    },
    "flower.gather.message": { ja: "あつまれ！", en: "Gather!" },
    "flower.gather.description": {
        ja: "ちょうちょをあつめる",
        en: "Gather the butterflies by color",
    },
    "flower.long.message": { ja: "ながいループ！", en: "Long Loop!" },
    "flower.long.description": {
        ja: "ループをのばす",
        en: "Extend the loop line",
    },

    // --- おじゃまオブジェクト(Bee / Spider / Catapy) ---
    "obstacle.bee.description": {
        ja: "ループが みじかくなる",
        en: "Shortens your loop line",
    },
    "obstacle.spider.description": {
        ja: "ちょうちょが にげる",
        en: "Butterflies flee from your pencil",
    },
    "obstacle.catapy.description": {
        ja: "いっしょに かこむとだめ",
        en: "Voids any loop that contains it",
    },
} satisfies Record<string, CatalogEntry>;

export type MessageKey = keyof typeof CATALOG;

/** キャッシュした現在の言語(未初期化は null) */
let currentLang: Lang | null = null;

/** navigator.language から言語を自動判定する(取得不可なら英語) */
export function detectLang(): Lang {
    try {
        const language = navigator.language ?? "";
        return language.toLowerCase().startsWith("ja") ? "ja" : "en";
    } catch {
        return "en";
    }
}

function readStoredLang(): Lang | null {
    try {
        const value = localStorage.getItem(LANG_KEY);
        return value === "ja" || value === "en" ? value : null;
    } catch {
        return null;
    }
}

/** 現在の言語を返す。保存値を優先し、なければ自動判定する */
export function getLang(): Lang {
    if (currentLang === null) {
        currentLang = readStoredLang() ?? detectLang();
    }
    return currentLang;
}

/** 言語を設定して localStorage に永続化する(保存できない環境でも継続) */
export function setLang(lang: Lang): void {
    currentLang = lang;
    try {
        localStorage.setItem(LANG_KEY, lang);
    } catch {
        // 保存できない環境では設定は揮発する(ゲームは継続)
    }
}

/** 言語を反転して返す */
export function toggleLang(): Lang {
    setLang(getLang() === "ja" ? "en" : "ja");
    return getLang();
}

/**
 * キャッシュを破棄する。主にテストの独立性確保のために使う。
 * 実行中は setLang / getLang がキャッシュを更新するため通常は不要。
 */
export function resetLangCache(): void {
    currentLang = null;
}

/**
 * カタログエントリから、指定言語の値を取り出す。
 * 目的の言語が無ければ英語→日本語の順にフォールバックする。
 */
export function pick(entry: CatalogEntry, lang: Lang): string {
    return entry[lang] ?? entry.en ?? entry.ja ?? "";
}

/**
 * カタログを引き、現在の言語のテキストを返す。
 * `{name}` 形式のプレースホルダを params で置換する。
 * 未知のキーはキー文字列をそのまま返す(表示が消えないように)。
 */
export function t(
    key: MessageKey,
    params?: Record<string, string | number>,
): string {
    const entry = (CATALOG as Record<string, CatalogEntry>)[key];
    if (!entry) {
        return key;
    }
    let text = pick(entry, getLang());
    if (params) {
        for (const [name, value] of Object.entries(params)) {
            text = text.split(`{${name}}`).join(String(value));
        }
    }
    return text;
}

/** 文字列に日本語(ひらがな・カタカナ・漢字)が含まれるか */
export function isJapaneseText(text: string): boolean {
    // ひらがな/カタカナ, CJK統合漢字, 半角カタカナ
    return /[぀-ヿ㐀-鿿ｦ-ﾟ]/.test(text);
}
