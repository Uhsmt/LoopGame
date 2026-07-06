import * as PIXI from "pixi.js";
import { imageSrcs, seSrcs } from "./utils/Const";
import { AudioManager } from "./utils/AudioManager";
import { GameStateManager } from "./scenes/GameStateManager";
import { StartState } from "./scenes/StartState";
import { ResponsiveCanvas } from "./utils/ResponsiveCanvas";
import { TouchHandler } from "./utils/TouchHandler";
import { LandscapePrompt } from "./utils/LandscapePrompt";
import { isMobileDevice } from "./utils/MobileDetection";

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
// Mobile-only helpers; kept referenced so they can be destroyed if teardown is added
let responsiveCanvas: ResponsiveCanvas | null = null;
let touchHandler: TouchHandler | null = null;
let landscapePrompt: LandscapePrompt | null = null;

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
    s.parentNode?.insertBefore(wf, s);
})();
/* eslint-enabled */
window.WebFontConfig = {
    google: {
        families: [
            "BIZ+UDGothic:wght@400;700",
            "Rajdhani:wght@700",
            "Palette+Mosaic",
        ],
    },
    active() {
        console.log("font loaded");
    },
};

window.addEventListener("load", async () => {
    const isMobile = isMobileDevice();

    // Always render at the design resolution; on mobile the canvas is
    // scaled down visually via CSS by ResponsiveCanvas, so game code can
    // keep positioning against app.screen (850x650)
    await app.init({
        width: 850,
        height: 650,
        backgroundColor: 0xffd700,
        antialias: true,
    });

    // ブラウザの自動再生制限: 最初の操作でオーディオを解禁する
    window.addEventListener(
        "pointerdown",
        () => {
            AudioManager.shared.unlock();
        },
        { once: true },
    );
    // SEの読み込みは起動をブロックしない
    void AudioManager.shared.loadSe(seSrcs);

    const mainCanvas = document.getElementById("mainCanvas");
    if (mainCanvas) {
        mainCanvas.appendChild(app.canvas);
    }

    if (isMobile) {
        responsiveCanvas = new ResponsiveCanvas(app, app.canvas, {
            scaleMode: "fit",
            targetAspectRatio: 850 / 650,
            baseWidth: 850,
            baseHeight: 650,
        });
        responsiveCanvas.init();

        landscapePrompt = new LandscapePrompt();
        landscapePrompt.init();

        touchHandler = new TouchHandler(app.canvas, {
            enableMouseEmulation: false,
        });
        touchHandler.init();
    }

    try {
        await PIXI.Assets.load(imageSrcs);
        setUp();
    } catch (error) {
        console.error("Failed to load game assets:", error);
        const loading = document.getElementById("loading");
        if (loading) {
            loading.textContent =
                "Failed to load the game. Please reload the page.";
        }
    }
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
    // app.init()完了後なのでcanvasは必ず存在する
    app.canvas.id = "app";

    const loading = document.getElementById("loading");
    if (loading) {
        loading.style.display = "none";
    }

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
