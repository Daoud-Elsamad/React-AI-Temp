import { indexedDbStorage, OfflineAction } from './indexedDbStorage';

export interface SyncConfig {
  enabled: boolean;
  syncInterval: number; // in milliseconds
  maxRetries: number;
  retryDelay: number; // in milliseconds
  batchSize: number;
  conflictResolution: 'client' | 'server' | 'latest';
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: number;
  pendingActions: number;
  failedActions: number;
  syncErrors: string[];
}

export interface ConflictResolution {
  id: string;
  type: 'conversation' | 'file' | 'setting';
  clientData: any;
  serverData: any;
  resolution: 'client' | 'server' | 'merge';
  timestamp: number;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: ConflictResolution[];
  errors: string[];
}

export class OfflineSyncManager {
  private config: SyncConfig;
  private status: SyncStatus;
  private syncInterval: NodeJS.Timeout | null = null;
  private onlineStatusListener: (() => void) | null = null;
  private statusCallbacks: ((status: SyncStatus) => void)[] = [];

  constructor(config?: Partial<SyncConfig>) {
    this.config = {
      enabled: true,
      syncInterval: 5 * 60 * 1000, // 5 minutes
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      batchSize: 10,
      conflictResolution: 'latest',
      ...config
    };

    this.status = {
      isOnline: navigator.onLine,
      isSyncing: false,
      lastSync: 0,
      pendingActions: 0,
      failedActions: 0,
      syncErrors: []
    };
  }

  async initialize(): Promise<void> {
    await this.loadConfig();
    await this.updateStatus();
    
    if (this.config.enabled) {
      this.setupOnlineStatusListener();
      this.startSyncInterval();
      
      // Perform initial sync if online
      if (this.status.isOnline) {
        this.performSync();
      }
    }
  }

  async queueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<void> {
    try {
      await indexedDbStorage.addOfflineAction(action);
      await this.updateStatus();
      
      // If online and not currently syncing, trigger immediate sync
      if (this.status.isOnline && !this.status.isSyncing) {
        this.performSync();
      }
    } catch (error) {
      console.error('Failed to queue offline action:', error);
      throw error;
    }
  }

