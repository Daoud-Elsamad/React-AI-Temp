import React from 'react';

export interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
}

export interface ResourceMetrics {
  name: string;
  size: number;
  loadTime: number;
  type: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeObservers();
    this.trackPageLoad();
  }

  private initializeObservers() {
    // Track LCP (Largest Contentful Paint)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as PerformanceEventTiming;
          this.metrics.lcp = lastEntry.startTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (e) {
        console.warn('LCP observer not supported');
      }

      // Track FID (First Input Delay)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'first-input') {
              this.metrics.fid = (entry as PerformanceEventTiming).processingStart - entry.startTime;
            }
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (e) {
        console.warn('FID observer not supported');
      }

      // Track CLS (Cumulative Layout Shift)
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
              this.metrics.cls = clsValue;
            }
          });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (e) {
        console.warn('CLS observer not supported');
      }
    }
  }

  private trackPageLoad() {
    window.addEventListener('load', () => {
      // Track FCP (First Contentful Paint)
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        this.metrics.fcp = fcpEntry.startTime;
      }

      // Track TTFB (Time to First Byte)
      const navigationEntries = performance.getEntriesByType('navigation');
      if (navigationEntries.length > 0) {
        const nav = navigationEntries[0] as PerformanceNavigationTiming;
        this.metrics.ttfb = nav.responseStart - nav.requestStart;
      }

      // Log initial metrics
      setTimeout(() => {
        this.logMetrics();
      }, 1000);
    });
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public getResourceMetrics(): ResourceMetrics[] {
    const resources = performance.getEntriesByType('resource');
    return resources.map((resource) => {
      const entry = resource as PerformanceResourceTiming;
      return {
        name: entry.name,
        size: entry.transferSize || 0,
        loadTime: entry.responseEnd - entry.requestStart,
        type: this.getResourceType(entry.name)
      };
    });
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'javascript';
    if (url.includes('.css')) return 'stylesheet';
    if (url.includes('.png') || url.includes('.jpg') || url.includes('.jpeg') || url.includes('.gif') || url.includes('.svg')) return 'image';
    if (url.includes('.woff') || url.includes('.woff2') || url.includes('.ttf')) return 'font';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  public logMetrics() {
    const metrics = this.getMetrics();
    const resources = this.getResourceMetrics();
    
    console.group('Performance Metrics');
    console.log('Core Web Vitals:', {
      'FCP (First Contentful Paint)': metrics.fcp ? `${metrics.fcp.toFixed(2)}ms` : 'N/A',
      'LCP (Largest Contentful Paint)': metrics.lcp ? `${metrics.lcp.toFixed(2)}ms` : 'N/A',
      'FID (First Input Delay)': metrics.fid ? `${metrics.fid.toFixed(2)}ms` : 'N/A',
      'CLS (Cumulative Layout Shift)': metrics.cls ? metrics.cls.toFixed(4) : 'N/A',
      'TTFB (Time to First Byte)': metrics.ttfb ? `${metrics.ttfb.toFixed(2)}ms` : 'N/A'
    });

    // Group resources by type
    const resourcesByType = resources.reduce((acc, resource) => {
      if (!acc[resource.type]) acc[resource.type] = [];
      acc[resource.type].push(resource);
      return acc;
    }, {} as Record<string, ResourceMetrics[]>);

    console.log('Resource Loading:');
    Object.entries(resourcesByType).forEach(([type, typeResources]) => {
      const totalSize = typeResources.reduce((sum, r) => sum + r.size, 0);
      const avgLoadTime = typeResources.reduce((sum, r) => sum + r.loadTime, 0) / typeResources.length;
      
      console.log(`${type}:`, {
        count: typeResources.length,
        totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
        avgLoadTime: `${avgLoadTime.toFixed(2)}ms`
      });
    });

    console.groupEnd();
  }

  // Track component render times
  public trackComponentRender(componentName: string, renderTime: number) {
    console.log(`Component ${componentName} rendered in ${renderTime.toFixed(2)}ms`);
  }

  // Track lazy loading effectiveness
  public trackLazyLoad(resourceName: string, viewportEntry: boolean) {
    console.log(`Lazy load: ${resourceName} ${viewportEntry ? 'entered' : 'left'} viewport`);
  }

  // Track cache hit rates
  public trackCacheHit(url: string, hit: boolean) {
    console.log(`Cache ${hit ? 'HIT' : 'MISS'}: ${url}`);
  }

  // Clean up observers
  public disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for component performance tracking
export function usePerformanceTracker(componentName: string) {
  const startTime = performance.now();
  
  return {
    trackRender: () => {
      const endTime = performance.now();
      performanceMonitor.trackComponentRender(componentName, endTime - startTime);
    }
  };
}

// Higher-order component for performance tracking
export function withPerformanceTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const PerformanceWrappedComponent = (props: P) => {
    const name = componentName || WrappedComponent.displayName || WrappedComponent.name;
    const startTime = performance.now();
    
    React.useEffect(() => {
      const endTime = performance.now();
      performanceMonitor.trackComponentRender(name, endTime - startTime);
    });

    return React.createElement(WrappedComponent, props);
  };

  PerformanceWrappedComponent.displayName = `withPerformanceTracking(${componentName || WrappedComponent.displayName || WrappedComponent.name})`;
  
  return PerformanceWrappedComponent;
}

// Bundle analyzer utility
export function analyzeBundleSize() {
  const resources = performanceMonitor.getResourceMetrics();
  const jsResources = resources.filter(r => r.type === 'javascript');
  const cssResources = resources.filter(r => r.type === 'stylesheet');
  
  const totalJSSize = jsResources.reduce((sum, r) => sum + r.size, 0);
  const totalCSSSize = cssResources.reduce((sum, r) => sum + r.size, 0);
  
  console.group('Bundle Analysis');
  console.log('JavaScript bundles:');
  jsResources.forEach(resource => {
    console.log(`- ${resource.name.split('/').pop()}: ${(resource.size / 1024).toFixed(2)} KB`);
  });
  
  console.log('CSS bundles:');
  cssResources.forEach(resource => {
    console.log(`- ${resource.name.split('/').pop()}: ${(resource.size / 1024).toFixed(2)} KB`);
  });
  
  console.log('Summary:', {
    'Total JS': `${(totalJSSize / 1024).toFixed(2)} KB`,
    'Total CSS': `${(totalCSSSize / 1024).toFixed(2)} KB`,
    'Total Assets': `${((totalJSSize + totalCSSSize) / 1024).toFixed(2)} KB`
  });
  console.groupEnd();
}

// Memory usage tracking
export function trackMemoryUsage() {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    console.log('Memory Usage:', {
      'Used': `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      'Total': `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      'Limit': `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
    });
  }
} 