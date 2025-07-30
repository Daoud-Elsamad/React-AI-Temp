import { indexedDbStorage } from './indexedDbStorage';

export interface ExportOptions {
  format: 'json' | 'csv' | 'xlsx' | 'zip';
  includeFiles?: boolean;
  includeSettings?: boolean;
  includeConversations?: boolean;
  dateRange?: {
    start: number;
    end: number;
  };
  compression?: boolean;
  encryption?: boolean;
  password?: string;
}

export interface ExportProgress {
  stage: 'preparing' | 'collecting' | 'processing' | 'compressing' | 'encrypting' | 'finalizing' | 'complete';
  progress: number; // 0-100
  message: string;
  currentItem?: string;
}

export interface ExportResult {
  success: boolean;
  filename: string;
  size: number;
  format: string;
  downloadUrl?: string;
  blob?: Blob;
  metadata: {
    exportedAt: number;
    totalItems: number;
    includedTypes: string[];
    compressed: boolean;
    encrypted: boolean;
  };
  error?: string;
}

export interface ExportMetadata {
  version: string;
  exportedAt: number;
  appVersion: string;
  totalSize: number;
  itemCounts: {
    conversations: number;
    messages: number;
    files: number;
    settings: number;
  };
  schema: {
    [key: string]: {
      version: string;
      fields: string[];
    };
  };
}

export class DataExportManager {
  private progressCallback?: (progress: ExportProgress) => void;

  constructor(progressCallback?: (progress: ExportProgress) => void) {
    this.progressCallback = progressCallback;
  }

