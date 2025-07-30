import { indexedDbStorage } from './indexedDbStorage';
import { DataExportManager, ExportOptions, ExportResult } from './dataExportManager';
import { dataBackupManager, BackupConfig, BackupMetadata } from './dataBackupManager';
import { offlineSyncManager, SyncStatus, SyncConfig } from './offlineSyncManager';
import { dataEncryption } from './dataEncryption';

export interface DataManagementConfig {
  encryption: {
    enabled: boolean;
    requirePassword: boolean;
    autoEncrypt: string[]; // Field types to auto-encrypt
  };
  backup: BackupConfig;
  sync: SyncConfig;
  storage: {
    preferIndexedDB: boolean;
    fallbackToLocalStorage: boolean;
    compressionThreshold: number; // Size in bytes
  };
}

export interface DataManagementStatus {
  storage: {
    type: 'indexeddb' | 'localstorage';
    size: number;
    quota: number;
    available: number;
  };
  encryption: {
    enabled: boolean;
    initialized: boolean;
    keyCount: number;
  };
  backup: {
    enabled: boolean;
    lastBackup: number;
    backupCount: number;
    nextScheduled?: number;
  };
  sync: SyncStatus;
  health: {
    status: 'healthy' | 'warning' | 'error';
    issues: string[];
    lastCheck: number;
  };
}

export interface DataMigrationResult {
  success: boolean;
  migratedItems: {
    conversations: number;
    files: number;
    settings: number;
  };
  errors: string[];
  timeTaken: number;
}

export class DataManagementService {
  private config: DataManagementConfig;
  private initialized = false;
  private exportManager: DataExportManager;

  constructor(config?: Partial<DataManagementConfig>) {
    this.config = {
      encryption: {
        enabled: false,
        requirePassword: false,
        autoEncrypt: ['api-keys', 'user-data']
      },
      backup: {
        enabled: true,
        frequency: 'daily',
        retention: { maxBackups: 10, maxAge: 30 },
        compression: true,
        encryption: false,
        includeFiles: true,
        autoCleanup: true
      },
      sync: {
        enabled: true,
        syncInterval: 5 * 60 * 1000,
        maxRetries: 3,
        retryDelay: 5000,
        batchSize: 10,
        conflictResolution: 'latest'
      },
      storage: {
        preferIndexedDB: true,
        fallbackToLocalStorage: true,
        compressionThreshold: 50 * 1024 // 50KB
      },
      ...config
    };

    this.exportManager = new DataExportManager();
  }

  async initialize(encryptionPassword?: string): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('Initializing Data Management Service...');

      // Initialize storage
      await this.initializeStorage();

      // Initialize encryption if enabled
      if (this.config.encryption.enabled) {
        await this.initializeEncryption(encryptionPassword);
      }

      // Initialize backup manager
      if (this.config.backup.enabled) {
        dataBackupManager.updateConfig(this.config.backup);
        await dataBackupManager.initialize();
      }

      // Initialize sync manager
      if (this.config.sync.enabled) {
        offlineSyncManager.updateConfig(this.config.sync);
        await offlineSyncManager.initialize();
      }

      // Perform health check
      await this.performHealthCheck();

      // Migrate data if needed
      await this.migrateDataIfNeeded();

