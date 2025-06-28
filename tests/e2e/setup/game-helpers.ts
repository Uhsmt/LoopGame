import { Page, Locator, expect } from '@playwright/test'

/**
 * Game Helper class for common E2E test interactions
 * Provides high-level methods for interacting with the LoopGame
 */
export class GameHelper {
  readonly page: Page
  readonly canvas: Locator
  readonly gameContainer: Locator

  constructor(page: Page) {
    this.page = page
    this.canvas = page.locator('canvas')
    this.gameContainer = page.locator('#game-container, .game-container, body')
  }

  /**
   * Navigate to the game and wait for it to load
   */
  async navigateToGame() {
    await this.page.goto('/')
    await this.waitForGameLoad()
  }

  /**
   * Wait for the game to fully load and initialize
   */
  async waitForGameLoad() {
    // Wait for canvas to be present
    await this.canvas.waitFor({ state: 'visible' })
    
    // Wait for PIXI.js initialization (check for game container or specific elements)
    await this.page.waitForFunction(() => {
      return window.PIXI !== undefined
    }, { timeout: 10000 })
    
    // Additional wait to ensure game is fully initialized
    await this.page.waitForTimeout(1000)
  }

  /**
   * Check if the game is currently in a specific state
   */
  async isInState(stateName: 'start' | 'gameplay' | 'result' | 'rule') {
    const stateIndicator = await this.page.evaluate((state) => {
      // This would need to be implemented based on how the game exposes its state
      // For now, we'll use DOM inspection or global variables
      return (window as any).gameState === state
    }, stateName)
    
    return stateIndicator
  }

  /**
   * Start a new game from the main menu
   */
  async startGame() {
    // Look for start button or click on canvas to start
    const startButton = this.page.locator('text=Start').first()
    
    if (await startButton.isVisible()) {
      await startButton.click()
    } else {
      // If no button, try clicking on canvas
      await this.canvas.click()
    }
    
    // Wait for gameplay state
    await this.waitForGameplayState()
  }

  /**
   * Wait for the game to enter gameplay state
   */
  async waitForGameplayState() {
    await this.page.waitForFunction(() => {
      // Check for gameplay indicators like timer, score, etc.
      return document.querySelector('.score, .timer, [data-testid="score"], [data-testid="timer"]') !== null ||
             (window as any).gameState === 'gameplay'
    }, { timeout: 5000 })
  }

  /**
   * Draw a loop on the canvas by providing an array of points
   */
  async drawLoop(points: { x: number; y: number }[]) {
    if (points.length < 3) {
      throw new Error('Need at least 3 points to draw a loop')
    }

    const canvasBounds = await this.canvas.boundingBox()
    if (!canvasBounds) {
      throw new Error('Canvas not found or not visible')
    }

    // Start drawing from the first point
    const startPoint = points[0]
    await this.page.mouse.move(
      canvasBounds.x + startPoint.x,
      canvasBounds.y + startPoint.y
    )
    await this.page.mouse.down()

    // Draw line through all points
    for (let i = 1; i < points.length; i++) {
      const point = points[i]
      await this.page.mouse.move(
        canvasBounds.x + point.x,
        canvasBounds.y + point.y,
        { steps: 5 } // Smooth movement
      )
      await this.page.waitForTimeout(50) // Small delay for realistic drawing
    }

    // Close the loop by returning to start
    await this.page.mouse.move(
      canvasBounds.x + startPoint.x,
      canvasBounds.y + startPoint.y,
      { steps: 5 }
    )
    
    await this.page.mouse.up()
    
    // Wait for loop processing
    await this.page.waitForTimeout(500)
  }

  /**
   * Draw a simple rectangular loop
   */
  async drawRectangleLoop(x: number, y: number, width: number, height: number) {
    const points = [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ]
    
    await this.drawLoop(points)
  }

  /**
   * Draw a circular loop (approximated with points)
   */
  async drawCircleLoop(centerX: number, centerY: number, radius: number) {
    const points: { x: number; y: number }[] = []
    const numPoints = 12 // 12-sided polygon to approximate circle
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * 2 * Math.PI
      points.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      })
    }
    
    await this.drawLoop(points)
  }

  /**
   * Get the current score from the UI
   */
  async getScore(): Promise<number> {
    const scoreText = await this.page.locator('.score, [data-testid="score"]').first().textContent()
    if (!scoreText) return 0
    
    const match = scoreText.match(/\d+/)
    return match ? parseInt(match[0], 10) : 0
  }

  /**
   * Get the remaining time from the UI
   */
  async getRemainingTime(): Promise<number> {
    const timeText = await this.page.locator('.timer, [data-testid="timer"]').first().textContent()
    if (!timeText) return 0
    
    const match = timeText.match(/\d+/)
    return match ? parseInt(match[0], 10) : 0
  }

  /**
   * Wait for the game to end (reach result state)
   */
  async waitForGameEnd() {
    await this.page.waitForFunction(() => {
      return (window as any).gameState === 'result' ||
             document.querySelector('.game-over, .result, [data-testid="game-over"]') !== null
    }, { timeout: 70000 }) // 70 seconds max (longer than game duration)
  }

  /**
   * Check if a butterfly is visible on screen
   */
  async butterflyCount(): Promise<number> {
    return await this.page.evaluate(() => {
      // This would need to be implemented based on how butterflies are rendered
      // For now, we'll use a generic approach
      const butterflies = document.querySelectorAll('.butterfly, [data-testid="butterfly"]')
      return butterflies.length
    })
  }

  /**
   * Take a screenshot with a descriptive name
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true,
    })
  }

  /**
   * Simulate mobile device interactions
   */
  async enableMobileMode() {
    await this.page.setViewportSize({ width: 375, height: 667 }) // iPhone SE size
  }

  /**
   * Wait for and dismiss mobile warning if it appears
   */
  async dismissMobileWarning() {
    const mobileWarning = this.page.locator('text=PC only, text=Desktop only').first()
    
    if (await mobileWarning.isVisible({ timeout: 2000 })) {
      // If there's a mobile warning, we might need to close it or handle it
      console.log('Mobile warning detected')
      return true
    }
    
    return false
  }

  /**
   * Verify game performance metrics
   */
  async checkPerformance() {
    const metrics = await this.page.evaluate(() => {
      return {
        fps: (window as any).gameStats?.fps || 0,
        memory: performance.memory?.usedJSHeapSize || 0,
        timing: performance.timing.loadEventEnd - performance.timing.navigationStart,
      }
    })
    
    return metrics
  }
}