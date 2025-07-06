export interface TouchEventOptions {
    preventDefaultTouchEvents: boolean;
    enableMouseEmulation: boolean;
    touchStartThreshold: number; // minimum distance for touch start
    touchMoveThreshold: number; // minimum distance for touch move
    touchEndDelay: number; // delay before processing touch end
    multiTouchEnabled: boolean;
}

export interface TouchEventInfo {
    type: "touchstart" | "touchmove" | "touchend" | "touchcancel";
    touches: Array<{
        id: number;
        x: number;
        y: number;
        pressure?: number;
    }>;
    target: HTMLElement;
    originalEvent: TouchEvent | MouseEvent;
    timestamp: number;
}

interface ActiveTouch {
    id: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
    startTime: number;
}

export class TouchHandler {
    private _element: HTMLElement;
    private _isInitialized = false;
    private _activeTouches: Map<number, ActiveTouch> = new Map();
    private _mouseTouch: ActiveTouch | null = null;

    // Event handlers
    private _touchStartHandler: (e: TouchEvent) => void;
    private _touchMoveHandler: (e: TouchEvent) => void;
    private _touchEndHandler: (e: TouchEvent) => void;
    private _touchCancelHandler: (e: TouchEvent) => void;
    private _mouseDownHandler: (e: MouseEvent) => void;
    private _mouseMoveHandler: (e: MouseEvent) => void;
    private _mouseUpHandler: (e: MouseEvent) => void;

    // Callbacks
    private _touchStartCallbacks: Array<(info: TouchEventInfo) => void> = [];
    private _touchMoveCallbacks: Array<(info: TouchEventInfo) => void> = [];
    private _touchEndCallbacks: Array<(info: TouchEventInfo) => void> = [];
    private _tapCallbacks: Array<(info: TouchEventInfo) => void> = [];
    private _longPressCallbacks: Array<(info: TouchEventInfo) => void> = [];

    // Long press timers
    private _longPressTimers: Map<number, number> = new Map();

    public readonly options: TouchEventOptions;

    private static readonly DEFAULT_OPTIONS: TouchEventOptions = {
        preventDefaultTouchEvents: true,
        enableMouseEmulation: true,
        touchStartThreshold: 2,
        touchMoveThreshold: 5,
        touchEndDelay: 0,
        multiTouchEnabled: true,
    };

    constructor(element: HTMLElement, options?: Partial<TouchEventOptions>) {
        this._element = element;
        this.options = { ...TouchHandler.DEFAULT_OPTIONS, ...options };

        // Bind event handlers
        this._touchStartHandler = this.handleTouchStart.bind(this);
        this._touchMoveHandler = this.handleTouchMove.bind(this);
        this._touchEndHandler = this.handleTouchEnd.bind(this);
        this._touchCancelHandler = this.handleTouchCancel.bind(this);
        this._mouseDownHandler = this.handleMouseDown.bind(this);
        this._mouseMoveHandler = this.handleMouseMove.bind(this);
        this._mouseUpHandler = this.handleMouseUp.bind(this);
    }

    /**
     * Initialize touch event handling
     */
    public init(): void {
        if (this._isInitialized) {
            return;
        }

        this._isInitialized = true;

        // Register touch events
        this._element.addEventListener("touchstart", this._touchStartHandler, {
            passive: false,
        });
        this._element.addEventListener("touchmove", this._touchMoveHandler, {
            passive: false,
        });
        this._element.addEventListener("touchend", this._touchEndHandler, {
            passive: false,
        });
        this._element.addEventListener(
            "touchcancel",
            this._touchCancelHandler,
            { passive: false },
        );

        // Register mouse events if emulation is enabled
        if (this.options.enableMouseEmulation) {
            this._element.addEventListener(
                "mousedown",
                this._mouseDownHandler,
                { passive: false },
            );
            this._element.addEventListener(
                "mousemove",
                this._mouseMoveHandler,
                { passive: false },
            );
            this._element.addEventListener("mouseup", this._mouseUpHandler, {
                passive: false,
            });
        }
    }

    /**
     * Cleanup touch event handling
     */
    public destroy(): void {
        if (!this._isInitialized) {
            return;
        }

        this._isInitialized = false;

        // Remove touch events
        this._element.removeEventListener(
            "touchstart",
            this._touchStartHandler,
        );
        this._element.removeEventListener("touchmove", this._touchMoveHandler);
        this._element.removeEventListener("touchend", this._touchEndHandler);
        this._element.removeEventListener(
            "touchcancel",
            this._touchCancelHandler,
        );

        // Remove mouse events
        this._element.removeEventListener("mousedown", this._mouseDownHandler);
        this._element.removeEventListener("mousemove", this._mouseMoveHandler);
        this._element.removeEventListener("mouseup", this._mouseUpHandler);

        // Clear active touches and timers
        this._activeTouches.clear();
        this._mouseTouch = null;
        this._longPressTimers.forEach((timer) => window.clearTimeout(timer));
        this._longPressTimers.clear();
    }

