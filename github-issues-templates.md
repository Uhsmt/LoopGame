# GitHub Issues Templates - テスト実装計画

## 🎯 親Issue: テスト実装計画 - 総合的なテスト戦略の導入

**タイトル**: `テスト実装計画 - 総合的なテスト戦略の導入`

**本文**:
```markdown
# 🧪 テスト実装計画 - 総合的なテスト戦略の導入

## 📋 概要
LoopGameプロジェクトにテストを導入し、コードの品質と保守性を向上させます。

## 🎯 目標
- コードの品質向上
- リファクタリング時の安全性確保
- バグの早期発見
- 機能追加時の既存機能保護

## 📊 テスト対象分析
### 高優先度
- **Utility.ts**: 純粋関数群（最も効果的）
- **LineDrawer.ts**: 複雑なアルゴリズム（線の交差判定など）
- **Butterfly.ts**: コアロジック（移動アルゴリズム）
- **GameplayState.ts**: ビジネスロジック（スコア計算）

### 中優先度
- **GameStateManager.ts**: 状態遷移
- **コンポーネント連携**: Butterfly × LineDrawer

### 低優先度
- **game.ts**: アプリケーション起動
- **E2Eテスト**: 完全ゲームプレイ

## 🚀 実装フェーズ
このissueは以下の子issueに分解されます：

- [ ] Phase 1: テスト環境構築 (#XX)
- [ ] Phase 2: ユニットテスト実装 (#XX)
- [ ] Phase 3: 統合テスト実装 (#XX)
- [ ] Phase 4: PIXI.js対応テスト (#XX)

## 📈 期待される効果
- 既存バグの発見と修正
- 新機能追加時の品質保証
- コードメンテナンス性の向上
- 開発速度の長期的な向上

## 🔗 関連Issue
このテスト計画は既存のissue（#2, #3, #4, #5, #7, #8, #10, #11）の品質向上にも貢献します。

---
🤖 Generated with [Claude Code](https://claude.ai/code)
```

---

## 🔧 子Issue 1: Phase 1: テスト環境構築とVitest導入

**タイトル**: `Phase 1: テスト環境構築とVitest導入`

**本文**:
```markdown
# 🔧 Phase 1: テスト環境構築とVitest導入

## 📋 概要
LoopGameプロジェクトにVitestベースのテスト環境を構築します。

## 🎯 作業内容
### 1. 依存関係の追加
```bash
npm install -D vitest @vitest/ui jsdom @types/jsdom
```

### 2. 設定ファイル作成
- `vitest.config.ts`: Vitest設定
- `tests/setup/test-setup.ts`: テストセットアップ

### 3. ディレクトリ構造作成
```
tests/
├── unit/
│   ├── utils/
│   └── components/
├── integration/
└── setup/
    └── test-setup.ts
```

### 4. package.json更新
テストスクリプトの追加:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

## ✅ 完了条件
- [ ] Vitestが正常にインストールされている
- [ ] 設定ファイルが作成されている
- [ ] テストディレクトリ構造が作成されている
- [ ] `npm test` コマンドが実行できる
- [ ] 簡単なサンプルテストが動作する

## 🔗 関連
- 親Issue: テスト実装計画 (#XX)
- 次のPhase: Phase 2 ユニットテスト実装 (#XX)

## 📚 参考資料
- [Vitest公式ドキュメント](https://vitest.dev/)
- [PIXI.js テスト設定参考](https://stackoverflow.com/questions/78123897/testing-pixijs-in-vitest)

---
🤖 Generated with [Claude Code](https://claude.ai/code)
```

---

## 🧪 子Issue 2: Phase 2: ユニットテスト実装 - コア機能

**タイトル**: `Phase 2: ユニットテスト実装 - コア機能`

**本文**:
```markdown
# 🧪 Phase 2: ユニットテスト実装 - コア機能

## 📋 概要
最も重要なコア機能のユニットテストを実装します。

## 🎯 実装対象
### 1. Utility.ts（最高優先度）
```typescript
// tests/unit/utils/Utility.test.ts
- random(): 範囲内ランダム値生成
- getDistance(): 2点間距離計算
- chooseAtRandom(): 配列からランダム選択
- formatNumberWithCommas(): 数値フォーマット
- shuffleArray(): 配列シャッフル
```

### 2. LineDrawer.ts（高優先度）
```typescript
// tests/unit/components/LineDrawer.test.ts
- doLinesIntersect(): 線分交差判定アルゴリズム
- direction(): 外積による方向計算
- getLoopSegments(): ループ検出ロジック
```

### 3. Butterfly.ts（高優先度）
```typescript
// tests/unit/components/Butterfly.test.ts
- fly(): 移動アルゴリズム（境界反発）
- switchColor(): 色変更ロジック
- setGatherPoint(): ギャザー機能
- getObjectCenter(): 座標計算
```

### 4. GameplayState.ts（中優先度）
```typescript
// tests/unit/scenes/GameplayState.test.ts
- isSuccessLoop(): ループ成功判定
- スコア計算ロジック
- エフェクト処理（freeze、gather等）
```

## ✅ 完了条件
- [ ] Utility.ts: 80%以上のカバレッジ
- [ ] LineDrawer.ts: 主要アルゴリズムのテスト完了
- [ ] Butterfly.ts: 移動ロジックのテスト完了
- [ ] GameplayState.ts: ビジネスロジックのテスト完了
- [ ] 全テストが成功する

## 🔗 関連
- 親Issue: テスト実装計画 (#XX)
- 前のPhase: Phase 1 テスト環境構築 (#XX)
- 次のPhase: Phase 3 統合テスト実装 (#XX)

---
🤖 Generated with [Claude Code](https://claude.ai/code)
```

