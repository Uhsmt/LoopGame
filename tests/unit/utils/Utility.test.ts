import { describe, it, expect, vi } from 'vitest'
import {
  random,
  chooseAtRandom,
  isTrueRandom,
  formatNumberWithCommas,
  getDistance,
  shuffleArray,
} from '../../../src/scripts/utils/Utility'

// Create a simple Point-like object for testing
class MockPoint {
  x: number
  y: number
  constructor(x: number = 0, y: number = 0) {
    this.x = x
    this.y = y
  }
}

describe('Utility Functions', () => {
  describe('random()', () => {
    it('should return a number within the specified range', () => {
      const min = 1
      const max = 10
      for (let i = 0; i < 100; i++) {
        const result = random(min, max)
        expect(result).toBeGreaterThanOrEqual(min)
        expect(result).toBeLessThanOrEqual(max)
        expect(Number.isInteger(result)).toBe(true)
      }
    })

    it('should return the same number when min equals max', () => {
      const value = 5
      const result = random(value, value)
      expect(result).toBe(value)
    })

    it('should handle negative numbers', () => {
      const min = -10
      const max = -5
      const result = random(min, max)
      expect(result).toBeGreaterThanOrEqual(min)
      expect(result).toBeLessThanOrEqual(max)
    })
  })

  describe('chooseAtRandom()', () => {
    it('should return the specified number of items', () => {
      const array = [1, 2, 3, 4, 5]
      const count = 3
      const result = chooseAtRandom(array, count)
      expect(result).toHaveLength(count)
    })

    it('should return items from the original array', () => {
      const array = ['a', 'b', 'c', 'd']
      const count = 2
      const result = chooseAtRandom(array, count)
      result.forEach((item) => {
        expect(array).toContain(item)
      })
    })

    it('should not modify the original array', () => {
      const array = [1, 2, 3, 4]
      const originalArray = [...array]
      chooseAtRandom(array, 2)
      expect(array).toEqual(originalArray)
    })

    it('should return entire array when count equals array length', () => {
      const array = [1, 2, 3]
      const result = chooseAtRandom(array, 3)
      expect(result).toHaveLength(3)
      array.forEach((item) => {
        expect(result).toContain(item)
      })
    })

    it('should handle empty array', () => {
      const array: number[] = []
      const result = chooseAtRandom(array, 1)
      expect(result).toHaveLength(1)
      expect(result[0]).toBeUndefined()
    })

    it('should default to count 1 when count is 0', () => {
      const array = [1, 2, 3]
      const result = chooseAtRandom(array, 0)
      expect(result).toHaveLength(1) // Function defaults 0 to 1
      expect(array).toContain(result[0])
    })
  })

  describe('isTrueRandom()', () => {
    it('should always return true for 100%', () => {
      for (let i = 0; i < 10; i++) {
        expect(isTrueRandom(100)).toBe(true)
      }
    })

    it('should always return false for 0%', () => {
      for (let i = 0; i < 10; i++) {
        expect(isTrueRandom(0)).toBe(false)
      }
    })

    it('should return boolean value', () => {
      const result = isTrueRandom(50)
      expect(typeof result).toBe('boolean')
    })

    it('should work with Math.random mock', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.3)
      expect(isTrueRandom(50)).toBe(true) // 0.3 * 100 = 30 <= 50
      expect(isTrueRandom(25)).toBe(false) // 0.3 * 100 = 30 > 25
      vi.restoreAllMocks()
    })
  })

  describe('formatNumberWithCommas()', () => {
    it('should add commas to large numbers', () => {
      expect(formatNumberWithCommas(1000)).toBe('1,000')
      expect(formatNumberWithCommas(1234567)).toBe('1,234,567')
      expect(formatNumberWithCommas(999999999)).toBe('999,999,999')
    })

    it('should not add commas to small numbers', () => {
      expect(formatNumberWithCommas(123)).toBe('123')
      expect(formatNumberWithCommas(99)).toBe('99')
      expect(formatNumberWithCommas(0)).toBe('0')
    })

    it('should handle negative numbers', () => {
      expect(formatNumberWithCommas(-1000)).toBe('-1,000')
      expect(formatNumberWithCommas(-1234567)).toBe('-1,234,567')
    })
  })

  describe('getDistance()', () => {
    it('should calculate distance between two points correctly', () => {
      const p1 = new MockPoint(0, 0)
      const p2 = new MockPoint(3, 4)
      const distance = getDistance(p1 as any, p2 as any)
      expect(distance).toBe(5) // 3-4-5 triangle
    })

    it('should return 0 for same points', () => {
      const p1 = new MockPoint(5, 5)
      const p2 = new MockPoint(5, 5)
      const distance = getDistance(p1 as any, p2 as any)
      expect(distance).toBe(0)
    })

    it('should handle negative coordinates', () => {
      const p1 = new MockPoint(-3, -4)
      const p2 = new MockPoint(0, 0)
      const distance = getDistance(p1 as any, p2 as any)
      expect(distance).toBe(5)
    })

    it('should calculate horizontal distance', () => {
      const p1 = new MockPoint(0, 5)
      const p2 = new MockPoint(10, 5)
      const distance = getDistance(p1 as any, p2 as any)
      expect(distance).toBe(10)
    })

    it('should calculate vertical distance', () => {
      const p1 = new MockPoint(5, 0)
      const p2 = new MockPoint(5, 12)
      const distance = getDistance(p1 as any, p2 as any)
      expect(distance).toBe(12)
    })
  })

  describe('shuffleArray()', () => {
    it('should return array with same length', () => {
      const array = [1, 2, 3, 4, 5]
      const shuffled = shuffleArray([...array])
      expect(shuffled).toHaveLength(array.length)
    })

    it('should contain all original elements', () => {
      const array = ['a', 'b', 'c', 'd']
      const shuffled = shuffleArray([...array])
      array.forEach((item) => {
        expect(shuffled).toContain(item)
      })
    })

    it('should modify the input array', () => {
      const array = [1, 2, 3, 4, 5]
      const originalArray = [...array]
      const result = shuffleArray(array)
      expect(result).toBe(array) // Same reference
      // Note: There's a small chance the shuffled array is the same as original
      // but statistically very unlikely for larger arrays
    })

    it('should handle single element array', () => {
      const array = [42]
      const shuffled = shuffleArray([...array])
      expect(shuffled).toEqual([42])
    })

    it('should handle empty array', () => {
      const array: number[] = []
      const shuffled = shuffleArray([...array])
      expect(shuffled).toEqual([])
    })

    it('should produce different results on multiple calls (statistical test)', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8]
      const results: string[] = []
      
      // Run shuffle multiple times and collect results
      for (let i = 0; i < 10; i++) {
        const shuffled = shuffleArray([...array])
        results.push(shuffled.join(','))
      }
      
      // Check that we get different arrangements (not all the same)
      const uniqueResults = new Set(results)
      expect(uniqueResults.size).toBeGreaterThan(1)
    })
  })
})