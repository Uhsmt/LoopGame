import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, ChildProcess } from "child_process";
import * as path from "path";

describe("Development Server Integration", () => {
    let devServerProcess: ChildProcess;
    const projectRoot = path.resolve(__dirname, "../..");

    beforeAll(() => {
        // This test validates that the dev server can start without compilation errors
        // It's important to catch the original issue where test files caused webpack errors
    });

    afterAll(() => {
        if (devServerProcess) {
            devServerProcess.kill();
        }
    });

    it("should start webpack dev server without TypeScript compilation errors", async () => {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                if (devServerProcess) {
                    devServerProcess.kill();
                }
                reject(new Error("Dev server startup timeout"));
            }, 30000);

            devServerProcess = spawn("npm", ["start"], {
                cwd: projectRoot,
                stdio: "pipe",
            });

            let stdout = "";
            let stderr = "";
            let compilationComplete = false;

            devServerProcess.stdout?.on("data", (data) => {
                stdout += data.toString();

                // Check for successful compilation
                if (
                    stdout.includes("webpack") &&
                    stdout.includes("compiled successfully")
                ) {
                    compilationComplete = true;
                    clearTimeout(timeout);
                    devServerProcess.kill();
                    resolve(true);
                }
            });

            devServerProcess.stderr?.on("data", (data) => {
                stderr += data.toString();

                // Check for the original TypeScript errors that we fixed
                const originalErrors = [
                    "Property 'PIXI' does not exist on type 'Window & typeof globalThis'",
                    "Property 'memory' does not exist on type 'Performance'",
                    "Property 'use' does not exist on type 'FullConfig'",
                    "Property 'setUserAgent' does not exist on type 'Page'",
                    "Cannot find name 'beforeEach'",
                ];

                const hasOriginalError = originalErrors.some((error) =>
                    stderr.includes(error),
                );

                if (hasOriginalError) {
                    clearTimeout(timeout);
                    devServerProcess.kill();
                    reject(
                        new Error(
                            `Dev server failed with original TypeScript errors: ${stderr}`,
                        ),
                    );
                }
            });

            devServerProcess.on("error", (error) => {
                clearTimeout(timeout);
                reject(error);
            });

            devServerProcess.on("exit", (code) => {
                clearTimeout(timeout);
                if (code !== 0 && !compilationComplete) {
                    reject(
                        new Error(
                            `Dev server exited with code ${code}. Stderr: ${stderr}`,
                        ),
                    );
                }
            });
        });
    }, 35000);
});
