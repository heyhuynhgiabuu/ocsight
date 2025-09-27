/**
 * Accessibility utilities and helpers
 */

export interface AccessibilityConfig {
  announcements: boolean;
  focusManagement: boolean;
  keyboardNavigation: boolean;
  screenReader: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
}

/**
 * Live region announcer for screen readers
 */
export class LiveAnnouncer {
  private liveRegion: HTMLElement | null = null;
  private politeRegion: HTMLElement | null = null;

  constructor() {
    this.createLiveRegions();
  }

  /**
   * Create ARIA live regions for announcements
   */
  private createLiveRegions() {
    if (typeof window === "undefined") return;

    // Assertive live region for urgent announcements
    this.liveRegion = document.createElement("div");
    this.liveRegion.setAttribute("aria-live", "assertive");
    this.liveRegion.setAttribute("aria-atomic", "true");
    this.liveRegion.setAttribute("class", "sr-only");
    this.liveRegion.setAttribute("id", "live-announcer");
    document.body.appendChild(this.liveRegion);

    // Polite live region for non-urgent announcements
    this.politeRegion = document.createElement("div");
    this.politeRegion.setAttribute("aria-live", "polite");
    this.politeRegion.setAttribute("aria-atomic", "true");
    this.politeRegion.setAttribute("class", "sr-only");
    this.politeRegion.setAttribute("id", "polite-announcer");
    document.body.appendChild(this.politeRegion);
  }

  /**
   * Announce message to screen readers (urgent)
   */
  announce(message: string, urgent = false) {
    const region = urgent ? this.liveRegion : this.politeRegion;
    if (!region) return;

    // Clear previous message
    region.textContent = "";

    // Add new message after a brief delay to ensure it's announced
    setTimeout(() => {
      region.textContent = message;
    }, 100);

    // Clear message after announcement
    setTimeout(() => {
      region.textContent = "";
    }, 1000);
  }

  /**
   * Announce page navigation
   */
  announceNavigation(pageName: string) {
    this.announce(`Navigated to ${pageName}`);
  }

  /**
   * Announce search results
   */
  announceSearchResults(count: number, query: string) {
    const message =
      count === 0
        ? `No results found for "${query}"`
        : `${count} result${count !== 1 ? "s" : ""} found for "${query}"`;
    this.announce(message);
  }

  /**
   * Announce form validation errors
   */
  announceFormError(fieldName: string, error: string) {
    this.announce(`Error in ${fieldName}: ${error}`, true);
  }
}

/**
 * Focus management utilities
 */
export class FocusManager {
  private focusStack: HTMLElement[] = [];
  private trapContainer: HTMLElement | null = null;

  /**
   * Set focus to element and add to focus stack
   */
  setFocus(element: HTMLElement | string, options?: FocusOptions) {
    const target =
      typeof element === "string"
        ? (document.querySelector(element) as HTMLElement)
        : element;

    if (!target) return;

    // Store current focus for restoration
    const currentFocus = document.activeElement as HTMLElement;
    if (currentFocus && currentFocus !== document.body) {
      this.focusStack.push(currentFocus);
    }

    target.focus(options);
  }

  /**
   * Restore previous focus
   */
  restoreFocus() {
    const previousFocus = this.focusStack.pop();
    if (previousFocus) {
      previousFocus.focus();
    }
  }

  /**
   * Trap focus within a container (for modals, dialogs)
   */
  trapFocus(container: HTMLElement | string) {
    const containerElement =
      typeof container === "string"
        ? (document.querySelector(container) as HTMLElement)
        : container;

    if (!containerElement) return;

    this.trapContainer = containerElement;

    const focusableElements = this.getFocusableElements(containerElement);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Set initial focus
    firstElement.focus();

    // Handle tab navigation
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    containerElement.addEventListener("keydown", handleTabKey);

    // Return cleanup function
    return () => {
      containerElement.removeEventListener("keydown", handleTabKey);
      this.trapContainer = null;
    };
  }

  /**
   * Release focus trap
   */
  releaseFocusTrap() {
    this.restoreFocus();
  }

  /**
   * Get all focusable elements within a container
   */
  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(", ");

    return Array.from(container.querySelectorAll(focusableSelectors)).filter(
      (element) => {
        const el = element as HTMLElement;
        return el.offsetWidth > 0 && el.offsetHeight > 0 && !el.hidden;
      },
    ) as HTMLElement[];
  }
}

/**
 * Keyboard navigation utilities
 */
export class KeyboardNavigation {
  private shortcuts: Map<string, () => void> = new Map();

  constructor() {
    this.setupGlobalKeyboardHandlers();
  }

  /**
   * Register keyboard shortcut
   */
  registerShortcut(key: string, callback: () => void, description?: string) {
    this.shortcuts.set(key.toLowerCase(), callback);

    // Store description for help system
    if (description) {
      this.shortcuts.set(`${key}:description`, () => description);
    }
  }

  /**
   * Unregister keyboard shortcut
   */
  unregisterShortcut(key: string) {
    this.shortcuts.delete(key.toLowerCase());
    this.shortcuts.delete(`${key}:description`);
  }

