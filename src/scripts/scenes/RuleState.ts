import * as PIXI from "pixi.js";
import { GameStateManager } from "./GameStateManager";
import { LineDrawer } from "../components/LineDrawer";
import { Sun } from "../components/Sun";
import { Butterfly } from "../components/Butterfly";
import * as Const from "../utils/Const";
import { StateBase } from "./BaseState";
import { HelpFlower } from "../components/HelpFlower";
import { Button } from "../components/Button";
import { StartState } from "./StartState";
import * as Utility from "../utils/Utility";

export class RuleState extends StateBase {
    private backgroundSprite: PIXI.Sprite;
    private lineDrawer: LineDrawer;
    private notebookSprite: PIXI.Sprite;
    private backButton: Button;
    private nextButton: Button;
    private page: number = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private pageInfos: any[] = [];
    private defaultTextStyle: PIXI.TextStyleOptions = {
        fontFamily: Const.FONT_ENGLISH,
        fontSize: 22,
        fill: "#000000",
    };
    private defaultTextStyleJP: PIXI.TextStyleOptions = {
        fontFamily: Const.FONT_JAPANESE,
        fontSize: 15,
        fill: "#000000",
    };
    private titleTextStyle: PIXI.TextStyleOptions = {
        fontFamily: Const.FONT_ENGLISH,
        fontWeight: Const.FONT_ENGLISH_BOLD,
        fontSize: 30,
        fill: "#000000",
        align: "center",
    };
    private butterflies: Butterfly[] = [];
    private helpFlowers: HelpFlower[] = [];
    private practiceMode: boolean = false;

    constructor(manager: GameStateManager) {
        super(manager);
        this.lineDrawer = new LineDrawer(this.manager.app);

        // background
        this.backgroundSprite = new PIXI.Sprite(
            PIXI.Texture.from("menu_background"),
        );
        this.adjustBackGroundSprite(this.backgroundSprite);
        this.container.addChild(this.backgroundSprite);

        // notebook
        this.notebookSprite = new PIXI.Sprite(PIXI.Texture.from("notebook"));
        this.notebookSprite.anchor.set(0.5);
        this.notebookSprite.x = this.manager.app.screen.width / 2;
        this.notebookSprite.y = this.manager.app.screen.height * 0.55;
        this.container.addChild(this.notebookSprite);
        this.notebookSprite.alpha = 0;

        // buttons
        this.backButton = new Button(
            "Back",
            this.manager.app.screen.width / 7,
            this.manager.app.screen.height * 0.85,
        );
        this.backButton.alpha = 0;
        this.backButton.scale.set(0.6);
        this.container.addChild(this.backButton);

        this.nextButton = new Button(
            "Next",
            (this.manager.app.screen.width * 6) / 7,
            this.manager.app.screen.height * 0.85,
        );
        this.nextButton.alpha = 0;
        this.nextButton.scale.set(0.6);
        this.container.addChild(this.nextButton);

        // Frame
        this.addFrameGraphic();
    }

    async onEnter(): Promise<void> {
        this.lineDrawer.on(
            "loopAreaCompleted",
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            this.handleLoopAreaCompleted.bind(this),
        );

        // notebookをfade in
        await Promise.all([
            this.fadeIn(this.notebookSprite, 0.03, 1),
            this.slideY(
                this.notebookSprite,
                this.manager.app.screen.height / 2,
                2,
            ),
        ]);

        // ボタンを表示
        this.backButton.alpha = 1;
        this.nextButton.alpha = 1;

        // ページ情報を表示
        this.setPageInfoOne();
        this.page = 1;
    }

    update(delta: number): void {
        if (this.butterflies.length > 0) {
            this.butterflies.forEach((butterfly) => {
                butterfly.update(delta);
            });
        }

        if (this.helpFlowers) {
            this.helpFlowers.forEach((flower) => {
                flower.spin(delta * 0.5);
            });
        }
    }

    render(): void {}

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

