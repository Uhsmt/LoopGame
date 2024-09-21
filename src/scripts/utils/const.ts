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
