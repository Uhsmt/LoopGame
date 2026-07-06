import * as PIXI from "pixi.js";
import { imageSrcs, seSrcs } from "./utils/Const";
import { AudioManager } from "./utils/AudioManager";
import { getMuted, setMuted } from "./utils/SettingsStorage";
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

    // SEの読み込みは起動をブロックしない
    void AudioManager.shared.loadSe(seSrcs);
    setupMuteButton();

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
        // タイトル画面を裏で起動してからゲートを被せる(操作はゲートが遮る)
        setUp();
        await waitForTapToStart();
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

/**
 * Click / Tap to Start ゲート。
 * ユーザー操作を1回保証することで、ブラウザの自動再生制限を確実に解除する
 * (このゲームはマウス移動だけで遊べるため、これがないと無音のままになり得る)
 */
function waitForTapToStart(): Promise<void> {
    return new Promise((resolve) => {
        const loading = document.getElementById("loading");
        if (loading) {
            loading.style.display = "none";
        }
        const gate = document.getElementById("tapToStart");
        if (!gate) {
            resolve();
            return;
        }
        gate.classList.remove("hidden");
        // 注意: タッチでは pointerdown 時点だと「ユーザー操作」として
        // 認定されず音声を解禁できない(Android Chrome等)。click は
        // touchend 後に発火し、マウス/タッチ両方で確実に操作認定される
        gate.addEventListener(
            "click",
            () => {
                AudioManager.shared.unlock();
                gate.classList.add("hidden");
                resolve();
            },
            { once: true },
        );
        // 保険: 解禁に失敗した場合に備えて、以降のクリック/タップでも再試行する
        const retryUnlock = () => {
            AudioManager.shared.unlock();
        };
        document.addEventListener("click", retryUnlock);
        document.addEventListener("touchend", retryUnlock);
    });
}

function setupMuteButton(): void {
    const button = document.getElementById("muteButton");
    if (!button) {
        return;
    }
    const icon = button.querySelector("i");
    const apply = (muted: boolean) => {
        AudioManager.shared.setMuted(muted);
        if (icon) {
            icon.className = muted ? "fa fa-volume-off" : "fa fa-volume-up";
        }
    };
    apply(getMuted());
    button.addEventListener("click", () => {
        const muted = !AudioManager.shared.isMuted();
        setMuted(muted);
        apply(muted);
    });
}

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
