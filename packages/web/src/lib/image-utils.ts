/**
 * Image optimization utilities for responsive images and lazy loading
 */

export interface ImageSizes {
  thumbnail: number;
  small: number;
  medium: number;
  large: number;
  xlarge: number;
}

export const imageSizes: ImageSizes = {
  thumbnail: 150,
  small: 300,
  medium: 600,
  large: 1200,
  xlarge: 1800,
};

export const breakpoints = [640, 768, 1024, 1280, 1536];

/**
 * Generate responsive image sizes string based on breakpoints
 */
export function generateSizes(config?: {
  mobile?: string;
  tablet?: string;
  desktop?: string;
}): string {
  const { mobile = "100vw", tablet = "50vw", desktop = "33vw" } = config || {};

  return `(max-width: 768px) ${mobile}, (max-width: 1200px) ${tablet}, ${desktop}`;
}

/**
 * Get optimal image format based on browser support
 */
export function getOptimalFormat(userAgent?: string): "avif" | "webp" | "png" {
  if (!userAgent) return "webp";

  // Check for AVIF support (Chrome 85+, Firefox 93+)
  if (
    userAgent.includes("Chrome/") &&
    parseInt(userAgent.split("Chrome/")[1]) >= 85
  ) {
    return "avif";
  }

  // Check for WebP support (most modern browsers)
  if (
    userAgent.includes("Chrome/") ||
    userAgent.includes("Firefox/") ||
    userAgent.includes("Safari/")
  ) {
    return "webp";
  }

  return "png";
}

/**
 * Lazy loading intersection observer setup
 */
export function setupLazyLoading(threshold = 0.1) {
  if (typeof window === "undefined") return;

  const imageObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset.src;

          if (src) {
            img.src = src;
            img.removeAttribute("data-src");
            imageObserver.unobserve(img);
          }
        }
      });
    },
    {
      threshold,
      rootMargin: "50px",
    },
  );

  // Observe all images with data-src attribute
  document.querySelectorAll("img[data-src]").forEach((img) => {
    imageObserver.observe(img);
  });

  return imageObserver;
}

/**
 * Preload critical images
 */
export function preloadCriticalImages(images: string[]) {
  if (typeof window === "undefined") return;

  images.forEach((src) => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = src;
    document.head.appendChild(link);
  });
}