  async performSync(): Promise<SyncResult> {
    if (this.status.isSyncing) {
      throw new Error('Sync already in progress');
    }

    if (!this.status.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    this.status.isSyncing = true;
    this.notifyStatusChange();

    const result: SyncResult = {
      success: false,
      synced: 0,
      failed: 0,
      conflicts: [],
      errors: []
    };

    try {
      console.log('Starting offline sync...');

      // Get pending actions
      const pendingActions = await indexedDbStorage.getPendingOfflineActions();
      
      if (pendingActions.length === 0) {
        result.success = true;
        this.status.lastSync = Date.now();
        return result;
      }

      // Process actions in batches
      const batches = this.createBatches(pendingActions, this.config.batchSize);
      
      for (const batch of batches) {
        const batchResult = await this.processBatch(batch);
        result.synced += batchResult.synced;
        result.failed += batchResult.failed;
        result.conflicts.push(...batchResult.conflicts);
        result.errors.push(...batchResult.errors);
      }

      result.success = result.failed === 0;
      this.status.lastSync = Date.now();
      this.status.syncErrors = result.errors;

      console.log(`Sync completed: ${result.synced} synced, ${result.failed} failed`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      result.errors.push(errorMessage);
      console.error('Sync failed:', error);
    } finally {
      this.status.isSyncing = false;
      await this.updateStatus();
      this.notifyStatusChange();
    }

    return result;
  }

  private async processBatch(actions: OfflineAction[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      conflicts: [],
      errors: []
    };

    for (const action of actions) {
      try {
        // Update action status to processing
        await indexedDbStorage.updateOfflineAction(action.id, { status: 'processing' });

        // Simulate API call (replace with actual API calls)
        const syncSuccess = await this.syncActionToServer(action);

        if (syncSuccess) {
          // Mark as completed and remove from queue
          await indexedDbStorage.deleteOfflineAction(action.id);
          result.synced++;
        } else {
          // Increment retry count and handle failures
          const newRetryCount = action.retryCount + 1;
          
          if (newRetryCount >= this.config.maxRetries) {
            await indexedDbStorage.updateOfflineAction(action.id, { 
              status: 'failed',
              retryCount: newRetryCount
            });
            result.failed++;
            result.errors.push(`Action ${action.id} exceeded max retries`);
          } else {
            await indexedDbStorage.updateOfflineAction(action.id, { 
              status: 'pending',
              retryCount: newRetryCount
            });
          }
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown action error';
        result.errors.push(`Action ${action.id}: ${errorMessage}`);
        result.failed++;

        // Mark action as failed
        await indexedDbStorage.updateOfflineAction(action.id, { status: 'failed' });
      }
    }

    return result;
  }

  private async syncActionToServer(action: OfflineAction): Promise<boolean> {
    // This is a placeholder for actual server sync logic
    // In a real implementation, you would make HTTP requests to your API
    
    try {
      switch (action.type) {
        case 'create':
          return await this.createOnServer(action);
        case 'update':
          return await this.updateOnServer(action);
        case 'delete':
          return await this.deleteOnServer(action);
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }
    } catch (error) {
      console.error(`Failed to sync action ${action.id}:`, error);
      return false;
    }
  }

  private async createOnServer(action: OfflineAction): Promise<boolean> {
    // Simulate API call
    console.log(`Syncing CREATE action for ${action.store}:`, action.data);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate success/failure (90% success rate)
    return Math.random() > 0.1;
  }

  private async updateOnServer(action: OfflineAction): Promise<boolean> {
    // Simulate API call
    console.log(`Syncing UPDATE action for ${action.store}:`, action.data);
    
    // Check for conflicts
    if (await this.hasConflict(action)) {
      const resolution = await this.resolveConflict(action);
      if (!resolution) {
        return false;
      }
    }
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate success/failure (85% success rate)
    return Math.random() > 0.15;
  }

  private async deleteOnServer(action: OfflineAction): Promise<boolean> {
    // Simulate API call
    console.log(`Syncing DELETE action for ${action.store}:`, action.data);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate success/failure (95% success rate)
    return Math.random() > 0.05;
  }

  private async hasConflict(_action: OfflineAction): Promise<boolean> {
    // Simulate conflict detection
    // In a real implementation, you would check timestamps or version numbers
    return Math.random() > 0.8; // 20% chance of conflict
  }

  private async resolveConflict(action: OfflineAction): Promise<boolean> {
    console.log(`Resolving conflict for action ${action.id} using strategy: ${this.config.conflictResolution}`);
    
    switch (this.config.conflictResolution) {
      case 'client':
        // Client data wins
        return true;
      case 'server':
        // Server data wins, skip this action
        return false;
      case 'latest':
        // Use the latest timestamp
        const serverTimestamp = Date.now() - Math.random() * 24 * 60 * 60 * 1000; // Random time in last 24h
        return action.timestamp > serverTimestamp;
      default:
        return false;
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private setupOnlineStatusListener(): void {
    this.onlineStatusListener = () => {
      const wasOnline = this.status.isOnline;
      this.status.isOnline = navigator.onLine;
      
      if (!wasOnline && this.status.isOnline) {
        console.log('Connection restored, triggering sync...');
        this.performSync().catch(error => {
          console.error('Auto-sync failed:', error);
        });
      }
      
      this.notifyStatusChange();
    };

    window.addEventListener('online', this.onlineStatusListener);
    window.addEventListener('offline', this.onlineStatusListener);
  }

  private startSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (this.status.isOnline && !this.status.isSyncing) {
        this.performSync().catch(error => {
          console.error('Scheduled sync failed:', error);
        });
      }
    }, this.config.syncInterval);
  }

  private async updateStatus(): Promise<void> {
    try {
      const pendingActions = await indexedDbStorage.getPendingOfflineActions();
      const allActions = await indexedDbStorage['getPendingOfflineActions'](); // Get all actions
      
      this.status.pendingActions = pendingActions.length;
      this.status.failedActions = allActions?.filter(a => a.status === 'failed').length || 0;
    } catch (error) {
      console.error('Failed to update sync status:', error);
    }
  }

  private notifyStatusChange(): void {
    this.statusCallbacks.forEach(callback => {
      try {
        callback({ ...this.status });
      } catch (error) {
        console.error('Status callback error:', error);
      }
    });
  }

  // Public API methods
  onStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  getStatus(): SyncStatus {
    return { ...this.status };
  }

  updateConfig(newConfig: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
    
    // Restart interval if needed
    if (newConfig.syncInterval) {
      this.startSyncInterval();
    }
  }

  getConfig(): SyncConfig {
    return { ...this.config };
  }

  async forcSync(): Promise<SyncResult> {
    return this.performSync();
  }

  async clearFailedActions(): Promise<void> {
    try {
      // Get all failed actions and delete them
      const allActions = await indexedDbStorage['getPendingOfflineActions']();
      const failedActions = allActions?.filter(a => a.status === 'failed') || [];
      
      for (const action of failedActions) {
        await indexedDbStorage.deleteOfflineAction(action.id);
      }
      
      await this.updateStatus();
      this.notifyStatusChange();
    } catch (error) {
      console.error('Failed to clear failed actions:', error);
      throw error;
    }
  }

  async retryFailedActions(): Promise<SyncResult> {
    try {
      // Reset failed actions to pending
      const allActions = await indexedDbStorage['getPendingOfflineActions']();
      const failedActions = allActions?.filter(a => a.status === 'failed') || [];
      
      for (const action of failedActions) {
        await indexedDbStorage.updateOfflineAction(action.id, { 
          status: 'pending',
          retryCount: 0
        });
      }
      
      await this.updateStatus();
      
      // Trigger sync
      return this.performSync();
    } catch (error) {
      console.error('Failed to retry failed actions:', error);
      throw error;
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const stored = localStorage.getItem('sync-config');
      if (stored) {
        const parsedConfig = JSON.parse(stored);
        this.config = { ...this.config, ...parsedConfig };
      }
    } catch (error) {
      console.error('Failed to load sync config:', error);
    }
  }

  private saveConfig(): void {
    try {
      localStorage.setItem('sync-config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save sync config:', error);
    }
  }

  // Cleanup method
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    if (this.onlineStatusListener) {
      window.removeEventListener('online', this.onlineStatusListener);
      window.removeEventListener('offline', this.onlineStatusListener);
    }
    
    this.statusCallbacks = [];
  }
}

// Utility functions for common sync operations
export async function queueConversationSync(conversationId: string, type: 'create' | 'update' | 'delete', data?: any): Promise<void> {
  await offlineSyncManager.queueAction({
    type,
    store: 'conversations',
    data: { id: conversationId, ...data }
  });
}

export async function queueFileSync(fileId: string, type: 'create' | 'update' | 'delete', data?: any): Promise<void> {
  await offlineSyncManager.queueAction({
    type,
    store: 'files',
    data: { id: fileId, ...data }
  });
}

export async function queueSettingSync(key: string, value: any, type: 'create' | 'update' | 'delete' = 'update'): Promise<void> {
  await offlineSyncManager.queueAction({
    type,
    store: 'settings',
    data: { key, value }
  });
}

// Singleton instance
export const offlineSyncManager = new OfflineSyncManager(); 