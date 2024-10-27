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

export const LONG_LOOP_EFFECT_TIME_MS = 5000;
export const GATHHER_EFFECT_TIME_MS = 10000;
export const FREEZE_EFFECT_TIME_MS = 3000;

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
    { alias: "moon", src: `${BASE_URL}assets/moon.png` },
    { alias: "sunset_spritesheet", src: `${BASE_URL}assets/sunset.json` },
    { alias: "sunset", src: `${BASE_URL}assets/sunset.png` },
    { alias: "flower1", src: `${BASE_URL}assets/flower1.png` },
    { alias: "flower2", src: `${BASE_URL}assets/flower2.png` },
    { alias: "flower3", src: `${BASE_URL}assets/flower3.png` },
    { alias: "flower4", src: `${BASE_URL}assets/flower4.png` },
    { alias: "notebook", src: `${BASE_URL}assets/notebook.png` },
    { alias: "stardust", src: `${BASE_URL}assets/stardust_effect.png` },
];