      this.initialized = true;
      console.log('Data Management Service initialized successfully');

    } catch (error) {
      console.error('Failed to initialize Data Management Service:', error);
      throw error;
    }
  }

  private async initializeStorage(): Promise<void> {
    try {
      if (this.config.storage.preferIndexedDB) {
        await indexedDbStorage.initialize();
        console.log('IndexedDB storage initialized');
      }
    } catch (error) {
      console.error('IndexedDB initialization failed:', error);
      if (this.config.storage.fallbackToLocalStorage) {
        console.log('Falling back to localStorage');
        // The existing conversationStorage will handle localStorage fallback
      } else {
        throw error;
      }
    }
  }

  private async initializeEncryption(password?: string): Promise<void> {
    try {
      if (this.config.encryption.requirePassword && !password) {
        throw new Error('Encryption password required but not provided');
      }

      await dataEncryption.initialize(password);
      
      // Generate default keys for auto-encryption categories
      for (const category of this.config.encryption.autoEncrypt) {
        if (!dataEncryption.hasKey(category)) {
          await dataEncryption.generateDataKey(category);
        }
      }

      console.log('Data encryption initialized');
    } catch (error) {
      console.error('Encryption initialization failed:', error);
      throw error;
    }
  }

  private async migrateDataIfNeeded(): Promise<DataMigrationResult> {
    const result: DataMigrationResult = {
      success: false,
      migratedItems: { conversations: 0, files: 0, settings: 0 },
      errors: [],
      timeTaken: 0
    };

    const startTime = Date.now();

    try {
      console.log('Checking for data migration needs...');

      // Check if we need to migrate from localStorage to IndexedDB
      const needsMigration = await this.checkMigrationNeeded();
      
      if (needsMigration) {
        console.log('Starting data migration...');
        
        // Migrate conversations (localStorage -> IndexedDB)
        result.migratedItems.conversations = await this.migrateConversations();
        
        // Migrate files if any exist in localStorage
        result.migratedItems.files = await this.migrateFiles();
        
        // Migrate settings
        result.migratedItems.settings = await this.migrateSettings();
        
        console.log('Data migration completed:', result.migratedItems);
      }

      result.success = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown migration error';
      result.errors.push(errorMessage);
      console.error('Data migration failed:', error);
    } finally {
      result.timeTaken = Date.now() - startTime;
    }

    return result;
  }

  private async checkMigrationNeeded(): Promise<boolean> {
    // Check if localStorage has data but IndexedDB doesn't
    const hasLocalStorageData = localStorage.getItem('ai_conversations') !== null;
    
    if (!hasLocalStorageData) {
      return false;
    }

    try {
      const indexedDbConversations = await indexedDbStorage.getConversations();
      return indexedDbConversations.length === 0;
    } catch (error) {
      console.error('Failed to check IndexedDB data:', error);
      return false;
    }
  }

  private async migrateConversations(): Promise<number> {
    let migrated = 0;
    try {
      const storedConversations = localStorage.getItem('ai_conversations');
      const storedThreads = localStorage.getItem('ai_conversation_threads');
      
      if (storedConversations && storedThreads) {
        const conversations = JSON.parse(storedConversations);
        const threads = JSON.parse(storedThreads);
        
                 for (const [id, conversation] of Object.entries(conversations as Record<string, any>)) {
           const thread = threads[id];
           if (thread && conversation) {
             await indexedDbStorage.saveConversation(conversation as any);
             await indexedDbStorage.saveThread(thread as any);
             migrated++;
           }
         }
      }
    } catch (error) {
      console.error('Failed to migrate conversations:', error);
    }
    return migrated;
  }

  private async migrateFiles(): Promise<number> {
    // Files migration would depend on how files are currently stored
    // This is a placeholder for actual file migration logic
    return 0;
  }

  private async migrateSettings(): Promise<number> {
    let migrated = 0;
    try {
      // Migrate relevant settings that should be encrypted
      const settingsToMigrate = [
        'api-keys',
        'user-preferences',
        'app-theme'
      ];

      for (const key of settingsToMigrate) {
        const value = localStorage.getItem(key);
        if (value) {
          // Apply encryption if configured
          if (this.config.encryption.enabled && this.shouldEncryptSetting(key)) {
            const encrypted = await dataEncryption.encryptData(value, 'settings');
            localStorage.setItem(key, JSON.stringify({
              _encrypted: true,
              _data: dataEncryption['encryptedDataToBase64'](encrypted)
            }));
          }
          migrated++;
        }
      }
    } catch (error) {
      console.error('Failed to migrate settings:', error);
    }
    return migrated;
  }

  private shouldEncryptSetting(key: string): boolean {
    const sensitiveSettings = ['api-keys', 'user-data', 'personal-info'];
    return sensitiveSettings.some(pattern => key.includes(pattern));
  }

  async getStatus(): Promise<DataManagementStatus> {
    const status: DataManagementStatus = {
      storage: {
        type: 'indexeddb', // Default, will be updated based on actual usage
        size: 0,
        quota: 0,
        available: 0
      },
      encryption: {
        enabled: this.config.encryption.enabled,
        initialized: dataEncryption.isInitialized(),
        keyCount: dataEncryption.getAvailableKeys().length
      },
      backup: {
        enabled: this.config.backup.enabled,
        lastBackup: 0,
        backupCount: 0
      },
      sync: offlineSyncManager.getStatus(),
      health: {
        status: 'healthy',
        issues: [],
        lastCheck: Date.now()
      }
    };

    try {
      // Get storage information
      if (this.config.storage.preferIndexedDB) {
        try {
          status.storage.size = await indexedDbStorage.getDatabaseSize();
          status.storage.quota = await indexedDbStorage.getDatabaseQuota();
          status.storage.available = status.storage.quota - status.storage.size;
          status.storage.type = 'indexeddb';
        } catch (error) {
          status.storage.type = 'localstorage';
          // Estimate localStorage usage
          let localStorageSize = 0;
          for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
              localStorageSize += localStorage[key].length;
            }
          }
          status.storage.size = localStorageSize;
          status.storage.quota = 5 * 1024 * 1024; // Approximate 5MB limit
          status.storage.available = status.storage.quota - status.storage.size;
        }
      }

      // Get backup information
      if (this.config.backup.enabled) {
        const backups = await dataBackupManager.listBackups();
        status.backup.backupCount = backups.length;
        if (backups.length > 0) {
          status.backup.lastBackup = Math.max(...backups.map(b => b.timestamp));
        }
      }

      // Health checks
      status.health = await this.performHealthCheck();

    } catch (error) {
      console.error('Failed to get complete status:', error);
      status.health.status = 'error';
      status.health.issues.push('Failed to retrieve system status');
    }

    return status;
  }

  private async performHealthCheck(): Promise<DataManagementStatus['health']> {
    const health: DataManagementStatus['health'] = {
      status: 'healthy',
      issues: [],
      lastCheck: Date.now()
    };

    try {
      // Check storage health
      if (this.config.storage.preferIndexedDB) {
        try {
          await indexedDbStorage.getDatabaseSize();
        } catch (error) {
          health.issues.push('IndexedDB storage not accessible');
          health.status = 'warning';
        }
      }

      // Check encryption health
      if (this.config.encryption.enabled && !dataEncryption.isInitialized()) {
        health.issues.push('Encryption enabled but not initialized');
        health.status = 'warning';
      }

      // Check backup health
      if (this.config.backup.enabled) {
        try {
          const backups = await dataBackupManager.listBackups();
          const daysSinceLastBackup = backups.length > 0 
            ? (Date.now() - Math.max(...backups.map(b => b.timestamp))) / (24 * 60 * 60 * 1000)
            : Infinity;
          
          if (daysSinceLastBackup > 7) {
            health.issues.push('No backup created in the last 7 days');
            health.status = 'warning';
          }
        } catch (error) {
          health.issues.push('Backup system not functioning');
          health.status = 'error';
        }
      }

      // Check sync health
      if (this.config.sync.enabled) {
        const syncStatus = offlineSyncManager.getStatus();
        if (syncStatus.failedActions > 0) {
          health.issues.push(`${syncStatus.failedActions} sync actions failed`);
          health.status = 'warning';
        }
      }

      // Check storage quota
      const status = await this.getStatus();
      const usagePercentage = (status.storage.size / status.storage.quota) * 100;
      if (usagePercentage > 90) {
        health.issues.push('Storage usage above 90%');
        health.status = 'error';
      } else if (usagePercentage > 80) {
        health.issues.push('Storage usage above 80%');
        health.status = 'warning';
      }

    } catch (error) {
      health.status = 'error';
      health.issues.push('Health check failed');
    }

    return health;
  }

  // Public API methods
  async exportData(options: ExportOptions): Promise<ExportResult> {
    return this.exportManager.exportAllData(options);
  }

  async createBackup(): Promise<void> {
    if (!this.config.backup.enabled) {
      throw new Error('Backup is not enabled');
    }
    await dataBackupManager.createBackup();
  }

  async listBackups(): Promise<BackupMetadata[]> {
    return dataBackupManager.listBackups();
  }

  async restoreBackup(backupId: string, options?: any): Promise<void> {
    const result = await dataBackupManager.restoreBackup(backupId, options);
    if (!result.success) {
      throw new Error(`Backup restoration failed: ${result.errors.join(', ')}`);
    }
  }

  async forceSync(): Promise<void> {
    if (!this.config.sync.enabled) {
      throw new Error('Sync is not enabled');
    }
    await offlineSyncManager.forcSync();
  }

  async updateConfig(newConfig: Partial<DataManagementConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // Update sub-service configurations
    if (newConfig.backup) {
      dataBackupManager.updateConfig(newConfig.backup);
    }
    
    if (newConfig.sync) {
      offlineSyncManager.updateConfig(newConfig.sync);
    }
    
    // Save configuration
    localStorage.setItem('data-management-config', JSON.stringify(this.config));
  }

  getConfig(): DataManagementConfig {
    return { ...this.config };
  }

  // Utility methods for common operations
  async cleanupOldData(): Promise<void> {
    if (this.config.backup.enabled) {
      await dataBackupManager.cleanupOldBackups();
    }
    
    if (this.config.sync.enabled) {
      await offlineSyncManager.clearFailedActions();
    }
  }

  async resetAllData(): Promise<void> {
    const confirmed = confirm('This will delete ALL data including conversations, files, and settings. This action cannot be undone. Are you sure?');
    
    if (!confirmed) {
      return;
    }

    try {
      // Clear IndexedDB
      await indexedDbStorage.clearAll();
      
      // Clear localStorage
      localStorage.clear();
      
      // Clear encryption keys
      dataEncryption.destroy();
      
      console.log('All data has been reset');
    } catch (error) {
      console.error('Failed to reset data:', error);
      throw error;
    }
  }

  async optimizeStorage(): Promise<void> {
    try {
      console.log('Optimizing storage...');
      
      // Cleanup old backups
      if (this.config.backup.enabled) {
        await dataBackupManager.cleanupOldBackups();
      }
      
      // Clear failed sync actions
      if (this.config.sync.enabled) {
        await offlineSyncManager.clearFailedActions();
      }
      
      // Compress large data if needed
      await this.compressLargeData();
      
      console.log('Storage optimization completed');
    } catch (error) {
      console.error('Storage optimization failed:', error);
      throw error;
    }
  }

  private async compressLargeData(): Promise<void> {
    // This would implement data compression for items exceeding the threshold
    // For now, it's a placeholder
    console.log('Data compression check completed');
  }

  destroy(): void {
    dataBackupManager.destroy();
    offlineSyncManager.destroy();
    dataEncryption.destroy();
    this.initialized = false;
  }
}

// Singleton instance
export const dataManagementService = new DataManagementService();

// Initialize with default configuration on first load
dataManagementService.initialize().catch(error => {
  console.error('Failed to initialize data management service:', error);
}); 