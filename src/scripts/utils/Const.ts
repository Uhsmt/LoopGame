/* eslint @typescript-eslint/no-namespace: 0 */
export namespace myConsts
{
    export const BUTTERFLY_WIDTH = 260;
    export const BUTTERFLY_HEIGHT = 256;
    export const FLAP_DURATION = 12;
    export const COLOR_LIST = [
        0xFFD700, // gold
        0xff69b4, // hotpink
        0xDC143C, // crimson
        0x6A5ACD, // slateblue
        0xadff2f // greenyellow
    ];
}

export const ButterflySizeType = {
    SMALL: 'small',
    MEDIUM: 'medium',
    LARGE: 'large',
} as const;

export const imageSrcs = [
    { alias: 'title', src: '/assets/title.png' },
    { alias: 'background', src: 'assets/background.jpg' },
    { alias: 'menu_background', src: 'assets/menu_background.jpeg' },
    { alias: 'base', src: 'assets/base.png' },
    { alias: 'bear', src: 'assets/bear.png' },
    { alias: 'butterfly_large', src: 'assets/butterfly_large.png' },
    { alias: 'butterfly_medium', src: 'assets/butterfly_medium.png' },
    { alias: 'butterfly_small', src: 'assets/butterfly_small.png' },
    { alias: 'leaf', src: 'assets/leaf.png' },
    { alias: 'leaf1', src: 'assets/leaf1.png' },
    { alias: 'leaf2', src: 'assets/leaf2.png' },
    { alias: 'leaf3', src: 'assets/leaf3.png' },
    { alias: 'leaf4', src: 'assets/leaf4.png' },
    { alias: 'leaf5', src: 'assets/leaf5.png' },
    { alias: 'leaf6', src: 'assets/leaf6.png' },
    { alias: 'leaf7', src: 'assets/leaf7.png' },
    { alias: 'moon', src: 'assets/moon.png' },
    { alias: 'pencil', src: 'assets/pencil.png' },
    { alias: 'sticky', src: 'assets/sticky.png' },
    { alias: 'sun', src: 'assets/sun.png' },
    { alias: 'sunset_spritesheet', src: 'assets/sunset.json' },
    { alias: 'sunset',src: 'assets/sunset.png' },
]