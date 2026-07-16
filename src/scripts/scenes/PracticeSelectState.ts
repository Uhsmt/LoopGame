import * as PIXI from "pixi.js";
import { GameStateManager } from "./GameStateManager";
import { AudioManager } from "../utils/AudioManager";
import { LineDrawer } from "../components/LineDrawer";
import * as Const from "../utils/Const";
import { StateBase } from "./BaseState";
import { Button } from "../components/Button";
import { StartState } from "./StartState";
import { GameplayState } from "./GameplayState";
import { StageInformation } from "../components/StageInformation";
import { t, getLang } from "../utils/Language";
import { getMaxLevel, getReachedBonusLevels } from "../utils/ScoreStorage";
import {
    selectDisplayStages,
    PracticeStageEntry,
} from "../utils/PracticeStages";

/** ステージ選択ボタン1つ分の表示要素 */
interface StageButtonEntry {
    entry: PracticeStageEntry;
    button: Button;
}

// ボーナスステージの葉は、他が緑一色の中で「紅葉した葉っぱ」のように
// ひと目でわかるよう区別する。通常の "leaf" テクスチャは絵柄自体が暗めの
// 緑のため乗算tintでは明るい色を出せない(butterfly_*が白地の絵柄で
// tintをそのまま発色させているのと対照的)。そのため白抜きの
// "leaf_white" を使い、butterflyと同じ要領で好きな色を乗せる
/** ボーナスステージボタンの葉のtint(紅葉のような赤〜オレンジ) */
const BONUS_BUTTON_TINT = 0xe8590c;

/**
 * プラクティスモードのステージ選択画面。
 * 到達済みのレベル(+到達済みボーナスステージ)を葉っぱボタンのグリッドで
 * 表示し、他の画面と同じく「ループで囲んで選ぶ」操作でステージを選択する。
 * ここから開始したステージは isPractice=true となり、記録・スコアは保存されない。
 */
export class PracticeSelectState extends StateBase {
    /** グリッドの列数 */
    private static readonly GRID_COLUMNS = 6;
    /** グリッドの行数 */
    private static readonly GRID_ROWS = 3;
    /** 表示するステージ数の上限(列数×行数) */
    static readonly MAX_STAGE_COUNT =
        PracticeSelectState.GRID_COLUMNS * PracticeSelectState.GRID_ROWS;

    private lineDrawer: LineDrawer;
    private backgroundSprite: PIXI.Sprite;
    private title: PIXI.Text;
    private backButton: Button;
    private stageButtons: StageButtonEntry[] = [];
    private emptyMessage: PIXI.Text | null = null;
    // 遷移開始後に多重選択されないようにするフラグ
    private isTransitioning: boolean = false;

    constructor(manager: GameStateManager) {
        super(manager);
        const app = manager.app;
        this.lineDrawer = new LineDrawer(app);

        // background
        this.backgroundSprite = new PIXI.Sprite(
            PIXI.Texture.from("menu_background"),
        );
        this.adjustBackGroundSprite(this.backgroundSprite);
        this.container.addChild(this.backgroundSprite);

        // title
        const isJa = getLang() === "ja";
        this.title = new PIXI.Text({
            text: t("practice.title"),
            style: {
                fontFamily: isJa ? Const.FONT_JAPANESE : Const.FONT_ENGLISH,
                fontWeight: (isJa
                    ? Const.FONT_JAPANESE_BOLD
                    : Const.FONT_ENGLISH_BOLD) as PIXI.TextStyleFontWeight,
                fontSize: isJa ? 42 : 48,
                fill: "#e0ffff",
                align: "center",
            },
        });
        this.title.anchor.set(0.5);
        this.title.x = app.screen.width / 2;
        this.title.y = app.screen.height * 0.14;
        this.container.addChild(this.title);

        // back button (画面下中央。グリッド最下段と干渉しない位置)
        this.backButton = new Button(
            t("button.back"),
            app.screen.width / 2,
            app.screen.height * 0.87,
        );
        this.backButton.scale.set(0.6);
        this.container.addChild(this.backButton);

        // Frame
        this.addFrameGraphic();
    }

    onEnter(): void {
        AudioManager.shared.playBgm(Const.bgmSrcs.title);

        this.lineDrawer.on(
            "loopAreaCompleted",
            this.handleLoopAreaCompleted.bind(this),
        );

        const entries = selectDisplayStages(
            getMaxLevel(),
            getReachedBonusLevels(),
            PracticeSelectState.MAX_STAGE_COUNT,
        );

        if (entries.length === 0) {
            this.buildEmptyMessage();
        } else {
            this.buildStageGrid(entries);
        }
    }

    update(): void {
        // 静的な選択画面なのでフレーム更新処理は無い
    }

    render(): void {
        // 描画はPixiJSがハンドルするのでここでは何もしない
    }

    onExit(): void {
        this.manager.app.stage.removeChild(this.container);
        this.container.destroy();

        if (this.lineDrawer) {
            // 次のフレームのレンダリングが完了した後にクリーンアップ処理を行う
            this.manager.app.ticker.addOnce(() => {
                this.lineDrawer.cleanup();
            });
        }
    }

