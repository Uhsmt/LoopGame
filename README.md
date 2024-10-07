# loop
browser game 'loop'
https://uhsmt.github.io/LoopGame/


## TODO
### phase 1 for release
- [x] Loop当たり判定調整
- [x] game finish&restart
- [x] deltaによるスピード調整
- [ ] BitmapText font
- [ ] canvas外の場合のライン描画
- [ ] soundセット
- [ ] lint

### phase1.5
- [ ] 記録保持 

### Design
- [ ] メッセージの日本語/英語対応
- [ ] 猫ちゃんスプライトを作る
 - [ ] ノーマル
 - [ ] 登場モーション
 - [ ] 居眠りモーション
 - [ ] 負けモーション

### phase2 お助けオブジェクト
- [ ] お助けsprite作成
- [ ] あつまれ！
- [ ] 時間延長
- [ ] ループ延長

### phase3 お邪魔オブジェクト
- [ ] お邪魔sprite作成
- [ ] 虫除け
- [ ] 含めるとbadloop
- [ ] loop不可

### phase4 bonus stage
 - [ ] bonus butterflyモーション
 - [ ] bonus入りの分岐とクリア判定
 - [ ] 専用背景素材

### phase5 スマホ対応

## development memo

### local
npm start
http://localhost:1234/

### debug
npm run debug

### build(Not need. Github Action build and deploy automaticaly.)
npm run build

### pritter
npx prettier --write ./src/scripts/utils/Utility.ts

### eslint 
npx eslint --fix "src/scripts/utils/Utility.ts"