export interface CanvasResizeOptions {
    maintainAspectRatio: boolean;
    minWidth: number;
    minHeight: number;
    maxWidth: number;
    maxHeight: number;
    targetAspectRatio: number; // width/height ratio
    scaleMode: "fit" | "fill" | "stretch";
    baseWidth: number; // design resolution the stage content is laid out for
    baseHeight: number;
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
        baseWidth: 800,
        baseHeight: 600,
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
        if (this.options.scaleMode !== "stretch") {
            const scaleX = width / this.options.baseWidth;
            const scaleY = height / this.options.baseHeight;
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
     * Apply calculated size to the canvas via CSS only.
     *
     * The PIXI renderer keeps the game's design resolution (baseWidth x
     * baseHeight), so game code that positions objects against app.screen
     * keeps working unchanged. PIXI's event system maps pointer coordinates
     * through the canvas bounding rect, which compensates for the CSS
     * scaling automatically. Centering is handled by CSS at the DOM level.
     */
    public applyCanvasSize(size: CanvasResizeResult): void {
        this._canvas.style.width = `${size.width}px`;
        this._canvas.style.height = `${size.height}px`;
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
