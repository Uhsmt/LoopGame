/* eslint @typescript-eslint/no-namespace: 0 */
export namespace myConsts {
    export const BUTTERFLY_WIDTH = 260;
    export const BUTTERFLY_HEIGHT = 256;
    export const FLAP_DURATION = 12;
    export const COLOR_LIST = [
        0xffd700, // gold
        0xff69b4, // hotpink
        0xdc143c, // crimson
        0x6a5acd, // slateblue
        0xadff2f, // greenyellow
    ];
}

export const ButterflySizeType = {
    SMALL: "small",
    MEDIUM: "medium",
    LARGE: "large",
} as const;

export const imageSrcs = [
    { alias: "title", src: `${BASE_URL}assets/title.png` },
    { alias: "background", src: `${BASE_URL}assets/background.jpg` },
    { alias: "menu_background", src: `${BASE_URL}assets/menu_background.jpeg` },
    { alias: "base", src: `${BASE_URL}assets/base.png` },
    { alias: "bear", src: `${BASE_URL}assets/bear.png` },
    { alias: "butterfly_large", src: `${BASE_URL}assets/butterfly_large.png` },
    { alias: "butterfly_medium", src: `${BASE_URL}assets/butterfly_medium.png` },
    { alias: "butterfly_small", src: `${BASE_URL}assets/butterfly_small.png` },
    { alias: "leaf", src: `${BASE_URL}assets/leaf.png` },
    { alias: "leaf1", src: `${BASE_URL}assets/leaf1.png` },
    { alias: "leaf2", src: `${BASE_URL}assets/leaf2.png` },
    { alias: "leaf3", src: `${BASE_URL}assets/leaf3.png` },
    { alias: "leaf4", src: `${BASE_URL}assets/leaf4.png` },
    { alias: "leaf5", src: `${BASE_URL}assets/leaf5.png` },
    { alias: "leaf6", src: `${BASE_URL}assets/leaf6.png` },
    { alias: "leaf7", src: `${BASE_URL}assets/leaf7.png` },
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
];
