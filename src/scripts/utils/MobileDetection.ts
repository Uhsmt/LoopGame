export interface MobileDetectionResult {
    isMobile: boolean;
    isTablet: boolean;
    isTouchDevice: boolean;
    screenSize: "small" | "medium" | "large";
    orientation: "portrait" | "landscape";
}

/**
 * Detect if the current device is a mobile device based on user agent
 */
export function isMobileDevice(): boolean {
    const userAgent = navigator.userAgent;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        userAgent,
    );
}

/**
 * Detect if the current device is a tablet based on user agent and screen size
 */
export function isTabletDevice(): boolean {
    const userAgent = navigator.userAgent.toLowerCase();
    const width = window.innerWidth;
    const height = window.innerHeight;

    // iPad detection
    if (userAgent.includes("ipad")) {
        return true;
    }

    // Android tablet detection (typically larger screens)
    if (userAgent.includes("android") && !userAgent.includes("mobile")) {
        return true;
    }

    // Don't classify desktop as tablet
    if (width >= 1200) {
        return false;
    }

    // Generic tablet detection based on screen size
    const minDimension = Math.min(width, height);
    const maxDimension = Math.max(width, height);

    // Typical tablet dimensions
    return minDimension >= 768 && maxDimension >= 1024;
}

/**
 * Detect if the current device supports touch
 */
export function isTouchDevice(): boolean {
    return "maxTouchPoints" in navigator && navigator.maxTouchPoints > 0;
}

/**
 * Get screen size category based on viewport dimensions
 */
export function getScreenSize(): "small" | "medium" | "large" {
    const width = window.innerWidth;

    if (width < 768) {
        return "small";
    } else if (width < 1200) {
        return "medium";
    } else {
        return "large";
    }
}

/**
 * Get current orientation based on viewport dimensions
 */
export function getOrientation(): "portrait" | "landscape" {
    return window.innerWidth > window.innerHeight ? "landscape" : "portrait";
}

/**
 * Get complete mobile detection result
 */
export function getMobileDetectionResult(): MobileDetectionResult {
    return {
        isMobile: isMobileDevice(),
        isTablet: isTabletDevice(),
        isTouchDevice: isTouchDevice(),
        screenSize: getScreenSize(),
        orientation: getOrientation(),
    };
}
