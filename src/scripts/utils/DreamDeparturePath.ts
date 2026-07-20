/**
 * 夢(ボーナス)へ誘うスペシャル標本の旅立ちモーションを計算する、
 * PIXIに依存しない純粋なステッパー。
 *
 * 「ピン留め位置でブルブルと震える → ピンが外れて、画面上方向へ
 * ふら〜と蛇行しながら飛び去る → 画面外に抜けたら完了」という一連の
 * 動きを、経過時間ベースのパラメトリックな座標として毎フレーム計算する。
 *
 * - trembling: ピン留め位置を中心に、微小な高周波の揺れを乗せる
 *   (ピンから抜けようともがいている感じ)。飛び立ちはしない
 * - departing: 画面の左半分にいれば右上へ、右半分にいれば左上へ向かう。
 *   速さは出だしだけ滑らかに立ち上げ(いきなり最高速で飛ばない)、
 *   進行方向と直交するサイン波の揺れを重ねることで「ふら〜と」した
 *   蛇行になる。画面外(余白込み)に抜けたら done
 *
 * ResultStateはPIXI.Tickerからdelta駆動でstep()を呼び、返る座標を
 * 標本コンテナへ反映する。ロジックをここに切り出すことで、Tickerや
 * モックに依存せず単体テストで軌道の性質(震えの範囲・退場方向・
 * 画面外への到達)を検証できる。
 */

function smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

export type DreamDepartureMode = "trembling" | "departing";

export interface DreamDeparturePathOptions {
    /** ピン留めされていた位置(=旅立ちの起点) */
    startX: number;
    startY: number;
    screenWidth: number;
    screenHeight: number;
    /** ピンから抜けるまでの震え時間(ms) */
    trembleDurationMs?: number;
    /** 震えの振幅(px)。微小に留める */
    trembleAmplitude?: number;
    /** 巡航の速さ(px/ms) */
    speedPerMs?: number;
    /** 出だしの加速にかける時間(ms) */
    easeInMs?: number;
    /** 蛇行(サイン波)の振幅(px) */
    swayAmplitude?: number;
    /** 蛇行1往復の周期(ms) */
    swayPeriodMs?: number;
    /** 退場完了(画面外)と判定する余白(px) */
    exitScreenMargin?: number;
}

export class DreamDeparturePath {
    private readonly startX: number;
    private readonly startY: number;
    private readonly screenWidth: number;
    private readonly screenHeight: number;
    private readonly trembleDurationMs: number;
    private readonly trembleAmplitude: number;
    private readonly speedPerMs: number;
    private readonly easeInMs: number;
    private readonly swayAmplitude: number;
    private readonly swayPeriodMs: number;
    private readonly exitScreenMargin: number;
    /** 退場方向の単位ベクトル。左半分なら右上、右半分なら左上 */
    private readonly exitDirX: number;
    private readonly exitDirY: number;

    private elapsedMs = 0;
    private departElapsedMs = 0;
    private distance = 0;
    private _mode: DreamDepartureMode = "trembling";
    private _x: number;
    private _y: number;
    private _done = false;

    constructor(options: DreamDeparturePathOptions) {
        this.startX = options.startX;
        this.startY = options.startY;
        this.screenWidth = options.screenWidth;
        this.screenHeight = options.screenHeight;
        this.trembleDurationMs = options.trembleDurationMs ?? 700;
        this.trembleAmplitude = options.trembleAmplitude ?? 1.5;
        this.speedPerMs = options.speedPerMs ?? 0.175;
        this.easeInMs = options.easeInMs ?? 600;
        this.swayAmplitude = options.swayAmplitude ?? 26;
        this.swayPeriodMs = options.swayPeriodMs ?? 1300;
        this.exitScreenMargin = options.exitScreenMargin ?? 90;

        // 画面の左半分にピン留めされていれば右上へ、右半分なら左上へ。
        // やや横方向優位の斜め上(勾配~0.55)で、蝶らしい抜け方にする
        const horizontal = this.startX < this.screenWidth / 2 ? 1 : -1;
        const len = Math.hypot(1, 0.55);
        this.exitDirX = horizontal / len;
        this.exitDirY = -0.55 / len;

        this._x = this.startX;
        this._y = this.startY;

        if (this.trembleDurationMs <= 0) {
            this._mode = "departing";
        }
    }

    get x(): number {
        return this._x;
    }

    get y(): number {
        return this._y;
    }

    get mode(): DreamDepartureMode {
        return this._mode;
    }

    /** 画面外まで抜けきったら true */
    get done(): boolean {
        return this._done;
    }

    /** deltaMS分だけ進める。画面外(余白込み)に抜けたら done が true になる */
    step(deltaMS: number): void {
        if (this._done) return;
        this.elapsedMs += deltaMS;

        if (this._mode === "trembling") {
            if (this.elapsedMs >= this.trembleDurationMs) {
                this._mode = "departing";
                this._x = this.startX;
                this._y = this.startY;
                return;
            }
            // 高周波(周期~70ms)の微小な揺れ。x/yで周波数と位相をずらして
            // 単調な振動に見えないようにする
            this._x =
                this.startX +
                Math.sin(this.elapsedMs * 0.09) * this.trembleAmplitude;
            this._y =
                this.startY +
                Math.sin(this.elapsedMs * 0.07 + 1.3) *
                    this.trembleAmplitude *
                    0.6;
            return;
        }

        this.departElapsedMs += deltaMS;
        // 出だしは滑らかに加速する(ピンから抜けた直後にいきなり最高速で
        // 飛ばず、ふわっと浮き上がる)
        const speedRamp = smoothstep(0, this.easeInMs, this.departElapsedMs);
        this.distance += this.speedPerMs * speedRamp * deltaMS;

        // 進行方向と直交する向きにサイン波を重ねて「ふら〜と」した蛇行に
        // する。蛇行も出だしは抑えて、飛び始めてから徐々に大きくする
        const swayRamp = Math.min(1, this.departElapsedMs / 1000);
        const sway =
            Math.sin((this.departElapsedMs / this.swayPeriodMs) * 2 * Math.PI) *
            this.swayAmplitude *
            swayRamp;
        const perpX = -this.exitDirY;
        const perpY = this.exitDirX;

        this._x = this.startX + this.exitDirX * this.distance + perpX * sway;
        this._y = this.startY + this.exitDirY * this.distance + perpY * sway;

        const margin = this.exitScreenMargin;
        if (
            this._x < -margin ||
            this._x > this.screenWidth + margin ||
            this._y < -margin ||
            this._y > this.screenHeight + margin
        ) {
            this._done = true;
        }
    }
}