    /** まだ一度も遊んでいないプレイヤー向けの案内メッセージを表示する */
    private buildEmptyMessage(): void {
        const isJa = getLang() === "ja";
        this.emptyMessage = new PIXI.Text({
            text: t("practice.empty"),
            style: {
                fontFamily: isJa ? Const.FONT_JAPANESE : Const.FONT_ENGLISH,
                fontWeight: (isJa
                    ? Const.FONT_JAPANESE_BOLD
                    : Const.FONT_ENGLISH_BOLD) as PIXI.TextStyleFontWeight,
                fontSize: 28,
                fill: "#ffffff",
                align: "center",
            },
        });
        this.emptyMessage.anchor.set(0.5);
        this.emptyMessage.x = this.manager.app.screen.width / 2;
        this.emptyMessage.y = this.manager.app.screen.height * 0.45;
        this.addChildBelowFrame(this.emptyMessage);
    }

    /**
     * 到達済みステージのボタンをグリッドで並べる。
     * 各行は中央寄せにし、ループ選択で隣のボタンを誤って囲まないよう
     * ボタン(scale 0.5)の当たり判定円より十分広い間隔をとる。
     */
    private buildStageGrid(entries: PracticeStageEntry[]): void {
        const width = this.manager.app.screen.width;
        const height = this.manager.app.screen.height;
        const colSpacing =
            (width - Const.MARGIN * 2) / PracticeSelectState.GRID_COLUMNS;
        const gridTop = height * 0.32;
        const rowGap = height * 0.17;

        entries.forEach((entry, index) => {
            const row = Math.floor(index / PracticeSelectState.GRID_COLUMNS);
            const col = index % PracticeSelectState.GRID_COLUMNS;
            // その行に実際に並ぶボタン数(最終行は少ないことがある)で中央寄せする
            const rowCount = Math.min(
                entries.length - row * PracticeSelectState.GRID_COLUMNS,
                PracticeSelectState.GRID_COLUMNS,
            );
            const x = width / 2 + (col - (rowCount - 1) / 2) * colSpacing;
            const y = gridTop + row * rowGap;

            // ボーナスステージは同じレベル数字の通常ステージと並ぶと見分けづらいため、
            // ラベルを数字ではなく「ボーナス」にし、白抜きの葉(leaf_white)に
            // 紅葉のようなtintを乗せて区別する
            const label = entry.isBonus
                ? t("practice.bonusLabel")
                : String(entry.level);
            const button = entry.isBonus
                ? new Button(label, x, y, "leaf_white")
                : new Button(label, x, y);
            button.scale.set(0.5);
            if (entry.isBonus) {
                button.setTint(BONUS_BUTTON_TINT);
            }
            this.addChildBelowFrame(button);

            this.stageButtons.push({ entry, button });
        });
    }

    // LineDrawerのループエリアが完成したときのハンドラ
    private handleLoopAreaCompleted(loopArea: PIXI.Graphics): void {
        if (this.isTransitioning) {
            return;
        }

        if (this.backButton.isHit(loopArea)) {
            AudioManager.shared.playSe("se_select");
            this.backButton.selected();
            this.onBackSelected().catch((error: unknown) => {
                console.error("Failed to go back to the start menu:", error);
            });
            return;
        }

        const hit = this.stageButtons.find(({ button }) =>
            button.isHit(loopArea),
        );
        if (hit) {
            AudioManager.shared.playSe("se_select");
            hit.button.selected();
            this.onStageSelected(hit).catch((error: unknown) => {
                console.error("Failed to start practice stage:", error);
            });
        }
    }

    /** 選択したステージへ(記録を残さないプラクティス扱いで)遷移する */
    private async onStageSelected(selected: StageButtonEntry): Promise<void> {
        this.isTransitioning = true;

        // ゲーム画面の背景を下に敷いてクロスフェードする(StartStateと同じ演出)
        const nextBGSprite = new PIXI.Sprite(PIXI.Texture.from("background"));
        this.adjustBackGroundSprite(nextBGSprite);
        this.container.addChildAt(nextBGSprite, 0);

        const others: PIXI.Container[] = [this.title, this.backButton];
        this.stageButtons.forEach(({ button }) => {
            if (button !== selected.button) {
                others.push(button);
            }
        });

        await Promise.all([
            ...others.map((target) => this.fadeOut(target, 0.05)),
            this.wait(300).then(() => {
                return this.fadeOut(selected.button, 0.05);
            }),
            this.wait(300).then(() => {
                return this.fadeOut(this.backgroundSprite, 0.05);
            }),
        ]);

        const stageInfo = new StageInformation(selected.entry.level);
        stageInfo.isPractice = true;
        if (selected.entry.isBonus) {
            stageInfo.bonusStage();
        }
        this.manager.setState(new GameplayState(this.manager, stageInfo));
    }

    /** スタート画面に戻る */
    private async onBackSelected(): Promise<void> {
        this.isTransitioning = true;

        const targets: PIXI.Container[] = [this.title];
        this.stageButtons.forEach(({ button }) => {
            targets.push(button);
        });
        if (this.emptyMessage) {
            targets.push(this.emptyMessage);
        }

        await Promise.all([
            ...targets.map((target) => this.fadeOut(target, 0.05)),
            this.wait(300).then(() => {
                return this.fadeOut(this.backButton, 0.05);
            }),
        ]);
        this.manager.setState(new StartState(this.manager));
    }
}
