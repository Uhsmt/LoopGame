import { describe, it, expect } from "vitest";
import * as path from "path";
import * as fs from "fs";
import { execSync } from "child_process";

describe("Webpack Compilation Process", () => {
    const projectRoot = path.resolve(__dirname, "../../..");

    it("should not include test files in webpack compilation", async () => {
        // Create a temporary test file with TypeScript errors that would break compilation
        const tempTestFile = path.join(projectRoot, "tests/temp-error-test.ts");
        const tempTestContent = `
// This file has intentional TypeScript errors that would break webpack compilation
// if test files were included in the webpack build process

import { NonExistentType } from './non-existent-module';

export class BrokenTestClass {
    public brokenMethod(): NonExistentType {
        return this.undefinedProperty.invalidAccess;
    }
    
    public anotherBrokenMethod() {
        // Using window.PIXI without proper types (one of the original errors)
        return window.PIXI.someNonExistentMethod();
    }
}

// Using beforeEach without proper test environment setup
beforeEach(() => {
    // This would cause compilation errors if included in webpack
});
`;

        try {
            // Write the temporary test file
            fs.writeFileSync(tempTestFile, tempTestContent);

            // Try to compile with webpack - this should succeed because test files are excluded
            const webpackCommand =
                "npx webpack --mode=development --stats=errors-only";

            expect(() => {
                execSync(webpackCommand, {
                    cwd: projectRoot,
                    stdio: "pipe",
                    timeout: 30000,
                });
            }).not.toThrow();
        } finally {
            // Clean up the temporary test file
            if (fs.existsSync(tempTestFile)) {
                fs.unlinkSync(tempTestFile);
            }
        }
    });

    it("should validate that TypeScript compilation uses correct config", () => {
        const buildTsConfigPath = path.join(projectRoot, "tsconfig.build.json");
        const buildTsConfig = JSON.parse(
            fs.readFileSync(buildTsConfigPath, "utf8"),
        );

        // Verify that test files are excluded from build config
        expect(buildTsConfig.exclude).toContain("tests/**/*");

        // Verify that only production files are included
        expect(buildTsConfig.include).toContain("src/**/*");
        expect(buildTsConfig.include).not.toContain("tests/**/*");
    });

    it("should prevent the original error scenario", async () => {
        // Test that the specific error patterns from the original issue are handled
        const errorPatterns = [
            "Property 'PIXI' does not exist on type 'Window & typeof globalThis'",
            "Property 'memory' does not exist on type 'Performance'",
            "Property 'use' does not exist on type 'FullConfig<{}, {}>'",
            "Property 'setUserAgent' does not exist on type 'Page'",
            "Cannot find name 'beforeEach'",
        ];

        // These errors should not appear in webpack compilation because test files are excluded
        const webpackConfigPath = path.join(projectRoot, "webpack.config.cjs");
        const webpackConfig = await import(webpackConfigPath);

        // Verify that the TypeScript rule excludes test files
        const tsRule = webpackConfig.default.module.rules.find(
            (rule: any) => rule.test && rule.test.toString().includes("\\.ts$"),
        );

        expect(tsRule).toBeDefined();
        expect(tsRule.exclude).toBeDefined();

        const excludePatterns = Array.isArray(tsRule.exclude)
            ? tsRule.exclude
            : [tsRule.exclude];
        const hasTestsExclude = excludePatterns.some((pattern: RegExp) =>
            pattern.toString().includes("tests"),
        );

        expect(hasTestsExclude).toBe(true);

        // Verify the build config excludes test files
        expect(tsRule.use.options.configFile).toBe("tsconfig.build.json");
    });
});