    /**
     * Transform screen coordinates to canvas-relative coordinates
     */
    public transformCoordinates(
        clientX: number,
        clientY: number,
        scale: number = 1,
    ): { x: number; y: number } {
        const rect = this._element.getBoundingClientRect();
        const x = (clientX - rect.left) / scale;
        const y = (clientY - rect.top) / scale;
        return { x, y };
    }

    /**
     * Normalize touch event to common format
     */
    public normalizeTouchEvent(event: TouchEvent): TouchEventInfo {
        const touches = Array.from(event.changedTouches || event.touches).map(
            (touch) => {
                const coords = this.transformCoordinates(
                    touch.clientX,
                    touch.clientY,
                );
                return {
                    id: touch.identifier,
                    x: coords.x,
                    y: coords.y,
                    pressure: (touch as Touch & { force?: number }).force || 1,
                };
            },
        );

        // Filter to single touch if multi-touch is disabled
        const filteredTouches = this.options.multiTouchEnabled
            ? touches
            : touches.slice(0, 1);

        return {
            type: event.type as
                | "touchstart"
                | "touchmove"
                | "touchend"
                | "touchcancel",
            touches: filteredTouches,
            target: event.target as HTMLElement,
            originalEvent: event,
            timestamp: event.timeStamp || Date.now(),
        };
    }

    /**
     * Handle touch start events
     */
    public handleTouchStart(event: TouchEvent): void {
        if (this.options.preventDefaultTouchEvents) {
            event.preventDefault();
        }

        const normalized = this.normalizeTouchEvent(event);

        normalized.touches.forEach((touch) => {
            const activeTouch: ActiveTouch = {
                id: touch.id,
                x: touch.x,
                y: touch.y,
                startX: touch.x,
                startY: touch.y,
                startTime: normalized.timestamp,
            };

            this._activeTouches.set(touch.id, activeTouch);

            // Start long press timer
            const longPressTimer = window.setTimeout(() => {
                this._longPressCallbacks.forEach((callback) =>
                    callback(normalized),
                );
                this._longPressTimers.delete(touch.id);
            }, 700);

            this._longPressTimers.set(touch.id, longPressTimer);
        });

        this._touchStartCallbacks.forEach((callback) => callback(normalized));
    }

    /**
     * Handle touch move events
     */
    public handleTouchMove(event: TouchEvent): void {
        if (this.options.preventDefaultTouchEvents) {
            event.preventDefault();
        }

        const normalized = this.normalizeTouchEvent(event);

        normalized.touches.forEach((touch) => {
            const activeTouch = this._activeTouches.get(touch.id);
            if (activeTouch) {
                activeTouch.x = touch.x;
                activeTouch.y = touch.y;

                // Cancel long press if moved too far
                const distance = Math.sqrt(
                    Math.pow(touch.x - activeTouch.startX, 2) +
                        Math.pow(touch.y - activeTouch.startY, 2),
                );

                if (distance > this.options.touchMoveThreshold) {
                    const timer = this._longPressTimers.get(touch.id);
                    if (timer) {
                        window.clearTimeout(timer);
                        this._longPressTimers.delete(touch.id);
                    }
                }
            }
        });

        this._touchMoveCallbacks.forEach((callback) => callback(normalized));
    }

    /**
     * Handle touch end events
     */
    public handleTouchEnd(event: TouchEvent): void {
        if (this.options.preventDefaultTouchEvents) {
            event.preventDefault();
        }

        const normalized = this.normalizeTouchEvent(event);

        normalized.touches.forEach((touch) => {
            const activeTouch = this._activeTouches.get(touch.id);
            if (activeTouch) {
                // Check for tap gesture
                const distance = Math.sqrt(
                    Math.pow(touch.x - activeTouch.startX, 2) +
                        Math.pow(touch.y - activeTouch.startY, 2),
                );
                const duration = normalized.timestamp - activeTouch.startTime;

                if (
                    distance <= this.options.touchStartThreshold &&
                    duration < 500
                ) {
                    this._tapCallbacks.forEach((callback) =>
                        callback(normalized),
                    );
                }

                // Clear long press timer
                const timer = this._longPressTimers.get(touch.id);
                if (timer) {
                    window.clearTimeout(timer);
                    this._longPressTimers.delete(touch.id);
                }

                this._activeTouches.delete(touch.id);
            }
        });

        this._touchEndCallbacks.forEach((callback) => callback(normalized));
    }

