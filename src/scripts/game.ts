import * as PIXI from 'pixi.js';

const imageSrcs = [
    { alias: 'title', src: '/assets/title.png' },
    // { alias: 'background', src: 'assets/background.jpg' },
    // { alias: 'background', src: 'assets/background.png' },
    // { alias: 'base', src: 'assets/base.png' },
    // { alias: 'bear', src: 'assets/bear.png' },
    // { alias: 'butterfly_large', src: 'assets/butterfly_large.png' },
    // { alias: 'butterfly_medium', src: 'assets/butterfly_medium.png' },
    // { alias: 'butterfly_small', src: 'assets/butterfly_small.png' },
    // { alias: 'leaf', src: 'assets/leaf.png' },
    // { alias: 'leaf1', src: 'assets/leaf1.png' },
    // { alias: 'leaf2', src: 'assets/leaf2.png' },
    // { alias: 'leaf3', src: 'assets/leaf3.png' },
    // { alias: 'leaf4', src: 'assets/leaf4.png' },
    // { alias: 'leaf5', src: 'assets/leaf5.png' },
    // { alias: 'leaf6', src: 'assets/leaf6.png' },
    // { alias: 'leaf7', src: 'assets/leaf7.png' },
    // { alias: 'moon', src: 'assets/moon.png' },
    // { alias: 'pencil', src: 'assets/pencil.png' },
    // { alias: 'sticky', src: 'assets/sticky.png' },
    // { alias: 'sun', src: 'assets/sun.png' },
    // { alias: 'sunset', src: 'assets/sunset.gif' },
    // { alias: 'sunset', src: 'assets/sunset.json' },
    // { alias: 'sunset',src: 'assets/sunset.png' },
]

window.addEventListener('load', () => {
    console.log("test");
    PIXI.Assets.load(imageSrcs).then(setUp)
})

async function setUp() {
    console.log("setUp");
    const app = new PIXI.Application();
    await app.init({ 
        width: 700,
        height: 500,
        backgroundColor: 0xffffff,
        antialias: true
     });
}