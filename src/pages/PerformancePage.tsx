import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { VirtualScroll, VirtualScrollItem } from '@/components/ui/VirtualScroll';
import { LazyImageGallery } from '@/components/ui/LazyImage';
import { performanceMonitor, analyzeBundleSize, trackMemoryUsage } from '@/lib/performance';

// Demo data for virtual scrolling
interface DemoItem extends VirtualScrollItem {
  id: number;
  title: string;
  description: string;
  category: string;
}

const generateDemoData = (count: number): DemoItem[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    title: `Item ${i + 1}`,
    description: `This is a description for item ${i + 1}. It contains some sample text to demonstrate virtual scrolling performance.`,
    category: ['Technology', 'Science', 'Art', 'Music', 'Sports'][i % 5]
  }));
};

// Demo images for lazy loading
const demoImages = Array.from({ length: 20 }, (_, i) => ({
  id: `img-${i}`,
  src: `https://picsum.photos/300/200?random=${i}`,
  alt: `Demo image ${i + 1}`,
  thumbnail: `https://picsum.photos/50/50?random=${i}`
}));

export const PerformancePage: React.FC = () => {
  const [itemCount, setItemCount] = useState(1000);
  const [showMetrics, setShowMetrics] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);

  // Memoized data to prevent unnecessary recalculations
  const demoData = useMemo(() => generateDemoData(itemCount), [itemCount]);

  // Optimized handlers with useCallback
  const handleItemCountChange = useCallback((newCount: number) => {
    setItemCount(newCount);
  }, []);

  const handleShowMetrics = useCallback(() => {
    const currentMetrics = performanceMonitor.getMetrics();
    const resources = performanceMonitor.getResourceMetrics();
    setMetrics({ ...currentMetrics, resources });
    setShowMetrics(true);
  }, []);

  const handleAnalyzeBundle = useCallback(() => {
    analyzeBundleSize();
  }, []);

  const handleTrackMemory = useCallback(() => {
    trackMemoryUsage();
  }, []);

  const renderVirtualItem = useCallback((item: DemoItem, index: number) => (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {item.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {item.description}
          </p>
          <span className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded mt-2">
            {item.category}
          </span>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          #{index + 1}
        </div>
      </div>
    </div>
  ), []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Performance Optimizations Demo
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            This page demonstrates various performance optimizations implemented in Phase 6.1
          </p>
        </div>

        {/* Performance Metrics Panel */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Performance Monitoring
          </h2>
          <div className="flex flex-wrap gap-4 mb-4">
            <Button onClick={handleShowMetrics}>
              Show Current Metrics
            </Button>
            <Button onClick={handleAnalyzeBundle} variant="outline">
              Analyze Bundle Size
            </Button>
            <Button onClick={handleTrackMemory} variant="outline">
              Track Memory Usage
            </Button>
          </div>

          {showMetrics && metrics && (
            <div className="bg-white dark:bg-gray-900 rounded p-4 mt-4">
              <h3 className="font-semibold mb-2">Core Web Vitals</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">FCP:</span>{' '}
                  {metrics.fcp ? `${metrics.fcp.toFixed(2)}ms` : 'N/A'}
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">LCP:</span>{' '}
                  {metrics.lcp ? `${metrics.lcp.toFixed(2)}ms` : 'N/A'}
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">FID:</span>{' '}
                  {metrics.fid ? `${metrics.fid.toFixed(2)}ms` : 'N/A'}
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">CLS:</span>{' '}
                  {metrics.cls ? metrics.cls.toFixed(4) : 'N/A'}
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">TTFB:</span>{' '}
                  {metrics.ttfb ? `${metrics.ttfb.toFixed(2)}ms` : 'N/A'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Code Splitting Demo */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            ✅ Code Splitting (React.lazy)
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            All pages are now lazy-loaded using React.lazy and Suspense boundaries. 
            Check the Network tab to see individual page chunks loading on-demand.
          </p>
          <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 p-3 rounded">
            ✅ Implemented: Pages split into separate chunks with loading fallbacks
          </div>
        </div>

        {/* Memoization Demo */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            ✅ useMemo/useCallback Optimizations
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Context providers and expensive calculations are memoized to prevent unnecessary re-renders.
          </p>
          <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 p-3 rounded">
            ✅ Implemented: ThemeContext, AuthContext, and component callbacks optimized
          </div>
        </div>

        {/* Virtual Scrolling Demo */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            ✅ Virtual Scrolling for Large Lists
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Only visible items are rendered, dramatically improving performance for large datasets.
          </p>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Number of items: {itemCount.toLocaleString()}
            </label>
            <div className="flex gap-2">
              {[100, 1000, 5000, 10000].map((count) => (
                <Button
                  key={count}
                  onClick={() => handleItemCountChange(count)}
                  variant={itemCount === count ? 'primary' : 'outline'}
                  size="sm"
                >
                  {count.toLocaleString()}
                </Button>
              ))}
            </div>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <VirtualScroll
              items={demoData}
              itemHeight={120}
              containerHeight={400}
              renderItem={renderVirtualItem}
              className="bg-white dark:bg-gray-900"
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Try scrolling through {itemCount.toLocaleString()} items. Notice how smooth it remains!
          </p>
        </div>

        {/* Lazy Image Loading Demo */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            ✅ Image Lazy Loading
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Images are loaded only when they enter the viewport, with placeholder states.
          </p>
          
          <LazyImageGallery
            images={demoImages}
            columns={4}
            gap={16}
            onImageClick={(image, index) => {
              console.log('Clicked image:', image, 'at index:', index);
            }}
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            Scroll down to see images load as they enter the viewport. Check Network tab to see loading behavior.
          </p>
        </div>

        {/* Service Worker Demo */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            ✅ Service Worker Caching
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Static assets and API responses are cached for improved loading performance and offline support.
          </p>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-900 p-4 rounded">
              <h4 className="font-semibold mb-2">Cache Strategies</h4>
              <ul className="text-sm space-y-1">
                <li>• Static assets: Cache-first</li>
                <li>• API requests: Network-first with fallback</li>
                <li>• Dynamic content: Stale-while-revalidate</li>
              </ul>
            </div>
            <div className="bg-white dark:bg-gray-900 p-4 rounded">
              <h4 className="font-semibold mb-2">Features</h4>
              <ul className="text-sm space-y-1">
                <li>• Background sync</li>
                <li>• Push notifications</li>
                <li>• Offline fallbacks</li>
                <li>• Cache size management</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 p-3 rounded mt-4">
            ✅ Service worker registered and caching assets in production builds
          </div>
        </div>

        {/* Performance Tips */}
        <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Performance Best Practices Implemented
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                React Optimizations
              </h3>
              <ul className="text-sm space-y-1 text-blue-800 dark:text-blue-200">
                <li>• React.lazy for code splitting</li>
                <li>• useMemo for expensive calculations</li>
                <li>• useCallback for stable references</li>
                <li>• Virtual scrolling for large lists</li>
                <li>• Intersection Observer for lazy loading</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Browser Optimizations
              </h3>
              <ul className="text-sm space-y-1 text-blue-800 dark:text-blue-200">
                <li>• Service Worker caching</li>
                <li>• Progressive image loading</li>
                <li>• Performance monitoring</li>
                <li>• Bundle analysis tools</li>
                <li>• Memory usage tracking</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 