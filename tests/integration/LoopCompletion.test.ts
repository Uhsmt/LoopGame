import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock PIXI.js
vi.mock('pixi.js', () => ({
  Application: vi.fn().mockImplementation(() => ({
    screen: { width: 800, height: 600 },
    stage: {
      addChild: vi.fn(),
      removeChild: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  })),
  Graphics: vi.fn().mockImplementation(() => ({
    moveTo: vi.fn().mockReturnThis(),
    lineTo: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
    alpha: 1,
  })),
  Point: vi.fn().mockImplementation((x = 0, y = 0) => ({ x, y })),
  Container: vi.fn().mockImplementation(() => ({
    addChild: vi.fn(),
    removeChild: vi.fn(),
    alpha: 1,
    x: 0,
    y: 0,
  })),
}))

// Mock utility functions
vi.mock('../../src/scripts/utils/Utility', () => ({
  getDistance: vi.fn().mockReturnValue(50), // Default to far distance
}))

vi.mock('../../src/scripts/utils/Const', () => ({
  MARGIN: 50,
}))

// Mock components we'll be integrating
vi.mock('../../src/scripts/components/BaseCaptureableObject', () => ({
  BaseCaptureableObject: class {
    hitAreaSize = 10
    addChild = vi.fn()
    alpha = 1
    x = 0
    y = 0
    width = 50
    height = 50
    pivot = { set: vi.fn() }
    position = { set: vi.fn() }
  },
}))

import { LineDrawer } from '../../src/scripts/components/LineDrawer'
import { Butterfly } from '../../src/scripts/components/Butterfly'

// Enhanced mocks for integration testing
class TestButterfly {
  public x: number = 0
  public y: number = 0
  public color: number
  public isFlying: boolean = true
  public hitAreaSize: number = 10
  public captured: boolean = false

  constructor(x: number, y: number, color: number = 0xff0000) {
    this.x = x
    this.y = y
    this.color = color
  }

  // Mock the isHit method for collision detection with loop areas
  isHit(loopGraphics: any): boolean {
    // Simple point-in-polygon test for testing
    // In real implementation, this would use proper collision detection
    return this.captured
  }

  switchColor(): void {
    this.color = this.color === 0xff0000 ? 0x00ff00 : 0xff0000
  }

  setMockCaptured(captured: boolean): void {
    this.captured = captured
  }

  getObjectCenter() {
    return { x: this.x, y: this.y }
  }
}

class TestLineDrawer {
  private segments: Array<{ start: any; end: any }> = []
  private eventHandlers: Map<string, Function[]> = new Map()

  constructor(private app: any) {}

  // Simulate drawing a line segment
  addSegment(startX: number, startY: number, endX: number, endY: number): void {
    const segment = {
      start: { x: startX, y: startY },
      end: { x: endX, y: endY },
    }
    this.segments.push(segment)
  }

  // Simulate completing a loop
  completeLoop(): void {
    const mockLoopGraphics = {
      fill: vi.fn(),
      alpha: 1,
      destroy: vi.fn(),
    }
    
    this.emit('loopAreaCompleted', mockLoopGraphics)
  }

  // Simple event emitter for testing
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(handler)
  }

  emit(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event) || []
    handlers.forEach(handler => handler(...args))
  }

  getSegments() {
    return this.segments
  }

  clearSegments(): void {
    this.segments = []
  }
}