    // LineDrawerのループエリアが完成したときのハンドラ
    private async handleLoopAreaCompleted(loopArea: PIXI.Graphics) {
        if (this.backButton.isHit(loopArea)) {
            void this.selectBackButton();
        } else if (this.nextButton.isHit(loopArea)) {
            void this.selectNextButton();
        }
        if (this.practiceMode) {
            // loopArea内にいる蝶を取得
            const butterfliesInLoopArea = this.butterflies.filter(
                (butterfly) => {
                    return butterfly.isHit(loopArea);
                },
            );

            let message = "";

            if (butterfliesInLoopArea.length === 1) {
                const butterfly = butterfliesInLoopArea[0];
                butterfly.switchColor();
                if (butterfly.color !== butterfly.getSubColor()) {
                    message = "Switch Color";
                }
            } else if (butterfliesInLoopArea.length > 1) {
                if (this.isSuccessLoop(butterfliesInLoopArea)) {
                    message = "Good Loop!";
                    butterfliesInLoopArea.forEach((butterfly) => {
                        butterfly.delete();
                        // this.butterfliesからけす
                        const index = this.butterflies.indexOf(butterfly);
                        if (index > -1) {
                            this.butterflies.splice(index, 1);
                        }
                    });
                } else {
                    message = "Bad Loop!";
                }
            }

            if (message.length > 0) {
                const msg = new PIXI.Text({
                    text: message,
                    style: this.titleTextStyle,
                });
                msg.anchor.x = 0.5;
                msg.x = this.noteLeftX() + (this.notebookSprite.width * 3) / 4;
                msg.y =
                    this.notebookSprite.y -
                    this.notebookSprite.height / 2 +
                    Const.MARGIN * 2;
                this.container.addChild(msg);
                this.pageInfos.push(msg);
                await this.wait(700);
                await this.fadeOut(msg, 0.05, 0).then(() => {
                    this.container.removeChild(msg);
                });
            }
        }
    }

    // Nextボタンを選択
    private async selectNextButton(): Promise<void> {
        if (this.nextButton.isSelected) {
            return;
        }
        this.practiceMode = false;
        this.lineDrawer.setLineColor(this.lineDrawer.originalLineColor);

        this.nextButton.selected();
        switch (this.page) {
            case 1:
                await this.resetPageInfo();
                this.setPageInfoTwo();
                this.page += 1;
                break;
            case 2:
                await this.resetPageInfo();
                this.setPageInfoThree();
                this.lineDrawer.setLineColor(0x730000);
                this.page += 1;
                break;
            case 3:
                await this.resetPageInfo();
                this.setPageInfoFour();
                this.page += 1;
                break;
            case 4:
                await this.resetPageInfo();
                await Promise.all([
                    this.backToTopPage(),
                    this.slideY(
                        this.notebookSprite,
                        this.manager.app.screen.height * 0.7,
                        2,
                    ),
                ]);
                break;
        }
        await this.wait(300).then(() => {
            this.nextButton.releaseSelected();
        });
    }

    // Backボタンを選択
    private async selectBackButton(): Promise<void> {
        if (this.backButton.isSelected) {
            return;
        }
        this.practiceMode = false;
        this.lineDrawer.setLineColor(this.lineDrawer.originalLineColor);

        this.backButton.selected();
        switch (this.page) {
            case 1:
                await this.resetPageInfo();
                await Promise.all([
                    this.backToTopPage(),
                    this.slideY(
                        this.notebookSprite,
                        this.manager.app.screen.height * 0.7,
                        2,
                    ),
                ]);
                break;
            case 2:
                await this.resetPageInfo();
                this.setPageInfoOne();
                this.page -= 1;
                break;
            case 3:
                await this.resetPageInfo();
                this.setPageInfoTwo();
                this.page -= 1;
                break;
            case 4:
                await this.resetPageInfo();
                this.setPageInfoThree();
                this.page -= 1;
                break;
        }
        await this.wait(300).then(() => {
            this.backButton.releaseSelected();
        });
    }

    // トップページに戻る
    private async backToTopPage(): Promise<void> {
        await Promise.all([
            this.fadeOut(this.backButton, 0.04, 0),
            this.fadeOut(this.nextButton, 0.04, 0),
            this.fadeOut(this.notebookSprite, 0.04, 0),
        ]);
        this.manager.setState(new StartState(this.manager));
    }

