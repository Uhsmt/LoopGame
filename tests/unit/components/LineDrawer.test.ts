import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Const module
vi.mock('../../../src/scripts/utils/Const', () => ({
  MARGIN: 50,
}))

// Mock PIXI.js
vi.mock('pixi.js', () => ({
  Point: vi.fn().mockImplementation((x = 0, y = 0) => ({ x, y })),
  Graphics: vi.fn().mockImplementation(() => ({
    moveTo: vi.fn().mockReturnThis(),
    lineTo: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    clear: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
    alpha: 1,
  })),
  Application: vi.fn(),
}))

import { LineDrawer } from '../../../src/scripts/components/LineDrawer'

// Create simple Point-like objects for testing
class MockPoint {
  x: number
  y: number
  constructor(x: number = 0, y: number = 0) {
    this.x = x
    this.y = y
  }
}

// Mock PIXI Application for testing
class MockApp {
  stage = {
    addChild: vi.fn(),
    removeChild: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
  screen = {
    width: 800,
    height: 600,
  }
}

// Mock PIXI Graphics
class MockGraphics {
  moveTo = vi.fn().mockReturnThis()
  lineTo = vi.fn().mockReturnThis()
  stroke = vi.fn().mockReturnThis()
  fill = vi.fn().mockReturnThis()
  clear = vi.fn().mockReturnThis()
  destroy = vi.fn()
  alpha = 1
}

describe('LineDrawer', () => {
  let lineDrawer: LineDrawer
  let mockApp: MockApp

  beforeEach(() => {
    mockApp = new MockApp()
    lineDrawer = new LineDrawer(mockApp as any)
    vi.clearAllMocks()
  })

  describe('Constructor', () => {
    it('should initialize with default color', () => {
      expect(lineDrawer.originalLineColor).toBe(0xffffff)
      expect(lineDrawer.originalLineDrawTime).toBe(1200)
    })

    it('should initialize with custom color', () => {
      const customLineDrawer = new LineDrawer(mockApp as any, 0xff0000)
      expect(customLineDrawer.originalLineColor).toBe(0xff0000)
    })

    it('should setup interaction listener', () => {
      // Check that addEventListener was called during constructor
      const newMockApp = new MockApp()
      new LineDrawer(newMockApp as any)
      expect(newMockApp.stage.addEventListener).toHaveBeenCalledWith(
        'pointermove',
        expect.any(Function)
      )
    })
  })

  describe('doLinesIntersect()', () => {
    it('should detect intersection when lines cross', () => {
      const p1 = new MockPoint(0, 0)
      const p2 = new MockPoint(10, 10)
      const p3 = new MockPoint(0, 10)
      const p4 = new MockPoint(10, 0)

      // Access private method for testing
      const result = (lineDrawer as any).doLinesIntersect(p1, p2, p3, p4)
      expect(result).toBe(true)
    })

    it('should not detect intersection when lines do not cross', () => {
      const p1 = new MockPoint(0, 0)
      const p2 = new MockPoint(5, 5)
      const p3 = new MockPoint(10, 0)
      const p4 = new MockPoint(15, 5)

      const result = (lineDrawer as any).doLinesIntersect(p1, p2, p3, p4)
      expect(result).toBe(false)
    })

    it('should not detect intersection for parallel lines', () => {
      const p1 = new MockPoint(0, 0)
      const p2 = new MockPoint(10, 0)
      const p3 = new MockPoint(0, 5)
      const p4 = new MockPoint(10, 5)

      const result = (lineDrawer as any).doLinesIntersect(p1, p2, p3, p4)
      expect(result).toBe(false)
    })

    it('should handle vertical and horizontal lines', () => {
      // Vertical line intersecting horizontal line
      const p1 = new MockPoint(5, 0)
      const p2 = new MockPoint(5, 10)
      const p3 = new MockPoint(0, 5)
      const p4 = new MockPoint(10, 5)

      const result = (lineDrawer as any).doLinesIntersect(p1, p2, p3, p4)
      expect(result).toBe(true)
    })

    it('should handle same endpoint cases', () => {
      const p1 = new MockPoint(0, 0)
      const p2 = new MockPoint(10, 10)
      const p3 = new MockPoint(10, 10) // Same as p2
      const p4 = new MockPoint(20, 0)

      const result = (lineDrawer as any).doLinesIntersect(p1, p2, p3, p4)
      expect(result).toBe(false)
    })
  })

  describe('direction()', () => {
    it('should return positive value for clockwise orientation', () => {
      const p1 = new MockPoint(0, 0)
      const p2 = new MockPoint(1, 0)
      const p3 = new MockPoint(0, -1)

      const result = (lineDrawer as any).direction(p1, p2, p3)
      expect(result).toBeGreaterThan(0)
    })

    it('should return negative value for counterclockwise orientation', () => {
      const p1 = new MockPoint(0, 0)
      const p2 = new MockPoint(1, 0)
      const p3 = new MockPoint(0, 1)

      const result = (lineDrawer as any).direction(p1, p2, p3)
      expect(result).toBeLessThan(0)
    })

    it('should return zero for collinear points', () => {
      const p1 = new MockPoint(0, 0)
      const p2 = new MockPoint(5, 5)
      const p3 = new MockPoint(10, 10)

      const result = (lineDrawer as any).direction(p1, p2, p3)
      expect(result).toBe(0)
    })

    it('should calculate correct cross product values', () => {
      const p1 = new MockPoint(1, 1)
      const p2 = new MockPoint(3, 2)
      const p3 = new MockPoint(2, 4)

      // Expected: (2-1) * (2-1) - (3-1) * (4-1) = 1 * 1 - 2 * 3 = 1 - 6 = -5
      const result = (lineDrawer as any).direction(p1, p2, p3)
      expect(result).toBe(-5)
    })
  })

  describe('getLoopSegments()', () => {
    beforeEach(() => {
      // Setup some segments in the lineDrawer
      const mockGraphics1 = new MockGraphics()
      const mockGraphics2 = new MockGraphics()
      
      // Add segments to the segments array
      ;(lineDrawer as any).segments = [
        {
          start: new MockPoint(0, 0),
          end: new MockPoint(10, 0),
          graphics: mockGraphics1,
        },
        {
          start: new MockPoint(10, 0),
          end: new MockPoint(10, 10),
          graphics: mockGraphics2,
        },
      ]
    })

    it('should return empty array when no intersection found', () => {
      const start = new MockPoint(20, 20)
      const end = new MockPoint(30, 30)

      const result = (lineDrawer as any).getLoopSegments(start, end)
      expect(result).toHaveLength(0)
    })

    it('should return segments from first intersection onward when loop is detected', () => {
      // Create a line that intersects with the first segment
      const start = new MockPoint(5, -5)
      const end = new MockPoint(5, 5)

      const result = (lineDrawer as any).getLoopSegments(start, end)
      expect(result.length).toBeGreaterThan(0)
      expect(result[result.length - 1].start).toEqual(start)
      expect(result[result.length - 1].end).toEqual(end)
    })

    it('should include all segments from intersection point to end', () => {
      // Mock intersection detection to always return true for first segment
      vi.spyOn(lineDrawer as any, 'doLinesIntersect')
        .mockReturnValueOnce(true)  // First segment intersects
        .mockReturnValueOnce(false) // Second segment doesn't intersect

      const start = new MockPoint(5, -5)
      const end = new MockPoint(5, 5)

      const result = (lineDrawer as any).getLoopSegments(start, end)
      expect(result).toHaveLength(2) // First segment + new segment
    })
  })

  describe('Line Color and Draw Time', () => {
    it('should set line color', () => {
      lineDrawer.setLineColor(0xff0000)
      expect((lineDrawer as any).lineColor).toBe(0xff0000)
    })

    it('should set line draw time', () => {
      lineDrawer.setLineDrawTime(2000)
      expect((lineDrawer as any).lineDrawTime).toBe(2000)
    })
  })

  describe('clearAllSegments()', () => {
    it('should clear all segments and reset state', () => {
      // Setup some segments
      const mockGraphics = new MockGraphics()
      ;(lineDrawer as any).segments = [
        {
          start: new MockPoint(0, 0),
          end: new MockPoint(10, 10),
          graphics: mockGraphics,
        },
      ]
      ;(lineDrawer as any).startPoint = new MockPoint(5, 5)

      lineDrawer.clearAllSegments()

      expect((lineDrawer as any).segments).toHaveLength(0)
      expect((lineDrawer as any).startPoint).toBeNull()
      expect(mockApp.stage.removeChild).toHaveBeenCalledWith(mockGraphics)
      expect(mockGraphics.destroy).toHaveBeenCalled()
    })
  })

  describe('getSegmentPoints()', () => {
    it('should return empty array when no segments exist', () => {
      const points = lineDrawer.getSegmentPoints()
      expect(points).toHaveLength(0)
    })

    it('should return start point and all segment end points', () => {
      const mockGraphics = new MockGraphics()
      ;(lineDrawer as any).startPoint = new MockPoint(0, 0)
      ;(lineDrawer as any).segments = [
        {
          start: new MockPoint(0, 0),
          end: new MockPoint(10, 10),
          graphics: mockGraphics,
        },
        {
          start: new MockPoint(10, 10),
          end: new MockPoint(20, 20),
          graphics: mockGraphics,
        },
      ]

      const points = lineDrawer.getSegmentPoints()
      expect(points).toHaveLength(3) // startPoint + 2 segment endpoints
      expect(points[0]).toEqual(new MockPoint(0, 0))
      expect(points[1]).toEqual(new MockPoint(10, 10))
      expect(points[2]).toEqual(new MockPoint(20, 20))
    })
  })

  describe('cleanup()', () => {
    it('should remove event listeners and clean up graphics', () => {
      ;(lineDrawer as any).pointerMoveHandler = vi.fn()

      lineDrawer.cleanup()

      expect(mockApp.stage.removeEventListener).toHaveBeenCalledWith(
        'pointermove',
        expect.any(Function)
      )
      expect((lineDrawer as any).startPoint).toBeNull()
    })
  })
})