  /**
   * Get all registered shortcuts
   */
  getShortcuts(): Array<{ key: string; description: string }> {
    const shortcuts: Array<{ key: string; description: string }> = [];

    this.shortcuts.forEach((callback, key) => {
      if (key.includes(":description")) {
        const shortcutKey = key.replace(":description", "");
        const description = callback();
        shortcuts.push({
          key: shortcutKey,
          description:
            typeof description === "string" ? description : "No description",
        });
      }
    });

    return shortcuts;
  }

  /**
   * Setup global keyboard event handlers
   */
  private setupGlobalKeyboardHandlers() {
    if (typeof window === "undefined") return;

    document.addEventListener("keydown", (e) => {
      // Build key combination string
      const modifiers = [];
      if (e.ctrlKey) modifiers.push("ctrl");
      if (e.metaKey) modifiers.push("cmd");
      if (e.altKey) modifiers.push("alt");
      if (e.shiftKey) modifiers.push("shift");

      const key = e.key.toLowerCase();
      const combination = [...modifiers, key].join("+");

      // Check for registered shortcut
      const callback = this.shortcuts.get(combination);
      if (callback) {
        e.preventDefault();
        callback();
      }
    });
  }
}

/**
 * Screen reader utilities
 */
export class ScreenReaderUtils {
  /**
   * Check if screen reader is likely active
   */
  static isScreenReaderActive(): boolean {
    if (typeof window === "undefined") return false;

    // Check for common screen reader indicators
    return !!(
      window.navigator.userAgent.includes("NVDA") ||
      window.navigator.userAgent.includes("JAWS") ||
      window.speechSynthesis ||
      (window as any).speechSynthesis
    );
  }

  /**
   * Generate accessible description for complex UI
   */
  static generateDescription(element: HTMLElement): string {
    const role = element.getAttribute("role") || element.tagName.toLowerCase();
    const label =
      element.getAttribute("aria-label") ||
      element.getAttribute("title") ||
      element.textContent?.trim() ||
      "Unlabeled element";

    const state = [];
    if (element.getAttribute("aria-expanded") === "true")
      state.push("expanded");
    if (element.getAttribute("aria-expanded") === "false")
      state.push("collapsed");
    if (element.getAttribute("aria-selected") === "true")
      state.push("selected");
    if (element.getAttribute("aria-checked") === "true") state.push("checked");
    if (element.hasAttribute("disabled")) state.push("disabled");

    return `${role} ${label}${state.length ? `, ${state.join(", ")}` : ""}`;
  }

  /**
   * Add screen reader only text
   */
  static addScreenReaderText(element: HTMLElement, text: string) {
    const srText = document.createElement("span");
    srText.className = "sr-only";
    srText.textContent = text;
    element.appendChild(srText);
  }
}

/**
 * Color contrast utilities
 */
export class ColorContrast {
  /**
   * Calculate color contrast ratio
   */
  static getContrastRatio(color1: string, color2: string): number {
    const luminance1 = this.getLuminance(color1);
    const luminance2 = this.getLuminance(color2);

    const lighter = Math.max(luminance1, luminance2);
    const darker = Math.min(luminance1, luminance2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Check if color combination meets WCAG standards
   */
  static meetsWCAG(
    color1: string,
    color2: string,
    level: "AA" | "AAA" = "AA",
  ): boolean {
    const ratio = this.getContrastRatio(color1, color2);
    return level === "AA" ? ratio >= 4.5 : ratio >= 7;
  }

  /**
   * Get relative luminance of a color
   */
  private static getLuminance(color: string): number {
    // Convert color to RGB values
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0;

    // Convert to relative luminance
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Convert hex color to RGB
   */
  private static hexToRgb(
    hex: string,
  ): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }
}

// Global instances
export const liveAnnouncer = new LiveAnnouncer();
export const focusManager = new FocusManager();
export const keyboardNavigation = new KeyboardNavigation();

// Setup default keyboard shortcuts
keyboardNavigation.registerShortcut(
  "/",
  () => {
    const searchInput = document.querySelector(
      "[data-search-input]",
    ) as HTMLElement;
    if (searchInput) {
      focusManager.setFocus(searchInput);
    }
  },
  "Focus search",
);

keyboardNavigation.registerShortcut(
  "ctrl+k",
  () => {
    const searchInput = document.querySelector(
      "[data-search-input]",
    ) as HTMLElement;
    if (searchInput) {
      focusManager.setFocus(searchInput);
    }
  },
  "Open search",
);

keyboardNavigation.registerShortcut(
  "cmd+k",
  () => {
    const searchInput = document.querySelector(
      "[data-search-input]",
    ) as HTMLElement;
    if (searchInput) {
      focusManager.setFocus(searchInput);
    }
  },
  "Open search",
);

keyboardNavigation.registerShortcut(
  "escape",
  () => {
    // Close any open modals or overlays
    const openModal = document.querySelector(
      "[data-modal][open]",
    ) as HTMLElement;
    if (openModal) {
      openModal.click(); // Trigger close
    }
  },
  "Close modal/overlay",
);
