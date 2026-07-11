/* eslint @typescript-eslint/no-namespace: 0 */
export const COLOR_LIST = [
    0xff69b4, // hotpink
    0xdc143c, // crimson
    0x6a5acd, // slateblue
    0x00f3eb, // lightblue
    0xffa519, // orange
] as const;

export const SIZE_LIST = ["small", "medium", "large"] as const;

export const MARGIN = 25;

export const FONT_ENGLISH = "Rajdhani";
export const FONT_ENGLISH_BOLD = "600";

export const FONT_JAPANESE = "BIZ UDGothic";
export const FONT_JAPANESE_BOLD = "400";

export const FONT_TITLE = "Palette Mosaic";

export const HELP_FLOWER_TYPES = [
    "freeze",
    "time_plus",
    "gather",
    "long",
] as const;

export const OBSTACLE_TYPES = ["bee", "spider", "catapy"] as const;

// ゲームの設計解像度(全レイアウトはapp.screen基準なのでここを変えれば全体が追従)
export const GAME_WIDTH = 1150;
export const GAME_HEIGHT = 650;

export const LONG_LOOP_EFFECT_TIME_MS = 5000;
export const GATHER_EFFECT_TIME_MS = 10000;
export const FREEZE_EFFECT_TIME_MS = 3000;
// お邪魔オブジェクトの効果時間(bee: ライン短縮 / spider: 蝶が鉛筆から逃げる)
export const LINE_SHORTEN_EFFECT_TIME_MS = 6000;
export const AVOID_PENCIL_EFFECT_TIME_MS = 6000;
// ライン短縮中の線の色(赤: 弱体化がひと目で分かるように)
export const LINE_SHORTEN_COLOR = 0xff0000;
// 鉛筆から逃げるときの速さ(px/16ms、小蝶と同じ。サイズによらず共通)
export const AVOID_PENCIL_SPEED = 0.6;
// その種類のお邪魔オブジェクトが初めて登場するステージでの出現タイミング(秒)
// 教習ステージとして機能させるため、通常の等分割+3秒より早く出す
export const FIRST_APPEARANCE_OBSTACLE_TIME_SEC = 23;

export const seSrcs = [
    { alias: "se_switch", src: `${BASE_URL}assets/sounds/se_switch.m4a` },
    {
        alias: "se_applause",
        src: `${BASE_URL}assets/sounds/se_applause.m4a`,
    },
    { alias: "se_capture", src: `${BASE_URL}assets/sounds/se_capture.m4a` },
    {
        alias: "se_capture_many",
        src: `${BASE_URL}assets/sounds/se_capture_many.m4a`,
    },
    { alias: "se_powerup", src: `${BASE_URL}assets/sounds/se_powerup.m4a` },
    { alias: "se_score", src: `${BASE_URL}assets/sounds/se_score.m4a` },
    { alias: "se_bad_loop", src: `${BASE_URL}assets/sounds/se_bad_loop.m4a` },
    { alias: "se_select", src: `${BASE_URL}assets/sounds/se_select.m4a` },
    { alias: "se_tick", src: `${BASE_URL}assets/sounds/se_tick.m4a` },
    {
        alias: "se_obstacle_appear",
        src: `${BASE_URL}assets/sounds/se_obstacle_appear.m4a`,
    },
    {
        alias: "se_obstacle_hit",
        src: `${BASE_URL}assets/sounds/se_obstacle_hit.m4a`,
    },
];

export const bgmSrcs = {
    title: `${BASE_URL}assets/sounds/bgm_title.m4a`,
    stage1: `${BASE_URL}assets/sounds/bgm_stage1.m4a`,
    stage2: `${BASE_URL}assets/sounds/bgm_stage2.m4a`,
    bonus: `${BASE_URL}assets/sounds/bgm_bonus.m4a`,
};

export const imageSrcs = [
    { alias: "background", src: `${BASE_URL}assets/background.jpg` },
    { alias: "menu_background", src: `${BASE_URL}assets/menu_background.jpeg` },
    // prettier-ignore
    { alias: "background_night", src: `${BASE_URL}assets/background_night.png` },
    { alias: "butterfly_large", src: `${BASE_URL}assets/butterfly_large.png` },
    // prettier-ignore
    { alias: "butterfly_medium", src: `${BASE_URL}assets/butterfly_medium.png`},
    { alias: "butterfly_small", src: `${BASE_URL}assets/butterfly_small.png` },
    // prettier-ignore
    { alias: "butterfly_special", src: `${BASE_URL}assets/butterfly_special.png` },
    { alias: "leaf", src: `${BASE_URL}assets/leaf.png` },
    { alias: "moon", src: `${BASE_URL}assets/moon.png` },
    { alias: "pencil", src: `${BASE_URL}assets/pencil.png` },
    { alias: "sticky", src: `${BASE_URL}assets/sticky.png` },
    { alias: "sun", src: `${BASE_URL}assets/sun.png` },
    { alias: "sunset_spritesheet", src: `${BASE_URL}assets/sunset.json` },
    { alias: "sunset", src: `${BASE_URL}assets/sunset.png` },
    { alias: "flower1", src: `${BASE_URL}assets/flower1.png` },
    { alias: "flower2", src: `${BASE_URL}assets/flower2.png` },
    { alias: "flower3", src: `${BASE_URL}assets/flower3.png` },
    { alias: "flower4", src: `${BASE_URL}assets/flower4.png` },
    { alias: "notebook", src: `${BASE_URL}assets/notebook.png` },
    { alias: "stardust", src: `${BASE_URL}assets/stardust_effect.png` },
    { alias: "bee", src: `${BASE_URL}assets/bee.png` },
    { alias: "spider1", src: `${BASE_URL}assets/spider1.png` },
    { alias: "spider2", src: `${BASE_URL}assets/spider2.png` },
    { alias: "catapy1", src: `${BASE_URL}assets/catapy1.png` },
    { alias: "catapy2", src: `${BASE_URL}assets/catapy2.png` },
];
