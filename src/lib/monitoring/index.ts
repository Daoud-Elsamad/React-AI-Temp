// Import instances for internal use
import { errorTracker } from './errorTracking';
import { performanceMonitor } from './performanceMonitoring';
import { logger } from './logging';

// Export all monitoring components
export * from './errorTracking';
export * from './performanceMonitoring';
export * from './logging';

// Combined initialization function
export interface MonitoringConfig {
  // Error tracking config
  sentryDsn?: string;
  environment?: string;
  
  // Logging config
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  enableRemoteLogging?: boolean;
  remoteLoggingEndpoint?: string;
  
  // Performance config
  enablePerformanceMonitoring?: boolean;
  
  // User context
  userId?: string;
  userEmail?: string;
}

export function initializeMonitoring(config: MonitoringConfig = {}) {
  const {
    sentryDsn,
    environment = process.env.NODE_ENV || 'development',
    logLevel = 'info',
    enableRemoteLogging = false,
    remoteLoggingEndpoint,
    enablePerformanceMonitoring = true,
    userId,
    userEmail
  } = config;

  // Initialize error tracking
  errorTracker.initialize(sentryDsn, environment);
  
  // Configure logging
  logger.configure({
    minLevel: logLevel === 'debug' ? 0 : logLevel === 'info' ? 1 : logLevel === 'warn' ? 2 : 3,
    enableRemote: enableRemoteLogging,
    remoteEndpoint: remoteLoggingEndpoint
  });

  // Initialize performance monitoring
  if (enablePerformanceMonitoring) {
    performanceMonitor.initialize();
  }

  // Set user context if provided
  if (userId) {
    errorTracker.setUser({ 
      id: userId, 
      email: userEmail 
    });
    logger.setUser(userId);
  }

  // Log successful initialization
  logger.info('Monitoring system initialized', 'system', {
    environment,
    logLevel,
    enableRemoteLogging,
    enablePerformanceMonitoring,
    hasUserId: !!userId
  });

  console.log('🔍 Monitoring system initialized successfully');
}

// Cleanup function
export function cleanupMonitoring() {
  performanceMonitor.cleanup();
  logger.cleanup();
  logger.info('Monitoring system cleaned up', 'system');
} 