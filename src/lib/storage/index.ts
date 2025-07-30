// Core storage services
export { indexedDbStorage } from './indexedDbStorage';
export type { 
  DatabaseConfig, 
  OfflineAction, 
  BackupEntry 
} from './indexedDbStorage';

// Data export functionality
export { DataExportManager, downloadExportResult, formatFileSize } from './dataExportManager';
export type { 
  ExportOptions, 
  ExportProgress, 
  ExportResult, 
  ExportMetadata 
} from './dataExportManager';

// Data backup system
export { dataBackupManager } from './dataBackupManager';
export type { 
  BackupConfig, 
  BackupMetadata, 
  BackupRestoreResult, 
  BackupValidationResult 
} from './dataBackupManager';

// Offline sync capabilities
export { 
  offlineSyncManager, 
  queueConversationSync, 
  queueFileSync, 
  queueSettingSync 
} from './offlineSyncManager';
export type { 
  SyncConfig, 
  SyncStatus, 
  ConflictResolution, 
  SyncResult 
} from './offlineSyncManager';

// Data encryption
export { 
  dataEncryption, 
  EncryptionConfigs, 
  encryptApiKey, 
  decryptApiKey, 
  encryptConversationContent, 
  decryptConversationContent 
} from './dataEncryption';
export type { 
  EncryptionConfig, 
  EncryptedData, 
  EncryptionKey, 
  FieldEncryptionConfig 
} from './dataEncryption';

// Main data management service
export { dataManagementService, DataManagementService } from './dataManagementService';
export type { 
  DataManagementConfig, 
  DataManagementStatus, 
  DataMigrationResult 
} from './dataManagementService';

// Utility type for storage configuration
export interface StorageConfiguration {
  preferIndexedDB: boolean;
  enableEncryption: boolean;
  enableBackups: boolean;
  enableSync: boolean;
  encryptionPassword?: string;
}

// Helper function to initialize all storage services with custom configuration
export async function initializeDataManagement(config?: StorageConfiguration): Promise<void> {
  const { dataManagementService } = await import('./dataManagementService');
  
  const dataConfig = {
    encryption: {
      enabled: config?.enableEncryption || false,
      requirePassword: config?.enableEncryption || false,
      autoEncrypt: ['api-keys', 'user-data']
    },
    backup: {
      enabled: config?.enableBackups !== false,
      frequency: 'daily' as const,
      retention: { maxBackups: 10, maxAge: 30 },
      compression: true,
      encryption: false,
      includeFiles: true,
      autoCleanup: true
    },
    sync: {
      enabled: config?.enableSync !== false,
      syncInterval: 5 * 60 * 1000,
      maxRetries: 3,
      retryDelay: 5000,
      batchSize: 10,
      conflictResolution: 'latest' as const
    },
    storage: {
      preferIndexedDB: config?.preferIndexedDB !== false,
      fallbackToLocalStorage: true,
      compressionThreshold: 50 * 1024
    }
  };

  await dataManagementService.updateConfig(dataConfig);
  await dataManagementService.initialize(config?.encryptionPassword);
}

// Storage health monitoring
export interface StorageHealthReport {
  status: 'healthy' | 'warning' | 'critical';
  details: {
    storage: string;
    encryption: string;
    backup: string;
    sync: string;
  };
  recommendations: string[];
}

export async function getStorageHealthReport(): Promise<StorageHealthReport> {
  const { dataManagementService } = await import('./dataManagementService');
  const status = await dataManagementService.getStatus();
  
  const report: StorageHealthReport = {
    status: status.health.status === 'healthy' ? 'healthy' : 
            status.health.status === 'warning' ? 'warning' : 'critical',
    details: {
      storage: `${status.storage.type.toUpperCase()} - ${Math.round(status.storage.size / 1024 / 1024)}MB used of ${Math.round(status.storage.quota / 1024 / 1024)}MB`,
      encryption: status.encryption.enabled ? 
        (status.encryption.initialized ? `Active (${status.encryption.keyCount} keys)` : 'Not initialized') :
        'Disabled',
      backup: status.backup.enabled ? 
        `${status.backup.backupCount} backups, last: ${status.backup.lastBackup ? new Date(status.backup.lastBackup).toLocaleDateString() : 'Never'}` :
        'Disabled',
      sync: status.sync.isOnline ? 
        `Online - ${status.sync.pendingActions} pending, ${status.sync.failedActions} failed` :
        'Offline'
    },
    recommendations: []
  };

  // Generate recommendations based on status
  if (status.health.issues.length > 0) {
    report.recommendations.push(...status.health.issues.map((issue: string) => `Fix: ${issue}`));
  }

  const storageUsage = (status.storage.size / status.storage.quota) * 100;
  if (storageUsage > 80) {
    report.recommendations.push('Consider cleaning up old data or increasing storage quota');
  }

  if (!status.encryption.enabled) {
    report.recommendations.push('Enable encryption for sensitive data protection');
  }

  if (status.backup.backupCount === 0) {
    report.recommendations.push('Create your first backup to protect your data');
  }

  if (status.sync.failedActions > 0) {
    report.recommendations.push('Review and retry failed sync actions');
  }

  return report;
}

// Quick setup functions for common scenarios
export const StoragePresets = {
  // Maximum security with all features enabled
  secure: (): StorageConfiguration => ({
    preferIndexedDB: true,
    enableEncryption: true,
    enableBackups: true,
    enableSync: true
  }),

  // Basic setup with just IndexedDB and backups
  basic: (): StorageConfiguration => ({
    preferIndexedDB: true,
    enableEncryption: false,
    enableBackups: true,
    enableSync: false
  }),

  // Minimal setup for performance
  minimal: (): StorageConfiguration => ({
    preferIndexedDB: false,
    enableEncryption: false,
    enableBackups: false,
    enableSync: false
  }),

  // Offline-first configuration
  offline: (): StorageConfiguration => ({
    preferIndexedDB: true,
    enableEncryption: false,
    enableBackups: true,
    enableSync: true
  })
};

// Export storage events for components to listen to
export interface StorageEvent {
  type: 'backup-created' | 'sync-completed' | 'encryption-enabled' | 'storage-warning' | 'data-migrated';
  timestamp: number;
  data?: any;
}

class StorageEventEmitter {
  private listeners: { [key: string]: ((event: StorageEvent) => void)[] } = {};

  on(eventType: StorageEvent['type'], callback: (event: StorageEvent) => void): () => void {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    this.listeners[eventType].push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.listeners[eventType].indexOf(callback);
      if (index > -1) {
        this.listeners[eventType].splice(index, 1);
      }
    };
  }

  emit(event: StorageEvent): void {
    const callbacks = this.listeners[event.type] || [];
    callbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error(`Error in storage event callback for ${event.type}:`, error);
      }
    });
  }
}

export const storageEvents = new StorageEventEmitter();

// Initialize default configuration on module load
if (typeof window !== 'undefined') {
  // Only initialize in browser environment
  initializeDataManagement().catch((error: Error) => {
    console.error('Failed to initialize data management:', error);
    storageEvents.emit({
      type: 'storage-warning',
      timestamp: Date.now(),
      data: { error: error.message }
    });
  });
} 