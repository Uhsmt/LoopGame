import { vi } from 'vitest'

/**
 * Comprehensive PIXI.js mock for testing
 * This provides a more realistic mock of PIXI.js components
 * for better testing of rendering and animation logic
 */

export class MockContainer {
  public children: any[] = []
  public x: number = 0
  public y: number = 0
  public width: number = 0
  public height: number = 0
  public alpha: number = 1
  public visible: boolean = true
  public pivot = { x: 0, y: 0, set: vi.fn() }
  public position = { x: 0, y: 0, set: vi.fn() }
  public scale = { x: 1, y: 1, set: vi.fn() }
  public rotation: number = 0
  public destroyed: boolean = false

  addChild = vi.fn().mockImplementation((child: any) => {
    if (!this.children.includes(child)) {
      this.children.push(child)
      child.parent = this
    }
    return child
  })

  addChildAt = vi.fn().mockImplementation((child: any, index: number) => {
    if (!this.children.includes(child)) {
      this.children.splice(index, 0, child)
      child.parent = this
    }
    return child
  })

  removeChild = vi.fn().mockImplementation((child: any) => {
    const index = this.children.indexOf(child)
    if (index !== -1) {
      this.children.splice(index, 1)
      child.parent = null
    }
    return child
  })

  destroy = vi.fn().mockImplementation(() => {
    this.destroyed = true
    this.children.forEach(child => {
      if (child.destroy) child.destroy()
    })
    this.children = []
  })

  getChildAt = vi.fn().mockImplementation((index: number) => {
    return this.children[index]
  })

  getChildIndex = vi.fn().mockImplementation((child: any) => {
    return this.children.indexOf(child)
  })
}

export class MockSprite extends MockContainer {
  public texture: any
  public tint: number = 0xffffff
  public anchor = { x: 0.5, y: 0.5, set: vi.fn() }

  constructor(texture?: any) {
    super()
    this.texture = texture || MockTexture.WHITE
    this.width = 100
    this.height = 100
  }

  static from = vi.fn().mockImplementation((source: string) => {
    return new MockSprite(new MockTexture(source))
  })
}

export class MockTexture {
  public source: string
  public width: number = 100
  public height: number = 100
  public valid: boolean = true

  constructor(source: string = 'default') {
    this.source = source
  }

  static WHITE = new MockTexture('white')
  static EMPTY = new MockTexture('empty')

  static from = vi.fn().mockImplementation((source: string) => {
    return new MockTexture(source)
  })

  destroy = vi.fn()
}

export class MockGraphics extends MockContainer {
  private _fillStyle: any = null
  private _lineStyle: any = null
  private _currentPath: Array<{ type: string; points: number[] }> = []

  clear = vi.fn().mockImplementation(() => {
    this._currentPath = []
    this._fillStyle = null
    this._lineStyle = null
    return this
  })

  moveTo = vi.fn().mockImplementation((x: number, y: number) => {
    this._currentPath.push({ type: 'moveTo', points: [x, y] })
    return this
  })

  lineTo = vi.fn().mockImplementation((x: number, y: number) => {
    this._currentPath.push({ type: 'lineTo', points: [x, y] })
    return this
  })

  rect = vi.fn().mockImplementation((x: number, y: number, width: number, height: number) => {
    this._currentPath.push({ type: 'rect', points: [x, y, width, height] })
    return this
  })

  ellipse = vi.fn().mockImplementation((x: number, y: number, width: number, height: number) => {
    this._currentPath.push({ type: 'ellipse', points: [x, y, width, height] })
    return this
  })

  circle = vi.fn().mockImplementation((x: number, y: number, radius: number) => {
    this._currentPath.push({ type: 'circle', points: [x, y, radius] })
    return this
  })

  fill = vi.fn().mockImplementation((style?: any) => {
    if (style) this._fillStyle = style
    return this
  })

  stroke = vi.fn().mockImplementation((style?: any) => {
    if (style !== undefined) this._lineStyle = style
    return this
  })

  // Test helper methods
  getPath() {
    return this._currentPath
  }

  getFillStyle() {
    return this._fillStyle
  }

  getLineStyle() {
    return this._lineStyle
  }
}

export class MockApplication {
  public stage: MockContainer
  public screen: { width: number; height: number }
  public ticker = {
    add: vi.fn(),
    remove: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    deltaMS: 16.67,
  }
  public loader = {
    add: vi.fn(),
    load: vi.fn(),
    resources: {},
  }

  constructor(options: any = {}) {
    this.screen = {
      width: options.width || 800,
      height: options.height || 600,
    }
    this.stage = new MockContainer()
    this.stage.width = this.screen.width
    this.stage.height = this.screen.height
  }

  destroy = vi.fn()
  resize = vi.fn()
}

export class MockBitmapText extends MockContainer {
  public text: string = ''
  public style: any = {}
  public anchor = { x: 0, y: 0, set: vi.fn() }

  constructor(options: any = {}) {
    super()
    this.text = options.text || ''
    this.style = options.style || {}
  }
}

export class MockPoint {
  constructor(public x: number = 0, public y: number = 0) {}

  clone() {
    return new MockPoint(this.x, this.y)
  }

  equals(point: MockPoint) {
    return this.x === point.x && this.y === point.y
  }

  set(x?: number, y?: number) {
    this.x = x ?? this.x
    this.y = y ?? this.y
    return this
  }
}

export class MockRectangle {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public width: number = 0,
    public height: number = 0
  ) {}

  contains(x: number, y: number) {
    return x >= this.x && x <= this.x + this.width && 
           y >= this.y && y <= this.y + this.height
  }

  clone() {
    return new MockRectangle(this.x, this.y, this.width, this.height)
  }
}

// Animation helper for testing
export class MockAnimationTicker {
  private callbacks: Array<{ fn: Function; context?: any }> = []
  private _started: boolean = false

  add(fn: Function, context?: any) {
    this.callbacks.push({ fn, context })
    return this
  }

  remove(fn: Function, context?: any) {
    const index = this.callbacks.findIndex(cb => cb.fn === fn && cb.context === context)
    if (index !== -1) {
      this.callbacks.splice(index, 1)
    }
    return this
  }

  start() {
    this._started = true
    return this
  }

  stop() {
    this._started = false
    return this
  }

  get started() {
    return this._started
  }

  // Test helper to manually tick the animation
  tick(deltaTime: number = 16.67) {
    if (this._started) {
      this.callbacks.forEach(({ fn, context }) => {
        fn.call(context, deltaTime)
      })
    }
  }
}

// Export the complete PIXI mock
export const PIXIMock = {
  Application: MockApplication,
  Container: MockContainer,
  Sprite: MockSprite,
  Graphics: MockGraphics,
  Texture: MockTexture,
  BitmapText: MockBitmapText,
  Point: MockPoint,
  Rectangle: MockRectangle,
  utils: {
    EventEmitter: class {
      private events: Map<string, Function[]> = new Map()

      on(event: string, fn: Function) {
        if (!this.events.has(event)) {
          this.events.set(event, [])
        }
        this.events.get(event)!.push(fn)
        return this
      }

      off(event: string, fn?: Function) {
        if (!this.events.has(event)) return this
        
        if (fn) {
          const handlers = this.events.get(event)!
          const index = handlers.indexOf(fn)
          if (index !== -1) {
            handlers.splice(index, 1)
          }
        } else {
          this.events.delete(event)
        }
        return this
      }

      emit(event: string, ...args: any[]) {
        const handlers = this.events.get(event) || []
        handlers.forEach(handler => handler(...args))
        return this
      }
    },
  },
  Ticker: MockAnimationTicker,
}