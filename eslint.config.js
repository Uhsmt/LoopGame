// eslint.config.js
import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import tsEsLintPlugin from "@typescript-eslint/eslint-plugin";
import tsEsLintParser from "@typescript-eslint/parser";

export default [
    // 無視するファイルを指定（従来の .eslintignore に相当）
    { ignores: ["dist", "**/*.cjs", ".claude/worktrees"] },
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
        files: ["**/*.ts", "**/*.tsx", "**/*.cts", "**/*.mts"],
        languageOptions: {
            parser: tsEsLintParser,
            parserOptions: {
                // project: true,
                project: "./tsconfig.json",
            },
        },
        rules: {
            // @typescript-eslint/eslint-pluginに付属のルールを適用
            ...tsEsLintPlugin.configs["eslint-recommended"].overrides[0].rules,
            ...tsEsLintPlugin.configs["recommended-type-checked"].rules,
            // 追加の設定
            "@typescript-eslint/no-explicit-any": "error",
        },
    },
    // Test files - more lenient rules
    {
        files: ["tests/**/*.ts", "**/*.test.ts", "**/*.spec.ts"],
        languageOptions: {
            parser: tsEsLintParser,
            parserOptions: {
                project: "./tsconfig.json",
            },
        },
        rules: {
            // @typescript-eslint/eslint-pluginに付属のルールを適用
            ...tsEsLintPlugin.configs["eslint-recommended"].overrides[0].rules,
            ...tsEsLintPlugin.configs["recommended-type-checked"].rules,
            // Relax rules for test files
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/no-unsafe-function-type": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/require-await": "off",
        },
    },
];
