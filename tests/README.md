# LoopGame Testing Documentation

This directory contains comprehensive test suites for the LoopGame project.

## Test Structure

```
tests/
├── unit/                   # Unit tests
│   ├── components/         # Component-specific tests
│   ├── rendering/          # Rendering and visual tests
│   └── utils/             # Utility function tests
├── integration/           # Integration tests
├── e2e/                  # End-to-end tests
│   ├── setup/            # E2E test utilities and helpers
│   └── specs/            # E2E test specifications
└── setup/                # Test setup and mocking utilities
```

## Test Types

### Unit Tests (Vitest)
- **Components**: Tests for individual game components (Butterfly, LineDrawer, etc.)
- **Rendering**: Tests for PIXI.js rendering, sprites, UI, and animations
- **Utils**: Tests for utility functions and helper methods

### Integration Tests (Vitest)
- **GameStateManager**: Tests for state management and transitions
- **LoopCompletion**: Tests for component interactions during loop completion
- **PowerUpSystem**: Tests for power-up effects and system integration

### End-to-End Tests (Playwright)
- **Basic Game Flow**: Core gameplay functionality and interactions
- **Mobile Detection**: Device-specific behavior and responsive design
- **Game Mechanics**: Advanced gameplay scenarios and edge cases

## Running Tests

### Unit and Integration Tests
```bash
# Run all unit/integration tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run specific test files
npm test -- tests/unit/components/
npm test -- tests/integration/
```

### End-to-End Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in headed mode (visible browser)
npm run test:e2e:headed

# Debug E2E tests
npm run test:e2e:debug

# Run specific E2E test files
npx playwright test basic-game-flow
npx playwright test mobile-detection
```

## Test Configuration

### Vitest Configuration
- **Environment**: jsdom for browser-like testing
- **Coverage**: Comprehensive coverage reporting
- **Mocking**: Complete PIXI.js mock system for rendering tests

### Playwright Configuration
- **Browsers**: Chromium, Firefox, WebKit, and mobile variants
- **Base URL**: http://localhost:1234 (development server)
- **Screenshots**: Captured on test failures
- **Video**: Recorded for failed tests
- **Traces**: Available for debugging

## PIXI.js Mocking System

The test suite includes a comprehensive PIXI.js mock system located in `tests/setup/pixi-mock.ts`:

- **MockApplication**: Simulates PIXI Application
- **MockContainer**: Mock display object container
- **MockSprite**: Mock sprite with texture support
- **MockGraphics**: Mock graphics rendering
- **MockBitmapText**: Mock text rendering
- **MockAnimationTicker**: Mock animation system

This allows testing rendering logic without requiring actual WebGL/Canvas contexts.

## E2E Test Helpers

The `GameHelper` class in `tests/e2e/setup/game-helpers.ts` provides high-level methods for E2E testing:

- **Navigation**: `navigateToGame()`, `waitForGameLoad()`
- **Interactions**: `startGame()`, `drawLoop()`, `drawRectangleLoop()`
- **State**: `getScore()`, `getRemainingTime()`, `waitForGameEnd()`
- **Utilities**: `takeScreenshot()`, `checkPerformance()`

## Test Coverage

The test suite provides comprehensive coverage:

- **111 Unit Tests**: All core functionality and components
- **40 Integration Tests**: Component interactions and state management
- **75 Rendering Tests**: Visual components and animations
- **20+ E2E Tests**: Full gameplay scenarios and user flows

### Coverage Areas
- ✅ Utility functions
- ✅ Game components (Butterfly, LineDrawer, HelpFlower)
- ✅ State management
- ✅ Loop completion logic
- ✅ Power-up system
- ✅ Rendering and animations
- ✅ UI components
- ✅ Mobile device detection
- ✅ Performance and stability
- ✅ Edge cases and error handling

## Continuous Integration

Tests are configured to run in CI environments:

- **Unit/Integration**: Fast feedback with jsdom
- **E2E**: Cross-browser testing with multiple viewports
- **Performance**: Memory and timing validation
- **Mobile**: Device-specific behavior verification

## Best Practices

1. **Isolation**: Each test is independent and properly cleaned up
2. **Mocking**: External dependencies are mocked for reliability
3. **Assertions**: Comprehensive assertions with meaningful error messages
4. **Screenshots**: Visual verification for E2E tests
5. **Performance**: Performance monitoring during long-running tests
6. **Cross-browser**: Testing across multiple browsers and devices

## Debugging

### Unit/Integration Tests
- Use `test:ui` for interactive debugging
- Add `console.log` statements for debugging
- Use VS Code's Vitest extension for breakpoints

### E2E Tests
- Use `test:e2e:debug` for step-by-step debugging
- Use `test:e2e:headed` to see browser interactions
- Check screenshots in `test-results/` for visual debugging
- Use Playwright's trace viewer for detailed execution analysis

## Adding New Tests

### Unit Tests
1. Create test file in appropriate directory
2. Import necessary mocks and utilities
3. Follow existing naming conventions
4. Ensure proper test isolation

### E2E Tests
1. Create spec file in `tests/e2e/specs/`
2. Use `GameHelper` for common interactions
3. Add appropriate screenshots for visual verification
4. Test across multiple browsers and viewports