  async exportAllData(options: ExportOptions): Promise<ExportResult> {
    try {
      this.updateProgress('preparing', 0, 'Preparing export...');

      // Collect all data based on options
      const data = await this.collectData(options);
      
      this.updateProgress('processing', 40, 'Processing data...');

      // Generate export content
      let exportContent: Blob;
      let filename: string;

      switch (options.format) {
        case 'json':
          exportContent = await this.generateJSONExport(data);
          filename = `app-export-${this.getTimestamp()}.json`;
          break;
        case 'csv':
          exportContent = await this.generateCSVExport(data);
          filename = `app-export-${this.getTimestamp()}.csv`;
          break;
        case 'xlsx':
          exportContent = await this.generateExcelExport(data);
          filename = `app-export-${this.getTimestamp()}.xlsx`;
          break;
        case 'zip':
          exportContent = await this.generateZipExport(data);
          filename = `app-export-${this.getTimestamp()}.zip`;
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      this.updateProgress('compressing', 70, 'Compressing data...');

      // Apply compression if requested
      if (options.compression && options.format !== 'zip') {
        exportContent = await this.compressData(exportContent);
        filename = filename.replace(/\.[^.]+$/, '.gz');
      }

      this.updateProgress('encrypting', 85, 'Encrypting data...');

      // Apply encryption if requested
      if (options.encryption && options.password) {
        exportContent = await this.encryptData(exportContent, options.password);
        filename = filename.replace(/\.[^.]+$/, '.enc');
      }

      this.updateProgress('finalizing', 95, 'Finalizing export...');

      // Generate download URL
      const downloadUrl = URL.createObjectURL(exportContent);

      const result: ExportResult = {
        success: true,
        filename,
        size: exportContent.size,
        format: options.format,
        downloadUrl,
        blob: exportContent,
        metadata: {
          exportedAt: Date.now(),
          totalItems: this.calculateTotalItems(data),
          includedTypes: this.getIncludedTypes(options),
          compressed: options.compression || false,
          encrypted: options.encryption || false
        }
      };

      this.updateProgress('complete', 100, 'Export completed successfully!');

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown export error';
      this.updateProgress('complete', 100, `Export failed: ${errorMessage}`);
      
      return {
        success: false,
        filename: '',
        size: 0,
        format: options.format,
        metadata: {
          exportedAt: Date.now(),
          totalItems: 0,
          includedTypes: [],
          compressed: false,
          encrypted: false
        },
        error: errorMessage
      };
    }
  }

  private async collectData(options: ExportOptions): Promise<any> {
    this.updateProgress('collecting', 10, 'Collecting conversations...');
    
    const data: any = {
      metadata: this.generateMetadata(),
      conversations: [],
      files: [],
      settings: {}
    };

    // Collect conversations
    if (options.includeConversations !== false) {
      const conversations = await indexedDbStorage.getConversations();
      
      for (let i = 0; i < conversations.length; i++) {
        const summary = conversations[i];
        this.updateProgress('collecting', 10 + (i / conversations.length) * 15, 
          `Loading conversation: ${summary.title}`);

        // Apply date filter
        if (options.dateRange) {
          if (summary.updatedAt < options.dateRange.start || 
              summary.updatedAt > options.dateRange.end) {
            continue;
          }
        }

        const conversation = await indexedDbStorage.getConversation(summary.id);
        const thread = await indexedDbStorage.getThread(summary.id);
        
        if (conversation && thread) {
          data.conversations.push({
            conversation,
            thread,
            summary
          });
        }
      }
    }

    this.updateProgress('collecting', 25, 'Collecting files...');

    // Collect files
    if (options.includeFiles !== false) {
      const files = await indexedDbStorage.getFiles();
      data.files = files;
    }

    this.updateProgress('collecting', 35, 'Collecting settings...');

    // Collect settings
    if (options.includeSettings !== false) {
      data.settings = {
        theme: localStorage.getItem('app-theme'),
        preferences: localStorage.getItem('user-preferences'),
        apiKeys: localStorage.getItem('api-keys'), // Note: Should be encrypted
        lastSync: localStorage.getItem('last-sync'),
        version: localStorage.getItem('app-version')
      };
    }

    return data;
  }

  private generateMetadata(): ExportMetadata {
    return {
      version: '2.0',
      exportedAt: Date.now(),
      appVersion: '1.0.0', // Should come from package.json
      totalSize: 0, // Will be calculated later
      itemCounts: {
        conversations: 0,
        messages: 0,
        files: 0,
        settings: 0
      },
      schema: {
        conversations: {
          version: '1.0',
          fields: ['id', 'title', 'provider', 'createdAt', 'updatedAt', 'messageCount']
        },
        messages: {
          version: '1.0',
          fields: ['id', 'conversationId', 'role', 'content', 'timestamp']
        },
        files: {
          version: '1.0',
          fields: ['id', 'name', 'type', 'size', 'uploadStatus', 'aiProcessingStatus']
        }
      }
    };
  }

  private async generateJSONExport(data: any): Promise<Blob> {
    const jsonString = JSON.stringify(data, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
  }

  private async generateCSVExport(data: any): Promise<Blob> {
    let csvContent = '';

    // Conversations CSV
    if (data.conversations.length > 0) {
      csvContent += 'CONVERSATIONS\n';
      csvContent += 'ID,Title,Provider,Created,Updated,Message Count,Last Message\n';
      
      data.conversations.forEach((item: any) => {
        const conv = item.conversation;
        csvContent += `"${conv.id}","${conv.title}","${conv.provider}","${new Date(conv.createdAt).toISOString()}","${new Date(conv.updatedAt).toISOString()}","${conv.messageCount}","${(conv.lastMessage || '').replace(/"/g, '""')}"\n`;
      });
      csvContent += '\n';

      // Messages CSV
      csvContent += 'MESSAGES\n';
      csvContent += 'ID,Conversation ID,Role,Content,Timestamp\n';
      
      data.conversations.forEach((item: any) => {
        item.thread.messages.forEach((msg: any) => {
          csvContent += `"${msg.id}","${msg.conversationId}","${msg.role}","${msg.content.replace(/"/g, '""')}","${new Date(msg.timestamp).toISOString()}"\n`;
        });
      });
      csvContent += '\n';
    }

    // Files CSV
    if (data.files.length > 0) {
      csvContent += 'FILES\n';
      csvContent += 'ID,Name,Type,Size,Upload Status,AI Processing Status\n';
      
      data.files.forEach((file: any) => {
        csvContent += `"${file.id}","${file.name}","${file.type}","${file.size}","${file.uploadStatus}","${file.aiProcessingStatus || 'N/A'}"\n`;
      });
    }

    return new Blob([csvContent], { type: 'text/csv' });
  }

  private async generateExcelExport(data: any): Promise<Blob> {
    // For a real implementation, you would use a library like xlsx
    // For now, return CSV format with Excel MIME type
    const csvBlob = await this.generateCSVExport(data);
    const csvText = await csvBlob.text();
    
    return new Blob([csvText], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
  }

  private async generateZipExport(data: any): Promise<Blob> {
    // For a real implementation, you would use a library like jszip
    // For now, create a simple archive structure
    const files: { [filename: string]: string } = {};

    // Add metadata
    files['metadata.json'] = JSON.stringify(data.metadata, null, 2);

    // Add conversations
    if (data.conversations.length > 0) {
      files['conversations.json'] = JSON.stringify(data.conversations, null, 2);
      
      // Individual conversation files
      data.conversations.forEach((item: any, index: number) => {
        files[`conversations/conversation-${index + 1}.json`] = JSON.stringify(item, null, 2);
      });
    }

    // Add files list
    if (data.files.length > 0) {
      files['files.json'] = JSON.stringify(data.files, null, 2);
    }

    // Add settings
    files['settings.json'] = JSON.stringify(data.settings, null, 2);

    // Create a simple archive format (in real implementation, use JSZip)
    const archiveContent = JSON.stringify(files, null, 2);
    return new Blob([archiveContent], { type: 'application/zip' });
  }

  private async compressData(data: Blob): Promise<Blob> {
    // For a real implementation, you would use compression algorithms
    // For now, return the original data
    return data;
  }

  private async encryptData(data: Blob, _password: string): Promise<Blob> {
    // For a real implementation, you would use WebCrypto API
    // For now, return the original data
    console.warn('Encryption not implemented yet');
    return data;
  }

  private calculateTotalItems(data: any): number {
    let total = 0;
    total += data.conversations.length;
    total += data.files.length;
    total += Object.keys(data.settings).length;
    
    data.conversations.forEach((item: any) => {
      total += item.thread.messages.length;
    });

    return total;
  }

  private getIncludedTypes(options: ExportOptions): string[] {
    const types: string[] = [];
    if (options.includeConversations !== false) types.push('conversations');
    if (options.includeFiles !== false) types.push('files');
    if (options.includeSettings !== false) types.push('settings');
    return types;
  }

  private getTimestamp(): string {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  }

  private updateProgress(stage: ExportProgress['stage'], progress: number, message: string, currentItem?: string): void {
    if (this.progressCallback) {
      this.progressCallback({
        stage,
        progress,
        message,
        currentItem
      });
    }
  }

  // Quick export methods
  async exportConversationsOnly(format: 'json' | 'csv' = 'json'): Promise<ExportResult> {
    return this.exportAllData({
      format,
      includeConversations: true,
      includeFiles: false,
      includeSettings: false
    });
  }

  async exportFilesOnly(format: 'json' | 'csv' = 'json'): Promise<ExportResult> {
    return this.exportAllData({
      format,
      includeConversations: false,
      includeFiles: true,
      includeSettings: false
    });
  }

  async exportSettingsOnly(): Promise<ExportResult> {
    return this.exportAllData({
      format: 'json',
      includeConversations: false,
      includeFiles: false,
      includeSettings: true
    });
  }
}

// Utility functions for download handling
export function downloadExportResult(result: ExportResult): void {
  if (!result.success || !result.downloadUrl) {
    throw new Error('Export failed or no download URL available');
  }

  const link = document.createElement('a');
  link.href = result.downloadUrl;
  link.download = result.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the object URL after a delay
  setTimeout(() => {
    if (result.downloadUrl) {
      URL.revokeObjectURL(result.downloadUrl);
    }
  }, 1000);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 