    // 1ページ目情報をセット
    private setPageInfoOne(): void {
        const title = new PIXI.Text({
            text: "How to play",
            style: this.titleTextStyle,
        });
        title.anchor.x = 0.5;
        title.x = this.noteLeftX() + this.notebookSprite.width / 4;
        title.y =
            this.notebookSprite.y -
            this.notebookSprite.height / 2 +
            Const.MARGIN * 2;
        this.pageInfos.push(title);

        const titlejp = new PIXI.Text({
            text: "あそびかた",
            style: this.defaultTextStyleJP,
        });
        titlejp.anchor.x = 0.5;
        titlejp.x = title.x;
        titlejp.y = title.y + title.height * 1.1;
        this.pageInfos.push(titlejp);

        const text1 = new PIXI.Text({
            text: "Draw a loop to capture butterflies",
            style: this.defaultTextStyle,
        });
        text1.x = this.noteLeftX() + Const.MARGIN;
        text1.y = this.manager.app.screen.height * 0.3;
        this.pageInfos.push(text1);

        const text1jp = new PIXI.Text({
            text: "せんをかいて　ちょうちょをつかまえて",
            style: this.defaultTextStyleJP,
        });
        text1jp.x = text1.x;
        text1jp.y = text1.y + text1.height * 1.1;
        this.pageInfos.push(text1jp);

        for (let i = 0; i < 4; i++) {
            const color = i === 3 ? Const.COLOR_LIST[1] : Const.COLOR_LIST[0];
            const text1_butterfly = new Butterfly("medium", color, color, 1, {
                x: this.manager.app.screen.width,
                y: this.manager.app.screen.height,
            });

            if (i <= 1) {
                text1_butterfly.x =
                    this.manager.app.screen.width / 6 + Const.MARGIN * 2;
            } else {
                text1_butterfly.x =
                    (this.manager.app.screen.width * 2) / 6 + Const.MARGIN * 2;
            }

            if (i % 2 === 0) {
                text1_butterfly.y =
                    text1jp.y +
                    text1jp.height +
                    Const.MARGIN +
                    text1_butterfly.height * 1.5;
            } else {
                text1_butterfly.y =
                    text1jp.y +
                    text1jp.height +
                    Const.MARGIN +
                    text1_butterfly.height * 3.5;
            }
            text1_butterfly.appear(false);
            text1_butterfly.isFlapping = true;
            this.butterflies.push(text1_butterfly);
        }

        const text2 = new PIXI.Text({
            text: "More butterflies, more points",
            style: this.defaultTextStyle,
        });
        text2.x = text1.x;
        text2.y = this.manager.app.screen.height * 0.7;
        this.pageInfos.push(text2);

        const text2jp = new PIXI.Text({
            text: "おおいほど　高とくてん",
            style: this.defaultTextStyleJP,
        });
        text2jp.x = text2.x;
        text2jp.y = text2.y + text2.height * 1.1;
        this.pageInfos.push(text2jp);

        const text3 = new PIXI.Text({
            text: "Capture neeeded number of\rbutterflies before sunset",
            style: this.defaultTextStyle,
        });
        text3.x = this.manager.app.screen.width / 2 + Const.MARGIN * 2;
        text3.y = text1.y;
        this.pageInfos.push(text3);

        const text3jp = new PIXI.Text({
            text: "たいようがしずむまえに \rひつようなかずをつかまえて",
            style: this.defaultTextStyleJP,
        });
        text3jp.x = text3.x;
        text3jp.y = text3.y + text3.height * 1.1;
        this.pageInfos.push(text3jp);

        const sun = new Sun();
        sun.scale.set(0.7);
        sun.x =
            this.notebookSprite.x -
            this.notebookSprite.width / 2 +
            this.notebookSprite.width * 0.75;
        sun.y = text3jp.y + text3jp.height + sun.height / 2 + Const.MARGIN;
        sun.blink();
        this.pageInfos.push(sun);

        const pencilIcon = PIXI.Sprite.from("pencil");
        pencilIcon.x = title.x;
        pencilIcon.y = this.manager.app.screen.height / 2 + Const.MARGIN;
        this.pageInfos.push(pencilIcon);

        // 鉛筆の軌跡を描くためのGraphicsオブジェクトを作成
        const pencilTrail = new PIXI.Graphics();
        pencilTrail.moveTo(pencilIcon.x, pencilIcon.y);
        this.pageInfos.push(pencilTrail);

        // 鉛筆アイコンが円を描くアニメーションを設定
        let angle: number = 0;
        let isAnimating: boolean = false;
        let lastTime: number = 2000;

        const animatePencil = async (ticker: PIXI.Ticker) => {
            if (this.page !== 1) {
                this.manager.app.ticker.remove(animatePencil);
                return;
            }

            const delta = ticker.deltaMS;
            const radiusX = 80;
            const radiusY = 90;
            const speed = 0.008;

            if (isAnimating) {
                angle += speed * delta;
                const newX = -radiusX + title.x + radiusX * Math.cos(angle);
                const newY =
                    this.manager.app.screen.height / 2 +
                    Const.MARGIN +
                    radiusY * Math.sin(angle);

                // 鉛筆の位置を更新
                pencilIcon.x = newX;
                pencilIcon.y = newY;

                // 軌跡を描画
                pencilTrail
                    .lineTo(newX, newY)
                    .stroke({ width: 2, color: 0x000000 });

                // 1周したらアニメーションを停止し、10秒待機
                if (angle >= 2 * Math.PI) {
                    angle = 0;
                    isAnimating = false;
                    lastTime = ticker.lastTime;

                    // 軌跡をリセット
                    pencilTrail.clear();
                    pencilTrail.moveTo(pencilIcon.x, pencilIcon.y);

                    const loopAreaGraphics = new PIXI.Graphics();
                    loopAreaGraphics.ellipse(
                        newX - radiusX,
                        newY,
                        radiusX,
                        radiusY,
                    );
                    loopAreaGraphics.fill({ color: 0xffffff, alpha: 0.5 });
                    this.container.addChild(loopAreaGraphics);
                    this.pageInfos.push(loopAreaGraphics);
                    const loopedButterflies = this.butterflies.filter(
                        (butterfly) => {
                            return butterfly.isHit(loopAreaGraphics);
                        },
                    );

                    loopedButterflies.forEach((butterfly) => {
                        butterfly.isFlapping = false;
                    });

                    await Promise.all([
                        loopedButterflies.map((butterfly) => {
                            return this.fadeOut(butterfly, 0.02, 0);
                        }),
                        this.fadeOut(loopAreaGraphics, 0.02, 0),
                    ]);
                    await this.wait(2000);
                    loopedButterflies.forEach((butterfly) => {
                        butterfly.appear(false);
                        butterfly.isFlapping = true;
                    });
                }
            } else {
                // 5秒待機
                if (ticker.lastTime - lastTime >= 5000) {
                    isAnimating = true;
                }
            }
        };
        this.manager.app.ticker.add(animatePencil);

        // pageInfoを表示
        this.pageInfos.forEach((pageInfo) => {
            this.container.addChild(pageInfo);
        });
        this.container.addChild(...this.butterflies);
    }

