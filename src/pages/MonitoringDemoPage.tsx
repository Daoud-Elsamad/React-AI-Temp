import React, { useState } from 'react';
import { logger, performanceMonitor, LogLevel } from '../lib/monitoring';
import { ErrorBoundary } from '../components/error/ErrorBoundary';

// Component that intentionally throws an error
const ErrorComponent: React.FC<{ shouldError: boolean }> = ({ shouldError }) => {
  if (shouldError) {
    throw new Error('This is a demo error to test error boundaries!');
  }
  return <div className="text-green-600">No error thrown</div>;
};

// Component to test performance monitoring
const PerformanceTestComponent: React.FC = () => {
  const [results, setResults] = React.useState<number[]>([]);

  const runPerformanceTest = () => {
    // Start performance timing
    const testId = performanceMonitor.startTiming('demo-operation');
    
    // Simulate work
    setTimeout(() => {
      const numbers = Array.from({ length: 100000 }, (_, i) => Math.random() * i);
      const sorted = numbers.sort((a, b) => a - b);
      setResults(sorted.slice(0, 10));
      
      performanceMonitor.endTiming(testId, 'Demo Operation');
      logger.performance('Array sort operation', performance.now());
    }, Math.random() * 2000 + 500);
  };

  return (
    <div className="space-y-4">
      <button
        onClick={runPerformanceTest}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Run Performance Test
      </button>
      {results.length > 0 && (
        <div className="text-sm text-gray-600">
          Sample results: {results.slice(0, 5).map(n => n.toFixed(2)).join(', ')}...
        </div>
      )}
    </div>
  );
};

export const MonitoringDemoPage: React.FC = () => {
  const [shouldError, setShouldError] = useState(false);

  const [logs, setLogs] = useState<any[]>([]);

  // Refresh logs display
  const refreshLogs = () => {
    const recentLogs = logger.getLogs(undefined, undefined, 20);
    setLogs(recentLogs);
  };

  const clearLogs = () => {
    logger.clearLogs();
    setLogs([]);
  };

  const triggerError = () => {
    setShouldError(true);
    setTimeout(() => setShouldError(false), 100);
  };

  const testLogging = () => {
    logger.debug('This is a debug message', 'demo', { testData: 'debug test' });
    logger.info('This is an info message', 'demo', { testData: 'info test' });
    logger.warn('This is a warning message', 'demo', { testData: 'warning test' });
    logger.error('This is an error message', 'demo', { testData: 'error test' });
    logger.user('User clicked test logging button', { timestamp: Date.now() });
    refreshLogs();
  };

  const getPerformanceStats = () => {
    const stats = performanceMonitor.getPerformanceSummary();
    logger.info('Performance stats retrieved', 'demo', stats.averages);
    refreshLogs();
  };

  React.useEffect(() => {
    refreshLogs();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Monitoring & Error Handling Demo
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Error Boundary Demo */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Error Boundary Demo
              </h2>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-h-[100px]">
                <ErrorBoundary level="component" isolate>
                  <ErrorComponent shouldError={shouldError} />
                </ErrorBoundary>
              </div>
              <button
                onClick={triggerError}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Trigger Error
              </button>
            </div>

            {/* Performance Monitoring Demo */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Performance Monitoring
              </h2>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <PerformanceTestComponent />
              </div>
              <button
                onClick={getPerformanceStats}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Get Performance Stats
              </button>
            </div>

            {/* Logging Demo */}
            <div className="space-y-4 lg:col-span-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Logging System Demo
              </h2>
              
              <div className="flex gap-4 flex-wrap">
                <button
                  onClick={testLogging}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Test All Log Levels
                </button>
                <button
                  onClick={refreshLogs}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Refresh Logs
                </button>
                <button
                  onClick={clearLogs}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Clear Logs
                </button>
              </div>

              {/* Log Statistics */}
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Log Statistics
                </h3>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {(() => {
                    const stats = logger.getLogStats();
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>Total Logs: {stats.total}</div>
                        <div>Debug: {stats.byLevel.DEBUG || 0}</div>
                        <div>Info: {stats.byLevel.INFO || 0}</div>
                        <div>Warning: {stats.byLevel.WARN || 0}</div>
                        <div>Error: {stats.byLevel.ERROR || 0}</div>
                        <div>Categories: {Object.keys(stats.byCategory).length}</div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Recent Logs Display */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 max-h-96 overflow-y-auto">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Recent Logs (Last 20)
                </h3>
                {logs.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">No logs to display</p>
                ) : (
                  <div className="space-y-2">
                    {logs.slice().reverse().map((log) => (
                      <div
                        key={log.id}
                        className={`p-2 rounded text-sm border-l-4 ${
                          log.level === LogLevel.ERROR || log.level === LogLevel.FATAL
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            : log.level === LogLevel.WARN
                            ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                            : log.level === LogLevel.INFO
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-500 bg-gray-50 dark:bg-gray-900/20'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium">
                              [{LogLevel[log.level]}] {log.category && `[${log.category}]`} {log.message}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-gray-600 dark:text-gray-400">
                              Metadata
                            </summary>
                            <pre className="mt-1 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Usage Instructions */}
          <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-4">
              📋 How to Use This Monitoring System
            </h3>
            <div className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
              <p><strong>Error Boundaries:</strong> Automatically catch and handle React component errors</p>
              <p><strong>Performance Monitoring:</strong> Track Web Vitals, long tasks, and custom metrics</p>
              <p><strong>Logging:</strong> Structured logging with different levels and categories</p>
              <p><strong>Sentry Integration:</strong> Automatic error reporting to Sentry in production</p>
              <p><strong>Local Storage:</strong> Errors and logs are stored locally for offline scenarios</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 