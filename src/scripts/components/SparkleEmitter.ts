import * as PIXI from "pixi.js";

interface Particle {
    sprite: PIXI.Sprite;
    vx: number;
    vy: number;
    spin: number;
    gravity: number;
    lifeMs: number;
    maxLifeMs: number;
    baseScale: number;
}

export interface BurstOptions {
    lifeMs?: number;
    speed?: number;
    gravity?: number;
    scale?: number;
    tints?: number[];
}

/**
 * 星型パーティクルのエミッタ。
 *
 * フィルタを使わずスプライト+加算合成だけで表現するため軽量
 * (数百個程度なら普通のノートPCで問題なく動く)。
 * パーティクル数はMAX_PARTICLESで上限を設け、暴走しないようにする。
 */
export class SparkleEmitter extends PIXI.Container {
    private static readonly MAX_PARTICLES = 300;
    private particles: Particle[] = [];
    private texture: PIXI.Texture;

    constructor(texture: PIXI.Texture) {
        super();
        this.texture = texture;
    }

    /**
     * 星型テクスチャを生成する(起動時に1回だけ呼ぶ。画像素材不要)
     */
    static createStarTexture(renderer: PIXI.Renderer): PIXI.Texture {
        const g = new PIXI.Graphics();
        // 柔らかいハロー(同心円のアルファ重ね)で発光レイヤーっぽく見せる
        g.circle(0, 0, 12).fill({ color: 0xffffff, alpha: 0.1 });
        g.circle(0, 0, 8).fill({ color: 0xffffff, alpha: 0.18 });
        g.circle(0, 0, 5).fill({ color: 0xffffff, alpha: 0.3 });
        // 中心の星
        const outer = 7;
        const inner = 2;
        const points: number[] = [];
        for (let i = 0; i < 8; i++) {
            const r = i % 2 === 0 ? outer : inner;
            const a = (i * Math.PI) / 4 - Math.PI / 2;
            points.push(Math.cos(a) * r, Math.sin(a) * r);
        }
        g.poly(points);
        g.fill(0xffffff);
        const texture = renderer.generateTexture(g);
        g.destroy();
        return texture;
    }

    get particleCount(): number {
        return this.particles.length;
    }

    /** 一点から星を放射状に散らす(捕獲エフェクトなど) */
    burst(
        x: number,
        y: number,
        count: number,
        options: BurstOptions = {},
    ): void {
        const speed = options.speed ?? 0.18;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const v = speed * (0.3 + Math.random() * 0.7);
            this.spawn(x, y, {
                vx: Math.cos(angle) * v,
                vy: Math.sin(angle) * v - 0.05,
                gravity: options.gravity ?? 0.00035,
                lifeMs: options.lifeMs ?? 900,
                scale: options.scale ?? 1,
                tints: options.tints,
            });
        }
    }

    /** 軌跡用に1粒だけこぼす(ボーナス蝶の尾など) */
    trail(x: number, y: number, options: BurstOptions = {}): void {
        this.spawn(
            x + (Math.random() - 0.5) * 14,
            y + (Math.random() - 0.5) * 14,
            {
                vx: (Math.random() - 0.5) * 0.02,
                vy: 0.015 + Math.random() * 0.02,
                gravity: 0,
                lifeMs: options.lifeMs ?? 850,
                scale: (options.scale ?? 1) * (1.0 + Math.random() * 0.7),
                tints: options.tints,
            },
        );
    }

    private spawn(
        x: number,
        y: number,
        opts: {
            vx: number;
            vy: number;
            gravity: number;
            lifeMs: number;
            scale: number;
            tints?: number[];
        },
    ): void {
        // 上限を超える分は古いものから消す
        while (this.particles.length >= SparkleEmitter.MAX_PARTICLES) {
            this.removeParticle(this.particles[0]);
        }

        const sprite = new PIXI.Sprite(this.texture);
        sprite.anchor.set(0.5);
        sprite.x = x;
        sprite.y = y;
        sprite.rotation = Math.random() * Math.PI;
        // 加算合成は明るい背景で白飛びして見えなくなるため通常合成にする
        sprite.blendMode = "normal";
        const tints = opts.tints ?? [0xffffff, 0xfff6d8, 0xffe9a8];
        sprite.tint = tints[Math.floor(Math.random() * tints.length)];
        const baseScale = opts.scale * (0.6 + Math.random() * 0.6);
        sprite.scale.set(baseScale);
        this.addChild(sprite);

        this.particles.push({
            sprite,
            vx: opts.vx,
            vy: opts.vy,
            spin: (Math.random() - 0.5) * 0.008,
            gravity: opts.gravity,
            lifeMs: opts.lifeMs,
            maxLifeMs: opts.lifeMs,
            baseScale,
        });
    }

    /** 毎フレーム呼ぶ(deltaMS: 経過ミリ秒) */
    update(deltaMS: number): void {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.lifeMs -= deltaMS;
            if (p.lifeMs <= 0) {
                this.removeParticle(p);
                continue;
            }
            p.vy += p.gravity * deltaMS;
            p.sprite.x += p.vx * deltaMS;
            p.sprite.y += p.vy * deltaMS;
            p.sprite.rotation += p.spin * deltaMS;
            const t = p.lifeMs / p.maxLifeMs;
            p.sprite.alpha = t;
            p.sprite.scale.set(p.baseScale * (0.4 + 0.6 * t));
        }
    }

    private removeParticle(p: Particle): void {
        this.particles = this.particles.filter((x) => x !== p);
        this.removeChild(p.sprite);
        p.sprite.destroy();
    }

    /** 全パーティクルを破棄する(シーン離脱時) */
    clear(): void {
        for (const p of [...this.particles]) {
            this.removeParticle(p);
        }
    }
}
