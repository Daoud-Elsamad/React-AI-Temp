export interface EncryptionConfig {
  algorithm: 'AES-GCM' | 'AES-CBC';
  keyLength: 128 | 192 | 256;
  ivLength: 12 | 16; // 12 for GCM, 16 for CBC
  saltLength: 16 | 32;
  iterations: number; // For PBKDF2
}

export interface EncryptedData {
  data: Uint8Array;
  iv: Uint8Array;
  salt: Uint8Array;
  algorithm: string;
  keyLength: number;
  iterations: number;
}

export interface EncryptionKey {
  id: string;
  key: CryptoKey;
  created: number;
  algorithm: string;
  keyLength: number;
}

export interface FieldEncryptionConfig {
  [fieldPath: string]: {
    encrypt: boolean;
    keyId?: string;
  };
}

export class DataEncryptionService {
  private config: EncryptionConfig;
  private keys: Map<string, EncryptionKey> = new Map();
  private masterKey: CryptoKey | null = null;

  constructor(config?: Partial<EncryptionConfig>) {
    this.config = {
      algorithm: 'AES-GCM',
      keyLength: 256,
      ivLength: 12, // 12 bytes for GCM
      saltLength: 32,
      iterations: 100000,
      ...config
    };
  }

  async initialize(password?: string): Promise<void> {
    try {
      if (password) {
        await this.setMasterPassword(password);
      } else {
        await this.loadStoredKeys();
      }
    } catch (error) {
      console.error('Failed to initialize encryption service:', error);
      throw error;
    }
  }

  async setMasterPassword(password: string): Promise<void> {
    try {
      // Generate salt for master key
      const salt = crypto.getRandomValues(new Uint8Array(this.config.saltLength));
      
      // Derive master key from password
      const passwordKey = await this.deriveKeyFromPassword(password, salt);
      this.masterKey = passwordKey;

      // Store encrypted master key info (without the actual key)
      const masterKeyInfo = {
        salt: Array.from(salt),
        algorithm: this.config.algorithm,
        keyLength: this.config.keyLength,
        iterations: this.config.iterations,
        created: Date.now()
      };

      localStorage.setItem('encryption-master-key-info', JSON.stringify(masterKeyInfo));
      console.log('Master encryption key set successfully');

    } catch (error) {
      console.error('Failed to set master password:', error);
      throw error;
    }
  }

  async verifyMasterPassword(password: string): Promise<boolean> {
    try {
      const masterKeyInfo = localStorage.getItem('encryption-master-key-info');
      if (!masterKeyInfo) {
        return false;
      }

      const info = JSON.parse(masterKeyInfo);
      const salt = new Uint8Array(info.salt);
      
      // Derive key from provided password
      const derivedKey = await this.deriveKeyFromPassword(password, salt);
      
      // Test encryption/decryption with a known value
      const testData = 'encryption-test';
      const encrypted = await this.encryptWithKey(testData, derivedKey);
      const decrypted = await this.decryptWithKey(encrypted, derivedKey);
      
      const isValid = decrypted === testData;
      if (isValid) {
        this.masterKey = derivedKey;
      }
      
      return isValid;

    } catch (error) {
      console.error('Failed to verify master password:', error);
      return false;
    }
  }

  async generateDataKey(keyId?: string): Promise<string> {
    if (!this.masterKey) {
      throw new Error('Master key not set. Please initialize with a password first.');
    }

    try {
      // Generate a new random key for data encryption
      const dataKey = await crypto.subtle.generateKey(
        {
          name: this.config.algorithm,
          length: this.config.keyLength
        },
        true, // extractable
        ['encrypt', 'decrypt']
      );

      const id = keyId || this.generateKeyId();
      const encryptionKey: EncryptionKey = {
        id,
        key: dataKey,
        created: Date.now(),
        algorithm: this.config.algorithm,
        keyLength: this.config.keyLength
      };

      this.keys.set(id, encryptionKey);
      await this.storeKey(encryptionKey);

      return id;

    } catch (error) {
      console.error('Failed to generate data key:', error);
      throw error;
    }
  }

  async encryptData(data: string | object, keyId?: string): Promise<EncryptedData> {
    const targetKeyId = keyId || 'default';
    let encryptionKey = this.keys.get(targetKeyId);

    if (!encryptionKey) {
      // Generate a new key if it doesn't exist
      await this.generateDataKey(targetKeyId);
      encryptionKey = this.keys.get(targetKeyId);
    }

    if (!encryptionKey) {
      throw new Error(`Encryption key ${targetKeyId} not found`);
    }

    const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
    return this.encryptWithKey(plaintext, encryptionKey.key);
  }

  async decryptData(encryptedData: EncryptedData, keyId?: string): Promise<string> {
    const targetKeyId = keyId || 'default';
    const encryptionKey = this.keys.get(targetKeyId);

    if (!encryptionKey) {
      throw new Error(`Encryption key ${targetKeyId} not found`);
    }

    return this.decryptWithKey(encryptedData, encryptionKey.key);
  }

