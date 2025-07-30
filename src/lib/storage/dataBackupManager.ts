import { indexedDbStorage, BackupEntry } from './indexedDbStorage';
import { DataExportManager, ExportOptions } from './dataExportManager';

export interface BackupConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'manual';
  retention: {
    maxBackups: number;
    maxAge: number; // in days
  };
  compression: boolean;
  encryption: boolean;
  includeFiles: boolean;
  autoCleanup: boolean;
}

export interface BackupMetadata {
  id: string;
  timestamp: number;
  version: string;
  size: number;
  compressed: boolean;
  encrypted: boolean;
  dataTypes: string[];
  itemCounts: {
    conversations: number;
    messages: number;
    files: number;
    settings: number;
  };
  checksum?: string;
}

export interface BackupRestoreResult {
  success: boolean;
  restored: {
    conversations: number;
    messages: number;
    files: number;
    settings: number;
  };
  skipped: {
    conversations: number;
    messages: number;
    files: number;
    settings: number;
  };
  errors: string[];
}

export interface BackupValidationResult {
  valid: boolean;
  issues: string[];
  metadata?: BackupMetadata;
}

export class DataBackupManager {
  private config: BackupConfig;
  private exportManager: DataExportManager;
  private backupInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<BackupConfig>) {
    this.config = {
      enabled: true,
      frequency: 'daily',
      retention: {
        maxBackups: 10,
        maxAge: 30
      },
      compression: true,
      encryption: false,
      includeFiles: true,
      autoCleanup: true,
      ...config
    };

    this.exportManager = new DataExportManager();
  }

  async initialize(): Promise<void> {
    await this.loadConfig();
    if (this.config.enabled) {
      this.scheduleBackups();
    }
    
    if (this.config.autoCleanup) {
      await this.cleanupOldBackups();
    }
  }

  async createBackup(options?: Partial<ExportOptions>): Promise<BackupEntry> {
    try {
      console.log('Starting backup creation...');

      const exportOptions: ExportOptions = {
        format: 'json',
        includeConversations: true,
        includeFiles: this.config.includeFiles,
        includeSettings: true,
        compression: this.config.compression,
        encryption: this.config.encryption,
        ...options
      };

      // Create export
      const exportResult = await this.exportManager.exportAllData(exportOptions);
      
      if (!exportResult.success || !exportResult.blob) {
        throw new Error(`Backup export failed: ${exportResult.error}`);
      }

      // Create backup entry
      const backupId = this.generateBackupId();
      const backupData = new Uint8Array(await exportResult.blob.arrayBuffer());

      const backupEntry: BackupEntry = {
        id: backupId,
        timestamp: Date.now(),
        version: '1.0',
        size: exportResult.blob.size,
        compressed: this.config.compression,
        data: backupData,
        metadata: {
          totalConversations: 0, // Will be populated from export metadata
          totalMessages: 0,
          totalFiles: 0
        }
      };

      // Store backup in IndexedDB
      await this.storeBackup(backupEntry);

      console.log(`Backup created successfully: ${backupId}`);
      return backupEntry;

    } catch (error) {
      console.error('Backup creation failed:', error);
      throw error;
    }
  }

  async restoreBackup(backupId: string, options?: {
    overwrite?: boolean;
    selectiveRestore?: {
      conversations?: boolean;
      files?: boolean;
      settings?: boolean;
    };
  }): Promise<BackupRestoreResult> {
    try {
      console.log(`Starting backup restoration: ${backupId}`);

      const backup = await this.getBackup(backupId);
      if (!backup || !backup.data) {
        throw new Error(`Backup ${backupId} not found or corrupted`);
      }

      // Validate backup
      const validation = await this.validateBackup(backup);
      if (!validation.valid) {
        throw new Error(`Backup validation failed: ${validation.issues.join(', ')}`);
      }

      // Parse backup data
      const backupBlob = new Blob([backup.data], { type: 'application/json' });
      const backupText = await backupBlob.text();
      const backupData = JSON.parse(backupText);

      const result: BackupRestoreResult = {
        success: false,
        restored: { conversations: 0, messages: 0, files: 0, settings: 0 },
        skipped: { conversations: 0, messages: 0, files: 0, settings: 0 },
        errors: []
      };

      // Restore conversations
      if (options?.selectiveRestore?.conversations !== false && backupData.conversations) {
        try {
          for (const conversationData of backupData.conversations) {
            const existingConv = await indexedDbStorage.getConversation(conversationData.conversation.id);
            
            if (existingConv && !options?.overwrite) {
              result.skipped.conversations++;
              continue;
            }

            await indexedDbStorage.saveConversation(conversationData.conversation);
            await indexedDbStorage.saveThread(conversationData.thread);
            result.restored.conversations++;
            result.restored.messages += conversationData.thread.messages.length;
          }
        } catch (error) {
          result.errors.push(`Conversation restore error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Restore files
      if (options?.selectiveRestore?.files !== false && backupData.files) {
        try {
          for (const fileData of backupData.files) {
            const existingFile = await indexedDbStorage.getFile(fileData.id);
            
            if (existingFile && !options?.overwrite) {
              result.skipped.files++;
              continue;
            }

            await indexedDbStorage.saveFile(fileData);
            result.restored.files++;
          }
        } catch (error) {
          result.errors.push(`File restore error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Restore settings
      if (options?.selectiveRestore?.settings !== false && backupData.settings) {
        try {
          Object.entries(backupData.settings).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
              const existingValue = localStorage.getItem(key);
              
              if (existingValue && !options?.overwrite) {
                result.skipped.settings++;
                return;
              }

              localStorage.setItem(key, value as string);
              result.restored.settings++;
            }
          });
        } catch (error) {
          result.errors.push(`Settings restore error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      result.success = result.errors.length === 0 || (
        result.restored.conversations > 0 || 
        result.restored.files > 0 || 
        result.restored.settings > 0
      );

      console.log(`Backup restoration completed:`, result);
      return result;

    } catch (error) {
      console.error('Backup restoration failed:', error);
      return {
        success: false,
        restored: { conversations: 0, messages: 0, files: 0, settings: 0 },
        skipped: { conversations: 0, messages: 0, files: 0, settings: 0 },
        errors: [error instanceof Error ? error.message : 'Unknown restoration error']
      };
    }
  }

  async listBackups(): Promise<BackupMetadata[]> {
    try {
      const store = await indexedDbStorage['getStore']('backups');
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        
        request.onsuccess = () => {
          const backups = request.result.map((backup: BackupEntry) => ({
            id: backup.id,
            timestamp: backup.timestamp,
            version: backup.version,
            size: backup.size,
            compressed: backup.compressed,
            encrypted: false, // Will be updated when encryption is implemented
            dataTypes: ['conversations', 'files', 'settings'],
            itemCounts: {
              conversations: backup.metadata.totalConversations,
              messages: backup.metadata.totalMessages,
              files: backup.metadata.totalFiles,
              settings: 0 // Will be calculated properly later
            },
            checksum: this.calculateChecksum(backup.data)
          }));
          
          resolve(backups.sort((a, b) => b.timestamp - a.timestamp));
        };
        
        request.onerror = () => {
          reject(new Error(`Failed to list backups: ${request.error?.message}`));
        };
      });
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  async deleteBackup(backupId: string): Promise<void> {
    try {
      const store = await indexedDbStorage['getStore']('backups', 'readwrite');
      
      return new Promise((resolve, reject) => {
        const request = store.delete(backupId);
        
        request.onsuccess = () => {
          console.log(`Backup deleted: ${backupId}`);
          resolve();
        };
        
        request.onerror = () => {
          reject(new Error(`Failed to delete backup: ${request.error?.message}`));
        };
      });
    } catch (error) {
      console.error('Failed to delete backup:', error);
      throw error;
    }
  }

  async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await this.listBackups();
      const now = Date.now();
      const maxAge = this.config.retention.maxAge * 24 * 60 * 60 * 1000; // Convert days to milliseconds

      // Remove backups older than maxAge
      const expiredBackups = backups.filter(backup => 
        now - backup.timestamp > maxAge
      );

      // Remove excess backups beyond maxBackups limit
      const excessBackups = backups
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(this.config.retention.maxBackups);

      const backupsToDelete = [...expiredBackups, ...excessBackups];
      
      for (const backup of backupsToDelete) {
        await this.deleteBackup(backup.id);
      }

      if (backupsToDelete.length > 0) {
        console.log(`Cleaned up ${backupsToDelete.length} old backups`);
      }
    } catch (error) {
      console.error('Backup cleanup failed:', error);
    }
  }

  async validateBackup(backup: BackupEntry): Promise<BackupValidationResult> {
    const issues: string[] = [];

    try {
      // Check if backup data exists
      if (!backup.data || backup.data.length === 0) {
        issues.push('Backup data is missing or empty');
      }

      // Check size consistency
      if (backup.data && backup.data.length !== backup.size) {
        issues.push('Backup size mismatch');
      }

      // Try to parse JSON
      if (backup.data) {
        try {
          const backupBlob = new Blob([backup.data], { type: 'application/json' });
          const backupText = await backupBlob.text();
          const backupData = JSON.parse(backupText);

          // Validate structure
          if (!backupData.metadata) {
            issues.push('Backup metadata missing');
          }

          if (!Array.isArray(backupData.conversations)) {
            issues.push('Conversations data invalid');
          }

          if (!Array.isArray(backupData.files)) {
            issues.push('Files data invalid');
          }

          if (typeof backupData.settings !== 'object') {
            issues.push('Settings data invalid');
          }

        } catch (parseError) {
          issues.push('Backup data is corrupted or invalid JSON');
        }
      }

      // Check timestamp validity
      if (!backup.timestamp || backup.timestamp > Date.now()) {
        issues.push('Invalid backup timestamp');
      }

      return {
        valid: issues.length === 0,
        issues,
        metadata: issues.length === 0 ? {
          id: backup.id,
          timestamp: backup.timestamp,
          version: backup.version,
          size: backup.size,
          compressed: backup.compressed,
          encrypted: false,
          dataTypes: ['conversations', 'files', 'settings'],
          itemCounts: {
            conversations: backup.metadata.totalConversations,
            messages: backup.metadata.totalMessages,
            files: backup.metadata.totalFiles,
            settings: 0
          }
        } : undefined
      };

    } catch (error) {
      return {
        valid: false,
        issues: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  updateConfig(newConfig: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
    
    // Restart scheduling if frequency changed
    if (newConfig.frequency) {
      this.stopScheduledBackups();
      if (this.config.enabled) {
        this.scheduleBackups();
      }
    }
  }

  getConfig(): BackupConfig {
    return { ...this.config };
  }

  private async storeBackup(backup: BackupEntry): Promise<void> {
    const store = await indexedDbStorage['getStore']('backups', 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.put(backup);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to store backup: ${request.error?.message}`));
    });
  }

  private async getBackup(backupId: string): Promise<BackupEntry | null> {
    const store = await indexedDbStorage['getStore']('backups');
    
    return new Promise((resolve, reject) => {
      const request = store.get(backupId);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error(`Failed to get backup: ${request.error?.message}`));
    });
  }

  private scheduleBackups(): void {
    this.stopScheduledBackups();

    let intervalMs: number;
    
    switch (this.config.frequency) {
      case 'daily':
        intervalMs = 24 * 60 * 60 * 1000; // 24 hours
        break;
      case 'weekly':
        intervalMs = 7 * 24 * 60 * 60 * 1000; // 7 days
        break;
      case 'monthly':
        intervalMs = 30 * 24 * 60 * 60 * 1000; // 30 days
        break;
      default:
        return; // No scheduling for manual backups
    }

    this.backupInterval = setInterval(async () => {
      try {
        console.log('Creating scheduled backup...');
        await this.createBackup();
        
        if (this.config.autoCleanup) {
          await this.cleanupOldBackups();
        }
      } catch (error) {
        console.error('Scheduled backup failed:', error);
      }
    }, intervalMs);

    console.log(`Backup scheduled: ${this.config.frequency} (${intervalMs}ms)`);
  }

  private stopScheduledBackups(): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
    }
  }

  private generateBackupId(): string {
    return `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateChecksum(data?: Uint8Array): string {
    if (!data) return '';
    
    // Simple checksum calculation (in production, use a proper hash function)
    let checksum = 0;
    for (let i = 0; i < data.length; i++) {
      checksum = (checksum + data[i]) % 256;
    }
    return checksum.toString(16).padStart(2, '0');
  }

  private async loadConfig(): Promise<void> {
    try {
      const stored = localStorage.getItem('backup-config');
      if (stored) {
        const parsedConfig = JSON.parse(stored);
        this.config = { ...this.config, ...parsedConfig };
      }
    } catch (error) {
      console.error('Failed to load backup config:', error);
    }
  }

  private saveConfig(): void {
    try {
      localStorage.setItem('backup-config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save backup config:', error);
    }
  }

  // Cleanup method to call when component unmounts
  destroy(): void {
    this.stopScheduledBackups();
  }
}

// Singleton instance
export const dataBackupManager = new DataBackupManager(); 