    /**
     * Handle touch cancel events
     */
    public handleTouchCancel(event: TouchEvent): void {
        const normalized = this.normalizeTouchEvent(event);

        normalized.touches.forEach((touch) => {
            // Clear long press timer
            const timer = this._longPressTimers.get(touch.id);
            if (timer) {
                window.clearTimeout(timer);
                this._longPressTimers.delete(touch.id);
            }

            this._activeTouches.delete(touch.id);
        });
    }

    /**
     * Handle mouse down events (mouse emulation)
     */
    public handleMouseDown(event: MouseEvent): void {
        if (!this.options.enableMouseEmulation || event.button !== 0) {
            return;
        }

        const coords = this.transformCoordinates(event.clientX, event.clientY);
        const mouseTouch: ActiveTouch = {
            id: 0, // Use 0 for mouse
            x: coords.x,
            y: coords.y,
            startX: coords.x,
            startY: coords.y,
            startTime: event.timeStamp || Date.now(),
        };

        this._mouseTouch = mouseTouch;

        // Create synthetic touch event
        const touchInfo: TouchEventInfo = {
            type: "touchstart",
            touches: [
                {
                    id: 0,
                    x: coords.x,
                    y: coords.y,
                },
            ],
            target: event.target as HTMLElement,
            originalEvent: event,
            timestamp: event.timeStamp || Date.now(),
        };

        this._touchStartCallbacks.forEach((callback) => callback(touchInfo));

        if (this.options.preventDefaultTouchEvents) {
            event.preventDefault();
        }
    }

    /**
     * Handle mouse move events (mouse emulation)
     */
    public handleMouseMove(event: MouseEvent): void {
        if (!this.options.enableMouseEmulation || !this._mouseTouch) {
            return;
        }

        const coords = this.transformCoordinates(event.clientX, event.clientY);
        this._mouseTouch.x = coords.x;
        this._mouseTouch.y = coords.y;

        const touchInfo: TouchEventInfo = {
            type: "touchmove",
            touches: [
                {
                    id: 0,
                    x: coords.x,
                    y: coords.y,
                },
            ],
            target: event.target as HTMLElement,
            originalEvent: event,
            timestamp: event.timeStamp || Date.now(),
        };

        this._touchMoveCallbacks.forEach((callback) => callback(touchInfo));
    }

    /**
     * Handle mouse up events (mouse emulation)
     */
    public handleMouseUp(event: MouseEvent): void {
        if (!this.options.enableMouseEmulation || !this._mouseTouch) {
            return;
        }

        const coords = this.transformCoordinates(event.clientX, event.clientY);
        const touchInfo: TouchEventInfo = {
            type: "touchend",
            touches: [
                {
                    id: 0,
                    x: coords.x,
                    y: coords.y,
                },
            ],
            target: event.target as HTMLElement,
            originalEvent: event,
            timestamp: event.timeStamp || Date.now(),
        };

        // Check for tap gesture
        const distance = Math.sqrt(
            Math.pow(coords.x - this._mouseTouch.startX, 2) +
                Math.pow(coords.y - this._mouseTouch.startY, 2),
        );
        const duration = touchInfo.timestamp - this._mouseTouch.startTime;

        if (distance <= this.options.touchStartThreshold && duration < 500) {
            this._tapCallbacks.forEach((callback) => callback(touchInfo));
        }

        this._touchEndCallbacks.forEach((callback) => callback(touchInfo));
        this._mouseTouch = null;
    }

    /**
     * Register touchstart callback
     */
    public onTouchStart(callback: (info: TouchEventInfo) => void): void {
        this._touchStartCallbacks.push(callback);
    }

    /**
     * Register touchmove callback
     */
    public onTouchMove(callback: (info: TouchEventInfo) => void): void {
        this._touchMoveCallbacks.push(callback);
    }

    /**
     * Register touchend callback
     */
    public onTouchEnd(callback: (info: TouchEventInfo) => void): void {
        this._touchEndCallbacks.push(callback);
    }

    /**
     * Register tap gesture callback
     */
    public onTap(callback: (info: TouchEventInfo) => void): void {
        this._tapCallbacks.push(callback);
    }

    /**
     * Register long press gesture callback
     */
    public onLongPress(callback: (info: TouchEventInfo) => void): void {
        this._longPressCallbacks.push(callback);
    }

    /**
     * Get currently active touches
     */
    public getActiveTouches(): Array<{ id: number; x: number; y: number }> {
        const touches = Array.from(this._activeTouches.values()).map(
            (touch) => ({
                id: touch.id,
                x: touch.x,
                y: touch.y,
            }),
        );

        if (this._mouseTouch) {
            touches.push({
                id: this._mouseTouch.id,
                x: this._mouseTouch.x,
                y: this._mouseTouch.y,
            });
        }

        return touches;
    }

    /**
     * Check if touch handler is initialized
     */
    public isInitialized(): boolean {
        return this._isInitialized;
    }
}
