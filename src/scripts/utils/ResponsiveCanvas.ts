export interface CanvasResizeOptions {
    maintainAspectRatio: boolean;
    minWidth: number;
    minHeight: number;
    maxWidth: number;
    maxHeight: number;
    targetAspectRatio: number; // width/height ratio
    scaleMode: "fit" | "fill" | "stretch";
}

export interface CanvasResizeResult {
    width: number;
    height: number;
    scale: number;
    offsetX: number;
    offsetY: number;
}

export interface CanvasInfo {
    width: number;
    height: number;
    scale: number;
    aspectRatio: number;
    devicePixelRatio: number;
}

interface PixiApp {
    renderer?: {
        resize?: (width: number, height: number) => void;
    };
    stage?: {
        scale: { x: number; y: number };
        position: { x: number; y: number };
    };
}

export class ResponsiveCanvas {
    private _pixiApp: PixiApp;
    private _canvas: HTMLCanvasElement;
    private _resizeHandler: () => void;
    private _isInitialized = false;
    private _currentSize: CanvasResizeResult = {
        width: 0,
        height: 0,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
    };

    public readonly options: CanvasResizeOptions;

    private static readonly DEFAULT_OPTIONS: CanvasResizeOptions = {
        maintainAspectRatio: true,
        minWidth: 320,
        minHeight: 240,
        maxWidth: 1920,
        maxHeight: 1080,
        targetAspectRatio: 16 / 9,
        scaleMode: "fit",
    };

    constructor(
        pixiApp: PixiApp,
        canvas: HTMLCanvasElement,
        options?: Partial<CanvasResizeOptions>,
    ) {
        this._pixiApp = pixiApp;
        this._canvas = canvas;
        this.options = { ...ResponsiveCanvas.DEFAULT_OPTIONS, ...options };

        this._resizeHandler = () => {
            this.resize();
        };
    }

    /**
     * Calculate optimal canvas size based on viewport and options
     */
    public calculateCanvasSize(): CanvasResizeResult {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const devicePixelRatio = window.devicePixelRatio || 1;

        let width = viewportWidth;
        let height = viewportHeight;
        let scale = 1;
        let offsetX = 0;
        let offsetY = 0;

        // Apply min/max constraints first
        width = Math.max(
            this.options.minWidth,
            Math.min(this.options.maxWidth, width),
        );
        height = Math.max(
            this.options.minHeight,
            Math.min(this.options.maxHeight, height),
        );

        // If we enforced minimums, we might need to maintain aspect ratio differently
        if (
            this.options.maintainAspectRatio &&
            (width === this.options.minWidth ||
                height === this.options.minHeight)
        ) {
            const targetRatio = this.options.targetAspectRatio;
            if (width / height < targetRatio) {
                width = height * targetRatio;
            } else {
                height = width / targetRatio;
            }
            // Re-apply constraints after aspect ratio adjustment
            width = Math.max(
                this.options.minWidth,
                Math.min(this.options.maxWidth, width),
            );
            height = Math.max(
                this.options.minHeight,
                Math.min(this.options.maxHeight, height),
            );
        }

        if (this.options.maintainAspectRatio) {
            const targetRatio = this.options.targetAspectRatio;
            const currentRatio = width / height;

            switch (this.options.scaleMode) {
                case "fit":
                    if (currentRatio > targetRatio) {
                        // Viewport is wider than target, fit by height
                        width = height * targetRatio;
                    } else {
                        // Viewport is taller than target, fit by width
                        height = width / targetRatio;
                    }
                    break;

                case "fill":
                    if (currentRatio > targetRatio) {
                        // Viewport is wider than target, fill by width
                        height = width / targetRatio;
                    } else {
                        // Viewport is taller than target, fill by height
                        width = height * targetRatio;
                    }
                    break;

                case "stretch":
                    // Don't maintain aspect ratio in stretch mode
                    break;
            }
        }

        // Calculate scale for responsive scaling
        const baseWidth = 800; // Reference resolution
        const baseHeight = 600;

        if (this.options.scaleMode !== "stretch") {
            const scaleX = width / baseWidth;
            const scaleY = height / baseHeight;
            scale = Math.min(scaleX, scaleY);
        }

        // Calculate offsets for centering
        offsetX = (viewportWidth - width) / 2;
        offsetY = (viewportHeight - height) / 2;

        // Account for device pixel ratio
        const actualWidth =
            Math.floor(width * devicePixelRatio) / devicePixelRatio;
        const actualHeight =
            Math.floor(height * devicePixelRatio) / devicePixelRatio;

        const result: CanvasResizeResult = {
            width: actualWidth,
            height: actualHeight,
            scale,
            offsetX,
            offsetY,
        };

        this._currentSize = result;
        return result;
    }

    /**
     * Apply calculated size to canvas and PIXI app
     */
    public applyCanvasSize(size: CanvasResizeResult): void {
        // Update canvas dimensions
        this._canvas.width = size.width;
        this._canvas.height = size.height;

        // Update canvas style for proper display
        this._canvas.style.width = `${size.width}px`;
        this._canvas.style.height = `${size.height}px`;

        // Update PIXI renderer
        if (
            this._pixiApp &&
            this._pixiApp.renderer &&
            typeof this._pixiApp.renderer.resize === "function"
        ) {
            this._pixiApp.renderer.resize(size.width, size.height);
        }

        // Update PIXI stage scale and position
        if (this._pixiApp && this._pixiApp.stage) {
            this._pixiApp.stage.scale.x = size.scale;
            this._pixiApp.stage.scale.y = size.scale;
            this._pixiApp.stage.position.x = size.offsetX;
            this._pixiApp.stage.position.y = size.offsetY;
        }
    }

    /**
     * Perform resize operation
     */
    public resize(): void {
        const newSize = this.calculateCanvasSize();
        this.applyCanvasSize(newSize);
    }

    /**
     * Initialize responsive canvas management
     */
    public init(): void {
        if (this._isInitialized) {
            return;
        }

        this._isInitialized = true;

        // Add resize listener
        window.addEventListener("resize", this._resizeHandler);

        // Perform initial resize
        this.resize();
    }

    /**
     * Cleanup responsive canvas management
     */
    public destroy(): void {
        if (!this._isInitialized) {
            return;
        }

        this._isInitialized = false;

        // Remove resize listener
        window.removeEventListener("resize", this._resizeHandler);
    }

    /**
     * Get current canvas information
     */
    public getCanvasInfo(): CanvasInfo {
        return {
            width: this._currentSize.width,
            height: this._currentSize.height,
            scale: this._currentSize.scale,
            aspectRatio: this._currentSize.width / this._currentSize.height,
            devicePixelRatio: window.devicePixelRatio || 1,
        };
    }

    /**
     * Check if responsive canvas is initialized
     */
    public isInitialized(): boolean {
        return this._isInitialized;
    }
}