  async encryptObject(obj: any, fieldConfig: FieldEncryptionConfig): Promise<any> {
    const result = { ...obj };

    for (const [fieldPath, config] of Object.entries(fieldConfig)) {
      if (config.encrypt) {
        const value = this.getNestedValue(obj, fieldPath);
        if (value !== undefined && value !== null) {
          try {
            const encrypted = await this.encryptData(value, config.keyId);
            this.setNestedValue(result, fieldPath, {
              _encrypted: true,
              _keyId: config.keyId || 'default',
              _data: this.encryptedDataToBase64(encrypted)
            });
          } catch (error) {
            console.error(`Failed to encrypt field ${fieldPath}:`, error);
          }
        }
      }
    }

    return result;
  }

  async decryptObject(obj: any, fieldConfig: FieldEncryptionConfig): Promise<any> {
    const result = { ...obj };

    for (const [fieldPath, config] of Object.entries(fieldConfig)) {
      if (config.encrypt) {
        const encryptedValue = this.getNestedValue(obj, fieldPath);
        if (encryptedValue && encryptedValue._encrypted) {
          try {
            const encryptedData = this.base64ToEncryptedData(encryptedValue._data);
            const decrypted = await this.decryptData(encryptedData, encryptedValue._keyId);
            this.setNestedValue(result, fieldPath, JSON.parse(decrypted));
          } catch (error) {
            console.error(`Failed to decrypt field ${fieldPath}:`, error);
            // Keep encrypted value if decryption fails
          }
        }
      }
    }

    return result;
  }

