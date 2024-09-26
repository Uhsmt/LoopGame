var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as PIXI from 'pixi.js';
import { imageSrcs } from './utils/Const';
import { GameStateManager } from './scenes/GameStateManager';
import { StartState } from './scenes/StartState';
const app = new PIXI.Application();
window.addEventListener('load', () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Loading assets...');
    yield app.init({
        width: 800,
        height: 600,
        backgroundColor: 0x000000,
        antialias: true
    });
    // Load bitmap font
    PIXI.Assets.load(imageSrcs).then(setUp);
}));
function setUp() {
    return __awaiter(this, void 0, void 0, function* () {
        const appView = app.canvas;
        if (appView) {
            document.getElementById('mainCanvas').appendChild(appView);
            document.getElementById('loading').style.display = 'none';
            const manager = new GameStateManager(app);
            const startState = new StartState(manager);
            manager.setState(startState);
            app.ticker.add((deltaTime) => {
                manager.update(app.ticker.deltaMS);
                manager.render();
            });
        }
    });
}
//# sourceMappingURL=game.js.map