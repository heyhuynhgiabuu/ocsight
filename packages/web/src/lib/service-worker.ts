/**
 * Service Worker registration and management utilities
 */

export interface ServiceWorkerConfig {
  swPath: string;
  scope: string;
  updateViaCache: "imports" | "all" | "none";
  skipWaiting: boolean;
}

const defaultConfig: ServiceWorkerConfig = {
  swPath: "/sw.js",
  scope: "/",
  updateViaCache: "none",
  skipWaiting: true,
};

/**
 * Register service worker with enhanced error handling
 */
export async function registerServiceWorker(
  config: Partial<ServiceWorkerConfig> = {},
) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    console.warn("Service Worker not supported in this environment");
    return null;
  }

  const finalConfig = { ...defaultConfig, ...config };

  try {
    const registration = await navigator.serviceWorker.register(
      finalConfig.swPath,
      {
        scope: finalConfig.scope,
        updateViaCache: finalConfig.updateViaCache,
      },
    );

    console.log("Service Worker registered successfully:", registration.scope);

    // Handle updates
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // New content available, notify user
            notifyUpdate();
          }
        });
      }
    });

    // Handle controller change
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });

    return registration;
  } catch (error) {
    console.error("Service Worker registration failed:", error);
    return null;
  }
}

/**
 * Unregister service worker
 */
export async function unregisterServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const result = await registration.unregister();
      console.log("Service Worker unregistered:", result);
      return result;
    }
    return false;
  } catch (error) {
    console.error("Service Worker unregistration failed:", error);
    return false;
  }
}

/**
 * Check if service worker is supported and active
 */
export function isServiceWorkerSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator;
}

/**
 * Get service worker registration status
 */
export async function getServiceWorkerStatus() {
  if (!isServiceWorkerSupported()) {
    return { supported: false, registered: false, active: false };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return {
      supported: true,
      registered: !!registration,
      active: !!registration?.active,
      scope: registration?.scope,
    };
  } catch (error) {
    return { supported: true, registered: false, active: false, error };
  }
}

/**
 * Notify user about service worker update
 */
function notifyUpdate() {
  // Create a simple notification
  const notification = document.createElement("div");
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgb(var(--color-primary));
      color: rgb(var(--color-primary-foreground));
      padding: 1rem;
      border-radius: 0.5rem;
      box-shadow: var(--shadow-brutal);
      z-index: 9999;
      font-family: var(--font-family-mono);
      font-size: 0.875rem;
    ">
      <p style="margin: 0 0 0.5rem 0; font-weight: 600;">Update Available</p>
      <p style="margin: 0 0 1rem 0;">A new version of the site is available.</p>
      <button onclick="window.location.reload()" style="
        background: rgb(var(--color-background));
        color: rgb(var(--color-foreground));
        border: 1px solid rgb(var(--color-border));
        padding: 0.5rem 1rem;
        border-radius: 0.25rem;
        cursor: pointer;
        font-family: inherit;
        font-size: inherit;
      ">
        Refresh
      </button>
      <button onclick="this.parentElement.parentElement.remove()" style="
        background: transparent;
        color: inherit;
        border: 1px solid currentColor;
        padding: 0.5rem 1rem;
        border-radius: 0.25rem;
        cursor: pointer;
        font-family: inherit;
        font-size: inherit;
        margin-left: 0.5rem;
      ">
        Later
      </button>
    </div>
  `;

  document.body.appendChild(notification);

  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 10000);
}

/**
 * Clear all service worker caches
 */
export async function clearServiceWorkerCaches() {
  if (typeof window === "undefined" || !("caches" in window)) {
    return false;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    console.log("All service worker caches cleared");
    return true;
  } catch (error) {
    console.error("Failed to clear service worker caches:", error);
    return false;
  }
}