  private async encryptWithKey(plaintext: string, key: CryptoKey): Promise<EncryptedData> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(this.config.ivLength));
    
    // Generate salt (for key derivation, though not used here since we have the key)
    const salt = crypto.getRandomValues(new Uint8Array(this.config.saltLength));

    const encrypted = await crypto.subtle.encrypt(
      {
        name: this.config.algorithm,
        iv: iv
      },
      key,
      data
    );

    return {
      data: new Uint8Array(encrypted),
      iv,
      salt,
      algorithm: this.config.algorithm,
      keyLength: this.config.keyLength,
      iterations: this.config.iterations
    };
  }

  private async decryptWithKey(encryptedData: EncryptedData, key: CryptoKey): Promise<string> {
    const decrypted = await crypto.subtle.decrypt(
      {
        name: encryptedData.algorithm,
        iv: encryptedData.iv
      },
      key,
      encryptedData.data
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  private async deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive the actual encryption key
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.config.iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: this.config.algorithm,
        length: this.config.keyLength
      },
      false, // not extractable
      ['encrypt', 'decrypt']
    );
  }

  private async storeKey(encryptionKey: EncryptionKey): Promise<void> {
    if (!this.masterKey) {
      throw new Error('Master key required to store encryption keys');
    }

    try {
      // Export the key for storage
      const exportedKey = await crypto.subtle.exportKey('raw', encryptionKey.key);
      
      // Encrypt the exported key with master key
      const keyData = {
        keyData: Array.from(new Uint8Array(exportedKey)),
        id: encryptionKey.id,
        created: encryptionKey.created,
        algorithm: encryptionKey.algorithm,
        keyLength: encryptionKey.keyLength
      };

      const encryptedKeyData = await this.encryptWithKey(JSON.stringify(keyData), this.masterKey);
      const storedKeys = this.getStoredKeys();
      storedKeys[encryptionKey.id] = this.encryptedDataToBase64(encryptedKeyData);
      
      localStorage.setItem('encryption-keys', JSON.stringify(storedKeys));

    } catch (error) {
      console.error('Failed to store encryption key:', error);
      throw error;
    }
  }

  private async loadStoredKeys(): Promise<void> {
    try {
      const storedKeys = this.getStoredKeys();
      
      if (Object.keys(storedKeys).length === 0) {
        return; // No keys to load
      }

      if (!this.masterKey) {
        console.warn('Master key not available, cannot load stored encryption keys');
        return;
      }

      for (const [keyId, encryptedKeyBase64] of Object.entries(storedKeys)) {
        try {
          const encryptedKeyData = this.base64ToEncryptedData(encryptedKeyBase64);
          const decryptedKeyJson = await this.decryptWithKey(encryptedKeyData, this.masterKey);
          const keyData = JSON.parse(decryptedKeyJson);
          
          // Import the key
          const importedKey = await crypto.subtle.importKey(
            'raw',
            new Uint8Array(keyData.keyData),
            {
              name: keyData.algorithm,
              length: keyData.keyLength
            },
            true,
            ['encrypt', 'decrypt']
          );

          const encryptionKey: EncryptionKey = {
            id: keyData.id,
            key: importedKey,
            created: keyData.created,
            algorithm: keyData.algorithm,
            keyLength: keyData.keyLength
          };

          this.keys.set(keyId, encryptionKey);
        } catch (error) {
          console.error(`Failed to load encryption key ${keyId}:`, error);
        }
      }

    } catch (error) {
      console.error('Failed to load stored keys:', error);
    }
  }

  private getStoredKeys(): { [keyId: string]: string } {
    try {
      const stored = localStorage.getItem('encryption-keys');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to get stored keys:', error);
      return {};
    }
  }

  private encryptedDataToBase64(encryptedData: EncryptedData): string {
    const combined = {
      data: Array.from(encryptedData.data),
      iv: Array.from(encryptedData.iv),
      salt: Array.from(encryptedData.salt),
      algorithm: encryptedData.algorithm,
      keyLength: encryptedData.keyLength,
      iterations: encryptedData.iterations
    };
    return btoa(JSON.stringify(combined));
  }

  private base64ToEncryptedData(base64: string): EncryptedData {
    const combined = JSON.parse(atob(base64));
    return {
      data: new Uint8Array(combined.data),
      iv: new Uint8Array(combined.iv),
      salt: new Uint8Array(combined.salt),
      algorithm: combined.algorithm,
      keyLength: combined.keyLength,
      iterations: combined.iterations
    };
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop();
    
    if (!lastKey) return;

    const target = keys.reduce((current, key) => {
      if (!current[key]) {
        current[key] = {};
      }
      return current[key];
    }, obj);

    target[lastKey] = value;
  }

  private generateKeyId(): string {
    return `key-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public utility methods
  getAvailableKeys(): string[] {
    return Array.from(this.keys.keys());
  }

  async deleteKey(keyId: string): Promise<void> {
    this.keys.delete(keyId);
    
    const storedKeys = this.getStoredKeys();
    delete storedKeys[keyId];
    localStorage.setItem('encryption-keys', JSON.stringify(storedKeys));
  }

  async rotateKey(keyId: string): Promise<string> {
    const newKeyId = await this.generateDataKey();
    await this.deleteKey(keyId);
    return newKeyId;
  }

  isInitialized(): boolean {
    return this.masterKey !== null;
  }

  hasKey(keyId: string): boolean {
    return this.keys.has(keyId);
  }

  // Cleanup sensitive data from memory
  destroy(): void {
    this.keys.clear();
    this.masterKey = null;
  }
}

// Predefined field encryption configurations for common data types
export const EncryptionConfigs = {
  // API Keys and secrets
  apiKeys: {
    'openai.apiKey': { encrypt: true, keyId: 'api-keys' },
    'huggingface.apiKey': { encrypt: true, keyId: 'api-keys' },
    'anthropic.apiKey': { encrypt: true, keyId: 'api-keys' }
  },

  // User settings that may contain sensitive info
  userSettings: {
    'email': { encrypt: true, keyId: 'user-data' },
    'phoneNumber': { encrypt: true, keyId: 'user-data' },
    'address': { encrypt: true, keyId: 'user-data' },
    'personalInfo': { encrypt: true, keyId: 'user-data' }
  },

  // Conversation content (optional, for privacy)
  conversations: {
    'messages.content': { encrypt: true, keyId: 'conversations' },
    'title': { encrypt: false }, // Keep titles unencrypted for search
    'systemMessage': { encrypt: true, keyId: 'conversations' }
  },

  // File metadata that might be sensitive
  files: {
    'extractedContent.textContent': { encrypt: true, keyId: 'files' },
    'extractedContent.ocrText': { encrypt: true, keyId: 'files' },
    'aiPrompt': { encrypt: true, keyId: 'files' },
    'name': { encrypt: false }, // Keep names unencrypted for UI
    'metadata.description': { encrypt: true, keyId: 'files' }
  }
};

// Singleton instance
export const dataEncryption = new DataEncryptionService();

// Utility functions for common encryption tasks
export async function encryptApiKey(apiKey: string, _provider: string): Promise<string> {
  if (!dataEncryption.isInitialized()) {
    throw new Error('Data encryption not initialized');
  }

  const encrypted = await dataEncryption.encryptData(apiKey, 'api-keys');
  return dataEncryption['encryptedDataToBase64'](encrypted);
}

export async function decryptApiKey(encryptedApiKey: string): Promise<string> {
  if (!dataEncryption.isInitialized()) {
    throw new Error('Data encryption not initialized');
  }

  const encryptedData = dataEncryption['base64ToEncryptedData'](encryptedApiKey);
  return dataEncryption.decryptData(encryptedData, 'api-keys');
}

export async function encryptConversationContent(content: string): Promise<string> {
  if (!dataEncryption.isInitialized()) {
    return content; // Return unencrypted if encryption not available
  }

  try {
    const encrypted = await dataEncryption.encryptData(content, 'conversations');
    return dataEncryption['encryptedDataToBase64'](encrypted);
  } catch (error) {
    console.error('Failed to encrypt conversation content:', error);
    return content; // Fallback to unencrypted
  }
}

export async function decryptConversationContent(encryptedContent: string): Promise<string> {
  if (!dataEncryption.isInitialized()) {
    return encryptedContent; // Return as-is if encryption not available
  }

  try {
    const encryptedData = dataEncryption['base64ToEncryptedData'](encryptedContent);
    return dataEncryption.decryptData(encryptedData, 'conversations');
  } catch (error) {
    console.error('Failed to decrypt conversation content:', error);
    return encryptedContent; // Fallback to original
  }
} 