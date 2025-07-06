import { describe, it, expect } from "vitest";
import * as path from "path";
import * as fs from "fs";

describe("Webpack Configuration", () => {
    const webpackConfigPath = path.resolve(
        __dirname,
        "../../../webpack.config.cjs",
    );

    it("should exist and be readable", () => {
        expect(fs.existsSync(webpackConfigPath)).toBe(true);
        expect(() => {
            fs.readFileSync(webpackConfigPath, "utf8");
        }).not.toThrow();
    });

    it("should exclude test files from TypeScript compilation", () => {
        const configContent = fs.readFileSync(webpackConfigPath, "utf8");

        // Check that tests directory is excluded
        expect(configContent).toMatch(/exclude.*tests/);

        // Check that ts-loader is configured with proper options
        expect(configContent).toMatch(/ts-loader/);
        expect(configContent).toMatch(/configFile.*tsconfig\.build\.json/);
    });

    it("should have a separate build TypeScript config", () => {
        const buildTsConfigPath = path.resolve(
            __dirname,
            "../../../tsconfig.build.json",
        );
        expect(fs.existsSync(buildTsConfigPath)).toBe(true);

        const buildTsConfig = JSON.parse(
            fs.readFileSync(buildTsConfigPath, "utf8"),
        );

        // Should exclude tests directory
        expect(buildTsConfig.exclude).toContain("tests/**/*");

        // Should include only production files
        expect(buildTsConfig.include).toContain("src/**/*");
        expect(buildTsConfig.include).not.toContain("tests/**/*");
    });

    it("should prevent compilation of test files in production bundle", async () => {
        const webpackConfig = await import(webpackConfigPath);

        // Find the TypeScript rule
        const tsRule = webpackConfig.default.module.rules.find(
            (rule: any) => rule.test && rule.test.toString().includes("\\.ts$"),
        );

        expect(tsRule).toBeDefined();
        expect(tsRule.exclude).toBeDefined();

        // Should exclude both node_modules and tests
        const excludePatterns = Array.isArray(tsRule.exclude)
            ? tsRule.exclude
            : [tsRule.exclude];
        const hasTestsExclude = excludePatterns.some((pattern: RegExp) =>
            pattern.toString().includes("tests"),
        );

        expect(hasTestsExclude).toBe(true);
    });

    it("should use build-specific TypeScript configuration", async () => {
        const webpackConfig = await import(webpackConfigPath);

        const tsRule = webpackConfig.default.module.rules.find(
            (rule: any) => rule.test && rule.test.toString().includes("\\.ts$"),
        );

        expect(tsRule.use).toBeDefined();
        expect(tsRule.use.loader).toBe("ts-loader");
        expect(tsRule.use.options).toBeDefined();
        expect(tsRule.use.options.configFile).toBe("tsconfig.build.json");
    });
});
