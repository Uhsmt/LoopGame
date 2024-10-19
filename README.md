# loop
browser game 'loop'
https://uhsmt.github.io/LoopGame/


## TODO
### phase 1 for release
- [x] Loop当たり判定調整
- [x] game finish&restart
- [x] deltaによるスピード調整
- [x] Font
- [x] canvas外の場合のライン描画
- [x] eslint
- [x] Prettier
- [x] スマホ制御
- [x] 蝶のカラー調整
- [x] share card

### phase2 お助けオブジェクト
- [x] お助けsprite作成
- [x] あつまれ！
- [x] 時間延長
- [x] ループ延長
- [x] とまれ！

### phase2.5
- [ ] 記録保持 

### Rule
- [ ] basic rule
- [ ] paging
- [ ] 特殊オブジェクト

### Design
- [ ] メッセージの日本語/英語対応
- [ ] 猫ちゃんスプライトを作る
 - [ ] ノーマル
 - [ ] 登場モーション
 - [ ] 居眠りモーション
 - [ ] 負けモーション
- [ ] soundセット

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

### pritter & eslint
- npm run lint:fix

別々にやりたいとき
- npx prettier --write filename
- npx eslint --fix filename