    // 2ページ目情報をセット
    private setPageInfoTwo(): void {
        const title = new PIXI.Text({
            text: "Loop Combinations",
            style: this.titleTextStyle,
        });
        title.anchor.x = 0.5;
        title.x = this.noteLeftX() + this.notebookSprite.width / 4;
        title.y =
            this.notebookSprite.y -
            this.notebookSprite.height / 2 +
            Const.MARGIN * 2;
        this.pageInfos.push(title);

        const titlejp = new PIXI.Text({
            text: "ループのくみあわせ",
            style: this.defaultTextStyleJP,
        });
        titlejp.anchor.x = 0.5;
        titlejp.x = title.x;
        titlejp.y = title.y + title.height * 1.1;
        this.pageInfos.push(titlejp);

        const text1 = new PIXI.Text({
            text: "Same color 2 or more: OK",
            style: this.defaultTextStyle,
        });
        text1.x = this.noteLeftX() + Const.MARGIN;
        text1.y = titlejp.y + titlejp.height + Const.MARGIN;

        this.pageInfos.push(text1);

        const text1jp = new PIXI.Text({
            text: "おなじいろ 2ひきいじょう…OK",
            style: this.defaultTextStyleJP,
        });
        text1jp.x = text1.x;
        text1jp.y = text1.y + text1.height * 1.1;
        this.pageInfos.push(text1jp);

        for (let i = 0; i < 2; i++) {
            const text1_butterfly = new Butterfly(
                "medium",
                Const.COLOR_LIST[2],
                Const.COLOR_LIST[2],
                1,
                {
                    x: this.manager.app.screen.width,
                    y: this.manager.app.screen.height,
                },
            );
            text1_butterfly.x =
                this.noteLeftX() +
                this.manager.app.screen.width * (0.12 + 0.12 * i);
            text1_butterfly.y =
                text1jp.y +
                text1jp.height * 1.1 +
                text1_butterfly.height +
                Const.MARGIN;
            text1_butterfly.appear(false);
            text1_butterfly.isFlapping = true;
            this.butterflies.push(text1_butterfly);
        }

        const text2 = new PIXI.Text({
            text: "Each different color 3 or more: OK",
            style: this.defaultTextStyle,
        });
        text2.x = text1.x;
        text2.y = this.manager.app.screen.height * 0.5 + Const.MARGIN;
        this.pageInfos.push(text2);

        const text2jp = new PIXI.Text({
            text: "ちがういろを1ひきずつ　3ひきいじょう…OK",
            style: this.defaultTextStyleJP,
        });
        text2jp.x = text2.x;
        text2jp.y = text2.y + text2.height * 1.1;
        this.pageInfos.push(text2jp);

        for (let i = 0; i < 3; i++) {
            const text2_butterfly = new Butterfly(
                "medium",
                Const.COLOR_LIST[i],
                Const.COLOR_LIST[i],
                1,
                {
                    x: this.manager.app.screen.width,
                    y: this.manager.app.screen.height,
                },
            );
            text2_butterfly.x =
                this.noteLeftX() +
                this.manager.app.screen.width * (0.12 + 0.1 * i);
            text2_butterfly.y =
                text2jp.y +
                text2jp.height * 1.1 +
                text2_butterfly.height +
                Const.MARGIN;
            text2_butterfly.isFlapping = true;
            text2_butterfly.appear(false);
            this.butterflies.push(text2_butterfly);
        }

        const text3 = new PIXI.Text({
            text: "Only one butterfly: Change color",
            style: this.defaultTextStyle,
        });
        text3.x = this.manager.app.screen.width / 2 + Const.MARGIN * 2;
        text3.y = text1.y;
        this.pageInfos.push(text3);

        const text3jp = new PIXI.Text({
            text: "1ひきだけ…いろをかえる",
            style: this.defaultTextStyleJP,
        });
        text3jp.x = text3.x;
        text3jp.y = text3.y + text3.height * 1.1;
        this.pageInfos.push(text3jp);

        const text3_butterfly = new Butterfly(
            "medium",
            Const.COLOR_LIST[0],
            Const.COLOR_LIST[1],
            1,
            {
                x: this.manager.app.screen.width,
                y: this.manager.app.screen.height,
            },
        );
        text3_butterfly.x = this.manager.app.screen.width * 0.75;
        text3_butterfly.y =
            text3jp.y +
            text3jp.height * 1.1 +
            text3_butterfly.height +
            Const.MARGIN;
        text3_butterfly.appear(false);
        text3_butterfly.isFlapping = true;
        this.butterflies.push(text3_butterfly);

        const text4 = new PIXI.Text({
            text: "Other combinations: Bad Loop",
            style: this.defaultTextStyle,
        });
        text4.x = text3.x;
        text4.y = text2.y;
        this.pageInfos.push(text4);

        const text4jp = new PIXI.Text({
            text: "それいがい…だめループ",
            style: this.defaultTextStyleJP,
        });
        text4jp.x = text4.x;
        text4jp.y = text4.y + text4.height * 1.1;
        this.pageInfos.push(text4jp);

        // pageInfoを表示
        this.pageInfos.forEach((pageInfo) => {
            this.container.addChild(pageInfo);
        });
        this.container.addChild(...this.butterflies);
    }

