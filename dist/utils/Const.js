/* eslint @typescript-eslint/no-namespace: 0 */
export var myConsts;
(function (myConsts) {
    myConsts.BUTTERFLY_WIDTH = 260;
    myConsts.BUTTERFLY_HEIGHT = 256;
    myConsts.FLAP_DURATION = 12;
    myConsts.COLOR_LIST = [
        0xFFD700,
        0xff69b4,
        0xDC143C,
        0x6A5ACD,
        0xadff2f // greenyellow
    ];
})(myConsts || (myConsts = {}));
export const ButterflySizeType = {
    SMALL: 'small',
    MEDIUM: 'medium',
    LARGE: 'large',
};
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
    { alias: 'sunset', src: 'assets/sunset.png' },
];
//# sourceMappingURL=Const.js.map