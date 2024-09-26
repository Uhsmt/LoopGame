import * as PIXI from 'pixi.js';
import * as Utility from '../utils/Utility';
export class Butterfly extends PIXI.Container {
    constructor(size, color, subColor = color) {
        super();
        this.flappingProgress = 0;
        this.flappingSpeed = 0.01;
        this.isFlying = true;
        this.isFlapping = true;
        this.xTernFrame = Utility.random(120, 150);
        this.yTernFrame = Utility.random(120, 150);
        this.color = color;
        switch (size) {
            case 'large':
                this.sprite = PIXI.Sprite.from('butterfly_large');
                this.sprite.scale.set(0.20);
                this.xDiretion = 0.6;
                this.yDiretion = 0.4;
                this.flappingSpeed = Utility.random(8, 10) / 1000;
                break;
            case 'medium':
                this.sprite = PIXI.Sprite.from('butterfly_medium');
                this.sprite.scale.set(0.16);
                this.xDiretion = 0.75;
                this.yDiretion = 0.6;
                this.flappingSpeed = Utility.random(12, 15) / 1000;
                break;
            default:
                this.sprite = PIXI.Sprite.from('butterfly_small');
                this.sprite.scale.set(0.13);
                this.xDiretion = 0.9;
                this.yDiretion = 0.8;
                this.flappingSpeed = Utility.random(13, 17) / 1000;
                break;
        }
        this.sprite.tint = color;
        this.addChild(this.sprite);
        // color change用のobject
        if (color != subColor) {
            const ellipse = new PIXI.Graphics();
            ellipse.ellipse(0, 0, 30 * this.sprite.scale.x, 40 * this.sprite.scale.x);
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
        // Set the pivot to the center
        this.pivot.set(this.width / 2, this.height / 2);
    }
    fly(screenWidth, screenHeight) {
        if (!this.isFlying)
            return;
        const butterflyWidth = this.sprite.width;
        const butterflyHeight = this.sprite.height;
        // 横方向
        if (this.xDiretion < 0 && this.x <= 0) {
            this.xFrame = 0;
            this.xDiretion = Math.abs(this.xDiretion);
        }
        else if (this.xDiretion > 0 && this.x >= screenWidth - butterflyWidth) {
            this.xFrame = 0;
            this.xDiretion = -1 * Math.abs(this.xDiretion);
        }
        else if (this.xFrame === this.xTernFrame) {
            this.xFrame = 0;
            this.xDiretion *= Utility.chooseAtRandom([-1, 1], 1)[0];
        }
        else {
            this.xFrame += 1;
        }
        // 縦方向
        if (this.yDiretion < 0 && this.y <= 0) {
            this.yFrame = 0;
            this.yDiretion = Math.abs(this.yDiretion);
        }
        else if (this.yDiretion > 0 && this.y >= screenHeight - butterflyHeight) {
            this.yFrame = 0;
            this.yDiretion = -1 * Math.abs(this.yDiretion);
        }
        else if (this.yFrame === this.yTernFrame) {
            this.yFrame = 0;
            this.yDiretion *= Utility.chooseAtRandom([-1, 1], 1)[0];
        }
        else {
            this.yFrame += 1;
        }
        this.x += this.xDiretion;
        this.y += this.yDiretion;
    }
    flap() {
        if (!this.isFlapping)
            return;
        // Calculate the scale based on flappingProgress
        let scale = 1;
        if (this.flappingProgress < 50) {
            scale = 1 - (this.flappingProgress / 100);
        }
        else {
            scale = (this.flappingProgress / 100);
        }
        this.scale.x = this.scale.y * scale;
        // Update flappingProgress
        this.flappingProgress += this.flappingSpeed * 100;
        if (this.flappingProgress >= 100) {
            this.flappingProgress = 0;
        }
    }
    stopFlap() {
        this.isFlapping = false;
    }
    stopFly() {
        this.isFlying = false;
    }
    switchColor() {
        if (!this.elipse)
            return;
        const mainColor = this.sprite.tint;
        const subColor = this.elipse.tint;
        this.sprite.tint = subColor;
        this.elipse.tint = mainColor;
        this.color = subColor;
    }
    setRandomInitialPoistion(screenWidth, screenHeight) {
        const positions = ['top', 'bottom', 'left', 'right'];
        const position = Utility.chooseAtRandom(positions, 1)[0];
        let x, y;
        switch (position) {
            case 'top':
                x = Utility.random(0, screenWidth);
                y = 0 - this.height;
                break;
            case 'bottom':
                x = Utility.random(0, screenWidth);
                y = screenHeight + this.height;
                break;
            case 'left':
                x = 0 - this.width;
                y = Utility.random(0, screenHeight);
                break;
            case 'right':
                x = screenWidth + this.width;
                y = Utility.random(0, screenHeight);
                break;
        }
        this.position.set(x, y);
    }
    delete() {
        // アニメーションで透明度を徐々に減少させる
        const fadeOut = () => {
            if (this.alpha > 0) {
                this.alpha -= 0.05;
                requestAnimationFrame(fadeOut);
            }
            else {
                this.destroy();
                this.removeFromParent();
            }
        };
        fadeOut();
    }
    stop() {
        this.isFlying = false;
    }
}
//# sourceMappingURL=Butterfly.js.map