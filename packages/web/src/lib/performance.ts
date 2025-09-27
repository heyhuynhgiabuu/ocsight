// Performance monitoring utilities

export interface PerformanceMetrics {
  fcp: number | null;
  lcp: number | null;
  cls: number | null;
  fid: number | null;
  ttfb: number | null;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fcp: null,
    lcp: null,
    cls: null,
    fid: null,
    ttfb: null,
  };

  constructor() {
    this.init();
  }

  private init() {
    // First Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metrics.fcp = lastEntry.startTime;
    }).observe({ entryTypes: ["paint"] });

    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metrics.lcp = lastEntry.startTime;
    }).observe({ entryTypes: ["largest-contentful-paint"] });

    // Cumulative Layout Shift
    new PerformanceObserver((list) => {
      let clsValue = 0;
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      this.metrics.cls = clsValue;
    }).observe({ entryTypes: ["layout-shift"] });

    // First Input Delay
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metrics.fid =
        (lastEntry as any).processingStart - lastEntry.startTime;
    }).observe({ entryTypes: ["first-input"] });

    // Time to First Byte
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[
        entries.length - 1
      ] as PerformanceNavigationTiming;
      this.metrics.ttfb = lastEntry.responseStart - lastEntry.requestStart;
    }).observe({ entryTypes: ["navigation"] });
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  logMetrics() {
    const metrics = this.getMetrics();
    console.group("🚀 Performance Metrics");
    console.log(
      "FCP:",
      metrics.fcp ? `${metrics.fcp.toFixed(2)}ms` : "Not measured",
    );
    console.log(
      "LCP:",
      metrics.lcp ? `${metrics.lcp.toFixed(2)}ms` : "Not measured",
    );
    console.log("CLS:", metrics.cls ? metrics.cls.toFixed(4) : "Not measured");
    console.log(
      "FID:",
      metrics.fid ? `${metrics.fid.toFixed(2)}ms` : "Not measured",
    );
    console.log(
      "TTFB:",
      metrics.ttfb ? `${metrics.ttfb.toFixed(2)}ms` : "Not measured",
    );
    console.groupEnd();
  }
}

// Initialize performance monitoring
export const performanceMonitor = new PerformanceMonitor();

// Utility to measure function execution time
export function measureExecutionTime<T>(
  fn: () => T,
  label: string = "Function execution",
): T {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  console.log(`${label}: ${(end - start).toFixed(2)}ms`);
  return result;
}

// Utility to lazy load images
export function lazyLoadImage(img: HTMLImageElement) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const image = entry.target as HTMLImageElement;
          if (image.dataset.src) {
            image.src = image.dataset.src;
            image.classList.remove("opacity-0");
            image.classList.add("opacity-100");
            observer.unobserve(image);
          }
        }
      });
    },
    { threshold: 0.1 },
  );

  observer.observe(img);
}
