import * as PIXI from "pixi.js";
import { imageSrcs } from "./utils/Const";
import { GameStateManager } from "./scenes/GameStateManager";
import { StartState } from "./scenes/StartState";

const app = new PIXI.Application();


function isMobileDevice(): boolean {
    const userAgent = navigator.userAgent || navigator.vendor;
    return /android/i.test(userAgent) || /iPad|iPhone|iPod/.test(userAgent);
}

function showMobileMessage(): void {
    alert("Sorry! This game is for PC only. Smartphone ver is coming soon!");
}


// eslint-disable-next-line @typescript-eslint/no-misused-promises
window.addEventListener("load", async () => {
    if (isMobileDevice()) {
        showMobileMessage();
        return;
    }
    await app.init({
        width: 800,
        height: 600,
        backgroundColor: 0xfefff1,
        antialias: true,
    });
    // Load bitmap font
    await PIXI.Assets.load(imageSrcs).then(setUp);
});

document.addEventListener("DOMContentLoaded", function () {
    const baseUrl = BASE_URL;
    const images = document.querySelectorAll("img");
    images.forEach((image) => {
        const img = image;
        img.src = baseUrl + img.getAttribute("src");
    });
});

function setUp() {
    const appView = app.canvas as HTMLCanvasElement | null;
    appView!.id = "app";
    if (appView) {
        document.getElementById("mainCanvas")!.appendChild(appView);
        document.getElementById("loading")!.style.display = "none";

        const manager = new GameStateManager(app);
        const startState = new StartState(manager);
        manager.setState(startState);

        app.ticker.add(() => {
            manager.update(app.ticker.deltaMS);
            manager.render();
        });
        // カーソルのスタイルを変更
        // eslint-disable-next-line no-useless-escape
        const cursorIcon = `url(\'${BASE_URL}assets/pencil.png\'),auto`;
        app.renderer.events.cursorStyles.default = cursorIcon;
    }
}