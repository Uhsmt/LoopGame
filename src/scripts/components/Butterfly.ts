import * as PIXI from 'pixi.js';
import * as Utility from '../utils/Utility';

export class Butterfly extends PIXI.Container {
    private sprite: PIXI.Sprite;
    private ellipse: PIXI.Graphics;
    private xDiretion:number;
    private yDiretion:number;
    private xFrame:number;
    private yFrame:number;
    private flappingProgress:number = 0;
    private flappingSpeed = 0.01;
    private isFlying = true;
    private isFlapping = true;
    readonly multiplicationRate:number = 1;
    color: number;
    private readonly xTernFrame = Utility.random(120, 150);    
    private readonly yTernFrame = Utility.random(120, 150);
    readonly spriteWith:number;
    readonly hitAreaSize:number;

    constructor(size: string, color: number, subColor:number, multiplicationRate: number = 1) {
        super();
        this.color = color;
        if (size === 'random') {
            size = Utility.chooseAtRandom(['small', 'medium', 'large'], 1)[0];
        }

        switch (size) {
            case 'large':
                this.sprite = PIXI.Sprite.from('butterfly_large');
                this.sprite.scale.set(0.20);
                this.xDiretion = 0.4;
                this.yDiretion = 0.3;
                this.flappingSpeed = Utility.random(8, 10) / 1000;
                this.hitAreaSize = 13;
                break;
            case 'medium':
                this.sprite = PIXI.Sprite.from('butterfly_medium');
                this.sprite.scale.set(0.16);
                this.xDiretion = 0.5;
                this.yDiretion = 0.4;
                this.flappingSpeed = Utility.random(12, 15) / 1000;
                this.hitAreaSize = 11;
                break;
            default:
                this.sprite = PIXI.Sprite.from('butterfly_small');
                this.sprite.scale.set(0.12);
                this.xDiretion = 0.6;
                this.yDiretion = 0.6;
                this.flappingSpeed = Utility.random(13, 17) / 1000;
                this.hitAreaSize = 9;
                break;
        }
        this.sprite.tint = color;
        this.sprite.anchor.set(0.5)
        this.addChild(this.sprite);
        this.spriteWith = this.sprite.width;

        // color change用のobject
        if (color != subColor){ 
            const ellipse = new PIXI.Graphics();
            ellipse.ellipse(0,0,30 * this.sprite.scale.x,40 * this.sprite.scale.x)
            ellipse.fill(0xffffff);
            ellipse.x = 0;
            ellipse.y = 0;
            this.ellipse = ellipse;
            this.ellipse.tint = subColor;
            this.addChild(ellipse);
        }

        // for multiplications
        this.multiplicationRate = multiplicationRate;
        if(this.multiplicationRate >= 2){
            const leaf = new MultipleLeaf(this.multiplicationRate)
            leaf.x = 0;
            leaf.y = this.sprite.height * 2 /3;
            this.addChild(leaf);
        }

        // for animation
        this.xFrame = Utility.random(1, 120);
        this.yFrame = Utility.random(1, 120);

        // Set the pivot to the center
        this.pivot.set(this.width / 2, this.height / 2);
    }

    fly(screenWidth: number, screenHeight: number, delta: number): void {

        if (!this.isFlying) return;

        // 横方向
        if (this.xDiretion < 0 && this.x <= this.spriteWith){
            this.xFrame = 0;
            this.xDiretion = Math.abs(this.xDiretion);
        }else if (this.xDiretion > 0 && this.x >= screenWidth ){
            this.xFrame = 0;
            this.xDiretion = -1 * Math.abs(this.xDiretion);
        }else if (this.xFrame === this.xTernFrame){
            this.xFrame = 0;
            this.xDiretion *= Utility.chooseAtRandom([-1, 1], 1)[0];
        }else{
            this.xFrame += 1;
        }
    
        // 縦方向
        if (this.yDiretion < 0 && this.y <= this.sprite.height){
            this.yFrame = 0;
            this.yDiretion = Math.abs(this.yDiretion);
        }else if (this.yDiretion > 0 && this.y >= screenHeight){
            this.yFrame = 0;
            this.yDiretion = -1 * Math.abs(this.yDiretion);
        }else if (this.yFrame === this.yTernFrame){
            this.yFrame = 0;
            this.yDiretion *= Utility.chooseAtRandom([-1, 1], 1)[0];
        }else{
            this.yFrame += 1;
        }
        this.x += this.xDiretion * delta / 16;
        this.y += this.yDiretion * delta / 16;
    }

