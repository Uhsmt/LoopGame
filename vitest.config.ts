import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./tests/setup/test-setup.ts"],
        include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
        exclude: ["tests/e2e/**/*", "node_modules/**/*"],
        coverage: {
            reporter: ["text", "json", "html"],
            exclude: ["node_modules/", "tests/", "dist/", "*.config.*"],
        },
    },
    resolve: {
        alias: {
            "@": "./src",
        },
    },
});
