# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LoopGame is a browser-based butterfly capturing game built with TypeScript and PIXI.js. Players draw loops to capture butterflies within a time limit, with special mechanics like help flowers and bonus stages.

## Development Commands

### Local Development

```bash
npm start
# Runs development server at http://localhost:1234/
```

### Debug Mode

```bash
npm run debug
# Runs in debug mode with additional features enabled
```

### Build

```bash
npm run build
# Creates production build (automated via GitHub Actions)
```

### Linting & Formatting

```bash
npm run lint:fix
# Runs both Prettier and ESLint with auto-fix
```

Individual commands:

```bash
npx prettier --write filename
npx eslint --fix filename
```

## Architecture

### Core Architecture

-   **PIXI.js Application**: Main rendering engine initialized in `src/scripts/game.ts`
-   **State Management**: Game uses a state machine pattern via `GameStateManager`
-   **Component System**: Game objects inherit from base classes for consistent behavior

### State Management System

The game uses a state machine pattern centered around:

-   `GameStateManager`: Manages state transitions and lifecycle
-   `GameState` interface: Defines state contract (onEnter, onExit, update, render)
-   State implementations: `StartState`, `GameplayState`, `ResultState`, `RuleState`

### Key Game States

-   **StartState**: Main menu and stage selection
-   **GameplayState**: Core gameplay with butterfly capturing mechanics
-   **ResultState**: Score display and progression
-   **RuleState**: Tutorial and help screens

### Component Hierarchy

-   **BaseCaptureableObject**: Base class for interactive game objects
-   **Butterfly**: Main capturable entities with different sizes and behaviors
-   **SpecialButterfly**: Special butterflies with unique properties
-   **HelpFlower**: Power-up items providing temporary effects
-   **PlanetBase**: Base class for Sun/Moon background elements
-   **LineDrawer**: Handles loop drawing mechanics

### Game Mechanics

-   **Loop Drawing**: Players draw closed paths to capture butterflies
-   **Time System**: 60-second stages with timer-based progression
-   **Power-ups**: Help flowers provide freeze, time extension, gather, and long loop effects
-   **Scoring**: Points based on butterfly size and capture efficiency
-   **Stage Progression**: Multiple stages with increasing difficulty

### Configuration Files

-   `stage-config.json`: Production stage configurations
-   `stage-config-debug.json`: Debug mode stage configurations
-   `Const.ts`: Game constants, colors, fonts, and asset definitions

### Asset Management

All game assets are defined in `Const.ts` with BASE_URL prefix for deployment flexibility. Includes butterflies, backgrounds, UI elements, and effect sprites.

### Mobile Support

Game detects mobile devices and displays a "PC only" message, as the game is designed for desktop interaction.

## Testing Framework

The project has comprehensive testing infrastructure with 266+ tests covering all aspects of the game.

### Test Commands

```bash
# Unit and Integration Tests (Vitest)
npm test                    # Run all unit/integration tests
npm run test:ui            # Run tests with interactive UI
npm run test:coverage      # Run tests with coverage report

# End-to-End Tests (Playwright)
npm run test:e2e           # Run all E2E tests
npm run test:e2e:ui        # Run E2E tests with interactive UI
npm run test:e2e:headed    # Run E2E tests in visible browser
npm run test:e2e:debug     # Debug E2E tests step-by-step
```

### Test Structure

-   **Unit Tests**: `tests/unit/` - Component logic, utilities, rendering
-   **Integration Tests**: `tests/integration/` - Component interactions, state management
-   **E2E Tests**: `tests/e2e/` - Complete user scenarios, cross-browser testing

### Test Coverage

-   111 Unit Tests (core functionality and components)
-   40 Integration Tests (component interactions and state management)
-   75 Rendering Tests (sprites, UI, animations)
-   20+ E2E Tests (complete user scenarios and edge cases)

## Development Workflow for Claude Code

### MANDATORY: Pre-Commit Testing and Linting

**IMPORTANT**: Before any commit, Claude Code MUST follow this workflow:

1. **Run Relevant Tests**: Execute tests related to the changed code

    ```bash
    # For component changes
    npm test -- tests/unit/components/

    # For utility changes
    npm test -- tests/unit/utils/

    # For rendering changes
    npm test -- tests/unit/rendering/

    # For integration changes
    npm test -- tests/integration/

    # For full validation (when unsure)
    npm test
    ```

2. **Run Linting and Formatting**: Fix any style or linting issues

    ```bash
    npm run lint:fix
    ```

3. **Verify All Tests Pass**: Ensure no regressions were introduced

    ```bash
    npm test  # Must show 100% pass rate
    ```

4. **Only Then Commit**: After tests pass and linting is clean
    ```bash
    git add .
    git commit -m "Your commit message"
    ```

### Test-Driven Development Guidelines

-   **Write tests first** when adding new functionality
-   **Update existing tests** when modifying behavior
-   **Add integration tests** for component interactions
-   **Include E2E tests** for user-facing features
-   **Maintain 100% test pass rate** at all times

### When to Run Which Tests

-   **Unit tests**: For any code changes in `src/scripts/`
-   **Integration tests**: For changes affecting multiple components
-   **Rendering tests**: For changes to PIXI.js components or UI
-   **E2E tests**: For major features or UI changes (run locally before push)
-   **Full test suite**: Before major commits or releases
