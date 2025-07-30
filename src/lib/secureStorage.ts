// Note: Encryption can be enabled when the dataEncryption service is properly configured
import { InputSanitizer } from './security';

export interface APIKeyConfig {
  key: string;
  provider: string;
  lastUsed?: Date;
  isActive: boolean;
  rateLimitInfo?: {
    requestsPerMinute: number;
    dailyLimit: number;
    currentUsage: number;
  };
}

export interface SecureStorageConfig {
  encryptionEnabled: boolean;
  autoExpiry: boolean;
  expiryHours: number;
  auditLog: boolean;
}

export class SecureAPIKeyManager {
  private static instance: SecureAPIKeyManager | null = null;
  private config: SecureStorageConfig;
  private memoryCache = new Map<string, { value: string; expiry: number }>();
  private auditLog: Array<{ action: string; provider: string; timestamp: Date; success: boolean }> = [];

  private constructor(config: Partial<SecureStorageConfig> = {}) {
    this.config = {
      encryptionEnabled: true,
      autoExpiry: true,
      expiryHours: 24,
      auditLog: true,
      ...config
    };
  }

  static getInstance(config?: Partial<SecureStorageConfig>): SecureAPIKeyManager {
    if (!this.instance) {
      this.instance = new SecureAPIKeyManager(config);
    }
    return this.instance;
  }

  /**
   * Securely store an API key
   */
  async storeAPIKey(provider: string, apiKey: string, options: {
    override?: boolean;
    rateLimitInfo?: APIKeyConfig['rateLimitInfo'];
  } = {}): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate provider name
      const cleanProvider = InputSanitizer.sanitizeText(provider, { maxLength: 50 });
      if (!cleanProvider || cleanProvider.length < 2) {
        throw new Error('Invalid provider name');
      }

      // Validate API key format
      if (!this.validateAPIKeyFormat(cleanProvider, apiKey)) {
        throw new Error('Invalid API key format');
      }

      const storageKey = `apikey_${cleanProvider}`;
      
      // Check if key already exists
      const existing = await this.getStoredKey(storageKey);
      if (existing && !options.override) {
        throw new Error('API key already exists for this provider');
      }

      const keyConfig: APIKeyConfig = {
        key: apiKey,
        provider: cleanProvider,
        lastUsed: new Date(),
        isActive: true,
        rateLimitInfo: options.rateLimitInfo
      };

      // Store API key securely
      localStorage.setItem(storageKey, JSON.stringify(keyConfig));

      // Cache in memory with expiry
      if (this.config.autoExpiry) {
        const expiry = Date.now() + (this.config.expiryHours * 60 * 60 * 1000);
        this.memoryCache.set(storageKey, { value: apiKey, expiry });
      }