    flap(delta: number): void {
        if (!this.isFlapping) return;

        // Calculate the scale based on flappingProgress
        let scale = 1;
        if (this.flappingProgress < 50) {
            scale = 1 - (this.flappingProgress / 100);
        } else {
            scale = (this.flappingProgress / 100);
        }
        this.sprite.scale.x = this.sprite.scale.y * scale;
        if(this.ellipse){
            this.ellipse.scale.x = scale;
        }

        // Update flappingProgress
        this.flappingProgress += this.flappingSpeed * 8 * delta ;
        if (this.flappingProgress >= 100) {
            this.flappingProgress = 0;
        }
    }

    stopFlap(){
        this.isFlapping = false;
    }

    stopFly(){
        this.isFlying = false;
    }

    switchColor(): void {
        if (!this.ellipse) return;
        const mainColor:number = this.sprite.tint;
        const subColor:number = this.ellipse.tint;
        
        this.sprite.tint = subColor;
        this.ellipse.tint = mainColor;
        this.color = subColor;
    }

    setRandomInitialPoistion(screenWidth: number, screenHeight: number): void {
        const positions = ['top', 'bottom', 'left', 'right'];
        const position = Utility.chooseAtRandom(positions, 1)[0];
        const top_y =  0;
        const bottom_y = screenHeight + this.height;
        const left_x = 0;
        const right_x = screenWidth + this.width;


        let x, y;
        switch (position) {
            case 'top':
                x = Utility.random(left_x, right_x);
                y = top_y;
                break;
            case 'bottom':
                x = Utility.random(left_x, right_x);
                y = bottom_y;
                break;
            case 'left':
                x = left_x;
                y = Utility.random(top_y, bottom_y);
                break;
            case 'right':
                x = right_x;
                y = Utility.random(top_y, bottom_y);
                break;
        }
        this.position.set(x, y);
    }

    isHit(loopArea: PIXI.Graphics): boolean {
        const butterflyCenter = { x: this.x - this.spriteWith/2  , y: this.y- this.height/2 };
        const points: PIXI.Point[] = [];

        for (let i = 0; i < 36; i++) {
            const angle = (i * 10) * Math.PI / 180;
            const x = butterflyCenter.x + Math.cos(angle) * this.hitAreaSize;
            const y = butterflyCenter.y + Math.sin(angle) * this.hitAreaSize;
            points.push(new PIXI.Point(x, y));
        }

        // ループエリア内のpointの数がhitsRateを超えていれば、ループエリア内と判定
        const hitsRate = 0.7;
        let hits = 0;
        points.forEach(point => {
            if (loopArea.containsPoint(point)) {
                hits++;
            }
        });
        return hits / points.length > hitsRate;
    }

    async delete(): Promise<void> {
        // アニメーションで透明度を徐々に減少させる
        const fadeOut = () => {
            if (this.alpha > 0) {
                this.alpha -= 0.02;
                requestAnimationFrame(fadeOut);
            } else {
                this.destroy();
                this.removeFromParent();
            }
        };
        fadeOut()
    }
    stop(): void {
        this.isFlying = false;
    }
}

class MultipleLeaf extends PIXI.Container{
    constructor(number: number){
        super();
        const sprite = PIXI.Sprite.from('leaf');
        sprite.scale.x = 0.1;
        sprite.scale.y = 0.1;
        sprite.anchor.set(0.5);
        this.addChild(sprite);

        const text = new PIXI.BitmapText({
            text: `x${number}`,
            style: {
                fill: '#ffffff',
                fontSize: 15,
                fontFamily: "Arial",
            },
        });
        text.anchor.set(0.5);
        text.x = 2;
        this.addChild(text);
    }
}