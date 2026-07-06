# サウンド素材リスト / Sound Asset List

issue #5 のためのサウンド素材の一覧と選定方針のメモ。

## ライセンス方針 / License Policy

このリポジトリは公開GitHubリポジトリのため、音源ファイルをコミットすると
第三者が素材単体で取り出せる状態になる。したがって
**「ゲーム組込みは可・素材単体の再配布は不可」という規約のサイト
(効果音ラボ・魔王魂・DOVA-SYNDROME等)は使用しない。**

採用するライセンス:

| 優先 | ライセンス               | クレジット                        | 代表サイト                                                                                                                     |
| ---- | ------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1    | CC0 (パブリックドメイン) | 不要                              | [Kenney](https://kenney.nl/) (SE/ジングル), [FreePD](https://freepd.com/) (BGM)                                                |
| 2    | CC BY 4.0                | フッターの material credit に表記 | [incompetech](https://incompetech.com/) (BGM), [OtoLogic](https://otologic.jp/) (SE) ※OtoLogicは採用時に規約を手動確認すること |

新しい素材を追加するときは、このファイルに出典とライセンスを追記すること。

## BGM(ループ再生)

| ID  | 用途                         | イメージ               | 状態       |
| --- | ---------------------------- | ---------------------- | ---------- |
| B1  | タイトル + 説明画面(共用)    | ゆったり・森・平和     | 候補選定中 |
| B2  | ゲームプレイ中(60秒ステージ) | 軽快・少し急かされる   | 候補選定中 |
| B3  | ボーナスステージ             | アップテンポ・お祭り感 | 候補選定中 |

リザルト画面は専用BGMなし(ジングル S7 で代用)。

## SE(効果音)

| ID  | トリガー                     | イメージ                      | 状態       |
| --- | ---------------------------- | ----------------------------- | ---------- |
| S1  | 空ループ(0匹)                | 「ぷすっ」と軽い空振り音      | 候補選定中 |
| S2  | 1〜9匹捕獲                   | ぽんっ + キラッ               | 候補選定中 |
| S3  | 10匹以上捕獲                 | 豪華なキラキラ音              | 候補選定中 |
| S4  | お助けフラワー出現           | ぽよん / きらーん             | 候補選定中 |
| S5  | お助け効果発動               | 共通1つ(将来 freeze 等で分化) | 候補選定中 |
| S6  | ボーナスButterfly出現        | 特別感のあるキラーン          | 候補選定中 |
| S7  | TotalScore表示               | カウントアップ音 + ジングル   | 候補選定中 |
| S8  | New Record!                  | 短いファンファーレ            | 候補選定中 |
| S9  | ループ失敗(Bad Loop -20)     | 軽めのブブー                  | 候補選定中 |
| S10 | ボタン選択(葉っぱを囲んだ時) | 決定音                        | 候補選定中 |
| S11 | 残り時間わずか               | チクタク / ピッ               | 候補選定中 |
| S12 | お邪魔オブジェクト登場(#3)   | 不穏な登場音                  | 候補選定中 |
| S13 | お邪魔エフェクト被弾(#3)     | ネガティブな被弾音            | 候補選定中 |

S12 / S13 は #3(お邪魔オブジェクト)実装前だが、素材だけ先に確保する。

## 採用素材の記録

すべて `public/assets/sounds/` に m4a (AAC) で配置。
**oggはiOS Safariで再生できないため、追加時も必ずm4a/mp3に変換すること。**

| ID    | ファイル               | 元素材                           | 出典                             | ライセンス    | 加工                                                                  |
| ----- | ---------------------- | -------------------------------- | -------------------------------- | ------------- | --------------------------------------------------------------------- |
| B1    | bgm_title.m4a          | Dewdrop Fantasy (Kevin MacLeod)  | incompetech.com                  | CC BY 4.0     | 先頭128秒に切り出し+フェードアウト                                    |
| B2a   | bgm_stage1.m4a         | Wholesome (Kevin MacLeod)        | incompetech.com                  | CC BY 4.0     | AAC変換のみ                                                           |
| B2b   | bgm_stage2.m4a         | Fluffing a Duck (Kevin MacLeod)  | incompetech.com                  | CC BY 4.0     | AAC変換のみ                                                           |
| B3    | bgm_bonus.m4a          | Dreamy Flashback (Kevin MacLeod) | incompetech.com                  | CC BY 4.0     | AAC変換のみ                                                           |
| S1    | se_switch.m4a          | 自作(コルクポップ風「スポッ」)   | このリポジトリ                   | 自作          | 空ループ・色替えで共用                                                |
| S8'   | se_applause.m4a        | Applause (Yo Frankie! / LeeZH)   | opengameart.org/content/applause | CC BY 3.0     | 0.3〜4.9秒を切り出し+フェード(New Record時)。フッターにクレジット表記 |
| S2    | se_capture.m4a         | 自作(チャイム3音アルペジオ)      | このリポジトリ                   | 自作          | -                                                                     |
| S3    | se_capture_many.m4a    | 自作(チャイム4音+和音)           | このリポジトリ                   | 自作          | -                                                                     |
| S4/S6 | se_powerup.m4a         | powerUp11                        | Kenney Digital Audio             | CC0           | AAC変換のみ(S6はS4と共用)                                             |
| S5    | (なし)                 | -                                | -                                | -             | -                                                                     |
| S7    | se_score.m4a           | jingles_PIZZI10                  | Kenney Music Jingles             | CC0           | 再生時にplaybackRateで音階上げ                                        |
| S8    | (なし・保留)           | -                                | -                                | -             | -                                                                     |
| S9    | se_bad_loop.m4a        | error_007                        | Kenney Interface Sounds          | CC0           | AAC変換のみ                                                           |
| S10   | se_select.m4a          | confirmation_001                 | Kenney Interface Sounds          | CC0           | AAC変換のみ                                                           |
| S11   | se_tick.m4a            | Clock ticking (natalie)          | Wikimedia Commons(PD)            | Public Domain | ティック1打を切り出し。再生時にrate 1.5/1.15で高低交互(0.5秒間隔)     |
| S12   | se_obstacle_appear.m4a | lowRandom                        | Kenney Digital Audio             | CC0           | AAC変換のみ(#3実装まで未使用)                                         |
| S13   | se_obstacle_hit.m4a    | minimize_006                     | Kenney Interface Sounds          | CC0           | AAC変換のみ(#3実装まで未使用)                                         |

補足:

-   BGM B2はステージごとに bgm_stage1 / bgm_stage2 を交互に使う
-   FreePDは2025年にサービス終了していたため不使用
-   OtoLogicは規約ページがbot保護で自動確認できなかったため今回は不使用
-   incompetech(CC BY 4.0)のクレジットは index.html の material credit に記載
