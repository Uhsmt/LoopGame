import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    MockSprite,
    MockTexture,
    MockContainer,
    MockApplication,
} from "../../setup/pixi-mock";

// Mock PIXI.js to use our comprehensive mocks
vi.mock("pixi.js", () => ({
    Sprite: MockSprite,
    Texture: MockTexture,
    Container: MockContainer,
    Application: MockApplication,
    Point: vi.fn().mockImplementation((x = 0, y = 0) => ({ x, y })),
}));

// Mock constants for testing
vi.mock("../../../src/scripts/utils/Const", () => ({
    COLOR: {
        BACKGROUND: 0x87ceeb,
        BUTTERFLY_RED: 0xff0000,
        BUTTERFLY_GREEN: 0x00ff00,
        BUTTERFLY_BLUE: 0x0000ff,
    },
    SCREEN_WIDTH: 800,
    SCREEN_HEIGHT: 600,
    BASE_URL: "/assets/",
}));

describe("Sprite Rendering Tests", () => {
    let mockApp: any;
    let container: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockApp = new MockApplication({
            width: 800,
            height: 600,
        });

        container = new MockContainer();
    });

    describe("Sprite Creation and Properties", () => {
        it("should create sprite with correct texture", () => {
            const texture = MockTexture.from("butterfly.png");
            const sprite = new MockSprite(texture);

            expect(sprite.texture).toBe(texture);
            expect(sprite.texture.source).toBe("butterfly.png");
        });

        it("should create sprite using static from method", () => {
            const sprite = MockSprite.from("background.jpg");

            expect(sprite).toBeInstanceOf(MockSprite);
            expect(sprite.texture.source).toBe("background.jpg");
        });

        it("should set sprite dimensions correctly", () => {
            const sprite = new MockSprite();

            expect(sprite.width).toBe(100); // Default mock size
            expect(sprite.height).toBe(100);

            sprite.width = 200;
            sprite.height = 150;

            expect(sprite.width).toBe(200);
            expect(sprite.height).toBe(150);
        });

        it("should handle sprite positioning", () => {
            const sprite = new MockSprite();

            sprite.x = 100;
            sprite.y = 200;

            expect(sprite.x).toBe(100);
            expect(sprite.y).toBe(200);
        });

        it("should manage sprite anchor points", () => {
            const sprite = new MockSprite();

            expect(sprite.anchor.x).toBe(0.5);
            expect(sprite.anchor.y).toBe(0.5);

            sprite.anchor.set(0.5, 1.0);
            expect(sprite.anchor.set).toHaveBeenCalledWith(0.5, 1.0);
        });
    });

    describe("Sprite Visual Properties", () => {
        it("should handle sprite tinting", () => {
            const sprite = new MockSprite();

            expect(sprite.tint).toBe(0xffffff); // Default white

            sprite.tint = 0xff0000; // Red tint
            expect(sprite.tint).toBe(0xff0000);
        });

        it("should manage sprite alpha transparency", () => {
            const sprite = new MockSprite();

            expect(sprite.alpha).toBe(1); // Fully opaque

            sprite.alpha = 0.5;
            expect(sprite.alpha).toBe(0.5);

            sprite.alpha = 0;
            expect(sprite.alpha).toBe(0); // Fully transparent
        });

        it("should handle sprite visibility", () => {
            const sprite = new MockSprite();

            expect(sprite.visible).toBe(true);

            sprite.visible = false;
            expect(sprite.visible).toBe(false);
        });

        it("should manage sprite scale", () => {
            const sprite = new MockSprite();

            expect(sprite.scale.x).toBe(1);
            expect(sprite.scale.y).toBe(1);

            sprite.scale.set(2.0, 1.5);
            expect(sprite.scale.set).toHaveBeenCalledWith(2.0, 1.5);
        });

        it("should handle sprite rotation", () => {
            const sprite = new MockSprite();

            expect(sprite.rotation).toBe(0);

            sprite.rotation = Math.PI / 4; // 45 degrees
            expect(sprite.rotation).toBe(Math.PI / 4);
        });
    });

    describe("Sprite Container Interactions", () => {
        it("should add sprite to container", () => {
            const sprite = new MockSprite();
            const result = container.addChild(sprite);

            expect(result).toBe(sprite);
            expect(container.children).toContain(sprite);
            expect(sprite.parent).toBe(container);
        });

        it("should remove sprite from container", () => {
            const sprite = new MockSprite();
            container.addChild(sprite);

            const result = container.removeChild(sprite);

            expect(result).toBe(sprite);
            expect(container.children).not.toContain(sprite);
            expect(sprite.parent).toBe(null);
        });

        it("should handle multiple sprites in container", () => {
            const sprite1 = new MockSprite();
            const sprite2 = new MockSprite();
            const sprite3 = new MockSprite();

            container.addChild(sprite1);
            container.addChild(sprite2);
            container.addChild(sprite3);

            expect(container.children).toHaveLength(3);
            expect(container.children).toEqual([sprite1, sprite2, sprite3]);
        });

        it("should manage sprite ordering with addChildAt", () => {
            const sprite1 = new MockSprite();
            const sprite2 = new MockSprite();
            const sprite3 = new MockSprite();

            container.addChild(sprite1);
            container.addChild(sprite3);
            container.addChildAt(sprite2, 1); // Insert at index 1

            expect(container.children).toEqual([sprite1, sprite2, sprite3]);
        });

        it("should get sprite at specific index", () => {
            const sprite1 = new MockSprite();
            const sprite2 = new MockSprite();

            container.addChild(sprite1);
            container.addChild(sprite2);

            expect(container.getChildAt(0)).toBe(sprite1);
            expect(container.getChildAt(1)).toBe(sprite2);
        });

        it("should find sprite index in container", () => {
            const sprite1 = new MockSprite();
            const sprite2 = new MockSprite();

            container.addChild(sprite1);
            container.addChild(sprite2);

            expect(container.getChildIndex(sprite1)).toBe(0);
            expect(container.getChildIndex(sprite2)).toBe(1);
        });
    });

    describe("Sprite Lifecycle Management", () => {
        it("should destroy sprite properly", () => {
            const sprite = new MockSprite();
            container.addChild(sprite);

            sprite.destroy();

            expect(sprite.destroyed).toBe(true);
            expect(sprite.destroy).toHaveBeenCalled();
        });

        it("should destroy container with all sprites", () => {
            const sprite1 = new MockSprite();
            const sprite2 = new MockSprite();

            container.addChild(sprite1);
            container.addChild(sprite2);

            container.destroy();

            expect(container.destroyed).toBe(true);
            expect(sprite1.destroy).toHaveBeenCalled();
            expect(sprite2.destroy).toHaveBeenCalled();
            expect(container.children).toHaveLength(0);
        });

        it("should handle texture lifecycle", () => {
            const texture = new MockTexture("test.png");
            const sprite = new MockSprite(texture);

            expect(texture.valid).toBe(true);

            texture.destroy();

            expect(texture.destroy).toHaveBeenCalled();
        });
    });

    describe("Animation and Transform Tests", () => {
        it("should handle sprite position animation", () => {
            const sprite = new MockSprite();
            sprite.x = 0;
            sprite.y = 0;

            // Simulate animation frames
            const frames = 10;
            const targetX = 100;
            const targetY = 100;

            for (let i = 0; i < frames; i++) {
                const progress = (i + 1) / frames;
                sprite.x = targetX * progress;
                sprite.y = targetY * progress;
            }

            expect(sprite.x).toBe(targetX);
            expect(sprite.y).toBe(targetY);
        });

        it("should handle sprite scale animation", () => {
            const sprite = new MockSprite();
            sprite.scale.x = 1;
            sprite.scale.y = 1;

            // Simulate scale animation
            const startScale = 1;
            const endScale = 2;
            const progress = 0.5;

            const currentScale =
                startScale + (endScale - startScale) * progress;
            sprite.scale.x = currentScale;
            sprite.scale.y = currentScale;

            expect(sprite.scale.x).toBe(1.5);
            expect(sprite.scale.y).toBe(1.5);
        });

        it("should handle sprite rotation animation", () => {
            const sprite = new MockSprite();
            sprite.rotation = 0;

            // Simulate rotation animation
            const rotationSpeed = 0.1;
            const frames = 10;

            for (let i = 0; i < frames; i++) {
                sprite.rotation += rotationSpeed;
            }

            expect(sprite.rotation).toBeCloseTo(1.0, 5);
        });

        it("should handle sprite alpha fade animation", () => {
            const sprite = new MockSprite();
            sprite.alpha = 1;

            // Simulate fade out animation
            const fadeFrames = 20;

            for (let i = 0; i < fadeFrames; i++) {
                sprite.alpha = Math.max(0, 1 - (i + 1) / fadeFrames);
            }

            expect(sprite.alpha).toBe(0);
        });
    });

    describe("Complex Rendering Scenarios", () => {
        it("should handle nested container hierarchies", () => {
            const parentContainer = new MockContainer();
            const childContainer = new MockContainer();
            const sprite = new MockSprite();

            parentContainer.addChild(childContainer);
            childContainer.addChild(sprite);

            expect(parentContainer.children).toContain(childContainer);
            expect(childContainer.children).toContain(sprite);
            expect(childContainer.parent).toBe(parentContainer);
            expect(sprite.parent).toBe(childContainer);
        });

        it("should handle sprite layering and z-order", () => {
            const background = MockSprite.from("background.jpg");
            const character = MockSprite.from("character.png");
            const ui = MockSprite.from("ui.png");

            // Add in specific order for layering
            container.addChild(background); // Bottom layer
            container.addChild(character); // Middle layer
            container.addChild(ui); // Top layer

            expect(container.getChildIndex(background)).toBe(0);
            expect(container.getChildIndex(character)).toBe(1);
            expect(container.getChildIndex(ui)).toBe(2);
        });

        it("should handle multiple sprite properties simultaneously", () => {
            const sprite = new MockSprite();

            // Set multiple properties
            sprite.x = 200;
            sprite.y = 150;
            sprite.scale.x = 1.5;
            sprite.scale.y = 1.5;
            sprite.rotation = Math.PI / 6;
            sprite.alpha = 0.8;
            sprite.tint = 0x00ff00;

            // Verify all properties are set correctly
            expect(sprite.x).toBe(200);
            expect(sprite.y).toBe(150);
            expect(sprite.scale.x).toBe(1.5);
            expect(sprite.scale.y).toBe(1.5);
            expect(sprite.rotation).toBe(Math.PI / 6);
            expect(sprite.alpha).toBe(0.8);
            expect(sprite.tint).toBe(0x00ff00);
        });

        it("should handle sprite batch operations", () => {
            const sprites = Array.from({ length: 50 }, (_, i) => {
                const sprite = new MockSprite();
                sprite.x = (i % 10) * 50;
                sprite.y = Math.floor(i / 10) * 50;
                return sprite;
            });

            // Add all sprites to container
            sprites.forEach((sprite) => container.addChild(sprite));

            expect(container.children).toHaveLength(50);

            // Verify positions are set correctly
            expect(sprites[0].x).toBe(0);
            expect(sprites[0].y).toBe(0);
            expect(sprites[9].x).toBe(450);
            expect(sprites[9].y).toBe(0);
            expect(sprites[10].x).toBe(0);
            expect(sprites[10].y).toBe(50);
        });
    });

    describe("Performance and Edge Cases", () => {
        it("should handle rapid sprite creation and destruction", () => {
            const sprites: any[] = [];

            // Create many sprites rapidly
            for (let i = 0; i < 100; i++) {
                const sprite = new MockSprite();
                sprites.push(sprite);
                container.addChild(sprite);
            }

            expect(container.children).toHaveLength(100);

            // Destroy all sprites
            sprites.forEach((sprite) => {
                container.removeChild(sprite);
                sprite.destroy();
            });

            expect(container.children).toHaveLength(0);
            sprites.forEach((sprite) => {
                expect(sprite.destroyed).toBe(true);
            });
        });

        it("should handle edge case property values", () => {
            const sprite = new MockSprite();

            // Test extreme values
            sprite.x = -1000;
            sprite.y = 5000;
            sprite.scale.x = 0.001;
            sprite.scale.y = 100;
            sprite.rotation = Math.PI * 4; // Multiple full rotations
            sprite.alpha = -0.5; // Negative alpha

            // Verify values are accepted (behavior depends on implementation)
            expect(sprite.x).toBe(-1000);
            expect(sprite.y).toBe(5000);
            expect(sprite.scale.x).toBe(0.001);
            expect(sprite.scale.y).toBe(100);
            expect(sprite.rotation).toBe(Math.PI * 4);
            expect(sprite.alpha).toBe(-0.5);
        });

        it("should prevent duplicate sprite additions", () => {
            const sprite = new MockSprite();

            container.addChild(sprite);
            container.addChild(sprite); // Try to add again

            // Should only appear once in children array
            expect(
                container.children.filter((child) => child === sprite),
            ).toHaveLength(1);
        });
    });
});
