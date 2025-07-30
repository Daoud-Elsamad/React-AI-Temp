import { errorTracker, ErrorSeverity } from './errorTracking';

// Performance metric types
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  rating?: 'good' | 'needs-improvement' | 'poor';
  metadata?: Record<string, any>;
}

// Resource timing data
export interface ResourceTiming {
  name: string;
  duration: number;
  size?: number;
  type: string;
  startTime: number;
}

// Navigation timing data
export interface NavigationTiming {
  domContentLoaded: number;
  loadComplete: number;
  firstPaint: number;
  firstContentfulPaint: number;
  domInteractive: number;
}

// Performance monitoring service
export class PerformanceMonitoringService {
  private static instance: PerformanceMonitoringService;
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private isMonitoring = false;

  static getInstance(): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance = new PerformanceMonitoringService();
    }
    return PerformanceMonitoringService.instance;
  }

  // Initialize performance monitoring
  initialize(): void {
    if (this.isMonitoring) return;

    this.setupWebVitalsTracking();
    this.setupResourceTimingObserver();
    this.setupLongTaskObserver();
    this.setupMemoryMonitoring();
    this.setupNavigationTimingTracking();
    this.isMonitoring = true;

    console.log('Performance monitoring initialized');
  }

  // Set up Web Vitals tracking
  private setupWebVitalsTracking(): void {
    // Web Vitals will be implemented when the library is properly configured
    // For now, we'll track basic performance metrics
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'paint') {
          this.recordMetric({
            name: entry.name,
            value: entry.startTime,
            unit: 'ms',
            timestamp: Date.now(),
            rating: entry.startTime > 3000 ? 'poor' : entry.startTime > 1500 ? 'needs-improvement' : 'good'
          });
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['paint'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Failed to observe paint metrics:', error);
    }
  }



  // Set up resource timing observer
  private setupResourceTimingObserver(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            
            // Track slow resources
            if (resourceEntry.duration > 1000) {
              this.recordMetric({
                name: 'Slow Resource',
                value: resourceEntry.duration,
                unit: 'ms',
                timestamp: Date.now(),
                rating: 'poor',
                metadata: {
                  name: resourceEntry.name,
                  type: this.getResourceType(resourceEntry.name),
                  size: resourceEntry.transferSize || resourceEntry.encodedBodySize
                }
              });
            }
          }
        }
      });

      observer.observe({ entryTypes: ['resource'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Failed to set up resource timing observer:', error);
    }
  }

  // Set up long task observer
  private setupLongTaskObserver(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric({
            name: 'Long Task',
            value: entry.duration,
            unit: 'ms',
            timestamp: Date.now(),
            rating: entry.duration > 100 ? 'poor' : 'needs-improvement',
            metadata: {
              startTime: entry.startTime,
              attribution: (entry as any).attribution
            }
          });

          // Log warning for very long tasks
          if (entry.duration > 100) {
            errorTracker.captureMessage(
              `Long task detected: ${entry.duration}ms`,
              ErrorSeverity.WARNING,
              { 
                component: 'PerformanceMonitor',
                extra: { duration: entry.duration }
              }
            );
          }
        }
      });

      observer.observe({ entryTypes: ['longtask'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Failed to set up long task observer:', error);
    }
  }

  // Set up memory monitoring
  private setupMemoryMonitoring(): void {
    if (!(performance as any).memory) return;

    const checkMemory = () => {
      const memory = (performance as any).memory;
      const used = memory.usedJSHeapSize;
      const total = memory.totalJSHeapSize;
      const limit = memory.jsHeapSizeLimit;

      this.recordMetric({
        name: 'Memory Usage',
        value: used,
        unit: 'bytes',
        timestamp: Date.now(),
        rating: used / limit > 0.9 ? 'poor' : used / limit > 0.7 ? 'needs-improvement' : 'good',
        metadata: { total, limit, percentage: (used / limit) * 100 }
      });

      // Warn if memory usage is high
      if (used / limit > 0.8) {
        errorTracker.captureMessage(
          `High memory usage: ${Math.round((used / limit) * 100)}%`,
          ErrorSeverity.WARNING,
          { 
            extra: { memoryUsed: used, memoryLimit: limit }
          }
        );
      }
    };

    // Check memory every 30 seconds
    setInterval(checkMemory, 30000);
    checkMemory(); // Initial check
  }

  // Set up navigation timing tracking
  private setupNavigationTimingTracking(): void {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          const timings: NavigationTiming = {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            firstPaint: 0,
            firstContentfulPaint: 0,
            domInteractive: navigation.domInteractive
          };

          // Get paint timings
          const paintEntries = performance.getEntriesByType('paint');
          paintEntries.forEach((entry) => {
            if (entry.name === 'first-paint') {
              timings.firstPaint = entry.startTime;
            } else if (entry.name === 'first-contentful-paint') {
              timings.firstContentfulPaint = entry.startTime;
            }
          });

          Object.entries(timings).forEach(([name, value]) => {
            if (value > 0) {
              this.recordMetric({
                name: `Navigation ${name}`,
                value,
                unit: 'ms',
                timestamp: Date.now(),
                rating: value > 3000 ? 'poor' : value > 1500 ? 'needs-improvement' : 'good'
              });
            }
          });
        }
      }, 100);
    });
  }

  // Get resource type from URL
  private getResourceType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase() || '';
    
    if (['js', 'mjs'].includes(extension)) return 'script';
    if (['css'].includes(extension)) return 'stylesheet';
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) return 'image';
    if (['woff', 'woff2', 'ttf', 'otf'].includes(extension)) return 'font';
    if (['json', 'xml'].includes(extension)) return 'fetch';
    
    return 'other';
  }

  // Record a performance metric
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Log poor performance
    if (metric.rating === 'poor') {
      console.warn(`Poor performance detected: ${metric.name} = ${metric.value}${metric.unit}`);
    }

    // Store in local storage
    this.storeMetricsLocally();
  }

  // Measure function execution time
  measureFunction<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;

    this.recordMetric({
      name: `Function ${name}`,
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      rating: duration > 100 ? 'poor' : duration > 50 ? 'needs-improvement' : 'good'
    });

    return result;
  }

  // Measure async function execution time
  async measureAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;

    this.recordMetric({
      name: `Async Function ${name}`,
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      rating: duration > 1000 ? 'poor' : duration > 500 ? 'needs-improvement' : 'good'
    });

    return result;
  }

  // Start timing a custom operation
  startTiming(name: string): string {
    const id = `${name}_${Date.now()}_${Math.random()}`;
    performance.mark(`${id}_start`);
    return id;
  }

  // End timing a custom operation
  endTiming(id: string, name: string): void {
    const endMark = `${id}_end`;
    performance.mark(endMark);
    performance.measure(id, `${id}_start`, endMark);

    const measure = performance.getEntriesByName(id)[0];
    if (measure) {
      this.recordMetric({
        name: `Custom ${name}`,
        value: measure.duration,
        unit: 'ms',
        timestamp: Date.now(),
        rating: measure.duration > 1000 ? 'poor' : measure.duration > 500 ? 'needs-improvement' : 'good'
      });
    }

    // Clean up marks and measures
    performance.clearMarks(`${id}_start`);
    performance.clearMarks(endMark);
    performance.clearMeasures(id);
  }

  // Get performance summary
  getPerformanceSummary(): {
    webVitals: PerformanceMetric[];
    slowResources: PerformanceMetric[];
    longTasks: PerformanceMetric[];
    memoryUsage: PerformanceMetric[];
    averages: Record<string, number>;
  } {
    const webVitals = this.metrics.filter(m => 
      ['CLS', 'FID', 'FCP', 'LCP', 'TTFB'].includes(m.name)
    );
    
    const slowResources = this.metrics.filter(m => 
      m.name === 'Slow Resource'
    );
    
    const longTasks = this.metrics.filter(m => 
      m.name === 'Long Task'
    );
    
    const memoryUsage = this.metrics.filter(m => 
      m.name === 'Memory Usage'
    );

    // Calculate averages
    const averages: Record<string, number> = {};
    const groupedMetrics = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) acc[metric.name] = [];
      acc[metric.name].push(metric.value);
      return acc;
    }, {} as Record<string, number[]>);

    Object.entries(groupedMetrics).forEach(([name, values]) => {
      averages[name] = values.reduce((sum, val) => sum + val, 0) / values.length;
    });

    return {
      webVitals,
      slowResources,
      longTasks,
      memoryUsage,
      averages
    };
  }

  // Store metrics locally
  private storeMetricsLocally(): void {
    try {
      const recentMetrics = this.metrics.slice(-100); // Store last 100 metrics
      localStorage.setItem('performance_metrics', JSON.stringify(recentMetrics));
    } catch (error) {
      console.warn('Failed to store performance metrics locally:', error);
    }
  }

  // Get stored metrics
  getStoredMetrics(): PerformanceMetric[] {
    try {
      return JSON.parse(localStorage.getItem('performance_metrics') || '[]');
    } catch {
      return [];
    }
  }

  // Clear all metrics
  clearMetrics(): void {
    this.metrics = [];
    localStorage.removeItem('performance_metrics');
  }

  // Cleanup observers
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.isMonitoring = false;
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitoringService.getInstance(); 