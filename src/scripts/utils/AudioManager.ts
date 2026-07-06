/**
 * BGMとSEの再生を管理するシングルトン。
 *
 * - SE: Web Audio API (AudioContext + AudioBuffer)。playbackRateで音程変更可能
 * - BGM: HTMLAudioElement (ストリーミング再生・ループ)
 * - ブラウザの自動再生制限のため、最初のユーザー操作で unlock() を呼ぶこと。
 *   unlockまでBGMは保留され、SEは鳴らない(すべて操作起点なので実害なし)
 * - AudioContextが使えない環境でも例外を投げず、無音で動作を継続する
 */

export interface SoundDef {
    alias: string;
    src: string;
}

export class AudioManager {
    private static _shared: AudioManager | null = null;

    static get shared(): AudioManager {
        if (!AudioManager._shared) {
            AudioManager._shared = new AudioManager();
        }
        return AudioManager._shared;
    }

    /** テスト用: シングルトンを破棄する */
    static resetForTesting(): void {
        AudioManager._shared = null;
    }

    bgmVolume: number = 0.35;
    seVolume: number = 0.6;

    private context: AudioContext | null = null;
    private buffers = new Map<string, AudioBuffer>();
    private bgmElement: HTMLAudioElement | null = null;
    private currentBgmSrc: string | null = null;
    private pendingBgmSrc: string | null = null;
    private unlocked = false;
    private muted = false;

    private ensureContext(): AudioContext | null {
        if (this.context) {
            return this.context;
        }
        try {
            this.context = new AudioContext();
        } catch (error) {
            console.error("AudioContext is not available:", error);
            this.context = null;
        }
        return this.context;
    }

    /** SEを読み込む。個々の失敗はログのみで、他の読み込みは続行する */
    async loadSe(defs: SoundDef[]): Promise<void> {
        const ctx = this.ensureContext();
        if (!ctx) {
            return;
        }
        await Promise.all(
            defs.map(async (def) => {
                try {
                    const res = await fetch(def.src);
                    const data = await res.arrayBuffer();
                    const buffer = await ctx.decodeAudioData(data);
                    this.buffers.set(def.alias, buffer);
                } catch (error) {
                    console.error(
                        `Failed to load sound "${def.alias}":`,
                        error,
                    );
                }
            }),
        );
    }

    /** SEを再生する。rateで音程(再生速度)を変えられる(1が原音) */
    playSe(alias: string, options: { rate?: number } = {}): void {
        const ctx = this.context;
        const buffer = this.buffers.get(alias);
        if (!ctx || !buffer || ctx.state !== "running" || this.muted) {
            return;
        }
        try {
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.playbackRate.value = options.rate ?? 1;
            const gain = ctx.createGain();
            gain.gain.value = this.seVolume;
            source.connect(gain);
            gain.connect(ctx.destination);
            source.start();
        } catch (error) {
            console.error(`Failed to play sound "${alias}":`, error);
        }
    }

    /** BGMをループ再生する。同じsrcが再生中なら何もしない */
    playBgm(src: string): void {
        if (this.currentBgmSrc === src) {
            return;
        }
        this.currentBgmSrc = src;
        if (!this.unlocked) {
            this.pendingBgmSrc = src;
            return;
        }
        this.startBgmElement(src);
    }

    /** ミュートを切り替える。BGMは再生位置を保ったまま消音/復帰する */
    setMuted(muted: boolean): void {
        this.muted = muted;
        if (this.bgmElement) {
            this.bgmElement.muted = muted;
        }
    }

    isMuted(): boolean {
        return this.muted;
    }

    stopBgm(fadeMs: number = 600): void {
        this.currentBgmSrc = null;
        this.pendingBgmSrc = null;
        this.stopBgmElement(fadeMs);
    }

    /**
     * 最初のユーザー操作で呼ぶ。AudioContextを再開し、保留中のBGMを開始する
     */
    unlock(): void {
        this.unlocked = true;
        const ctx = this.ensureContext();
        if (ctx && ctx.state === "suspended") {
            ctx.resume().catch((error: unknown) => {
                console.error("Failed to resume AudioContext:", error);
            });
        }
        if (this.pendingBgmSrc) {
            const src = this.pendingBgmSrc;
            this.pendingBgmSrc = null;
            this.startBgmElement(src);
        }
    }

    private startBgmElement(src: string): void {
        this.stopBgmElement();
        const el = new Audio(src);
        el.loop = true;
        // フェードインはせず即時フル音量で開始する(フェードは停止時のみ)
        el.volume = this.bgmVolume;
        el.muted = this.muted;
        this.bgmElement = el;
        el.play().catch(() => {
            // 自動再生がブロックされた場合は次のunlockで再試行する
            this.pendingBgmSrc = src;
            this.unlocked = false;
        });
    }

    private stopBgmElement(fadeMs: number = 600): void {
        if (this.bgmElement) {
            const el = this.bgmElement;
            this.bgmElement = null;
            // ブチッと切れないようにフェードアウトしてから停止する
            this.fadeElement(el, 0, fadeMs, () => {
                el.pause();
            });
        }
    }

    /** HTMLAudioElementの音量を一定時間かけて目標値まで変化させる */
    private fadeElement(
        el: HTMLAudioElement,
        to: number,
        durationMs: number,
        onDone?: () => void,
    ): void {
        const from = el.volume;
        const stepMs = 50;
        const steps = Math.max(1, Math.round(durationMs / stepMs));
        let step = 0;
        const timer = setInterval(() => {
            step++;
            const t = step / steps;
            el.volume = Math.min(1, Math.max(0, from + (to - from) * t));
            if (step >= steps) {
                clearInterval(timer);
                onDone?.();
            }
        }, stepMs);
    }
}
