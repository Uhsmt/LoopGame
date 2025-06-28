import { vi } from 'vitest'

// Mock PIXI.js for testing
vi.mock('pixi.js', () => ({
  Application: vi.fn(),
  Container: vi.fn(),
  Sprite: vi.fn(),
  Texture: vi.fn(),
  Point: vi.fn().mockImplementation((x = 0, y = 0) => ({ x, y })),
  Rectangle: vi.fn(),
  Graphics: vi.fn(),
  Text: vi.fn(),
  TextStyle: vi.fn(),
  Loader: vi.fn(),
  utils: {
    EventEmitter: vi.fn(),
  },
}))

// Mock canvas and WebGL context
Object.defineProperty(window, 'HTMLCanvasElement', {
  value: vi.fn().mockImplementation(() => ({
    getContext: vi.fn(() => ({
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Array(4) })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => ({ data: new Array(4) })),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
    })),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Global test setup
beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks()
})