---

## 🔄 子Issue 3: Phase 3: 統合テスト実装 - 状態管理とコンポーネント連携

**タイトル**: `Phase 3: 統合テスト実装 - 状態管理とコンポーネント連携`

**本文**:
```markdown
# 🔄 Phase 3: 統合テスト実装 - 状態管理とコンポーネント連携

## 📋 概要
コンポーネント間の連携と状態管理の統合テストを実装します。

## 🎯 実装対象
### 1. GameStateManager.ts
```typescript
// tests/integration/GameStateManager.test.ts
- 状態遷移フロー（Start → Gameplay → Result）
- 状態のライフサイクル（onEnter/onExit）
- 不正な状態遷移の防止
```

### 2. ループ完成処理
```typescript
// tests/integration/LoopCompletion.test.ts
- LineDrawer × Butterfly連携
- ループ描画完了時の蝶キャプチャ処理
- スコア計算とエフェクト発動
```

### 3. パワーアップシステム
```typescript
// tests/integration/PowerUpSystem.test.ts
- HelpFlower × Butterfly連携
- 各種エフェクト（freeze、gather、longLoop、timeplus）
- エフェクトの重複処理
```

## ✅ 完了条件
- [ ] GameStateManager: 全状態遷移パターンのテスト
- [ ] ループ完成処理: 正常・異常系両方のテスト
- [ ] パワーアップシステム: 全エフェクトのテスト
- [ ] 統合テストが全て成功する

## 🔗 関連
- 親Issue: テスト実装計画 (#XX)  
- 前のPhase: Phase 2 ユニットテスト実装 (#XX)
- 次のPhase: Phase 4 PIXI.js対応テスト (#XX)

---
🤖 Generated with [Claude Code](https://claude.ai/code)
```

---

## 🎮 子Issue 4: Phase 4: PIXI.js対応テスト - レンダリングとE2E

**タイトル**: `Phase 4: PIXI.js対応テスト - レンダリングとE2E`

**本文**:
```markdown
# 🎮 Phase 4: PIXI.js対応テスト - レンダリングとE2E

## 📋 概要
PIXI.jsのレンダリング部分とエンドツーエンドテストを実装します。

## 🎯 実装対象
### 1. PIXI.js Mock設定
```typescript
// tests/setup/pixi-mock.ts
- Canvas APIのモック
- WebGL/Canvas2Dレンダラーのモック
- テクスチャ読み込みのモック
```

### 2. レンダリングテスト
```typescript
// tests/unit/rendering/
- Sprite作成・配置テスト
- アニメーション処理テスト
- UI要素のレンダリング
```

### 3. E2Eテスト（Playwright/Cypress検討）
```typescript
// tests/e2e/
- ゲーム起動からプレイまでの完全フロー
- ループ描画 → 蝶キャプチャの実際の操作
- スコア表示と結果画面
```

## ⚠️ 技術的課題
- PIXI.js WebGLコンテキストのモック
- Canvas要素のテスト環境での扱い
- 非同期アセット読み込みのテスト

## ✅ 完了条件
- [ ] PIXI.jsのモック設定完了
- [ ] レンダリング関連のテスト実装
- [ ] E2Eテストフレームワーク選定・導入
- [ ] 基本的なE2Eテストシナリオ実装
- [ ] 全テストが安定して実行される

## 🔗 関連
- 親Issue: テスト実装計画 (#XX)
- 前のPhase: Phase 3 統合テスト実装 (#XX)

## 📚 参考資料
- [PIXI.js Testing with Vitest](https://stackoverflow.com/questions/78123897/testing-pixijs-in-vitest)
- [PIXI.js Tests with Jest](https://stackoverflow.com/questions/73394433/pixi-js-tests-with-jest-in-react-spa)

---
🤖 Generated with [Claude Code](https://claude.ai/code)
```

---

## 📝 使用方法

1. **親Issue**から順番に作成
2. 子Issue作成時に親IssueのURL（#番号）を関連として追加
3. 各フェーズは前のフェーズ完了後に着手

このファイルを参考に、GitHub上でIssueを作成してください。MCP設定完了後は、これらのテンプレートを使って自動作成も可能になります！