import { test, expect } from '@playwright/test'
import { GameHelper } from '../setup/game-helpers'

test.describe('Game Mechanics and Interactions', () => {
  let gameHelper: GameHelper

  test.beforeEach(async ({ page }) => {
    gameHelper = new GameHelper(page)
  })

  test('should handle butterfly capture scenarios', async ({ page }) => {
    await gameHelper.navigateToGame()
    await gameHelper.startGame()
    
    // Wait for game to stabilize and butterflies to appear
    await page.waitForTimeout(2000)
    
    // Get initial score
    const initialScore = await gameHelper.getScore()
    
    // Draw multiple loops to try to capture butterflies
    await gameHelper.drawCircleLoop(200, 200, 80)
    await page.waitForTimeout(500)
    
    await gameHelper.drawCircleLoop(400, 300, 60)
    await page.waitForTimeout(500)
    
    await gameHelper.drawRectangleLoop(100, 400, 120, 80)
    await page.waitForTimeout(500)
    
    // Check if score changed (indicating successful captures)
    const finalScore = await gameHelper.getScore()
    
    // Score should either stay the same or increase (never decrease)
    expect(finalScore).toBeGreaterThanOrEqual(initialScore)
    
    await gameHelper.takeScreenshot('butterfly-capture-attempt')
  })

  test('should handle rapid loop drawing', async ({ page }) => {
    await gameHelper.navigateToGame()
    await gameHelper.startGame()
    
    await page.waitForTimeout(1000)
    
    // Draw multiple loops rapidly
    const loops = [
      { x: 150, y: 150, width: 60, height: 60 },
      { x: 250, y: 200, width: 80, height: 50 },
      { x: 350, y: 180, width: 70, height: 70 },
      { x: 180, y: 300, width: 90, height: 60 },
      { x: 320, y: 350, width: 75, height: 65 },
    ]
    
    for (const loop of loops) {
      await gameHelper.drawRectangleLoop(loop.x, loop.y, loop.width, loop.height)
      await page.waitForTimeout(200) // Small delay between loops
    }
    
    // Verify game is still responsive after rapid interactions
    await expect(gameHelper.canvas).toBeVisible()
    
    // Check for any performance issues
    const performanceMetrics = await gameHelper.checkPerformance()
    expect(performanceMetrics.memory).toBeGreaterThan(0)
    
    await gameHelper.takeScreenshot('rapid-loop-drawing')
  })

  test('should maintain game state throughout a full session', async ({ page }) => {
    await gameHelper.navigateToGame()
    await gameHelper.startGame()
    
    // Track game state over time
    const gameStates = []
    const sessionDuration = 10000 // 10 seconds
    const checkInterval = 2000 // Check every 2 seconds
    
    for (let elapsed = 0; elapsed < sessionDuration; elapsed += checkInterval) {
      const currentScore = await gameHelper.getScore()
      const currentTime = await gameHelper.getRemainingTime()
      
      gameStates.push({
        elapsed,
        score: currentScore,
        time: currentTime,
        timestamp: Date.now()
      })
      
      // Perform some interactions
      if (elapsed % 4000 === 0) { // Every 4 seconds
        await gameHelper.drawCircleLoop(200 + elapsed / 100, 200 + elapsed / 100, 50)
      }
      
      await page.waitForTimeout(checkInterval)
    }
    
    // Analyze game state progression
    expect(gameStates).toHaveLength(Math.ceil(sessionDuration / checkInterval))
    
    // Time should generally decrease (or stay stable if already at 0)
    const timeValues = gameStates.map(s => s.time).filter(t => t > 0)
    if (timeValues.length > 1) {
      const firstTime = timeValues[0]
      const lastTime = timeValues[timeValues.length - 1]
      expect(lastTime).toBeLessThanOrEqual(firstTime)
    }
    
    // Score should never decrease
    for (let i = 1; i < gameStates.length; i++) {
      expect(gameStates[i].score).toBeGreaterThanOrEqual(gameStates[i - 1].score)
    }
    
    await gameHelper.takeScreenshot('session-complete')
  })

  test('should handle different loop shapes and sizes', async ({ page }) => {
    await gameHelper.navigateToGame()
    await gameHelper.startGame()
    
    await page.waitForTimeout(1000)
    
    // Test various loop shapes
    const shapes = [
      {
        name: 'small-circle',
        action: () => gameHelper.drawCircleLoop(200, 200, 30),
      },
      {
        name: 'large-circle',
        action: () => gameHelper.drawCircleLoop(400, 200, 100),
      },
      {
        name: 'narrow-rectangle',
        action: () => gameHelper.drawRectangleLoop(300, 350, 150, 40),
      },
      {
        name: 'square',
        action: () => gameHelper.drawRectangleLoop(150, 350, 80, 80),
      },
      {
        name: 'complex-shape',
        action: async () => {
          const points = [
            { x: 500, y: 150 },
            { x: 550, y: 120 },
            { x: 600, y: 150 },
            { x: 580, y: 200 },
            { x: 520, y: 200 },
          ]
          await gameHelper.drawLoop(points)
        },
      },
    ]
    
    for (const shape of shapes) {
      await shape.action()
      await page.waitForTimeout(500)
      await gameHelper.takeScreenshot(`shape-${shape.name}`)
    }
    
    // Verify game handled all shapes without issues
    await expect(gameHelper.canvas).toBeVisible()
  })

  test('should handle edge cases and boundary conditions', async ({ page }) => {
    await gameHelper.navigateToGame()
    await gameHelper.startGame()
    
    await page.waitForTimeout(1000)
    
    const canvas = gameHelper.canvas
    const canvasBox = await canvas.boundingBox()
    
    if (canvasBox) {
      // Test drawing at canvas edges
      const edgeTests = [
        {
          name: 'top-left-corner',
          action: () => gameHelper.drawRectangleLoop(5, 5, 50, 50),
        },
        {
          name: 'top-right-corner',
          action: () => gameHelper.drawRectangleLoop(canvasBox.width - 55, 5, 50, 50),
        },
        {
          name: 'bottom-left-corner',
          action: () => gameHelper.drawRectangleLoop(5, canvasBox.height - 55, 50, 50),
        },
        {
          name: 'bottom-right-corner',
          action: () => gameHelper.drawRectangleLoop(canvasBox.width - 55, canvasBox.height - 55, 50, 50),
        },
        {
          name: 'very-small-loop',
          action: () => gameHelper.drawRectangleLoop(200, 200, 10, 10),
        },
        {
          name: 'overlapping-loops',
          action: async () => {
            await gameHelper.drawCircleLoop(300, 300, 60)
            await page.waitForTimeout(200)
            await gameHelper.drawCircleLoop(320, 320, 50)
          },
        },
      ]
      
      for (const edgeTest of edgeTests) {
        await edgeTest.action()
        await page.waitForTimeout(300)
        await gameHelper.takeScreenshot(`edge-case-${edgeTest.name}`)
      }
    }
    
    // Verify game stability after edge case testing
    await expect(gameHelper.canvas).toBeVisible()
  })

  test('should handle long gameplay sessions', async ({ page }) => {
    await gameHelper.navigateToGame()
    await gameHelper.startGame()
    
    // Extended gameplay simulation
    const sessionLength = 15000 // 15 seconds (shortened for test efficiency)
    const interactionInterval = 1500 // Interaction every 1.5 seconds
    
    let interactionCount = 0
    const startTime = Date.now()
    
    while (Date.now() - startTime < sessionLength) {
      // Vary the interactions
      if (interactionCount % 3 === 0) {
        await gameHelper.drawCircleLoop(
          200 + (interactionCount * 30) % 400,
          200 + (interactionCount * 20) % 200,
          40 + (interactionCount % 3) * 20
        )
      } else {
        await gameHelper.drawRectangleLoop(
          150 + (interactionCount * 40) % 300,
          150 + (interactionCount * 30) % 250,
          60 + (interactionCount % 4) * 15,
          50 + (interactionCount % 3) * 15
        )
      }
      
      interactionCount++
      await page.waitForTimeout(interactionInterval)
      
      // Periodic stability checks
      if (interactionCount % 5 === 0) {
        await expect(gameHelper.canvas).toBeVisible()
      }
    }
    
    // Final stability verification
    const finalPerformance = await gameHelper.checkPerformance()
    expect(finalPerformance.memory).toBeGreaterThan(0)
    
    await gameHelper.takeScreenshot(`long-session-${interactionCount}-interactions`)
  })

  test('should handle invalid or incomplete loop attempts', async ({ page }) => {
    await gameHelper.navigateToGame()
    await gameHelper.startGame()
    
    await page.waitForTimeout(1000)
    
    const canvas = gameHelper.canvas
    const canvasBox = await canvas.boundingBox()
    
    if (canvasBox) {
      // Test various invalid drawing patterns
      
      // Single point click
      await page.mouse.click(canvasBox.x + 200, canvasBox.y + 200)
      await page.waitForTimeout(300)
      
      // Short line (not a loop)
      await page.mouse.move(canvasBox.x + 250, canvasBox.y + 250)
      await page.mouse.down()
      await page.mouse.move(canvasBox.x + 280, canvasBox.y + 250, { steps: 3 })
      await page.mouse.up()
      await page.waitForTimeout(300)
      
      // Open path (doesn't close)
      await page.mouse.move(canvasBox.x + 350, canvasBox.y + 200)
      await page.mouse.down()
      await page.mouse.move(canvasBox.x + 400, canvasBox.y + 200, { steps: 5 })
      await page.mouse.move(canvasBox.x + 400, canvasBox.y + 250, { steps: 5 })
      await page.mouse.move(canvasBox.x + 350, canvasBox.y + 250, { steps: 5 })
      // Don't close the loop - leave it open
      await page.mouse.up()
      await page.waitForTimeout(500)
      
      // Zigzag pattern
      await page.mouse.move(canvasBox.x + 100, canvasBox.y + 350)
      await page.mouse.down()
      for (let i = 0; i < 5; i++) {
        await page.mouse.move(
          canvasBox.x + 100 + i * 20,
          canvasBox.y + 350 + (i % 2 === 0 ? 0 : 20),
          { steps: 2 }
        )
      }
      await page.mouse.up()
      await page.waitForTimeout(300)
    }
    
    // Verify game handles invalid inputs gracefully
    await expect(gameHelper.canvas).toBeVisible()
    
    // Game should still be responsive to valid inputs
    await gameHelper.drawRectangleLoop(200, 300, 60, 60)
    
    await gameHelper.takeScreenshot('invalid-inputs-handled')
  })
})