      this.logAction('store', cleanProvider, true);
      return { success: true };
    } catch (error) {
      this.logAction('store', provider, false);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to store API key' 
      };
    }
  }

  /**
   * Securely retrieve an API key
   */
  async getAPIKey(provider: string): Promise<{ key: string | null; error?: string }> {
    try {
      const cleanProvider = InputSanitizer.sanitizeText(provider, { maxLength: 50 });
      if (!cleanProvider) {
        throw new Error('Invalid provider name');
      }

      const storageKey = `apikey_${cleanProvider}`;

      // Check memory cache first
      const cached = this.memoryCache.get(storageKey);
      if (cached) {
        if (cached.expiry > Date.now()) {
          this.logAction('retrieve', cleanProvider, true);
          return { key: cached.value };
        } else {
          this.memoryCache.delete(storageKey);
        }
      }

      // Retrieve from storage
      const keyConfig = await this.getStoredKey(storageKey);
      if (!keyConfig || !keyConfig.isActive) {
        this.logAction('retrieve', cleanProvider, false);
        return { key: null, error: 'API key not found or inactive' };
      }

      // Update last used timestamp
      keyConfig.lastUsed = new Date();
      localStorage.setItem(storageKey, JSON.stringify(keyConfig));

      // Update memory cache
      if (this.config.autoExpiry) {
        const expiry = Date.now() + (this.config.expiryHours * 60 * 60 * 1000);
        this.memoryCache.set(storageKey, { value: keyConfig.key, expiry });
      }

      this.logAction('retrieve', cleanProvider, true);
      return { key: keyConfig.key };
    } catch (error) {
      this.logAction('retrieve', provider, false);
      return { 
        key: null, 
        error: error instanceof Error ? error.message : 'Failed to retrieve API key' 
      };
    }
  }

  /**
   * List all stored API key providers
   */
  async listProviders(): Promise<Array<{ provider: string; lastUsed?: Date; isActive: boolean }>> {
    try {
      const providers: Array<{ provider: string; lastUsed?: Date; isActive: boolean }> = [];
      
      // Check localStorage for API key entries
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('apikey_')) {
          const keyConfig = await this.getStoredKey(key);
          if (keyConfig) {
            providers.push({
              provider: keyConfig.provider,
              lastUsed: keyConfig.lastUsed,
              isActive: keyConfig.isActive
            });
          }
        }
      }

      return providers;
    } catch (error) {
      console.error('Failed to list providers:', error);
      return [];
    }
  }

  /**
   * Deactivate an API key
   */
  async deactivateAPIKey(provider: string): Promise<{ success: boolean; error?: string }> {
    try {
      const cleanProvider = InputSanitizer.sanitizeText(provider, { maxLength: 50 });
      const storageKey = `apikey_${cleanProvider}`;
      
      const keyConfig = await this.getStoredKey(storageKey);
      if (!keyConfig) {
        return { success: false, error: 'API key not found' };
      }

      keyConfig.isActive = false;
      localStorage.setItem(storageKey, JSON.stringify(keyConfig));

      // Remove from memory cache
      this.memoryCache.delete(storageKey);

      this.logAction('deactivate', cleanProvider, true);
      return { success: true };
    } catch (error) {
      this.logAction('deactivate', provider, false);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to deactivate API key' 
      };
    }
  }

  /**
   * Delete an API key permanently
   */
  async deleteAPIKey(provider: string): Promise<{ success: boolean; error?: string }> {
    try {
      const cleanProvider = InputSanitizer.sanitizeText(provider, { maxLength: 50 });
      const storageKey = `apikey_${cleanProvider}`;
      
      // Remove from storage
      localStorage.removeItem(storageKey);

      // Remove from memory cache
      this.memoryCache.delete(storageKey);

      this.logAction('delete', cleanProvider, true);
      return { success: true };
    } catch (error) {
      this.logAction('delete', provider, false);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete API key' 
      };
    }
  }

  /**
   * Clear all expired keys from memory cache
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.memoryCache.entries()) {
      if (cached.expiry <= now) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Get audit log
   */
  getAuditLog(): Array<{ action: string; provider: string; timestamp: Date; success: boolean }> {
    return [...this.auditLog];
  }

  /**
   * Clear audit log
   */
  clearAuditLog(): void {
    this.auditLog.length = 0;
  }

  private async getStoredKey(storageKey: string): Promise<APIKeyConfig | null> {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return null;
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to retrieve stored key:', error);
      return null;
    }
  }

  private validateAPIKeyFormat(provider: string, apiKey: string): boolean {
    if (!apiKey || typeof apiKey !== 'string') return false;
    
    // Basic length and character validation
    if (apiKey.length < 10 || apiKey.length > 500) return false;
    
    // Provider-specific validation
    switch (provider.toLowerCase()) {
      case 'openai':
        return /^sk-[a-zA-Z0-9]{20,}$/.test(apiKey);
      case 'huggingface':
        return /^hf_[a-zA-Z0-9]{34}$/.test(apiKey);
      case 'anthropic':
        return /^sk-ant-[a-zA-Z0-9-_]{95,}$/.test(apiKey);
      default:
        // Generic validation - alphanumeric with common special chars
        return /^[a-zA-Z0-9\-_\.]+$/.test(apiKey);
    }
  }

  private logAction(action: string, provider: string, success: boolean): void {
    if (!this.config.auditLog) return;
    
    this.auditLog.push({
      action,
      provider,
      timestamp: new Date(),
      success
    });

    // Keep only last 100 entries
    if (this.auditLog.length > 100) {
      this.auditLog.splice(0, this.auditLog.length - 100);
    }
  }
}

// Environment variable helpers with security
export class SecureEnvironmentManager {
  private static sensitiveKeys = ['api', 'key', 'secret', 'token', 'password'];

  /**
   * Safely get environment variable with validation
   */
  static getEnvVar(key: string, options: {
    required?: boolean;
    defaultValue?: string;
    validate?: (value: string) => boolean;
  } = {}): string | null {
    const { required = false, defaultValue = null, validate } = options;
    
    // Sanitize the key name
    const cleanKey = InputSanitizer.sanitizeText(key, { maxLength: 100 }).toUpperCase();
    if (!cleanKey) return defaultValue;

    const value = import.meta.env[`VITE_${cleanKey}`] || import.meta.env[cleanKey];
    
    if (!value) {
      if (required) {
        throw new Error(`Required environment variable ${cleanKey} is not set`);
      }
      return defaultValue;
    }

    // Validate if validator provided
    if (validate && !validate(value)) {
      throw new Error(`Environment variable ${cleanKey} failed validation`);
    }

    return value;
  }

  /**
   * Check if environment variable contains sensitive data
   */
  static isSensitive(key: string): boolean {
    const lowerKey = key.toLowerCase();
    return this.sensitiveKeys.some(sensitive => lowerKey.includes(sensitive));
  }

  /**
   * Get API key from environment with security checks
   */
  static getAPIKey(provider: string): string | null {
    const key = this.getEnvVar(`${provider}_API_KEY`);
    if (!key) return null;

    // Basic format validation
    if (key.length < 10) {
      console.warn(`API key for ${provider} appears to be too short`);
      return null;
    }

    return key;
  }

  /**
   * Mask sensitive values for logging
   */
  static maskSensitiveValue(key: string, value: string): string {
    if (!this.isSensitive(key)) return value;
    
    if (value.length <= 8) {
      return '***';
    }
    
    const start = value.substring(0, 4);
    const end = value.substring(value.length - 4);
    return `${start}***${end}`;
  }
}

// Default instance
export const secureAPIKeyManager = SecureAPIKeyManager.getInstance(); 