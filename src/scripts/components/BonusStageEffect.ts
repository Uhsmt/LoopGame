import * as PIXI from "pixi.js";
import * as Const from "../utils/Const";
import { SparkleEmitter } from "./SparkleEmitter";
import { t, getLang } from "../utils/Language";

/**
 * ボーナスステージ導入演出の進行フェーズ。
 * idle -> intro -> playing (ゲーム本編)
 */
export type BonusEffectPhase = "idle" | "intro" | "playing";

/**
 * ボーナスステージの「夢への誘い」導入演出を担う独立コンポーネント。
 *
 * スペシャル蝶に導かれて不思議な夢へ入っていくイメージ。
 * 「BONUS STAGE!」のような弾む祝祭バナーではなく、静かな誘いの
 * メッセージ(bonus.invitation)をふわりとフェードイン/フェードアウトさせる。
 * きらめきも金のギラつきを避け、淡い夢の色をまばらに漂わせるだけにする。
 *
 * 演出は delta(経過ミリ秒)ベースで駆動し、フレームレートに依存しない。
 * フェーズ遷移は update() のみで進み、外部からは phase で観測できる。
 * ゲーム本編の開始トリガは consumeIntroComplete() で1度だけ取得する。
 *
 * NOTE: 「夢から覚める」明転演出はボーナスのリザルト(ResultState)側が
 * 担うため、このコンポーネントに終了(outro)フェーズは持たせない。
 */
export class BonusStageEffect extends PIXI.Container {
    // 静かな誘い。急がずに読める長さ(約3秒)
    static readonly INTRO_DURATION_MS = 3000;
    // きらめきをまばらに漂わせる間隔(ミリ秒)
    private static readonly SPARKLE_INTERVAL_MS = 260;
    // 1回あたりのきらめき数(控えめ)
    private static readonly SPARKLE_BATCH = 2;

    private _phase: BonusEffectPhase = "idle";
    private elapsed = 0;
    private sparkleTimer = 0;
    private introCompleteConsumed = false;

    private readonly screenWidth: number;
    private readonly screenHeight: number;
    private readonly sparkles: SparkleEmitter;
    // 不思議な夢の色(淡い白〜青紫)。金のギラつきは使わない
    private readonly tints = [0xffffff, 0xd8e6ff, 0xcbb8ff];
    private readonly message: PIXI.BitmapText;

    constructor(
        screenWidth: number,
        screenHeight: number,
        sparkles: SparkleEmitter,
        fontColor: number = 0xffffff,
    ) {
        super();
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
        this.sparkles = sparkles;

        const isJa = getLang() === "ja";
        this.message = new PIXI.BitmapText({
            text: t("bonus.invitation"),
            style: new PIXI.TextStyle({
                fontFamily: isJa ? Const.FONT_JAPANESE : Const.FONT_ENGLISH,
                fontWeight: isJa
                    ? Const.FONT_JAPANESE_BOLD
                    : Const.FONT_ENGLISH_BOLD,
                fontSize: 40,
                fill: fontColor,
                align: "center",
            }),
        });
        this.message.anchor.set(0.5);
        this.message.x = screenWidth / 2;
        this.message.y = screenHeight / 2;
        this.message.alpha = 0;
        this.addChild(this.message);
    }

    get phase(): BonusEffectPhase {
        return this._phase;
    }

    /** 導入演出を開始する */
    startIntro(): void {
        this.elapsed = 0;
        this.sparkleTimer = 0;
        this.message.alpha = 0;
        this._phase = "intro";
    }

    /**
     * 導入演出が完了した瞬間に一度だけ true を返す(ゲーム本編の開始トリガ)。
     * ポーリングで消費するのでフレームの取りこぼしがない
     */
    consumeIntroComplete(): boolean {
        if (this._phase === "playing" && !this.introCompleteConsumed) {
            this.introCompleteConsumed = true;
            return true;
        }
        return false;
    }

    /** 毎フレーム呼ぶ(deltaMS: 経過ミリ秒) */
    update(deltaMS: number): void {
        if (this._phase !== "intro") return;

        this.elapsed += deltaMS;
        const t = Math.min(
            1,
            this.elapsed / BonusStageEffect.INTRO_DURATION_MS,
        );

        // 静かに浮かび上がって(前半30%)、しばらく留まり、後半20%で消える。
        // 弾む easeOutBack は使わず、アルファのみでやさしく出し入れする
        const fadeIn = Math.min(1, t / 0.3);
        const fadeOut = t > 0.8 ? (t - 0.8) / 0.2 : 0;
        this.message.alpha = Math.max(0, Math.min(fadeIn, 1 - fadeOut));

        // 夢の色のきらめきをまばらに漂わせる
        this.sparkleTimer += deltaMS;
        while (this.sparkleTimer >= BonusStageEffect.SPARKLE_INTERVAL_MS) {
            this.sparkleTimer -= BonusStageEffect.SPARKLE_INTERVAL_MS;
            this.emitDreamSparkle();
        }

        if (this.elapsed >= BonusStageEffect.INTRO_DURATION_MS) {
            this.message.alpha = 0;
            this._phase = "playing";
        }
    }

    /** 画面のあちこちから淡いきらめきをふわりと落とす */
    private emitDreamSparkle(): void {
        const x = this.screenWidth * (0.15 + Math.random() * 0.7);
        const y = this.screenHeight * (0.2 + Math.random() * 0.4);
        this.sparkles.shower(x, y, BonusStageEffect.SPARKLE_BATCH, {
            tints: this.tints,
            scale: 0.7,
        });
    }
}