    // 3ページ目情報をセット
    private setPageInfoThree(): void {
        const title = new PIXI.Text({
            text: "Let's try to loop!",
            style: this.titleTextStyle,
        });
        title.anchor.x = 0.5;
        title.x = this.noteLeftX() + this.notebookSprite.width / 4;
        title.y =
            this.notebookSprite.y -
            this.notebookSprite.height / 2 +
            Const.MARGIN * 2;
        this.pageInfos.push(title);

        const titlejp = new PIXI.Text({
            text: "ループのれんしゅう",
            style: this.defaultTextStyleJP,
        });
        titlejp.anchor.x = 0.5;
        titlejp.x = title.x;
        titlejp.y = title.y + title.height * 1.1;
        this.pageInfos.push(titlejp);

        // 蝶々をセット
        for (let i = 0; i < 8; i++) {
            const butterfly = new Butterfly(
                "large",
                Const.COLOR_LIST[0],
                Const.COLOR_LIST[0],
                1,
                {
                    x: this.manager.app.screen.width,
                    y: this.manager.app.screen.height,
                },
            );
            this.butterflies.push(butterfly);
        }
        Const.COLOR_LIST.forEach((color) => {
            // subColorはcolorとは異なる色をランダムで選択
            const subColor = Utility.chooseAtRandom(
                Const.COLOR_LIST.filter((_color) => _color !== color),
                1,
            )[0];
            const butterfly = new Butterfly("large", color, subColor, 1, {
                x: this.manager.app.screen.width,
                y: this.manager.app.screen.height,
            });
            const butterfly2 = new Butterfly("large", color, color, 1, {
                x: this.manager.app.screen.width,
                y: this.manager.app.screen.height,
            });

            this.butterflies.push(butterfly);
            this.butterflies.push(butterfly2);
        });

        // butterfliesの並び順をシャッフル
        this.butterflies = Utility.shuffleArray(this.butterflies);
        this.butterflies.forEach((butterfly, index) => {
            butterfly.x =
                this.noteLeftX() +
                butterfly.width +
                Const.MARGIN * 3 +
                butterfly.width * 2 * (index % 6);
            butterfly.y =
                titlejp.y +
                titlejp.height +
                butterfly.height +
                Const.MARGIN * 2 +
                butterfly.height * 2 * Math.floor(index / 6);
            butterfly.isFlapping = true;
            butterfly.appear(false);
        });

        // pageInfoを表示
        this.pageInfos.forEach((pageInfo) => {
            this.container.addChild(pageInfo);
        });
        this.container.addChild(...this.butterflies);
        this.practiceMode = true;
    }

