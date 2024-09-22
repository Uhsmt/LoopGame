import * as PIXI from 'pixi.js';
import * as Utility from '../utils/utility'; // Adjust the path as necessary

export class Butterfly extends PIXI.Container {
    private sprite: PIXI.Sprite;
    private elipse: PIXI.Graphics;
    private xDiretion:number;
    private yDiretion:number;
    private xFrame:number;
    private yFrame:number;
    private flappingProgress:number = 0;
    private flappingSpeed = 0.01;
    private color: number;
    private readonly xTernFrame = Utility.random(120, 150);    
    private readonly yTernFrame = Utility.random(120, 150);

    constructor(size: string, color: number, subColor:number = color) {
        super();
        this.color = color;
        switch (size) {
            case 'large':
                this.sprite = PIXI.Sprite.from('butterfly_large');
                this.sprite.scale.set(0.20);
                this.xDiretion = 0.7;
                this.yDiretion = 0.5;
                this.flappingSpeed = 0.005;
                break;
            case 'medium':
                this.sprite = PIXI.Sprite.from('butterfly_medium');
                this.sprite.scale.set(0.15);
                this.xDiretion = 0.9;
                this.yDiretion = 0.7;
                break;
            default:
                this.sprite = PIXI.Sprite.from('butterfly_small');
                this.sprite.scale.set(0.10);
                this.xDiretion = 1.1;
                this.yDiretion = 0.9;
                break;
        }
        this.sprite.tint = color;
        this.addChild(this.sprite);

        // color change用のobject
        if (color != subColor){ 
            const ellipse = new PIXI.Graphics();
            ellipse.ellipse(0,0,30 * this.sprite.scale.x,40 * this.sprite.scale.x)
            ellipse.fill(0xffffff);
            ellipse.x = this.sprite.width / 2;
            ellipse.y = this.sprite.height / 2;
            this.elipse = ellipse;
            this.elipse.tint = subColor;
            this.addChild(ellipse);
        }

        // for animation
        this.xFrame = Utility.random(1, 120);
        this.yFrame = Utility.random(1, 120);
    }

    update(delta: number, screenWidth: number, screenHeight: number): void {
        this.fly(screenWidth, screenHeight);
        this.flap();
    }

    private fly(screenWidth: number, screenHeight: number){
        const butterflyWidth = this.sprite.width;
        const butterflyHeight = this.sprite.height;
    
        // 横方向
        if (this.xDiretion < 0 && this.x <= 0){
            this.xFrame = 0;
            this.xDiretion = Math.abs(this.xDiretion);
        }else if (this.xDiretion > 0 && this.x >= screenWidth - butterflyWidth){
            this.xFrame = 0;
            this.xDiretion = -1 * Math.abs(this.xDiretion);
        }else if (this.xFrame === this.xTernFrame){
            this.xFrame = 0;
            this.xDiretion *= Utility.chooseAtRandom([-1, 1], 1)[0];
        }else{
            this.xFrame += 1;
        }
    
        // 縦方向
        if (this.yDiretion < 0 && this.y <= 0){
            this.yFrame = 0;
            this.yDiretion = Math.abs(this.yDiretion);
        }else if (this.yDiretion > 0 && this.y >= screenHeight - butterflyHeight){
            this.yFrame = 0;
            this.yDiretion = -1 * Math.abs(this.yDiretion);
        }else if (this.yFrame === this.yTernFrame){
            this.yFrame = 0;
            this.yDiretion *= Utility.chooseAtRandom([-1, 1], 1)[0];
        }else{
            this.yFrame += 1;
        }
    
        this.x += this.xDiretion;
        this.y += this.yDiretion;
    }

    private flap(): void {
        if (this.flappingProgress === 100){
            this.flappingProgress = 0;
            return;
        }
        let diff = 0;

        if (this.flappingProgress < 50){
            diff = this.flappingProgress * (this.flappingSpeed * -1);
        }else{
            diff = (100 - this.flappingProgress) * (this.flappingSpeed * -1);
        }
        this.scale.x = (1 + diff) * this.scale.x;
        this.scale.x = (1 + diff) * this.scale.y;
        this.flappingProgress += 2;
    }

    switchColor(): void {
        console.log("switchColor");
        const mainColor:number = this.sprite.tint;
        const subColor:number = this.elipse.tint;
        
        console.log(mainColor, subColor);
        this.sprite.tint = subColor;
        this.elipse.tint = mainColor;
        this.color = subColor;
    }
}
