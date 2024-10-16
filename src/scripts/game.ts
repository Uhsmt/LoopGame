import * as PIXI from "pixi.js";
import { imageSrcs } from "./utils/Const";
import { GameStateManager } from "./scenes/GameStateManager";
import { StartState } from "./scenes/StartState";

interface WebFontConfig {
    google: {
        families: string[];
    };
    active(): void;
}

declare global {
    interface Window {
        WebFontConfig: WebFontConfig;
    }
}

const app = new PIXI.Application();

function isMobileDevice(): boolean {
    const userAgent = navigator.userAgent || navigator.vendor;
    return /android/i.test(userAgent) || /iPad|iPhone|iPod/.test(userAgent);
}

function showMobileMessage(): void {
    alert("Sorry! This game is for PC only. Smartphone ver is coming soon!");
}

/* eslint-disable */
// include the web-font loader script
(function () {
    const wf = document.createElement("script");
    wf.src = `${
        document.location.protocol === "https:" ? "https" : "http"
    }://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js`;
    wf.type = "text/javascript";
    wf.async = true;
    const s = document.getElementsByTagName("script")[0];
    s.parentNode!.insertBefore(wf, s);
})();
/* eslint-enabled */
window.WebFontConfig = {
    google: {
        families: ["BIZ+UDGothic:wght@400;700", "Rajdhani:wght@700"],
    },
    active() {
        console.log("font loaded");
    },
};

window.addEventListener("load", async () => {
    if (isMobileDevice()) {
        showMobileMessage();
        return;
    }
    await app.init({
        width: 850,
        height: 650,
        backgroundColor: 0xffd700,
        antialias: true,
    });
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
        const cursorIcon = `url(\'${BASE_URL}assets/pencil.png\'),auto`;
        app.renderer.events.cursorStyles.default = cursorIcon;
    }
}