    // 4ページ目情報をセット
    private setPageInfoFour(): void {
        const title = new PIXI.Text({
            text: "Help Objects",
            style: this.titleTextStyle,
        });
        title.anchor.x = 0.5;
        title.x = this.noteLeftX() + this.notebookSprite.width / 4;
        title.y =
            this.notebookSprite.y -
            this.notebookSprite.height / 2 +
            Const.MARGIN * 2;
        this.pageInfos.push(title);

        const titlejp = new PIXI.Text({
            text: "おたすけ オブジェクト",
            style: this.defaultTextStyleJP,
        });
        titlejp.anchor.x = 0.5;
        titlejp.x = title.x;
        titlejp.y = title.y + title.height * 1.1;
        this.pageInfos.push(titlejp);

        Const.HELP_FLOWER_TYPES.forEach((type, index) => {
            const flower = new HelpFlower(
                type,
                this.manager.app.screen.width,
                this.manager.app.screen.height,
            );
            flower.x = this.noteLeftX() + Const.MARGIN + flower.width / 2;
            flower.y =
                titlejp.y +
                titlejp.height +
                Const.MARGIN +
                flower.height * 0.5 +
                flower.height * 2.5 * index;
            this.helpFlowers.push(flower);

            const text = new PIXI.Text({
                text: flower.description,
                style: this.defaultTextStyle,
            });
            text.x = flower.x + flower.width;
            text.y = flower.y - flower.height / 2;
            this.pageInfos.push(text);

            const textjp = new PIXI.Text({
                text: flower.descriptionJP,
                style: this.defaultTextStyleJP,
            });
            textjp.x = text.x;
            textjp.y = text.y + text.height * 1.1;
            this.pageInfos.push(textjp);
        });

        const title2 = new PIXI.Text({
            text: "Hindrance Objects",
            style: this.titleTextStyle,
        });
        title2.anchor.x = 0.5;
        title2.x = this.noteLeftX() + (this.notebookSprite.width * 3) / 4;
        title2.y = title.y;
        this.pageInfos.push(title2);

        const title2jp = new PIXI.Text({
            text: "おじゃま オブジェクト",
            style: this.defaultTextStyleJP,
        });
        title2jp.anchor.x = 0.5;
        title2jp.x = title2.x;
        title2jp.y = title2.y + title2.height * 1.1;
        this.pageInfos.push(title2jp);

        const text1 = new PIXI.Text({
            text: "Comming soon...",
            style: this.defaultTextStyle,
        });
        text1.x = this.manager.app.screen.width / 2 + Const.MARGIN * 2;
        text1.y = title2jp.y + title2jp.height + Const.MARGIN;
        this.pageInfos.push(text1);

        // pageInfoを表示
        this.pageInfos.forEach((pageInfo) => {
            this.container.addChild(pageInfo);
        });
        this.container.addChild(...this.helpFlowers);
    }

    //  ページ情報をリセット
    private async resetPageInfo(): Promise<void> {
        this.butterflies.forEach((butterfly) => {
            butterfly.isFlying = false;
            butterfly.delete(0.05);
        });
        this.butterflies = [];
        this.helpFlowers.forEach((flower) => {
            flower.delete(0.05);
        });
        this.helpFlowers = [];
        await Promise.all(
            this.pageInfos.map((pageInfo) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                return this.fadeOut(pageInfo, 0.05);
            }),
        );
    }

    private noteLeftX(): number {
        return this.notebookSprite.x - this.notebookSprite.width / 2;
    }
}
