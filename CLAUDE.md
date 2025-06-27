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
- **PIXI.js Application**: Main rendering engine initialized in `src/scripts/game.ts`
- **State Management**: Game uses a state machine pattern via `GameStateManager`
- **Component System**: Game objects inherit from base classes for consistent behavior

### State Management System
The game uses a state machine pattern centered around:
- `GameStateManager`: Manages state transitions and lifecycle
- `GameState` interface: Defines state contract (onEnter, onExit, update, render)
- State implementations: `StartState`, `GameplayState`, `ResultState`, `RuleState`

### Key Game States
- **StartState**: Main menu and stage selection
- **GameplayState**: Core gameplay with butterfly capturing mechanics
- **ResultState**: Score display and progression
- **RuleState**: Tutorial and help screens

### Component Hierarchy
- **BaseCaptureableObject**: Base class for interactive game objects
- **Butterfly**: Main capturable entities with different sizes and behaviors
- **SpecialButterfly**: Special butterflies with unique properties
- **HelpFlower**: Power-up items providing temporary effects
- **PlanetBase**: Base class for Sun/Moon background elements
- **LineDrawer**: Handles loop drawing mechanics

### Game Mechanics
- **Loop Drawing**: Players draw closed paths to capture butterflies
- **Time System**: 60-second stages with timer-based progression
- **Power-ups**: Help flowers provide freeze, time extension, gather, and long loop effects
- **Scoring**: Points based on butterfly size and capture efficiency
- **Stage Progression**: Multiple stages with increasing difficulty

### Configuration Files
- `stage-config.json`: Production stage configurations
- `stage-config-debug.json`: Debug mode stage configurations
- `Const.ts`: Game constants, colors, fonts, and asset definitions

### Asset Management
All game assets are defined in `Const.ts` with BASE_URL prefix for deployment flexibility. Includes butterflies, backgrounds, UI elements, and effect sprites.

### Mobile Support
Game detects mobile devices and displays a "PC only" message, as the game is designed for desktop interaction.