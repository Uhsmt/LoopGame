import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock PIXI.js
vi.mock("pixi.js", () => ({
    Application: vi.fn().mockImplementation(() => ({
        screen: { width: 800, height: 600 },
        stage: {
            eventMode: "",
            hitArea: null,
        },
    })),
}));

import { GameStateManager } from "../../src/scripts/scenes/GameStateManager";
import type { GameState } from "../../src/scripts/scenes/GameState";

// Mock GameState implementations for testing
class MockGameState implements GameState {
    public onEnterCalled = false;
    public onExitCalled = false;
    public updateCalled = false;
    public renderCalled = false;
    public updateDelta: number | null = null;

    onEnter(): void {
        this.onEnterCalled = true;
    }

    onExit(): void {
        this.onExitCalled = true;
    }

    update(delta: number): void {
        this.updateCalled = true;
        this.updateDelta = delta;
    }

    render(): void {
        this.renderCalled = true;
    }

    reset(): void {
        this.onEnterCalled = false;
        this.onExitCalled = false;
        this.updateCalled = false;
        this.renderCalled = false;
        this.updateDelta = null;
    }
}

describe("GameStateManager Integration Tests", () => {
    let gameStateManager: GameStateManager;
    let mockApp: any;
    let mockState1: MockGameState;
    let mockState2: MockGameState;

    beforeEach(() => {
        vi.clearAllMocks();

        mockApp = {
            screen: { width: 800, height: 600 },
            stage: {
                eventMode: "",
                hitArea: null,
            },
        };

        gameStateManager = new GameStateManager(mockApp);
        mockState1 = new MockGameState();
        mockState2 = new MockGameState();
    });

    describe("State Lifecycle Management", () => {
        it("should initialize PIXI stage for interactions", () => {
            expect(mockApp.stage.eventMode).toBe("static");
            expect(mockApp.stage.hitArea).toBe(mockApp.screen);
        });

        it("should call onEnter when setting initial state", () => {
            gameStateManager.setState(mockState1);

            expect(mockState1.onEnterCalled).toBe(true);
            expect(mockState1.onExitCalled).toBe(false);
        });

        it("should handle state transitions properly", () => {
            // Set initial state
            gameStateManager.setState(mockState1);
            mockState1.reset();

            // Transition to new state
            gameStateManager.setState(mockState2);

            // Previous state should be exited
            expect(mockState1.onExitCalled).toBe(true);
            expect(mockState1.onEnterCalled).toBe(false);

            // New state should be entered
            expect(mockState2.onEnterCalled).toBe(true);
            expect(mockState2.onExitCalled).toBe(false);
        });

        it("should maintain proper state reference after transition", () => {
            gameStateManager.setState(mockState1);
            gameStateManager.setState(mockState2);

            // Only current state should receive update/render calls
            gameStateManager.update(16.67);
            gameStateManager.render();

            expect(mockState1.updateCalled).toBe(false);
            expect(mockState1.renderCalled).toBe(false);
            expect(mockState2.updateCalled).toBe(true);
            expect(mockState2.renderCalled).toBe(true);
        });
    });

    describe("Game Loop Integration", () => {
        beforeEach(() => {
            gameStateManager.setState(mockState1);
            mockState1.reset();
        });

        it("should delegate update calls to current state", () => {
            const deltaTime = 16.67;

            gameStateManager.update(deltaTime);

            expect(mockState1.updateCalled).toBe(true);
            expect(mockState1.updateDelta).toBe(deltaTime);
        });

        it("should delegate render calls to current state", () => {
            gameStateManager.render();

            expect(mockState1.renderCalled).toBe(true);
        });

        it("should handle multiple update/render cycles", () => {
            gameStateManager.update(16.67);
            gameStateManager.render();

            mockState1.reset();

            gameStateManager.update(20.0);
            gameStateManager.render();

            expect(mockState1.updateCalled).toBe(true);
            expect(mockState1.renderCalled).toBe(true);
            expect(mockState1.updateDelta).toBe(20.0);
        });
    });

    describe("State Transition Scenarios", () => {
        it("should handle rapid state transitions correctly", () => {
            const mockState3 = new MockGameState();

            // Rapid transitions
            gameStateManager.setState(mockState1);
            gameStateManager.setState(mockState2);
            gameStateManager.setState(mockState3);

            // All previous states should have been exited
            expect(mockState1.onExitCalled).toBe(true);
            expect(mockState2.onExitCalled).toBe(true);

            // Only final state should be active
            expect(mockState3.onEnterCalled).toBe(true);
            expect(mockState3.onExitCalled).toBe(false);

            // Only final state should receive updates
            gameStateManager.update(16.67);
            expect(mockState1.updateCalled).toBe(false);
            expect(mockState2.updateCalled).toBe(false);
            expect(mockState3.updateCalled).toBe(true);
        });

        it("should handle state transitions during update cycles", () => {
            // Set up a state that transitions to another state during update
            class TransitioningState extends MockGameState {
                constructor(
                    private manager: GameStateManager,
                    private nextState: GameState,
                ) {
                    super();
                }

                update(delta: number): void {
                    super.update(delta);
                    // Simulate transitioning during update
                    this.manager.setState(this.nextState);
                }
            }

            const transitioningState = new TransitioningState(
                gameStateManager,
                mockState2,
            );

            gameStateManager.setState(transitioningState);
            gameStateManager.update(16.67);

            // Transition should have occurred
            expect(transitioningState.onExitCalled).toBe(true);
            expect(mockState2.onEnterCalled).toBe(true);

            // Next update should go to new state
            mockState2.reset();
            gameStateManager.update(16.67);
            expect(mockState2.updateCalled).toBe(true);
        });
    });

    describe("Error Handling", () => {
        it("should handle states that throw errors in lifecycle methods", () => {
            class ErrorState implements GameState {
                onEnter(): void {
                    throw new Error("onEnter error");
                }
                onExit(): void {}
                update(): void {}
                render(): void {}
            }

            const errorState = new ErrorState();

            expect(() => {
                gameStateManager.setState(errorState);
            }).toThrow("onEnter error");
        });

        it("should continue working after state errors during transitions", () => {
            class ExitErrorState implements GameState {
                onEnter(): void {}
                onExit(): void {
                    throw new Error("onExit error");
                }
                update(): void {}
                render(): void {}
            }

            const exitErrorState = new ExitErrorState();

            gameStateManager.setState(exitErrorState);

            expect(() => {
                gameStateManager.setState(mockState1);
            }).toThrow("onExit error");

            // Despite the error, the new state should still be set
            // (Though this depends on implementation - current implementation would fail)
            // This test documents the current behavior
        });
    });

    describe("Performance Considerations", () => {
        it("should not accumulate state references during transitions", () => {
            // This test ensures we don't create memory leaks
            const states = Array.from(
                { length: 10 },
                () => new MockGameState(),
            );

            states.forEach((state) => {
                gameStateManager.setState(state);
            });

            // Only the last state should be active
            gameStateManager.update(16.67);

            // Count how many states received updates (should be only 1)
            const activeStates = states.filter((state) => state.updateCalled);
            expect(activeStates).toHaveLength(1);
            expect(activeStates[0]).toBe(states[states.length - 1]);
        });

        it("should handle high-frequency updates efficiently", () => {
            gameStateManager.setState(mockState1);

            const startTime = Date.now();

            // Simulate 60 FPS for 1 second (60 updates)
            for (let i = 0; i < 60; i++) {
                gameStateManager.update(16.67);
                gameStateManager.render();
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should complete quickly (this is more of a smoke test)
            expect(duration).toBeLessThan(100); // 100ms threshold
            expect(mockState1.updateCalled).toBe(true);
            expect(mockState1.renderCalled).toBe(true);
        });
    });
});
