import { errorTracker, ErrorSeverity } from './errorTracking';

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

// Log entry interface
export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  category?: string;
  metadata?: Record<string, any>;
  stack?: string;
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
}

// Logger configuration
export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  enableRemote: boolean;
  maxStoredLogs: number;
  remoteEndpoint?: string;
  categories?: string[];
  sessionId?: string;
}

// Default configuration
const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  enableConsole: true,
  enableStorage: true,
  enableRemote: false,
  maxStoredLogs: 1000,
  categories: [],
  sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
};

// Logger class
export class Logger {
  private static instance: Logger;
  private config: LoggerConfig = DEFAULT_CONFIG;
  private logs: LogEntry[] = [];
  private logQueue: LogEntry[] = [];
  private isOnline = navigator.onLine;
  private flushInterval: number | null = null;

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private constructor() {
    this.setupNetworkListeners();
    this.setupPeriodicFlush();
    this.loadStoredLogs();
    
    // Log initialization
    this.info('Logger initialized', 'system', {
      config: this.config,
      isOnline: this.isOnline
    });
  }

  // Configure logger
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    this.info('Logger configuration updated', 'system', { config: this.config });
  }

  // Set user context
  setUser(userId: string): void {
    this.config.sessionId = `session_${userId}_${Date.now()}`;
    this.info('User context set', 'system', { userId });
  }

  // Core logging method
  private log(level: LogLevel, message: string, category?: string, metadata?: Record<string, any>, error?: Error): void {
    // Check if log level meets minimum threshold
    if (level < this.config.minLevel) {
      return;
    }

    // Check if category is filtered
    if (this.config.categories && this.config.categories.length > 0 && category && !this.config.categories.includes(category)) {
      return;
    }

    const logEntry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level,
      message,
      category,
      metadata,
      stack: error?.stack,
      sessionId: this.config.sessionId,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // Add to logs array
    this.logs.push(logEntry);

    // Maintain max stored logs
    if (this.logs.length > this.config.maxStoredLogs) {
      this.logs = this.logs.slice(-this.config.maxStoredLogs);
    }

    // Console output
    if (this.config.enableConsole) {
      this.outputToConsole(logEntry);
    }

    // Store locally
    if (this.config.enableStorage) {
      this.storeLog(logEntry);
    }

    // Send to remote endpoint
    if (this.config.enableRemote) {
      this.queueForRemote(logEntry);
    }

    // Send to Sentry for errors and warnings
    if (level >= LogLevel.WARN) {
      const sentryLevel = this.getSentryLevel(level);
      errorTracker.captureMessage(message, sentryLevel, {
        url: logEntry.url,
        extra: { category, ...metadata }
      });
    }
  }

  // Get Sentry equivalent level
  private getSentryLevel(level: LogLevel): ErrorSeverity {
    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        return ErrorSeverity.INFO;
      case LogLevel.WARN:
        return ErrorSeverity.WARNING;
      case LogLevel.ERROR:
        return ErrorSeverity.ERROR;
      case LogLevel.FATAL:
        return ErrorSeverity.FATAL;
      default:
        return ErrorSeverity.INFO;
    }
  }

  // Output log to console with styling
  private outputToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const category = entry.category ? `[${entry.category}]` : '';
    const levelName = LogLevel[entry.level];
    
    const style = this.getConsoleStyle(entry.level);
    const message = `%c${timestamp} ${levelName} ${category} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, style, entry.metadata);
        break;
      case LogLevel.INFO:
        console.info(message, style, entry.metadata);
        break;
      case LogLevel.WARN:
        console.warn(message, style, entry.metadata);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(message, style, entry.metadata);
        if (entry.stack) {
          console.error('Stack trace:', entry.stack);
        }
        break;
    }
  }

  // Get console style for log level
  private getConsoleStyle(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return 'color: #6b7280; font-size: 11px;';
      case LogLevel.INFO:
        return 'color: #3b82f6; font-weight: normal;';
      case LogLevel.WARN:
        return 'color: #f59e0b; font-weight: bold;';
      case LogLevel.ERROR:
        return 'color: #ef4444; font-weight: bold;';
      case LogLevel.FATAL:
        return 'color: #dc2626; font-weight: bold; background: #fee2e2;';
      default:
        return '';
    }
  }

  // Store log in local storage
  private storeLog(entry: LogEntry): void {
    try {
      const storedLogs = this.getStoredLogs();
      storedLogs.push(entry);

      // Keep only recent logs
      if (storedLogs.length > this.config.maxStoredLogs) {
        storedLogs.splice(0, storedLogs.length - this.config.maxStoredLogs);
      }

      localStorage.setItem('app_logs', JSON.stringify(storedLogs));
    } catch (error) {
      console.warn('Failed to store log:', error);
    }
  }

  // Queue log for remote transmission
  private queueForRemote(entry: LogEntry): void {
    this.logQueue.push(entry);
    
    if (this.isOnline) {
      this.flushRemoteLogs();
    }
  }

  // Flush logs to remote endpoint
  private async flushRemoteLogs(): Promise<void> {
    if (!this.config.remoteEndpoint || this.logQueue.length === 0) {
      return;
    }

    const logsToSend = [...this.logQueue];
    this.logQueue = [];

    try {
      const response = await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs: logsToSend }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send logs: ${response.status}`);
      }
    } catch (error) {
      // Re-queue logs if sending failed
      this.logQueue.unshift(...logsToSend);
      console.warn('Failed to send logs to remote endpoint:', error);
    }
  }

  // Setup network listeners
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.info('Network connection restored', 'system');
      this.flushRemoteLogs();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.warn('Network connection lost', 'system');
    });
  }

  // Setup periodic flush
  private setupPeriodicFlush(): void {
    this.flushInterval = window.setInterval(() => {
      if (this.isOnline && this.logQueue.length > 0) {
        this.flushRemoteLogs();
      }
    }, 30000); // Flush every 30 seconds
  }

  // Load stored logs from local storage
  private loadStoredLogs(): void {
    try {
      const stored = localStorage.getItem('app_logs');
      if (stored) {
        const logs = JSON.parse(stored) as LogEntry[];
        this.logs.push(...logs);
      }
    } catch (error) {
      console.warn('Failed to load stored logs:', error);
    }
  }

  // Public logging methods
  debug(message: string, category?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, category, metadata);
  }

  info(message: string, category?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, category, metadata);
  }

  warn(message: string, category?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, category, metadata);
  }

  error(message: string, category?: string, metadata?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.ERROR, message, category, metadata, error);
  }

  fatal(message: string, category?: string, metadata?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.FATAL, message, category, metadata, error);
  }

  // Specialized logging methods
  performance(operation: string, duration: number, metadata?: Record<string, any>): void {
    this.info(`Performance: ${operation} took ${duration}ms`, 'performance', {
      operation,
      duration,
      ...metadata
    });
  }

  user(action: string, metadata?: Record<string, any>): void {
    this.info(`User action: ${action}`, 'user', metadata);
  }

  api(method: string, url: string, status: number, duration: number, metadata?: Record<string, any>): void {
    const level = status >= 400 ? LogLevel.ERROR : status >= 300 ? LogLevel.WARN : LogLevel.INFO;
    this.log(level, `API ${method} ${url} - ${status} (${duration}ms)`, 'api', {
      method,
      url,
      status,
      duration,
      ...metadata
    });
  }

  // Get logs
  getLogs(level?: LogLevel, category?: string, limit?: number): LogEntry[] {
    let filteredLogs = this.logs;

    if (level !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.level >= level);
    }

    if (category) {
      filteredLogs = filteredLogs.filter(log => log.category === category);
    }

    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }

    return filteredLogs;
  }

  // Get stored logs from localStorage
  getStoredLogs(): LogEntry[] {
    try {
      const stored = localStorage.getItem('app_logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  // Clear logs
  clearLogs(): void {
    this.logs = [];
    localStorage.removeItem('app_logs');
    this.info('Logs cleared', 'system');
  }

  // Export logs as JSON
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Get log statistics
  getLogStats(): {
    total: number;
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
    oldest: number | null;
    newest: number | null;
  } {
    const stats = {
      total: this.logs.length,
      byLevel: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      oldest: this.logs.length > 0 ? this.logs[0].timestamp : null,
      newest: this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : null
    };

    this.logs.forEach(log => {
      const levelName = LogLevel[log.level];
      stats.byLevel[levelName] = (stats.byLevel[levelName] || 0) + 1;

      if (log.category) {
        stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
      }
    });

    return stats;
  }

  // Cleanup
  cleanup(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flushRemoteLogs();
  }
}

// Create and export logger instance
export const logger = Logger.getInstance();

// Helper functions for common logging scenarios
export const loggers = {
  // Performance logging
  time: (label: string) => {
    const startTime = performance.now();
    return {
      end: (metadata?: Record<string, any>) => {
        const duration = performance.now() - startTime;
        logger.performance(label, duration, metadata);
        return duration;
      }
    };
  },

  // API request logging
  apiRequest: (method: string, url: string) => {
    const startTime = performance.now();
    logger.debug(`API Request: ${method} ${url}`, 'api');
    
    return {
      success: (status: number, data?: any) => {
        const duration = performance.now() - startTime;
        logger.api(method, url, status, duration, { responseData: data });
      },
      error: (status: number, error: any) => {
        const duration = performance.now() - startTime;
        logger.api(method, url, status, duration, { error });
      }
    };
  },

  // User action logging
  userAction: (action: string, metadata?: Record<string, any>) => {
    logger.user(action, metadata);
  },

  // Component lifecycle logging
  component: (name: string, lifecycle: 'mount' | 'unmount' | 'update', metadata?: Record<string, any>) => {
    logger.debug(`Component ${name} ${lifecycle}`, 'component', metadata);
  }
}; 