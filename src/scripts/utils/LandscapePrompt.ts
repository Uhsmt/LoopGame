import { isMobileDevice, isTouchDevice } from "./MobileDetection";

export interface LandscapePromptOptions {
    threshold: number; // Minimum width/height ratio to hide prompt
    showDelay: number; // Delay before showing prompt (ms)
    checkInterval: number; // Interval to check orientation (ms)
    message: string; // Custom message to display
}

export interface LandscapePromptState {
    isVisible: boolean;
    isPortrait: boolean;
    shouldShow: boolean;
}

export class LandscapePrompt {
    private _element: HTMLElement | null = null;
    private _intervalId: number | null = null;
    private _isInitialized = false;
    private _isVisible = false;

    public readonly options: LandscapePromptOptions;

    private static readonly DEFAULT_OPTIONS: LandscapePromptOptions = {
        threshold: 1.2,
        showDelay: 1000,
        checkInterval: 500,
        message:
            "For the best experience, please rotate your device to landscape mode",
    };

    constructor(options?: Partial<LandscapePromptOptions>) {
        this.options = { ...LandscapePrompt.DEFAULT_OPTIONS, ...options };
    }

    /**
     * Check if device is currently in portrait mode
     */
    public isInPortraitMode(): boolean {
        const ratio = window.innerWidth / window.innerHeight;
        return ratio < this.options.threshold;
    }

    /**
     * Check if prompt should be shown based on device type and orientation
     */
    public shouldShowPrompt(): boolean {
        // Only show on mobile/touch devices
        if (!isMobileDevice() && !isTouchDevice()) {
            return false;
        }

        // Show only in portrait mode
        return this.isInPortraitMode();
    }

    /**
     * Create the prompt DOM element
     */
    public createPromptElement(): HTMLElement {
        const element = document.createElement("div");
        element.classList.add("landscape-prompt");

        element.innerHTML = `
            <div class="landscape-prompt-content">
                <div class="landscape-prompt-icon">📱</div>
                <div class="landscape-prompt-text">${this.options.message}</div>
                <div class="landscape-prompt-rotate-icon">🔄</div>
            </div>
        `;

        // Add CSS styles
        element.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 20px;
            box-sizing: border-box;
        `;

        const content = element.querySelector(
            ".landscape-prompt-content",
        ) as HTMLElement;
        if (content) {
            content.style.cssText = `
                max-width: 300px;
                line-height: 1.5;
            `;
        }

        const icon = element.querySelector(
            ".landscape-prompt-icon",
        ) as HTMLElement;
        if (icon) {
            icon.style.cssText = `
                font-size: 3rem;
                margin-bottom: 1rem;
            `;
        }

        const text = element.querySelector(
            ".landscape-prompt-text",
        ) as HTMLElement;
        if (text) {
            text.style.cssText = `
                font-size: 1.1rem;
                margin-bottom: 1rem;
            `;
        }

        const rotateIcon = element.querySelector(
            ".landscape-prompt-rotate-icon",
        ) as HTMLElement;
        if (rotateIcon) {
            rotateIcon.style.cssText = `
                font-size: 2rem;
                animation: rotate 2s linear infinite;
            `;
        }

        // Add rotation animation keyframes
        const style = document.createElement("style");
        style.textContent = `
            @keyframes rotate {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        return element;
    }

    /**
     * Show the landscape prompt
     */
    public show(): void {
        if (this._isVisible || !this.shouldShowPrompt()) {
            return;
        }

        this._element = this.createPromptElement();
        document.body.appendChild(this._element);
        this._isVisible = true;
    }

    /**
     * Hide the landscape prompt
     */
    public hide(): void {
        if (!this._isVisible || !this._element) {
            return;
        }

        document.body.removeChild(this._element);
        this._element = null;
        this._isVisible = false;
    }

    /**
     * Check if prompt is currently visible
     */
    public isVisible(): boolean {
        return this._isVisible;
    }

    /**
     * Initialize orientation monitoring
     */
    public init(): void {
        if (this._isInitialized) {
            return;
        }

        this._isInitialized = true;

        // Initial check with delay
        setTimeout(() => {
            this.checkOrientation();
        }, this.options.showDelay);

        // Set up periodic checking
        this._intervalId = window.setInterval(() => {
            this.checkOrientation();
        }, this.options.checkInterval);

        // Listen to orientation change events
        window.addEventListener("orientationchange", () => {
            setTimeout(() => {
                this.checkOrientation();
            }, 100); // Small delay for orientation change to complete
        });

        window.addEventListener("resize", () => {
            this.checkOrientation();
        });
    }

    /**
     * Destroy orientation monitoring
     */
    public destroy(): void {
        if (!this._isInitialized) {
            return;
        }

        this._isInitialized = false;

        if (this._intervalId !== null) {
            window.clearInterval(this._intervalId);
            this._intervalId = null;
        }

        this.hide();
    }

    /**
     * Check if prompt is initialized
     */
    public isInitialized(): boolean {
        return this._isInitialized;
    }

    /**
     * Get current prompt state
     */
    public getState(): LandscapePromptState {
        return {
            isVisible: this._isVisible,
            isPortrait: this.isInPortraitMode(),
            shouldShow: this.shouldShowPrompt(),
        };
    }

    /**
     * Internal method to check orientation and show/hide prompt accordingly
     */
    private checkOrientation(): void {
        if (this.shouldShowPrompt()) {
            this.show();
        } else {
            this.hide();
        }
    }
}
