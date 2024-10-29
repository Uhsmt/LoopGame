# loop
browser game 'loop'
https://uhsmt.github.io/LoopGame/
zzzz

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

### Rule
- [x] basic rule
- [x] paging
- [x] 特殊オブジェクト
- [ ] おじゃまオブジェクト

### phase2.5
- [ ] 記録保持 

### phase3 bonus stage
 - [x] bonus butterflyモーション
 - [x] bonus入りの分岐とクリア判定
 - [x] 専用背景素材
 - [ ] ステージ導入エフェクト
 - [ ] ステージ終わりエフェクト


### small bug fix
- [ ] ループ線に当たったら避ける

### Design
- [ ] soundセット
- [ ] メッセージの日本語/英語対応
- [ ] 猫ちゃんスプライトを作る
 - [ ] ノーマル
 - [ ] 登場モーション
 - [ ] 居眠りモーション
 - [ ] 負けモーション

### interactive Design
- [ ] Effect(filter)
  - [ ] flower
  - [ ] 捕まえた蝶の数
  - [ ] トータルスコア

### phase4 お邪魔オブジェクト
- [ ] お邪魔sprite作成
- [ ] 虫除け
- [ ] 含めるとbadloop
- [ ] loop不可

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
