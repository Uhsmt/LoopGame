import * as PIXI from "pixi.js";
import * as Const from "../utils/Const";
import { SparkleEmitter } from "./SparkleEmitter";

/**
 * ボーナスステージ演出の進行フェーズ。
 * idle -> intro -> playing (ゲーム本編) -> outro -> done
 */
export type BonusEffectPhase = "idle" | "intro" | "playing" | "outro" | "done";

/**
 * ボーナスステージの導入・終了演出を担う独立コンポーネント。
 *
 * 祝祭感を出すためのタイトルテキスト(スケール/フェード)ときらめきを
 * delta(経過ミリ秒)ベースで駆動する。フレームレートに依存しないよう
 * すべて経過時間で判定し、フェーズ遷移は update() のみで進む。
 *
 * 演出中の状態は phase で外部から観測でき、
 * ゲーム本編の開始・リザルトへの遷移トリガは
 * consumeIntroComplete() / consumeOutroComplete() で1度だけ取得する。
 *
 * NOTE: キャラクターSprite(Issue #2)が用意できたら、
 * ここに登場アニメーションを差し込む想定。テキストと同じく
 * startIntro/startOutro でリセットし、update() 内で位置・アルファを
 * 進めれば既存フローに載せられる。
 */
export class BonusStageEffect extends PIXI.Container {
    // テンポを損なわないよう導入+終了で合計3.3秒程度に収める
    static readonly INTRO_DURATION_MS = 1800;
    static readonly OUTRO_DURATION_MS = 1500;
    // きらめきを撒く間隔(ミリ秒)
    private static readonly SPARKLE_INTERVAL_MS = 120;
    // 1回あたりのきらめき数
    private static readonly SPARKLE_BATCH = 5;

    private _phase: BonusEffectPhase = "idle";
    private elapsed = 0;
    private sparkleTimer = 0;
    private introCompleteConsumed = false;
    private outroCompleteConsumed = false;

    private readonly screenWidth: number;
    private readonly screenHeight: number;
    private readonly sparkles: SparkleEmitter;
    // 金色系のお祝いカラー
    private readonly tints = [0xffffff, 0xffe9a8, 0xffd700];
    private readonly title: PIXI.BitmapText;

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

        this.title = new PIXI.BitmapText({
            text: "BONUS STAGE!",
            style: new PIXI.TextStyle({
                fontFamily: Const.FONT_ENGLISH,
                fontWeight: Const.FONT_ENGLISH_BOLD,
                fontSize: 56,
                fill: fontColor,
                align: "center",
            }),
        });
        this.title.anchor.set(0.5);
        this.title.x = screenWidth / 2;
        this.title.y = screenHeight / 2;
        this.title.alpha = 0;
        this.title.scale.set(0.4);
        this.addChild(this.title);
    }

    get phase(): BonusEffectPhase {
        return this._phase;
    }

    /** 導入演出を開始する */
    startIntro(): void {
        this.resetForPlay("BONUS STAGE!", this.screenHeight / 2);
        this._phase = "intro";
    }

    /** 終了演出を開始する */
    startOutro(): void {
        // 中央には "Time's up!" 等が出るため、締めのバナーは上寄せにする
        this.resetForPlay("GREAT!", this.screenHeight * 0.3);
        this._phase = "outro";
    }

    private resetForPlay(text: string, y: number): void {
        this.elapsed = 0;
        this.sparkleTimer = 0;
        this.title.text = text;
        this.title.x = this.screenWidth / 2;
        this.title.y = y;
        this.title.alpha = 0;
        this.title.scale.set(0.4);
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

    /**
     * 終了演出が完了した瞬間に一度だけ true を返す(リザルト遷移トリガ)。
     */
    consumeOutroComplete(): boolean {
        if (this._phase === "done" && !this.outroCompleteConsumed) {
            this.outroCompleteConsumed = true;
            return true;
        }
        return false;
    }

    /** 毎フレーム呼ぶ(deltaMS: 経過ミリ秒) */
    update(deltaMS: number): void {
        if (this._phase === "intro") {
            this.advance(
                deltaMS,
                BonusStageEffect.INTRO_DURATION_MS,
                "playing",
            );
        } else if (this._phase === "outro") {
            this.advance(deltaMS, BonusStageEffect.OUTRO_DURATION_MS, "done");
        }
    }

    private advance(
        deltaMS: number,
        duration: number,
        next: BonusEffectPhase,
    ): void {
        this.elapsed += deltaMS;
        const t = Math.min(1, this.elapsed / duration);

        // 序盤でポップに登場(easeOutBack)、終盤でフェードアウト
        const appear = Math.min(1, t / 0.35);
        this.title.scale.set(0.4 + this.easeOutBack(appear) * 0.6);
        const fadeOut = t > 0.75 ? (t - 0.75) / 0.25 : 0;
        this.title.alpha = Math.min(appear, 1 - fadeOut);

        // 一定間隔できらめきを撒く
        this.sparkleTimer += deltaMS;
        while (this.sparkleTimer >= BonusStageEffect.SPARKLE_INTERVAL_MS) {
            this.sparkleTimer -= BonusStageEffect.SPARKLE_INTERVAL_MS;
            this.emitCelebration();
        }

        if (this.elapsed >= duration) {
            this.title.alpha = 0;
            this._phase = next;
        }
    }

    /** 画面上部の広い範囲からきらきらを舞い降らせる */
    private emitCelebration(): void {
        const x = this.screenWidth * (0.15 + Math.random() * 0.7);
        this.sparkles.shower(
            x,
            this.screenHeight * 0.25,
            BonusStageEffect.SPARKLE_BATCH,
            { tints: this.tints },
        );
    }

    private easeOutBack(x: number): number {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    }
}
