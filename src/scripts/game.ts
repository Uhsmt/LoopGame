import * as PIXI from 'pixi.js';
import { imageSrcs } from './utils/Const';
import { GameStateManager } from './scenes/GameStateManager';
import { StartState } from './scenes/StartState';

const app = new PIXI.Application();

window.addEventListener('load', async () => {
    await app.init({ 
        width: 800,
        height: 600,
        backgroundColor: 0xfefff1,
        antialias: true
    }); 
    // Load bitmap font
    PIXI.Assets.load(imageSrcs).then(setUp);
})

document.addEventListener('DOMContentLoaded', function() {
    var baseUrl = BASE_URL;
    const images = document.querySelectorAll('img');
    images.forEach((image) => {
        const img = image as HTMLImageElement;
        img.src = baseUrl + img.getAttribute('src');
    });
});

async function setUp() {
    const appView = app.canvas as HTMLCanvasElement | null
    appView!.id = 'app';
    if (appView) {
        document.getElementById('mainCanvas')!.appendChild(appView);
        document.getElementById('loading')!.style.display = 'none';
        
        const manager = new GameStateManager(app);
        const startState = new StartState(manager);
        manager.setState(startState);

        app.ticker.add((deltaTime) => {
            manager.update(app.ticker.deltaMS);
            manager.render();
        });
        // カーソルのスタイルを変更
        const cursorIcon = `url(\'${BASE_URL}assets/pencil.png\'),auto`;
        app.renderer.events.cursorStyles.default = cursorIcon;        
    }
}