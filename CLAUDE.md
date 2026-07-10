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

**Important**: Entries in `stage-config.json` / `stage-config-debug.json` must be
kept sorted by `level` ascending. `StageInformation.setConfig` looks up entries
by their `level` field, but the "extra band" overflow generator
(`generateOverflowConfig`) takes the **last array entry** as the base config for
levels beyond the final defined stage. If the entries are out of order, the
overflow band's base level/needCount will be computed incorrectly.

### Asset Management

All game assets are defined in `Const.ts` with BASE_URL prefix for deployment flexibility. Includes butterflies, backgrounds, UI elements, and effect sprites.

### Mobile Support

On mobile devices (user-agent detection in `MobileDetection.ts`), the game boots with a responsive canvas instead of the fixed 850x650 desktop size:

-   `ResponsiveCanvas`: fits the canvas to the viewport keeping the game's aspect ratio (design resolution 1150x650, defined as GAME_WIDTH/GAME_HEIGHT in Const.ts)
-   `TouchHandler`: handles touch events on the canvas and prevents default scrolling during play
-   `LandscapePrompt`: recommends landscape orientation
-   `public/styles/mobile.css`: mobile layout overrides (applied via media query for narrow or short viewports)

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

### Project Development Rules

**MANDATORY RULES**: Claude Code MUST follow these rules when working on this project:

1. **ブランチ運用**: 新しい作業を始める時は、原則ブランチを新しく切って、その上で進めること

    - When starting new work, create a new branch and work on it

2. **TDD実装**: 新しい機能を実装する際はTDDで進める。その際、マッチポンプなテストにならないように注意

    - Implement new features using TDD. Be careful not to create tests that just mirror the implementation
    - Write tests first when adding new functionality
    - Update existing tests when modifying behavior
    - Add integration tests for component interactions
    - Include E2E tests for user-facing features

3. **Issue/PR管理**: GitHub Issueを進める際は、タスク終了後はPullRequestを作るところまで進める。また、その際PullRequestがマージされた時にIssueも一緒にcloseするように、descriptionに close: #{issue} としておくこと

    - When working on GitHub Issues, create a Pull Request after completing tasks. Include "close: #{issue}" in the PR description to auto-close the issue when merged

4. **多言語対応**: IssueやPullRequestは日本語と英語を併記しておくこと
    - Write Issues and Pull Requests in both Japanese and English

### MANDATORY: Pre-Commit and Pre-Push Workflow

**IMPORTANT**: Before any commit or push, Claude Code MUST follow this workflow:

#### After Making Changes:

1. **変更後のテスト実行**: 変更を加えた後は必ずテストを実行する

    - After making changes, always run tests

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

#### Before Push:

5. **Push前の品質確認**: push前には必ずlintでコードを整えること、testが確実に通ることを確認してからpushすること

    - Before pushing, always run lint to format code and ensure all tests pass
    - Maintain 100% test pass rate at all times

    ```bash
    npm run lint:fix
    npm test  # Must show 100% pass rate
    git push origin <branch-name>
    ```

### When to Run Which Tests

-   **Unit tests**: For any code changes in `src/scripts/`
-   **Integration tests**: For changes affecting multiple components
-   **Rendering tests**: For changes to PIXI.js components or UI
-   **E2E tests**: For major features or UI changes (run locally before push)
-   **Full test suite**: Before major commits or releases
