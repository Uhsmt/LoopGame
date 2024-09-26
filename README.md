# loop
browser game 'loop'



## development memo

first start :  
install typescript
`npm install`

server start :  
`npm run dev`

build:
`npm run build`

access:  
`http://localhost:3000/`

server stop :  
`Ctrl + C`


static check :
`npm run fix:eslint`
`npx eslint filename (optional:--fix)`


## TODO
### phase 1
- [ ] start menu
- [ ] game stage
- [ ] stage2~3

- [ ] game over
- [ ] game finish
- [ ] soundセット
- [ ] server upload
- [ ] BitmapText font
- [ ] 蝶々の属性作りこみ


### optional
- [ ] loop判定エリアの拡大
- [ ] メッセージの日本語/英語対応
- [ ] 猫ちゃんスプライトを作る
 - [ ]ノーマル
 - [ ]登場モーション
 - [ ]居眠りモーション
 - [ ]負けモーション


### phase2
- [ ] bonus stage
 - [ ] bonus butterflyモーション
 - [ ] bonus入りの分岐とクリア判定
 - [ ] 専用背景素材
- [ ] お助けオブジェクト
 - [ ] お助けsprite作成
 - [ ] あつまれ！
 - [ ] 時間延長
 - [ ] ループ延長

phase3
- [ ] お邪魔オブジェクト
 - [ ] お邪魔sprite作成
 - [ ] 虫除け
 - [ ] 含めるとbadloop
 - [ ] loop不可


# local
npx webpack serve
http://localhost:1234/

# build
npx webpack

# gh-pagesブランチの作成
git checkout -b gh-pages

# distフォルダの内容を追加
git add dist -f

# コミット
git commit -m "Deploy to GitHub Pages"

# プッシュ
git push -u origin gh-pages