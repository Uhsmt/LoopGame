/**
 * 夢に誘う蝶(ResultStateの dreamButterfly)の振り付けモーションを計算する、
 * PIXIに依存しない純粋なステッパー。
 *
 * 「画面中央あたりに現れる → 軽く円を描く(だいたい1周) → そのまま同じ速さで
 * 画面外へ抜ける」という一連の動きを、進行方向を(接線方向, 半径方向)の
 * ブレンドとして毎フレーム計算することで作る。
 *
 * outwardness(0〜1)が「どれだけ半径方向(外向き)に進むか」を表す:
 * - 0 = 純粋な接線方向(真円)
 * - 1 = 純粋な半径方向(直進)
 * どのフェーズでも速さ(speedPerMs)は一定なので、速度そのものが変わって
 * 見えることはない(向きだけが滑らかに変化する)。
 *
 * - growing: 出現位置(中心付近)から円軌道の半径へ丸め込む。半径が目標半径に
 *   近づくほどoutwardnessを滑らかに0へ収束させるので、自然に純粋な円運動へ
 *   落ち着く
 * - holding: outwardness=0の純粋な円運動を約1周ぶん続ける
 * - exiting: outwardnessを0から目標値へ滑らかに立ち上げていく。円の接線
 *   方向を保ったまま半径方向の成分を少しずつ足していくため、円→退場の
 *   繋ぎが唐突な方向転換にならず、螺旋を広げるように自然に画面外へ抜けていく
 *
 * ResultStateはPIXI.Tickerからdelta駆動でstep()を呼び、返る座標を
 * butterflyへ反映する。ロジックをここに切り出すことで、Tickerやモックに
 * 依存せず単体テストで軌道の性質(速度一定・滑らかな旋回・画面外への到達)
 * を検証できる。
 */

function smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

export type DreamFlightMode = "growing" | "holding" | "exiting";

export interface DreamFlightPathOptions {
    centerX: number;
    centerY: number;
    screenWidth: number;
    screenHeight: number;
    /** 出現位置(中心からのオフセット、px) */
    spawnRadius?: number;
    /** 速さ(px/ms)。円を描いている間も退場中も常にこの速さを使う */
    speedPerMs?: number;
    /** 中央で円を描くときの半径(px) */
    loopRadius?: number;
    /** 出現直後、円軌道に丸め込むまでの外向き度合いの強さ(0〜1) */
    growOutwardness?: number;
    /** 中央での周回数(「1周程度」) */
    holdLaps?: number;
    /** 退場時、外向き度を0から目標値まで滑らかに立ち上げる距離(px) */
    exitRampDistance?: number;
    /** 退場が定常状態になったときの外向き度合い(1に近いほどほぼ直進) */
    exitOutwardness?: number;
    /** 退場完了(画面外)と判定する余白(px) */
    exitScreenMargin?: number;
}

/** small蝶(Butterfly.ts の xDiretion/yDiretion = 0.6)を参照した対角移動
 * 相当の速さ(px/ms)。演出としてキビキビ感を持たせるため1.8倍にしているが、
 * 従来の退場(約1100px/秒)のような爆速には程遠い */
export const DREAM_FLIGHT_DEFAULT_SPEED_PER_MS =
    (Math.hypot(0.6, 0.6) / 16) * 1.8;

export class DreamFlightPath {
    private readonly centerX: number;
    private readonly centerY: number;
    private readonly screenWidth: number;
    private readonly screenHeight: number;
    private readonly speedPerMs: number;
    private readonly loopRadius: number;
    private readonly growOutwardness: number;
    private readonly holdLaps: number;
    private readonly exitRampDistance: number;
    private readonly exitOutwardness: number;
    private readonly exitScreenMargin: number;

    private _mode: DreamFlightMode = "growing";
    private holdLapProgress = 0;
    private exitDistance = 0;
    private _x: number;
    private _y: number;
    private _done = false;

    constructor(options: DreamFlightPathOptions) {
        this.centerX = options.centerX;
        this.centerY = options.centerY;
        this.screenWidth = options.screenWidth;
        this.screenHeight = options.screenHeight;
        this.speedPerMs =
            options.speedPerMs ?? DREAM_FLIGHT_DEFAULT_SPEED_PER_MS;
        this.loopRadius = options.loopRadius ?? 50;
        this.growOutwardness = options.growOutwardness ?? 0.85;
        this.holdLaps = options.holdLaps ?? 1;
        this.exitRampDistance = options.exitRampDistance ?? 150;
        this.exitOutwardness = options.exitOutwardness ?? 0.95;
        this.exitScreenMargin = options.exitScreenMargin ?? 90;

        const spawnRadius = options.spawnRadius ?? 15;
        this._x = this.centerX + spawnRadius;
        this._y = this.centerY;
    }

    get x(): number {
        return this._x;
    }

    get y(): number {
        return this._y;
    }

    get mode(): DreamFlightMode {
        return this._mode;
    }

    /** 画面外まで抜けきったら true */
    get done(): boolean {
        return this._done;
    }

    /** deltaMS分だけ進める。画面外(余白込み)に抜けたら done が true になる */
    step(deltaMS: number): void {
        if (this._done) return;

        const dx = this._x - this.centerX;
        const dy = this._y - this.centerY;
        const radius = Math.hypot(dx, dy) || 0.0001;
        const radialX = dx / radius;
        const radialY = dy / radius;
        // 接線方向(半径ベクトルを90度回転)
        const tangentX = -radialY;
        const tangentY = radialX;

        let outwardness: number;
        if (this._mode === "growing") {
            const progress = Math.min(1, radius / this.loopRadius);
            outwardness =
                this.growOutwardness * (1 - smoothstep(0, 1, progress));
            if (radius >= this.loopRadius * 0.97) {
                this._mode = "holding";
                this.holdLapProgress = 0;
            }
        } else if (this._mode === "holding") {
            outwardness = 0;
            this.holdLapProgress +=
                (this.speedPerMs * deltaMS) / (2 * Math.PI * this.loopRadius);
            if (this.holdLapProgress >= this.holdLaps) {
                this._mode = "exiting";
                this.exitDistance = 0;
            }
        } else {
            const progress = smoothstep(
                0,
                this.exitRampDistance,
                this.exitDistance,
            );
            outwardness = this.exitOutwardness * progress;
            this.exitDistance += this.speedPerMs * deltaMS;
        }

        let dirX = tangentX * (1 - outwardness) + radialX * outwardness;
        let dirY = tangentY * (1 - outwardness) + radialY * outwardness;
        const dirLen = Math.hypot(dirX, dirY) || 1;
        dirX /= dirLen;
        dirY /= dirLen;

        const travel = this.speedPerMs * deltaMS;
        this._x += dirX * travel;
        this._y += dirY * travel;

        const margin = this.exitScreenMargin;
        if (
            this._mode === "exiting" &&
            (this._x < -margin ||
                this._x > this.screenWidth + margin ||
                this._y < -margin ||
                this._y > this.screenHeight + margin)
        ) {
            this._done = true;
        }
    }
}
