import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MockAnimationTicker, MockSprite, MockContainer, MockApplication } from '../../setup/pixi-mock'

// Mock PIXI.js to use our comprehensive mocks
vi.mock('pixi.js', () => ({
  Ticker: MockAnimationTicker,
  Sprite: MockSprite,
  Container: MockContainer,
  Application: MockApplication,
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
      
      emit(event: string, ...args: any[]) {
        const handlers = this.events.get(event) || []
        handlers.forEach(handler => handler(...args))
        return this
      }
    },
  },
}))

// Mock game constants for animations
vi.mock('../../../src/scripts/utils/Const', () => ({
  BUTTERFLY_SPEED: 2,
  ANIMATION_SPEED: 0.1,
  FADE_DURATION: 1000,
  BOUNCE_HEIGHT: 20,
}))

describe('Animation System Tests', () => {
  let ticker: MockAnimationTicker
  let mockApp: any
  let container: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    ticker = new MockAnimationTicker()
    mockApp = new MockApplication({
      width: 800,
      height: 600,
    })
    
    container = new MockContainer()
  })

  describe('Animation Ticker Management', () => {
    it('should start and stop ticker correctly', () => {
      expect(ticker.started).toBe(false)
      
      ticker.start()
      expect(ticker.started).toBe(true)
      
      ticker.stop()
      expect(ticker.started).toBe(false)
    })

    it('should add and remove animation callbacks', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      
      ticker.add(callback1)
      ticker.add(callback2)
      
      expect(ticker.callbacks).toHaveLength(2)
      
      ticker.remove(callback1)
      expect(ticker.callbacks).toHaveLength(1)
      
      ticker.remove(callback2)
      expect(ticker.callbacks).toHaveLength(0)
    })

    it('should execute callbacks when ticking', () => {
      const callback = vi.fn()
      
      ticker.add(callback)
      ticker.start()
      ticker.tick(16.67)
      
      expect(callback).toHaveBeenCalledWith(16.67)
    })

    it('should not execute callbacks when stopped', () => {
      const callback = vi.fn()
      
      ticker.add(callback)
      ticker.stop()
      ticker.tick(16.67)
      
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('Basic Object Animations', () => {
    it('should animate sprite position over time', () => {
      const sprite = new MockSprite()
      const startX = 0
      const startY = 0
      const endX = 200
      const endY = 150
      const duration = 1000 // 1 second
      
      let elapsedTime = 0
      
      const animatePosition = (deltaTime: number) => {
        elapsedTime += deltaTime
        const progress = Math.min(elapsedTime / duration, 1)
        
        sprite.x = startX + (endX - startX) * progress
        sprite.y = startY + (endY - startY) * progress
        
        if (progress >= 1) {
          ticker.remove(animatePosition)
        }
      }
      
      ticker.add(animatePosition)
      ticker.start()
      
      // Simulate 1 second of animation (60 FPS)
      for (let i = 0; i < 60; i++) {
        ticker.tick(16.67)
      }
      
      expect(sprite.x).toBe(endX)
      expect(sprite.y).toBe(endY)
    })

    it('should animate sprite scale with easing', () => {
      const sprite = new MockSprite()
      const startScale = 1
      const endScale = 2
      const duration = 500
      
      let elapsedTime = 0
      
      const animateScale = (deltaTime: number) => {
        elapsedTime += deltaTime
        const progress = Math.min(elapsedTime / duration, 1)
        
        // Ease-out cubic easing
        const easedProgress = 1 - Math.pow(1 - progress, 3)
        const currentScale = startScale + (endScale - startScale) * easedProgress
        
        sprite.scale.x = currentScale
        sprite.scale.y = currentScale
      }
      
      ticker.add(animateScale)
      ticker.start()
      
      // Simulate half duration
      for (let i = 0; i < 15; i++) {
        ticker.tick(16.67)
      }
      
      expect(sprite.scale.x).toBeGreaterThan(startScale)
      expect(sprite.scale.x).toBeLessThan(endScale)
      
      // Complete animation
      for (let i = 0; i < 15; i++) {
        ticker.tick(16.67)
      }
      
      expect(sprite.scale.x).toBeCloseTo(endScale, 1)
    })

    it('should animate sprite rotation continuously', () => {
      const sprite = new MockSprite()
      const rotationSpeed = 0.05 // radians per frame
      
      const rotateSprite = () => {
        sprite.rotation += rotationSpeed
      }
      
      ticker.add(rotateSprite)
      ticker.start()
      
      // Simulate 100 frames
      for (let i = 0; i < 100; i++) {
        ticker.tick(16.67)
      }
      
      expect(sprite.rotation).toBeCloseTo(rotationSpeed * 100, 5)
    })

    it('should animate sprite alpha for fade effects', () => {
      const sprite = new MockSprite()
      sprite.alpha = 1
      
      const fadeOutDuration = 1000
      let elapsedTime = 0
      
      const fadeOut = (deltaTime: number) => {
        elapsedTime += deltaTime
        const progress = Math.min(elapsedTime / fadeOutDuration, 1)
        
        sprite.alpha = 1 - progress
        
        if (progress >= 1) {
          ticker.remove(fadeOut)
        }
      }
      
      ticker.add(fadeOut)
      ticker.start()
      
      // Simulate fade animation
      for (let i = 0; i < 60; i++) {
        ticker.tick(16.67)
      }
      
      expect(sprite.alpha).toBe(0)
    })
  })

  describe('Complex Animation Patterns', () => {
    it('should animate object in circular motion', () => {
      const sprite = new MockSprite()
      const centerX = 400
      const centerY = 300
      const radius = 100
      let angle = 0
      const angularSpeed = 0.02
      
      const circularMotion = () => {
        angle += angularSpeed
        sprite.x = centerX + Math.cos(angle) * radius
        sprite.y = centerY + Math.sin(angle) * radius
      }
      
      ticker.add(circularMotion)
      ticker.start()
      
      // Test initial position
      ticker.tick(16.67)
      expect(sprite.x).toBeCloseTo(centerX + radius, 1)
      expect(sprite.y).toBeCloseTo(centerY, -1)
      
      // Test quarter circle movement (approximate)
      for (let i = 0; i < 40; i++) { // Simplified loop count
        ticker.tick(16.67)
      }
      
      // Should have moved significantly from initial position
      expect(Math.abs(sprite.x - (centerX + radius))).toBeGreaterThan(10)
      expect(Math.abs(sprite.y - centerY)).toBeGreaterThan(10)
    })

    it('should animate bouncing motion', () => {
      const sprite = new MockSprite()
      const groundY = 500
      const bounceHeight = 100
      let velocity = 0
      const gravity = 0.5
      const bounce = 0.8 // Energy retention
      
      sprite.y = groundY - bounceHeight
      
      const bounceAnimation = () => {
        velocity += gravity
        sprite.y += velocity
        
        // Bounce when hitting ground
        if (sprite.y >= groundY) {
          sprite.y = groundY
          velocity = -velocity * bounce
        }
      }
      
      ticker.add(bounceAnimation)
      ticker.start()
      
      // Simulate bouncing
      for (let i = 0; i < 200; i++) {
        ticker.tick(16.67)
      }
      
      // Should eventually settle near ground
      expect(sprite.y).toBeCloseTo(groundY, 10)
    })

    it('should animate spring-like motion', () => {
      const sprite = new MockSprite()
      const targetX = 200
      const springStrength = 0.1
      const damping = 0.95
      let velocityX = 0
      
      sprite.x = 0
      
      const springAnimation = () => {
        const forceX = (targetX - sprite.x) * springStrength
        velocityX += forceX
        velocityX *= damping
        sprite.x += velocityX
      }
      
      ticker.add(springAnimation)
      ticker.start()
      
      // Simulate spring motion
      for (let i = 0; i < 200; i++) {
        ticker.tick(16.67)
      }
      
      // Should settle near target
      expect(sprite.x).toBeCloseTo(targetX, -1)
    })
  })

  describe('Animation Sequences and Chains', () => {
    it('should execute animations in sequence', () => {
      const sprite = new MockSprite()
      const animations = [
        { endX: 100, endY: 0, duration: 500 },
        { endX: 100, endY: 100, duration: 500 },
        { endX: 0, endY: 100, duration: 500 },
        { endX: 0, endY: 0, duration: 500 },
      ]
      
      let currentAnimation = 0
      let elapsedTime = 0
      let startX = 0
      let startY = 0
      
      const sequenceAnimation = (deltaTime: number) => {
        if (currentAnimation >= animations.length) {
          ticker.remove(sequenceAnimation)
          return
        }
        
        const anim = animations[currentAnimation]
        elapsedTime += deltaTime
        const progress = Math.min(elapsedTime / anim.duration, 1)
        
        sprite.x = startX + (anim.endX - startX) * progress
        sprite.y = startY + (anim.endY - startY) * progress
        
        if (progress >= 1) {
          startX = anim.endX
          startY = anim.endY
          currentAnimation++
          elapsedTime = 0
        }
      }
      
      ticker.add(sequenceAnimation)
      ticker.start()
      
      // Simulate entire sequence (4 animations × 30 frames each)
      for (let i = 0; i < 120; i++) {
        ticker.tick(16.67)
      }
      
      expect(sprite.x).toBe(0)
      expect(sprite.y).toBe(0)
      expect(currentAnimation).toBe(4)
    })

    it('should handle parallel animations', () => {
      const sprite = new MockSprite()
      
      // Position animation
      let positionTime = 0
      const positionDuration = 1000
      const positionAnimation = (deltaTime: number) => {
        positionTime += deltaTime
        const progress = Math.min(positionTime / positionDuration, 1)
        sprite.x = 200 * progress
      }
      
      // Scale animation (different timing)
      let scaleTime = 0
      const scaleDuration = 500
      const scaleAnimation = (deltaTime: number) => {
        scaleTime += deltaTime
        const progress = Math.min(scaleTime / scaleDuration, 1)
        sprite.scale.x = 1 + progress
        sprite.scale.y = 1 + progress
      }
      
      // Rotation animation
      const rotationAnimation = () => {
        sprite.rotation += 0.05
      }
      
      ticker.add(positionAnimation)
      ticker.add(scaleAnimation)
      ticker.add(rotationAnimation)
      ticker.start()
      
      // Simulate animations
      for (let i = 0; i < 60; i++) {
        ticker.tick(16.67)
      }
      
      expect(sprite.x).toBeGreaterThan(0)
      expect(sprite.scale.x).toBeGreaterThan(1)
      expect(sprite.rotation).toBeGreaterThan(0)
    })
  })

  describe('Game-Specific Animations', () => {
    it('should animate butterfly flying pattern', () => {
      const butterfly = new MockSprite()
      butterfly.x = 100
      butterfly.y = 100
      
      const flySpeed = 2
      const wobbleAmount = 0.5
      let time = 0
      
      const butterflyFly = (deltaTime: number) => {
        time += deltaTime * 0.01
        
        // Main movement
        butterfly.x += flySpeed
        
        // Wobble motion
        butterfly.y += Math.sin(time) * wobbleAmount
        
        // Wing rotation
        butterfly.rotation = Math.sin(time * 2) * 0.1
        
        // Wrap around screen
        if (butterfly.x > 800) {
          butterfly.x = -50
        }
      }
      
      ticker.add(butterflyFly)
      ticker.start()
      
      const initialX = butterfly.x
      
      // Simulate flight
      for (let i = 0; i < 100; i++) {
        ticker.tick(16.67)
      }
      
      expect(butterfly.x).toBeGreaterThan(initialX)
      expect(Math.abs(butterfly.rotation)).toBeLessThan(0.2)
    })

    it('should animate help flower blooming', () => {
      const flower = new MockSprite()
      flower.scale.x = 0
      flower.scale.y = 0
      flower.alpha = 0
      
      const bloomDuration = 800
      let elapsedTime = 0
      
      const bloomAnimation = (deltaTime: number) => {
        elapsedTime += deltaTime
        const progress = Math.min(elapsedTime / bloomDuration, 1)
        
        // Ease-out back for spring effect
        const ease = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2
        
        flower.scale.x = ease * 1.2 // Slight overshoot
        flower.scale.y = ease * 1.2
        flower.alpha = progress
        
        if (progress >= 1) {
          // Settle to normal size
          flower.scale.x = 1
          flower.scale.y = 1
          ticker.remove(bloomAnimation)
        }
      }
      
      ticker.add(bloomAnimation)
      ticker.start()
      
      // Simulate bloom animation
      for (let i = 0; i < 48; i++) { // 800ms at 60fps
        ticker.tick(16.67)
      }
      
      expect(flower.scale.x).toBe(1)
      expect(flower.scale.y).toBe(1)
      expect(flower.alpha).toBe(1)
    })

    it('should animate score popup effect', () => {
      const scoreText = new MockSprite() // Using sprite as text placeholder
      scoreText.scale.x = 0
      scoreText.scale.y = 0
      scoreText.alpha = 1
      scoreText.y = 300
      
      const popupDuration = 1500
      let elapsedTime = 0
      
      const scorePopup = (deltaTime: number) => {
        elapsedTime += deltaTime
        const progress = Math.min(elapsedTime / popupDuration, 1)
        
        if (progress < 0.2) {
          // Scale up quickly
          const scaleProgress = progress / 0.2
          scoreText.scale.x = scaleProgress * 1.5
          scoreText.scale.y = scaleProgress * 1.5
        } else if (progress < 0.4) {
          // Settle to normal size
          const settleProgress = (progress - 0.2) / 0.2
          scoreText.scale.x = 1.5 - settleProgress * 0.5
          scoreText.scale.y = 1.5 - settleProgress * 0.5
        } else {
          // Rise and fade
          const fadeProgress = (progress - 0.4) / 0.6
          scoreText.y = 300 - fadeProgress * 50
          scoreText.alpha = 1 - fadeProgress
        }
        
        if (progress >= 1) {
          ticker.remove(scorePopup)
        }
      }
      
      ticker.add(scorePopup)
      ticker.start()
      
      // Simulate popup animation
      for (let i = 0; i < 90; i++) { // 1500ms at 60fps
        ticker.tick(16.67)
      }
      
      expect(scoreText.scale.x).toBeCloseTo(1, 1)
      expect(scoreText.y).toBeLessThan(300)
      expect(scoreText.alpha).toBe(0)
    })
  })

  describe('Performance and Memory Management', () => {
    it('should handle many simultaneous animations efficiently', () => {
      const objects: any[] = []
      const animations: Function[] = []
      
      // Create 100 animated objects
      for (let i = 0; i < 100; i++) {
        const obj = new MockSprite()
        obj.x = Math.random() * 800
        obj.y = Math.random() * 600
        objects.push(obj)
        
        const animate = () => {
          obj.rotation += 0.01
          obj.x += Math.sin(obj.rotation) * 0.5
          obj.y += Math.cos(obj.rotation) * 0.5
        }
        
        animations.push(animate)
        ticker.add(animate)
      }
      
      ticker.start()
      const startTime = Date.now()
      
      // Simulate one second of animation
      for (let i = 0; i < 60; i++) {
        ticker.tick(16.67)
      }
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should complete efficiently
      expect(duration).toBeLessThan(100)
      
      // Clean up
      animations.forEach(anim => ticker.remove(anim))
    })

    it('should properly clean up finished animations', () => {
      const initialCallbackCount = ticker.callbacks.length
      
      const tempAnimations: Function[] = []
      
      // Add temporary animations
      for (let i = 0; i < 10; i++) {
        const anim = vi.fn()
        tempAnimations.push(anim)
        ticker.add(anim)
      }
      
      expect(ticker.callbacks.length).toBe(initialCallbackCount + 10)
      
      // Remove all temporary animations
      tempAnimations.forEach(anim => ticker.remove(anim))
      
      expect(ticker.callbacks.length).toBe(initialCallbackCount)
    })

    it('should handle animation removal during execution', () => {
      let executed = false
      
      const selfRemovingAnimation = () => {
        executed = true
        ticker.remove(selfRemovingAnimation)
      }
      
      ticker.add(selfRemovingAnimation)
      ticker.start()
      ticker.tick(16.67)
      
      expect(executed).toBe(true)
      expect(ticker.callbacks).not.toContain(selfRemovingAnimation)
    })
  })
})