import { ConversationStorage, Conversation, ConversationThread, ConversationSummary, ConversationFilter, ChatMessage } from '../ai/types';

// Database configuration
const DB_NAME = 'ReactAIAppDB';
const DB_VERSION = 1;

// Object store names
const CONVERSATIONS_STORE = 'conversations';
const THREADS_STORE = 'threads';
const MESSAGES_STORE = 'messages';
const FILES_STORE = 'files';
const BACKUPS_STORE = 'backups';
const SYNC_QUEUE_STORE = 'syncQueue';

export interface DatabaseConfig {
  name: string;
  version: number;
  stores: {
    [key: string]: {
      keyPath: string;
      autoIncrement?: boolean;
      indexes?: Array<{
        name: string;
        keyPath: string | string[];
        options?: IDBIndexParameters;
      }>;
    };
  };
}

export interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  store: string;
  data: any;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface BackupEntry {
  id: string;
  timestamp: number;
  version: string;
  size: number;
  compressed: boolean;
  metadata: {
    totalConversations: number;
    totalMessages: number;
    totalFiles: number;
  };
  data?: Uint8Array; // Compressed backup data
}

class IndexedDBStorage implements ConversationStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  private readonly config: DatabaseConfig = {
    name: DB_NAME,
    version: DB_VERSION,
    stores: {
      [CONVERSATIONS_STORE]: {
        keyPath: 'id',
        indexes: [
          { name: 'updatedAt', keyPath: 'updatedAt' },
          { name: 'provider', keyPath: 'provider' },
          { name: 'starred', keyPath: 'starred' },
          { name: 'archived', keyPath: 'archived' }
        ]
      },
      [THREADS_STORE]: {
        keyPath: 'conversationId',
        indexes: [
          { name: 'updatedAt', keyPath: 'updatedAt' },
          { name: 'messageCount', keyPath: 'messageCount' }
        ]
      },
      [MESSAGES_STORE]: {
        keyPath: 'id',
        indexes: [
          { name: 'conversationId', keyPath: 'conversationId' },
          { name: 'timestamp', keyPath: 'timestamp' },
          { name: 'role', keyPath: 'role' }
        ]
      },
      [FILES_STORE]: {
        keyPath: 'id',
        indexes: [
          { name: 'name', keyPath: 'name' },
          { name: 'type', keyPath: 'type' },
          { name: 'uploadStatus', keyPath: 'uploadStatus' },
          { name: 'aiProcessingStatus', keyPath: 'aiProcessingStatus' }
        ]
      },
      [BACKUPS_STORE]: {
        keyPath: 'id',
        indexes: [
          { name: 'timestamp', keyPath: 'timestamp' },
          { name: 'version', keyPath: 'version' }
        ]
      },
      [SYNC_QUEUE_STORE]: {
        keyPath: 'id',
        indexes: [
          { name: 'timestamp', keyPath: 'timestamp' },
          { name: 'status', keyPath: 'status' },
          { name: 'type', keyPath: 'type' }
        ]
      }
    }
  };

  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.name, this.config.version);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.db.onerror = (event) => {
          console.error('Database error:', (event.target as IDBRequest).error);
        };
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.upgradeDatabase(db, event.oldVersion);
      };
    });

    return this.initPromise;
  }

  private upgradeDatabase(db: IDBDatabase, _oldVersion: number): void {
    // Create stores and indexes
    Object.entries(this.config.stores).forEach(([storeName, storeConfig]) => {
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, {
          keyPath: storeConfig.keyPath,
          autoIncrement: storeConfig.autoIncrement
        });

        // Create indexes
        if (storeConfig.indexes) {
          storeConfig.indexes.forEach(index => {
            store.createIndex(index.name, index.keyPath, index.options);
          });
        }
      }
    });
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    await this.initialize();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction([storeName], mode);
    return transaction.objectStore(storeName);
  }

  private async getMultipleStores(storeNames: string[], mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore[]> {
    await this.initialize();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction(storeNames, mode);
    return storeNames.map(name => transaction.objectStore(name));
  }

  // Conversation Storage Implementation
  async saveConversation(conversation: Conversation): Promise<void> {
    const store = await this.getStore(CONVERSATIONS_STORE, 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.put(conversation);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save conversation: ${request.error?.message}`));
    });
  }

  async saveThread(thread: ConversationThread): Promise<void> {
    const [threadsStore, messagesStore, conversationsStore] = await this.getMultipleStores(
      [THREADS_STORE, MESSAGES_STORE, CONVERSATIONS_STORE], 
      'readwrite'
    );

    return new Promise((resolve, reject) => {
      const transaction = threadsStore.transaction;
      
      // Save thread
      threadsStore.put(thread);
      
      // Save individual messages
      thread.messages.forEach(message => {
        messagesStore.put(message);
      });

      // Update conversation
      const conversationRequest = conversationsStore.get(thread.conversationId);
      conversationRequest.onsuccess = () => {
        const conversation = conversationRequest.result;
        if (conversation) {
          const lastMessage = thread.messages.length > 0 ? 
            thread.messages[thread.messages.length - 1].content : '';
          
          conversation.updatedAt = thread.updatedAt;
          conversation.messageCount = thread.messages.length;
          conversation.lastMessage = lastMessage.length > 100 ? 
            lastMessage.substring(0, 100) + '...' : lastMessage;
          
          conversationsStore.put(conversation);
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error(`Failed to save thread: ${transaction.error?.message}`));
    });
  }

  async saveMessage(message: ChatMessage): Promise<void> {
    const store = await this.getStore(MESSAGES_STORE, 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.put(message);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save message: ${request.error?.message}`));
    });
  }

  async getConversation(id: string): Promise<Conversation | null> {
    const store = await this.getStore(CONVERSATIONS_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error(`Failed to get conversation: ${request.error?.message}`));
    });
  }

  async getThread(conversationId: string): Promise<ConversationThread | null> {
    const [threadsStore, messagesStore] = await this.getMultipleStores([THREADS_STORE, MESSAGES_STORE]);
    
    return new Promise((resolve, reject) => {
      const threadRequest = threadsStore.get(conversationId);
      
      threadRequest.onsuccess = () => {
        const thread = threadRequest.result;
        if (!thread) {
          resolve(null);
          return;
        }

        // Get messages for this conversation
        const index = messagesStore.index('conversationId');
        const messagesRequest = index.getAll(conversationId);
        
        messagesRequest.onsuccess = () => {
          thread.messages = messagesRequest.result.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          resolve(thread);
        };
        
        messagesRequest.onerror = () => reject(new Error(`Failed to get messages: ${messagesRequest.error?.message}`));
      };
      
      threadRequest.onerror = () => reject(new Error(`Failed to get thread: ${threadRequest.error?.message}`));
    });
  }

  async getConversations(filter?: ConversationFilter): Promise<ConversationSummary[]> {
    const store = await this.getStore(CONVERSATIONS_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => {
        let conversations = request.result;
        
        // Apply filters
        if (filter) {
          conversations = conversations.filter(conv => {
            if (filter.provider && conv.provider !== filter.provider) return false;
            if (filter.starred !== undefined && conv.starred !== filter.starred) return false;
            if (filter.archived !== undefined && conv.archived !== filter.archived) return false;
            if (filter.searchTerm) {
              const searchLower = filter.searchTerm.toLowerCase();
              return conv.title.toLowerCase().includes(searchLower) ||
                     (conv.lastMessage && conv.lastMessage.toLowerCase().includes(searchLower));
            }
            return true;
          });
        }

        // Convert to summaries and sort
        const summaries: ConversationSummary[] = conversations.map(conv => ({
          id: conv.id,
          title: conv.title,
          lastMessage: conv.lastMessage || '',
          messageCount: conv.messageCount,
          updatedAt: conv.updatedAt,
          provider: conv.provider,
          starred: conv.starred,
          archived: conv.archived
        })).sort((a, b) => b.updatedAt - a.updatedAt);

        resolve(summaries);
      };
      
      request.onerror = () => reject(new Error(`Failed to get conversations: ${request.error?.message}`));
    });
  }

  async deleteConversation(id: string): Promise<void> {
    const [conversationsStore, threadsStore, messagesStore] = await this.getMultipleStores(
      [CONVERSATIONS_STORE, THREADS_STORE, MESSAGES_STORE], 
      'readwrite'
    );

    return new Promise((resolve, reject) => {
      const transaction = conversationsStore.transaction;
      
      // Delete conversation
      conversationsStore.delete(id);
      
      // Delete thread
      threadsStore.delete(id);
      
      // Delete messages
      const index = messagesStore.index('conversationId');
      const messagesRequest = index.getAll(id);
      
      messagesRequest.onsuccess = () => {
        messagesRequest.result.forEach(message => {
          messagesStore.delete(message.id);
        });
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error(`Failed to delete conversation: ${transaction.error?.message}`));
    });
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<void> {
    const store = await this.getStore(CONVERSATIONS_STORE, 'readwrite');
    
    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const conversation = getRequest.result;
        if (!conversation) {
          reject(new Error(`Conversation ${id} not found`));
          return;
        }

        const updatedConversation = { ...conversation, ...updates };
        const putRequest = store.put(updatedConversation);
        
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(new Error(`Failed to update conversation: ${putRequest.error?.message}`));
      };
      
      getRequest.onerror = () => reject(new Error(`Failed to get conversation: ${getRequest.error?.message}`));
    });
  }

  async exportConversation(id: string): Promise<any> {
    const conversation = await this.getConversation(id);
    const thread = await this.getThread(id);
    
    if (!conversation || !thread) {
      throw new Error(`Conversation ${id} not found`);
    }

    return {
      conversation,
      thread,
      exportedAt: Date.now(),
      version: '1.0'
    };
  }

  async importConversation(data: any): Promise<string> {
    if (!data.conversation || !data.thread) {
      throw new Error('Invalid conversation data format');
    }

    const newId = this.generateId();
    const conversation: Conversation = {
      ...data.conversation,
      id: newId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const thread: ConversationThread = {
      ...data.thread,
      id: newId,
      conversationId: newId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: data.thread.messages.map((msg: ChatMessage) => ({
        ...msg,
        id: this.generateId(),
        conversationId: newId,
        timestamp: msg.timestamp || Date.now()
      }))
    };

    await this.saveConversation(conversation);
    await this.saveThread(thread);

    return newId;
  }

  async clearAll(): Promise<void> {
    const storeNames = Object.keys(this.config.stores);
    const stores = await this.getMultipleStores(storeNames, 'readwrite');
    
    return new Promise((resolve, reject) => {
      const transaction = stores[0].transaction;
      
      stores.forEach(store => {
        store.clear();
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error(`Failed to clear database: ${transaction.error?.message}`));
    });
  }

  // Additional methods for large data management
  async saveFile(file: any): Promise<void> {
    const store = await this.getStore(FILES_STORE, 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.put(file);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save file: ${request.error?.message}`));
    });
  }

  async getFile(id: string): Promise<any> {
    const store = await this.getStore(FILES_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error(`Failed to get file: ${request.error?.message}`));
    });
  }

  async getFiles(): Promise<any[]> {
    const store = await this.getStore(FILES_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to get files: ${request.error?.message}`));
    });
  }

  // Offline sync queue management
  async addOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<void> {
    const store = await this.getStore(SYNC_QUEUE_STORE, 'readwrite');
    
    const offlineAction: OfflineAction = {
      ...action,
      id: this.generateId(),
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending'
    };

    return new Promise((resolve, reject) => {
      const request = store.put(offlineAction);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to add offline action: ${request.error?.message}`));
    });
  }

  async getPendingOfflineActions(): Promise<OfflineAction[]> {
    const store = await this.getStore(SYNC_QUEUE_STORE);
    
    return new Promise((resolve, reject) => {
      const index = store.index('status');
      const request = index.getAll('pending');
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to get pending actions: ${request.error?.message}`));
    });
  }

  async updateOfflineAction(id: string, updates: Partial<OfflineAction>): Promise<void> {
    const store = await this.getStore(SYNC_QUEUE_STORE, 'readwrite');
    
    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const action = getRequest.result;
        if (!action) {
          reject(new Error(`Offline action ${id} not found`));
          return;
        }

        const updatedAction = { ...action, ...updates };
        const putRequest = store.put(updatedAction);
        
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(new Error(`Failed to update offline action: ${putRequest.error?.message}`));
      };
      
      getRequest.onerror = () => reject(new Error(`Failed to get offline action: ${getRequest.error?.message}`));
    });
  }

  async deleteOfflineAction(id: string): Promise<void> {
    const store = await this.getStore(SYNC_QUEUE_STORE, 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete offline action: ${request.error?.message}`));
    });
  }

  // Database size management
  async getDatabaseSize(): Promise<number> {
    if (!navigator.storage || !navigator.storage.estimate) {
      throw new Error('Storage estimation not supported');
    }

    const estimate = await navigator.storage.estimate();
    return estimate.usage || 0;
  }

  async getDatabaseQuota(): Promise<number> {
    if (!navigator.storage || !navigator.storage.estimate) {
      throw new Error('Storage estimation not supported');
    }

    const estimate = await navigator.storage.estimate();
    return estimate.quota || 0;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Create and export the singleton instance
export const indexedDbStorage = new IndexedDBStorage(); 