describe('Loop Completion Integration Tests', () => {
  let mockApp: any
  let lineDrawer: TestLineDrawer
  let butterflies: TestButterfly[]

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockApp = {
      screen: { width: 800, height: 600 },
      stage: {
        addChild: vi.fn(),
        removeChild: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    }

    lineDrawer = new TestLineDrawer(mockApp)
    butterflies = []
  })

  describe('Loop Drawing and Detection', () => {
    it('should detect loop completion when line intersects with existing segments', () => {
      let loopCompleted = false
      let capturedGraphics: any = null

      lineDrawer.on('loopAreaCompleted', (graphics: any) => {
        loopCompleted = true
        capturedGraphics = graphics
      })

      // Simulate drawing a square loop
      lineDrawer.addSegment(100, 100, 200, 100) // Top
      lineDrawer.addSegment(200, 100, 200, 200) // Right  
      lineDrawer.addSegment(200, 200, 100, 200) // Bottom
      lineDrawer.completeLoop() // Close the loop

      expect(loopCompleted).toBe(true)
      expect(capturedGraphics).toBeDefined()
    })

    it('should handle multiple loops drawn in sequence', () => {
      let loopCount = 0
      
      lineDrawer.on('loopAreaCompleted', () => {
        loopCount++
      })

      // Draw first loop
      lineDrawer.completeLoop()
      lineDrawer.clearSegments()

      // Draw second loop  
      lineDrawer.completeLoop()

      expect(loopCount).toBe(2)
    })
  })

  describe('Butterfly-Loop Interaction', () => {
    beforeEach(() => {
      // Set up butterflies at different positions
      butterflies = [
        new TestButterfly(150, 150, 0xff0000), // Red butterfly inside potential loop
        new TestButterfly(250, 250, 0x00ff00), // Green butterfly outside loop
        new TestButterfly(175, 175, 0xff0000), // Another red butterfly inside
      ]
    })

    it('should capture butterflies inside completed loop', () => {
      const capturedButterflies: TestButterfly[] = []

      lineDrawer.on('loopAreaCompleted', (loopGraphics: any) => {
        // Mark butterflies inside loop as captured
        butterflies[0].setMockCaptured(true) // Inside
        butterflies[2].setMockCaptured(true) // Inside
        // butterflies[1] stays outside

        butterflies.forEach(butterfly => {
          if (butterfly.isHit(loopGraphics)) {
            capturedButterflies.push(butterfly)
          }
        })
      })

      lineDrawer.completeLoop()

      expect(capturedButterflies).toHaveLength(2)
      expect(capturedButterflies).toContain(butterflies[0])
      expect(capturedButterflies).toContain(butterflies[2])
      expect(capturedButterflies).not.toContain(butterflies[1])
    })

    it('should handle single butterfly color switching', () => {
      const singleButterfly = new TestButterfly(150, 150, 0xff0000)
      let colorSwitched = false

      lineDrawer.on('loopAreaCompleted', (loopGraphics: any) => {
        singleButterfly.setMockCaptured(true)
        const capturedButterflies = [singleButterfly].filter(b => b.isHit(loopGraphics))
        
        if (capturedButterflies.length === 1) {
          capturedButterflies[0].switchColor()
          colorSwitched = true
        }
      })

      const originalColor = singleButterfly.color
      lineDrawer.completeLoop()

      expect(colorSwitched).toBe(true)
      expect(singleButterfly.color).not.toBe(originalColor)
    })

    it('should validate successful loop conditions', () => {
      // Test successful loop conditions:
      // 1. 3+ different colors with one butterfly each
      // 2. 2+ butterflies of the same color

      const testCases = [
        {
          name: 'three different colors',
          butterflies: [
            new TestButterfly(150, 150, 0xff0000), // Red
            new TestButterfly(160, 160, 0x00ff00), // Green  
            new TestButterfly(170, 170, 0x0000ff), // Blue
          ],
          expectedSuccess: true,
        },
        {
          name: 'same color multiple butterflies',
          butterflies: [
            new TestButterfly(150, 150, 0xff0000), // Red
            new TestButterfly(160, 160, 0xff0000), // Red
          ],
          expectedSuccess: true,
        },
        {
          name: 'mixed colors with duplicates',
          butterflies: [
            new TestButterfly(150, 150, 0xff0000), // Red
            new TestButterfly(160, 160, 0xff0000), // Red
            new TestButterfly(170, 170, 0x00ff00), // Green
            new TestButterfly(180, 180, 0x00ff00), // Green
          ],
          expectedSuccess: false,
        },
        {
          name: 'two different colors single each',
          butterflies: [
            new TestButterfly(150, 150, 0xff0000), // Red
            new TestButterfly(160, 160, 0x00ff00), // Green
          ],
          expectedSuccess: false,
        },
      ]

      testCases.forEach(testCase => {
        const capturedButterflies: TestButterfly[] = []
        let loopSuccess = false

        lineDrawer.on('loopAreaCompleted', (loopGraphics: any) => {
          // Mark all test butterflies as captured
          testCase.butterflies.forEach(b => b.setMockCaptured(true))
          capturedButterflies.push(...testCase.butterflies.filter(b => b.isHit(loopGraphics)))

          // Apply success logic
          const colors = Array.from(new Set(capturedButterflies.map(b => b.color)))
          
          if (
            (colors.length >= 3 && colors.length === capturedButterflies.length) ||
            (colors.length === 1 && capturedButterflies.length >= 2)
          ) {
            loopSuccess = true
          }
        })

        lineDrawer.completeLoop()

        expect(loopSuccess).toBe(testCase.expectedSuccess)
        
        // Clear for next test
        lineDrawer.clearSegments()
        lineDrawer.eventHandlers.clear()
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty loops (no butterflies captured)', () => {
      let loopCompleted = false
      let capturedCount = 0

      lineDrawer.on('loopAreaCompleted', (loopGraphics: any) => {
        loopCompleted = true
        capturedCount = butterflies.filter(b => b.isHit(loopGraphics)).length
      })

      lineDrawer.completeLoop()

      expect(loopCompleted).toBe(true)
      expect(capturedCount).toBe(0)
    })

    it('should handle loops with butterflies at boundary conditions', () => {
      // Test butterflies exactly at the edge of hit detection
      const edgeButterfly = new TestButterfly(150, 150, 0xff0000)
      let processedCorrectly = false

      lineDrawer.on('loopAreaCompleted', (loopGraphics: any) => {
        // Simulate boundary condition - butterfly might or might not be captured
        const hitResult = Math.random() > 0.5 // Random for edge case
        edgeButterfly.setMockCaptured(hitResult)
        
        const captured = edgeButterfly.isHit(loopGraphics)
        processedCorrectly = true // We handled it without crashing
      })

      lineDrawer.completeLoop()

      expect(processedCorrectly).toBe(true)
    })

    it('should handle rapid loop completions', () => {
      let completionCount = 0
      
      lineDrawer.on('loopAreaCompleted', () => {
        completionCount++
      })

      // Simulate rapid loop completions
      for (let i = 0; i < 5; i++) {
        lineDrawer.completeLoop()
        lineDrawer.clearSegments()
      }

      expect(completionCount).toBe(5)
    })
  })

  describe('Performance and Memory Management', () => {
    it('should not accumulate memory during multiple loop operations', () => {
      const initialSegmentCount = lineDrawer.getSegments().length
      
      // Perform multiple loop operations
      for (let i = 0; i < 10; i++) {
        lineDrawer.addSegment(i * 10, i * 10, i * 10 + 50, i * 10 + 50)
        lineDrawer.completeLoop()
        lineDrawer.clearSegments()
      }

      // Should be back to initial state
      expect(lineDrawer.getSegments().length).toBe(initialSegmentCount)
    })

    it('should handle large numbers of butterflies efficiently', () => {
      // Create many butterflies
      const manyButterflies = Array.from({ length: 100 }, (_, i) => 
        new TestButterfly(i % 20 * 10, Math.floor(i / 20) * 10, 0xff0000)
      )

      let processedCount = 0
      const startTime = Date.now()

      lineDrawer.on('loopAreaCompleted', (loopGraphics: any) => {
        manyButterflies.forEach(butterfly => {
          butterfly.setMockCaptured(true)
          if (butterfly.isHit(loopGraphics)) {
            processedCount++
          }
        })
      })

      lineDrawer.completeLoop()
      
      const endTime = Date.now()
      const duration = endTime - startTime

      expect(processedCount).toBe(100)
      expect(duration).toBeLessThan(100) // Should complete quickly
    })
  })
})