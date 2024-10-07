// eslint.config.js
import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import tsEsLintPlugin from "@typescript-eslint/eslint-plugin";
import tsEsLintParser from "@typescript-eslint/parser";

export default [
  // 無視するファイルを指定（従来の .eslintignore に相当）
  { ignores: ["dist"] },
  // eslint:recommendedに相当
  js.configs.recommended,
  // eslint-config-prettierはrulesを持つオブジェクトなので、ここに並べられる
  eslintConfigPrettier,
  // プラグインを登録
  {
    plugins: {
      "@typescript-eslint": tsEsLintPlugin,
    },
  },
  // TypeScript用の設定
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.cts', '**/*.mts'],
    languageOptions: {
      parser: tsEsLintParser,
      parserOptions: {
        // project: true,
        project: './tsconfig.json',
      },
    },
    rules: {
      // @typescript-eslint/eslint-pluginに付属のルールを適用
      ...tsEsLintPlugin.configs["eslint-recommended"].overrides[0].rules,
      ...tsEsLintPlugin.configs["recommended-type-checked"].rules,
      // 追加の設定
      "@typescript-eslint/no-explicit-any": "error",
    }
  }
];